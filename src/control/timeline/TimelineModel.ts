import { type EventsHandler, createEvents } from "../../Events";
import { addSeconds } from "./timelineUtils";

type TimelineEventsList = ["change", "current", "play", "stop", "spanschange"];

const TIMELINE_EVENTS: TimelineEventsList = ["change", "current", "play", "stop", "spanschange" /*, "tick"*/];

const DEFAULT_SPAN_COLOR = "rgb(0, 180, 255)";

/** A colored time interval shown on the timeline scale. */
export interface ITimelineSpanParams {
    id?: string;
    start: Date;
    end: Date;
    color?: string;
    data?: unknown;
}

export interface ITimelineSpan {
    id: string;
    start: Date;
    end: Date;
    color: string;
    data?: unknown;
    /** Row the span is drawn in, assigned so that overlapping spans never share one. */
    lane: number;
}

interface ITimelineParams {
    current?: Date;
    rangeStart?: Date;
    rangeEnd?: Date;
    minDate?: Date | null;
    maxDate?: Date | null;
    multiplier?: number;
}

class TimelineModel {
    static __spanCounter__: number = 0;

    public events: EventsHandler<TimelineEventsList>;
    protected _current: Date;
    protected _rangeStart: Date;
    protected _rangeEnd: Date;
    protected _range: number;
    protected _minDate: Date | null;
    protected _maxDate: Date | null;
    protected _requestAnimationFrameId: number;
    protected _prevNow: number;
    protected _spans: ITimelineSpan[];
    protected _laneCount: number;

    public multiplier: number;
    public dt: number;

    /**
     * While set, playing does not advance
     * the time: something else sets `current` instead.
     */
    public driven: boolean;

    constructor(options: ITimelineParams = {}) {
        this.events = createEvents(TIMELINE_EVENTS);

        this._current = options.current || new Date();
        this._rangeStart = options.rangeStart || new Date();
        this._rangeEnd = options.rangeEnd || addSeconds(this._rangeStart, 3600);
        this._range = this._rangeEnd.getTime() - this._rangeStart.getTime();
        this._minDate = options.minDate || null;
        this._maxDate = options.maxDate || null;

        this.multiplier = options.multiplier != undefined ? options.multiplier : 1.0;

        this._requestAnimationFrameId = 0;
        this._prevNow = 0;
        this._spans = [];
        this._laneCount = 0;

        this.driven = false;

        this.dt = 0;
    }

    public addSpan(params: ITimelineSpanParams): ITimelineSpan {
        return this.addSpans([params])[0];
    }

    public addSpans(params: ITimelineSpanParams[]): ITimelineSpan[] {
        const added = params.map((item) => toSpan(item));

        this._spans = this._spans.concat(added);
        this._onSpansChange();

        return added;
    }

    public setSpans(params: ITimelineSpanParams[]): ITimelineSpan[] {
        this._spans = params.map((item) => toSpan(item));
        this._onSpansChange();
        return this._spans;
    }

    public updateSpan(id: string, params: ITimelineSpanParams): ITimelineSpan | undefined {
        const span = this.getSpan(id);

        if (!span) return;

        span.start = params.start;
        span.end = params.end;
        span.color = params.color || DEFAULT_SPAN_COLOR;
        span.data = params.data;

        this._onSpansChange();

        return span;
    }

    public removeSpan(id: string): void {
        const rest = this._spans.filter((span) => span.id !== id);

        if (rest.length === this._spans.length) return;

        this._spans = rest;
        this._onSpansChange();
    }

    public clearSpans(): void {
        if (!this._spans.length) return;

        this._spans = [];
        this._onSpansChange();
    }

    public getSpans(): ITimelineSpan[] {
        return this._spans;
    }

    public getSpan(id: string): ITimelineSpan | undefined {
        return this._spans.find((span) => span.id === id);
    }

    /**
     * Number of rows the current spans need, at least one when
     * there are any.
     */
    public get laneCount(): number {
        return this._laneCount;
    }

    protected _onSpansChange(): void {
        this._assignLanes();
        this.events.dispatch(this.events.spanschange, this._spans);
    }

    protected _assignLanes(): void {
        const laneEnds: number[] = [];

        for (const span of [...this._spans].sort((left, right) => left.start.getTime() - right.start.getTime())) {
            const start = span.start.getTime();
            const end = Math.max(start, span.end.getTime());

            let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);

            if (lane < 0) {
                lane = laneEnds.length;
            }

            laneEnds[lane] = end;
            span.lane = lane;
        }

        this._laneCount = laneEnds.length;
    }

    public play() {
        if (!this._requestAnimationFrameId) {
            this._prevNow = window.performance.now();
            this._animationFrameCallback();
            this.events.dispatch(this.events.play, this);
        }
    }

    public stop() {
        if (this._requestAnimationFrameId) {
            window.cancelAnimationFrame(this._requestAnimationFrameId);
            this._requestAnimationFrameId = 0;
            this.events.dispatch(this.events.stop, this);
        }
    }

    public stopped() {
        return this._requestAnimationFrameId == 0;
    }

    protected _animationFrameCallback() {
        this._requestAnimationFrameId = window.requestAnimationFrame(() => {
            this._frame();
            this._animationFrameCallback();
        });
    }

    protected _frame() {
        let now = window.performance.now();
        this.dt = now - this._prevNow;
        this._prevNow = now;

        if (!this.driven) {
            this.current = new Date(this.currentTime + this.dt * this.multiplier);
        }

        // this._events.dispatch(this._events.tick, this._current);
    }

    public get range(): number {
        return this._range;
    }

    public set(rangeStart: Date, rangeEnd: Date) {
        if (rangeStart !== this._rangeStart || rangeEnd !== this._rangeEnd) {
            this._rangeStart = rangeStart;
            this._rangeEnd = rangeEnd;
            this._range = this._rangeEnd.getTime() - this._rangeStart.getTime();
            this.events.dispatch(this.events.change, rangeStart, rangeEnd);
        }
    }

    public get current(): Date {
        return this._current;
    }

    public get rangeStart(): Date {
        return this._rangeStart;
    }

    public get rangeEnd(): Date {
        return this._rangeEnd;
    }

    public get rangeStartTime(): number {
        return this._rangeStart.getTime();
    }

    public get rangeEndTime(): number {
        return this._rangeEnd.getTime();
    }

    public get currentTime(): number {
        return this._current.getTime();
    }

    public set current(current: Date) {
        if (current !== this._current) {
            if (this._maxDate && current > this._maxDate) {
                this._current = this._maxDate;
            } else if (this._minDate && current < this._minDate) {
                this._current = this._minDate;
            } else {
                this._current = current;
            }
            this.events.dispatch(this.events.current, this._current);
        }
    }

    public set rangeStart(date: Date) {
        if (date !== this._rangeStart) {
            this._rangeStart = date;
            this._range = this._rangeEnd.getTime() - this._rangeStart.getTime();
            this.events.dispatch(this.events.change, date);
        }
    }

    public set rangeEnd(date: Date) {
        if (date !== this._rangeEnd) {
            this._rangeEnd = date;
            this._range = this._rangeEnd.getTime() - this._rangeStart.getTime();
            this.events.dispatch(this.events.change, date);
        }
    }
}

function toSpan(params: ITimelineSpanParams): ITimelineSpan {
    return {
        id: params.id || `span_${TimelineModel.__spanCounter__++}`,
        start: params.start,
        end: params.end,
        color: params.color || DEFAULT_SPAN_COLOR,
        data: params.data,
        lane: 0
    };
}

export { TimelineModel };
