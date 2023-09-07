import * as jd from "./astro/jd";
import {EventsHandler, createEvents} from "./Events";
import {JulianDate} from "./astro/jd";
import {Handler} from "./webgl/Handler";

type ClockEventsList = ["tick", "end", "start", "stop"];

const CLOCK_EVENTS: ClockEventsList = ["tick", "end", "start", "stop"];

export interface IClockParams {
    name?: string;
    startDate?: JulianDate;
    endDate?: JulianDate;
    currentDate?: JulianDate;
    multiplier?: number;
}

/**
 * Class represents application timer that stores custom current julian datetime, and time speed multiplier.
 * @class
 * @param {Object} [params] - Clock parameters:
 * @param {JulianDate} [params.startDate=0.0] - Julian start date.
 * @param {JulianDate} [params.endDate=0.0] - Julian end date.
 * @param {JulianDate} [params.currentDate] - Julian current date. Default: current date.
 * @param {number} [params.multiplier=1.0] - Time speed multiplier.
 */
class Clock {
    static __counter__: number = 0;
    protected __id: number;
    public __handler: Handler | null = null;

    /**
     * Clock events.
     * @public
     * @type {EventsHandler<ClockEventsList>}
     */
    public events: EventsHandler<ClockEventsList>;

    /**
     * Clock name.
     * @public
     * @type {string}
     */
    public name: string;

    /**
     * Start julian date clock loop.
     * @public
     * @type {JulianDate}
     */
    public startDate: JulianDate;

    /**
     * End julian date clock loop.
     * @public
     * @type {JulianDate}
     */
    public endDate: JulianDate;

    /**
     * Current julian datetime.
     * @public
     * @type {JulianDate}
     */
    public currentDate: JulianDate;

    /**
     * Animation frame delta time.
     * @public
     * @readonly
     * @type {number}
     */
    public deltaTicks: number;

    /**
     * Timer activity.
     * @public
     * @type {boolean}
     */
    public active: boolean = true;

    /**
     * Timer speed multiplier.
     * @protected
     * @type {number}
     */
    protected _multiplier: number;
    protected _running: number;
    protected _intervalDelay: number;
    protected _intervalStart: number;
    protected _intervalCallback: Function | null;


    constructor(params: IClockParams = {}) {


        this.__id = Clock.__counter__++;

        this.events = createEvents<ClockEventsList>(CLOCK_EVENTS, this);

        this.name = params.name || "";

        this.startDate = params.startDate || 0;

        this.endDate = params.endDate || 0;

        let currentDate = params.currentDate || jd.DateToUTC(new Date());
        if (params.startDate && currentDate < params.startDate) {
            currentDate = params.startDate;
        }
        if (params.endDate && currentDate > params.endDate) {
            currentDate = params.endDate;
        }

        this.currentDate = currentDate;

        this._multiplier = params.multiplier !== undefined ? params.multiplier : 1.0;
        this._running = 1;

        this.deltaTicks = 0;

        this.active = true;

        this._intervalDelay = 0;
        this._intervalStart = 0;
        this._intervalCallback = null;
    }

    public clearInterval() {
        this._intervalDelay = 0;
        this._intervalStart = 0;
        this._intervalCallback = null;
    }

    public setInterval(delay: number, callback: Function) {
        this._intervalStart = this.currentDate;
        this._intervalDelay = delay * jd.ONE_BY_MILLISECONDS_PER_DAY;
        this._intervalCallback = callback;
    }

    /**
     * Sets current clock datetime.
     * @public
     * @param {Object} date - JavaScript Date object.
     */
    public setDate(date: Date) {
        let d = jd.DateToUTC(date);
        if (this.startDate && d < this.startDate) {
            d = this.startDate;
        }
        if (this.endDate && d > this.endDate) {
            d = this.endDate;
        }
        this.currentDate = d;
    }

    /**
     * Returns current application date.
     * @public
     * @returns {Date} - Current date.
     */
    public getDate(): Date {
        return jd.UTCtoDate(this.currentDate);
    }

    public reset() {
        if (this.startDate) {
            this.currentDate = this.startDate;
        }
    }

    public tick(dt: number) {
        let m = this._multiplier * this._running;
        this.deltaTicks = dt * m
        if (this.active) {
            let cd = jd.addMilliseconds(this.currentDate, this.deltaTicks);
            if (m > 0) {
                if (this.endDate && cd > this.endDate) {
                    this.currentDate = this.startDate;
                    this.events.dispatch(this.events.end, this);
                } else {
                    this.currentDate = cd;
                }
            } else {
                if (this.startDate && cd < this.startDate) {
                    this.currentDate = this.endDate;
                    this.events.dispatch(this.events.end, this);
                } else {
                    this.currentDate = cd;
                }
            }

            if (this._intervalCallback) {
                if (this.currentDate - this._intervalStart >= this._intervalDelay) {
                    this._intervalStart = this.currentDate;
                    this._intervalCallback(this);
                }
            }

            this.events.dispatch(this.events.tick, this);
        }
    }

    /**
     * @public
     * @param {Clock} clock - Clock instance to compare.
     * @returns {boolean} - Returns true if a clock is the same instance.
     */
    public isEqual(clock: Clock) {
        return this.__id === clock.__id;
    }

    public start() {
        if (this._running === 0) {
            this._running = 1;
            this.events.dispatch(this.events.start, this);
        }
    }

    public get multiplier(): number {
        return this._multiplier;
    }

    public set multiplier(value: number) {
        this._multiplier = value;
    }

    public stop() {
        if (this._running === 1) {
            this._running = 0;
            this.events.dispatch(this.events.stop, this);
        }
    }
}

export {Clock};
