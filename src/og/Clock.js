"use strict";

import * as jd from "./astro/jd.js";
import { Events } from "./Events";

/**
 * Class represents application timer that stores custom current julian datetime, and time speed multiplier.
 * @class
 * @param {Object} [params] - Clock parameters:
 * @param {number} [params.startDate=0.0] - Julian start date.
 * @param {number} [params.endDate=0.0] - Julian end date.
 * @param {number} [params.currentDate] - Julian current date. Default: current date.
 * @param {number} [params.multiplier=1.0] - Time speed multiplier.
 */
class Clock {
    static get _staticCounter() {
        if (!this._counter && this._counter !== 0) {
            this._counter = 0;
        }
        return this._counter;
    }

    static set _staticCounter(n) {
        this._counter = n;
    }

    /**
     *
     * @param {Object} [params] - Clock parameters:
     */
    constructor(params) {
        params = params || {};

        this._id = Clock._staticCounter++;

        /**
         * Clock name.
         * @public
         * @type {string}
         */
        this.name = params.name || "";

        /**
         * Clock events.
         * @public
         * @type {Events}
         */
        this.events = new Events(["tick", "end", "start", "stop"], this);

        /**
         * Start julian date clock loop.
         * @public
         * @type {number}
         */
        this.startDate = params.startDate || 0;

        /**
         * End julian date clock loop.
         * @public
         * @type {number}
         */
        this.endDate = params.endDate || 0;

        var currentDate = params.currentDate || jd.DateToUTC(new Date());
        if (params.startDate && currentDate < params.startDate) {
            currentDate = params.startDate;
        }
        if (params.endDate && currentDate > params.endDate) {
            currentDate = params.endDate;
        }

        /**
         * Current julian datetime.
         * @public
         * @type {number}
         */
        this.currentDate = currentDate;

        /**
         * Timer speed multiplier.
         * @public
         * @type {number}
         */
        this._multiplier = params.multiplier !== undefined ? params.multiplier : 1.0;
        this._running = 1;

        /**
         * Animation frame delta time.
         * @public
         * @readonly
         * @type {number}
         */
        this.deltaTicks = 0;

        /**
         * Timer activity.
         * @public
         * @type {boolean}
         */
        this.active = true;

        this._intervalDelay = 0;
        this._intervalStart = 0;
        this._intervalCallback = null;
    }

    clearInterval() {
        this._intervalDelay = 0;
        this._intervalStart = 0;
        this._intervalCallback = null;
    }

    setInterval(delay, callback) {
        this._intervalStart = this.currentDate;
        this._intervalDelay = delay * jd.ONE_BY_MILLISECONDS_PER_DAY;
        this._intervalCallback = callback;
    }

    /**
     * Sets current clock datetime.
     * @public
     * @param {Object} date - JavaScript Date object.
     */
    setDate(date) {
        var d = jd.DateToUTC(date);
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
    getDate() {
        return jd.UTCtoDate(this.currentDate);
    }

    reset() {
        if (this.startDate) {
            this.currentDate = this.startDate;
        }
    }

    _tick(dt) {
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
    isEqual(clock) {
        return this._id === clock._id;
    }

    start() {
        if (this._running === 0) {
            this._running = 1;
            this.events.dispatch(this.events.start, this);
        }
    }

    get multiplier() {
        return this._multiplier;
    }

    set multiplier(value) {
        this._multiplier = value;
    }

    stop() {
        if (this._running === 1) {
            this._running = 0;
            this.events.dispatch(this.events.stop, this);
        }
    }
}

export { Clock };
