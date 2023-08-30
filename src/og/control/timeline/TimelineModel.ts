import {EventsHandler, createEvents} from '../../Events';
import {addSeconds} from "./timelineUtils";

type TimelineEventsList = ["change", "current"];

const TIMELINE_EVENTS: TimelineEventsList = ["change", "current"/*, "tick"*/];

interface ITimelineParams {
    current?: Date;
    rangeStart?: Date;
    rangeEnd?: Date;
    minDate?: Date | null;
    maxDate?: Date | null;
    multiplier?: number
}

class TimelineModel {
    protected _events: EventsHandler<TimelineEventsList>;
    protected _current: Date;
    protected _rangeStart: Date;
    protected _rangeEnd: Date;
    protected _range: number;
    protected _minDate: Date | null;
    protected _maxDate: Date | null;
    protected _requestAnimationFrameId: number;
    protected _prevNow: number;

    public multiplier: number;
    public dt: number;

    constructor(options: ITimelineParams = {}) {

        this._events = createEvents(TIMELINE_EVENTS);

        this._current = options.current || new Date();
        this._rangeStart = options.rangeStart || new Date();
        this._rangeEnd = options.rangeEnd || addSeconds(this._rangeStart, 3600);
        this._range = this._rangeEnd.getTime() - this._rangeStart.getTime();
        this._minDate = options.minDate || null;
        this._maxDate = options.maxDate || null;

        this.multiplier = options.multiplier != undefined ? options.multiplier : 1.0;

        this._requestAnimationFrameId = 0;
        this._prevNow = 0;

        this.dt = 0;
    }

    public on(eventName: string, callback: Function, sender?: any) {
        return this._events.on(eventName, callback, sender);
    }

    public off(eventName: string, callback: Function) {
        return this._events.off(eventName, callback);
    }

    public play() {
        if (!this._requestAnimationFrameId) {
            this._prevNow = window.performance.now();
            this._animationFrameCallback();
        }
    }

    public stop() {
        if (this._requestAnimationFrameId) {
            window.cancelAnimationFrame(this._requestAnimationFrameId);
            this._requestAnimationFrameId = 0;
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

        this.current = new Date(this.currentTime + this.dt * this.multiplier);

        // this._events.dispatch(this._events.tick, this._current);
    }

    public get range(): number {
        return this._range
    }

    public set(rangeStart: Date, rangeEnd: Date) {
        if (rangeStart !== this._rangeStart || rangeEnd !== this._rangeEnd) {
            this._rangeStart = rangeStart;
            this._rangeEnd = rangeEnd;
            this._range = this._rangeEnd.getTime() - this._rangeStart.getTime();
            this._events.dispatch(this._events.change, rangeStart, rangeEnd);
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
            this._events.dispatch(this._events.current, this._current);
        }
    }

    public set rangeStart(date: Date) {
        if (date !== this._rangeStart) {
            this._rangeStart = date;
            this._range = this._rangeEnd.getTime() - this._rangeStart.getTime();
            this._events.dispatch(this._events.change, date);
        }
    }

    public set rangeEnd(date: Date) {
        if (date !== this._rangeEnd) {
            this._rangeEnd = date;
            this._range = this._rangeEnd.getTime() - this._rangeStart.getTime();
            this._events.dispatch(this._events.change, date);
        }
    }
}

export {TimelineModel};
