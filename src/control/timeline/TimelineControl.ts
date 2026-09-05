import { Dialog } from "../../ui/Dialog";
import { ToggleButton } from "../../ui/ToggleButton";
import { Control, type IControlParams } from "../Control";
import { TimelineView } from "./TimelineView";
import type { ITimelineSpan, ITimelineSpanParams, TimelineModel } from "./TimelineModel";
import { createEvents, type EventsHandler } from "../../Events";

type TimelineControlEventsList = [
    "visibility",
    "change",
    "setcurrent",
    "current",
    "play",
    "playback",
    "pause",
    "reset",
    "startdrag",
    "stopdrag",
    "startdragcurrent",
    "stopdragcurrent",
    "localtime",
    "suntime",
    "sundate"
];

const TIMELINECONTROL_EVENTS: TimelineControlEventsList = [
    "visibility",
    "change",
    "setcurrent",
    "current",
    "play",
    "playback",
    "pause",
    "reset",
    "startdrag",
    "stopdrag",
    "startdragcurrent",
    "stopdragcurrent",
    "localtime",
    "suntime",
    "sundate"
];

interface ITimelineControlParams extends IControlParams {
    name?: string;
    current?: Date;
    rangeStart?: Date;
    rangeEnd?: Date;
}

function addHours(date: Date, hours: number): Date {
    const temp = new Date(date);
    temp.setHours(temp.getHours() + hours);
    return temp;
}

const ICON_BUTTON_SVG = `<?xml version="1.0" encoding="utf-8"?>
<!-- Svg Vector Icons : http://www.onlinewebfonts.com/icon -->
    <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 1000 1000" enable-background="new 0 0 1000 1000" xml:space="preserve">
    <metadata> Svg Vector Icons : http://www.onlinewebfonts.com/icon </metadata>
    <g><path d="M500,10C229.4,10,10,229.4,10,500s219.4,490,490,490s490-219.4,490-490S770.6,10,500,10z M800.3,800.3c-39,39-84.5,69.7-135,91C613,913.5,557.4,924.7,500,924.7s-112.9-11.2-165.3-33.3c-50.5-21.3-95.9-52-135-91c-39-39-69.7-84.5-91-135C86.5,612.9,75.3,557.4,75.3,500s11.2-112.9,33.3-165.3c21.3-50.5,52-95.9,91-135c39-39,84.5-69.7,135-91C387.1,86.5,442.6,75.3,500,75.3s112.9,11.2,165.3,33.3c50.5,21.3,95.9,52,135,91c39,39,69.7,84.5,91,135c22.1,52.3,33.3,107.9,33.3,165.3s-11.2,112.9-33.3,165.3C869.9,715.8,839.3,761.2,800.3,800.3z"/><path d="M761.3,532.7H532.7V304c0-18.1-14.6-32.7-32.7-32.7s-32.7,14.6-32.7,32.7v261.3l0,0c0,18.1,14.6,32.7,32.7,32.7h261.3c18.1,0,32.7-14.6,32.7-32.7l0,0C794,547.3,779.4,532.7,761.3,532.7z"/></g>
</svg>`;

class TimelineControl extends Control {
    protected _timelineView: TimelineView;
    protected _toggleBtn: ToggleButton;
    protected _dialog: Dialog<null>;
    protected _defaultClockWasRunningBeforeDrag: boolean;

    public events: EventsHandler<TimelineControlEventsList>;

    constructor(options: ITimelineControlParams = {}) {
        super({
            name: "timeline",
            ...options
        });

        this.events = createEvents(TIMELINECONTROL_EVENTS);
        this._defaultClockWasRunningBeforeDrag = false;

        let currentDate = options.current || new Date();
        let startDate = options.rangeStart || addHours(currentDate, -12);
        let endDate = options.rangeEnd || addHours(currentDate, 12);

        this._timelineView = new TimelineView({
            rangeStart: startDate,
            rangeEnd: endDate,
            currentDate: currentDate
        });

        this._toggleBtn = new ToggleButton({
            classList: ["og-map-button", "og-timeline_button"],
            icon: ICON_BUTTON_SVG
        });

        this._dialog = new Dialog({
            title: "Timeline",
            visible: false,
            resizable: true,
            useHide: true,
            top: 10,
            left: 60,
            width: 600,
            height: 115,
            minHeight: 115,
            maxHeight: 110
        });

        this._dialog.events.on("visibility", (v: boolean) => {
            this._toggleBtn.setActive(v);
            this.events.dispatch(this.events.visibility, v);
        });
    }

    /**
     * Returns timeline data model.
     * @public
     */
    public get model(): TimelineModel {
        return this._timelineView.model;
    }

    /**
     * Adds a colored time interval drawn on the scale, e.g. one per telemetry track.
     * Spans that overlap in time are placed on separate rows automatically, and the
     * rows share the scale height between them.
     * @public
     * @param {ITimelineSpanParams} params - Span start, end and color. An omitted id is generated.
     * @returns {ITimelineSpan} - Stored span, with its id and assigned row.
     */
    public addSpan(params: ITimelineSpanParams): ITimelineSpan {
        return this.model.addSpan(params);
    }

    /**
     * Adds several spans at once, keeping the ones already on the scale.
     * @public
     * @param {ITimelineSpanParams[]} params - Spans to add.
     * @returns {ITimelineSpan[]} - Stored spans, in the order they were given.
     */
    public addSpans(params: ITimelineSpanParams[]): ITimelineSpan[] {
        return this.model.addSpans(params);
    }

    /**
     * Replaces every span on the scale, e.g. to redraw the whole set after a source
     * was added or removed.
     * @public
     * @param {ITimelineSpanParams[]} params - Spans the scale is left with.
     * @returns {ITimelineSpan[]} - Stored spans, in the order they were given.
     */
    public setSpans(params: ITimelineSpanParams[]): ITimelineSpan[] {
        return this.model.setSpans(params);
    }

    /**
     * Replaces the time range, color and payload of a span, and reassigns the rows when
     * its time range moved.
     * @public
     * @param {string} id - Span id.
     * @param {ITimelineSpanParams} params - New span fields. Every field is replaced, the id is kept.
     * @returns {ITimelineSpan | undefined} - Updated span, or undefined when the id is unknown.
     */
    public updateSpan(id: string, params: ITimelineSpanParams): ITimelineSpan | undefined {
        return this.model.updateSpan(id, params);
    }

    /**
     * Removes a single span from the scale. An unknown id is ignored.
     * @public
     * @param {string} id - Span id.
     */
    public removeSpan(id: string): void {
        this.model.removeSpan(id);
    }

    /**
     * Removes every span from the scale.
     * @public
     */
    public clearSpans(): void {
        this.model.clearSpans();
    }

    /**
     * Returns the spans currently on the scale.
     * @public
     * @returns {ITimelineSpan[]} - Stored spans, each carrying its assigned row.
     */
    public getSpans(): ITimelineSpan[] {
        return this.model.getSpans();
    }

    /**
     * Returns a single span by its id.
     * @public
     * @param {string} id - Span id.
     * @returns {ITimelineSpan | undefined} - Stored span, or undefined when the id is unknown.
     */
    public getSpan(id: string): ITimelineSpan | undefined {
        return this.model.getSpan(id);
    }

    public override oninit() {
        let $container = this.renderer!.div!;
        const defaultClock = this.renderer!.handler.defaultClock;

        this._toggleBtn.appendTo(this.renderer!.topLeftContainer());
        this._dialog.appendTo($container);
        this._dialog.events.on("visibility", (v: boolean) => {
            if (v) {
                this._dialog.positionNearElementOnFirstOpen(this._toggleBtn.el, this.renderer!.div);
            }
        });

        this._toggleBtn.events.on("change", (isActive: boolean) => {
            this._dialog.setVisibility(isActive);
            if (isActive) {
                this._timelineView.resize();
            }
        });

        this._timelineView.appendTo(this._dialog.container!);

        // the Sun may already stand on a local date and time, and the timeline shows where
        let localDateTime = this.planet?.sun?.localDateTime;
        if (localDateTime) {
            let halfRange = this._timelineView.model.range * 0.5;
            this._timelineView.model.set(
                new Date(localDateTime.getTime() - halfRange),
                new Date(localDateTime.getTime() + halfRange)
            );
            this._timelineView.model.current = localDateTime;
            this._timelineView.localTime = true;
        }

        defaultClock.multiplier = this._timelineView.model.multiplier;
        defaultClock.setDate(this._timelineView.model.current);
        if (this._timelineView.model.stopped()) {
            defaultClock.stop();
        } else {
            defaultClock.start();
        }

        this._timelineView.events.on("setcurrent", (d: Date) => {
            this.renderer && defaultClock.setDate(d);
            // While the Sun has a marker of its own the timeline does not light the scene
            if (this._timelineView.localTime && !this._timelineView.sunTime) {
                this.planet?.sun?.setLocalDateTime(d);
            }
            this.events.dispatch(this.events.setcurrent, d);
        });

        this._timelineView.events.on("localtime", (isActive: boolean) => {
            let sun = this.planet?.sun;
            if (sun && !this._timelineView.sunTime) {
                sun.setLocalDateTime(isActive ? this._timelineView.model.current : null);
                this.renderer && this.renderer.requestRedraw();
            }
            this.events.dispatch(this.events.localtime, isActive);
        });

        this._timelineView.events.on("suntime", (isActive: boolean) => {
            let sun = this.planet?.sun;
            if (sun) {
                sun.setLocalDateTime(
                    isActive
                        ? this._timelineView.sunDate
                        : this._timelineView.localTime
                          ? this._timelineView.model.current
                          : null
                );
                this.renderer && this.renderer.requestRedraw();
            }
            this.events.dispatch(this.events.suntime, isActive);
        });

        this._timelineView.events.on("sundate", (d: Date) => {
            this.planet?.sun?.setLocalDateTime(d);
            this.renderer && this.renderer.requestRedraw();
            this.events.dispatch(this.events.sundate, d);
        });

        this._timelineView.model.events.on("change", (...args: unknown[]) => {
            this.events.dispatch(this.events.change, ...args);
        });

        this._timelineView.model.events.on("current", (d: Date) => {
            this.events.dispatch(this.events.current, d);
        });

        this._timelineView.events.on("play", (...args: unknown[]) => {
            defaultClock.multiplier = this._timelineView.model.multiplier;
            defaultClock.start();
            this.events.dispatch(this.events.play, ...args);
        });

        this._timelineView.events.on("playback", (...args: unknown[]) => {
            defaultClock.multiplier = this._timelineView.model.multiplier;
            defaultClock.start();
            this.events.dispatch(this.events.playback, ...args);
        });

        this._timelineView.events.on("pause", (...args: unknown[]) => {
            defaultClock.stop();
            this.events.dispatch(this.events.pause, ...args);
        });

        this._timelineView.events.on("reset", (...args: unknown[]) => {
            defaultClock.stop();
            this.events.dispatch(this.events.reset, ...args);
        });

        this._timelineView.events.on("startdrag", (e: Event) => {
            this._defaultClockWasRunningBeforeDrag = !this._timelineView.model.stopped();
            defaultClock.stop();
            this.planet?.sun!.stop();
            this.renderer && this.renderer.controls.navigation.deactivate();
            this.events.dispatch(this.events.startdrag, e);
        });

        this._timelineView.events.on("stopdrag", (d: Date) => {
            if (this._defaultClockWasRunningBeforeDrag) {
                defaultClock.start();
            }
            this.renderer && this.renderer.controls.navigation.activate();
            this.events.dispatch(this.events.stopdrag, d);
        });

        this._timelineView.events.on("startdragcurrent", (e: Event) => {
            this._defaultClockWasRunningBeforeDrag = !this._timelineView.model.stopped();
            defaultClock.stop();
            this.planet?.sun!.stop();
            this.renderer && this.renderer.controls.navigation.deactivate();
            this.events.dispatch(this.events.startdragcurrent, e);
        });

        this._timelineView.events.on("stopdragcurrent", (d: Date) => {
            if (this._defaultClockWasRunningBeforeDrag) {
                defaultClock.start();
            }
            this.renderer && this.renderer.controls.navigation.activate();
            this.events.dispatch(this.events.stopdragcurrent, d);
        });
    }
}

export { TimelineControl };
