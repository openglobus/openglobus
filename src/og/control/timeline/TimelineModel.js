'use strict';

import { Events } from '../../Events.js';
import { addSeconds } from "./timelineUtils.js";

class TimelineModel {
    constructor(options = {}) {

        this._events = new Events(["change", "current"/*, "tick"*/]);

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

    on(eventName, callback, sender) {
        return this._events.on(eventName, callback, sender);
    }

    off(eventName, callback) {
        return this._events.off(eventName, callback);
    }

    play() {
        if (!this._requestAnimationFrameId) {
            this._prevNow = window.performance.now();
            this._animationFrameCallback();
        }
    }

    stop() {
        if (this._requestAnimationFrameId) {
            window.cancelAnimationFrame(this._requestAnimationFrameId);
            this._requestAnimationFrameId = 0;
        }
    }

    stopped() {
        return this._requestAnimationFrameId == 0;
    }

    _animationFrameCallback() {
        this._requestAnimationFrameId = window.requestAnimationFrame(() => {
            this._frame();
            this._animationFrameCallback();
        });
    }

    _frame() {
        let now = window.performance.now();
        this.dt = now - this._prevNow;
        this._prevNow = now;

        this.current = new Date(this.currentTime + this.dt * this.multiplier);

        // // @ts-ignore
        // this._events.dispatch(this._events.tick, this._current);
    }

    get range() {
        return this._range
    }

    set(rangeStart, rangeEnd) {
        if (rangeStart !== this._rangeStart || rangeEnd !== this._rangeEnd) {
            this._rangeStart = rangeStart;
            this._rangeEnd = rangeEnd;
            this._range = this._rangeEnd.getTime() - this._rangeStart.getTime();
            this._events.dispatch(this._events.change, rangeStart, rangeEnd);
        }
    }

    get current() {
        return this._current;
    }

    get rangeStart() {
        return this._rangeStart;
    }

    get rangeEnd() {
        return this._rangeEnd;
    }

    get rangeStartTime() {
        return this._rangeStart.getTime();
    }

    get rangeEndTime() {
        return this._rangeEnd.getTime();
    }

    get currentTime() {
        return this._current.getTime();
    }

    set current(current) {
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

    set rangeStart(date) {
        if (date !== this._rangeStart) {
            this._rangeStart = date;
            this._range = this._rangeEnd.getTime() - this._rangeStart.getTime();
            this._events.dispatch(this._events.change, date);
        }
    }

    set rangeEnd(date) {
        if (date !== this._rangeEnd) {
            this._rangeEnd = date;
            this._range = this._rangeEnd.getTime() - this._rangeStart.getTime();
            this._events.dispatch(this._events.change, date);
        }
    }
}

export { TimelineModel };
