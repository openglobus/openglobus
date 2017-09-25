goog.provide('og.Clock');

goog.require('og.jd');
goog.require('og.Events');

/**
 * Class represents application timer that stores custom current julian datetime, and time speed multiplier.
 * @class
 * @param {Object} [params]: - Clock parameters:
 * @param {number} [params.startDate=0.0] - Julian start date.
 * @param {number} [params.endDate=0.0] - Julian end date.
 * @param {number} [params.currentDate] - Julian current date. Default: current date.
 * @param {number} [params.multiplier=1.0] - Time speed multiolier.
 */
og.Clock = function (params) {
    params = params || {};

    this._id = og.Clock._staticCounter++;

    /**
     * Clock name.
     * @public
     * @type {string}
     */
    this.name = params.name || "";

    /**
     * Clock events.
     * @public
     * @type {og.Events}
     */
    this.events = new og.Events(og.Clock.eventList);

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

    var currentDate = params.currentDate || og.jd.DateToUTC(new Date());
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
    this.multiplier = params.multiplier !== undefined ? params.multiplier : 1.0;

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
};

og.Clock._staticCounter = 0;

og.Clock.eventList = [
    "tick",
    "end"
];

/**
 * Sets current clock datetime.
 * @public
 * @param {Object} date - JavaScript Date object.
 */
og.Clock.prototype.setDate = function (date) {
    var d = og.jd.DateToUTC(date);
    if (this.startDate && d < this.startDate) {
        d = this.startDate;
    }
    if (this.endDate && d > this.endDate) {
        d = this.endDate;
    }
    this.currentDate = d;
};

/**
 * Returns current application date.
 * @public
 * @returns {Date} - Current date.
 */
og.Clock.prototype.getDate = function () {
    return og.jd.UTCtoDate(this.currentDate);
};

og.Clock.prototype.reset = function () {
    if (this.startDate) {
        this.currentDate = this.startDate;
    }
};

og.Clock.prototype._tick = function (dt) {
    this.deltaTicks = dt * this.multiplier;
    if (this.active) {
        var cd = og.jd.addMilliseconds(this.currentDate, this.deltaTicks);
        if (this.multiplier > 0) {
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
        this.events.dispatch(this.events.tick, this);
    }
};

/**
 * @public
 * @param {og.Clock} clock - Clock instance to compare.
 * @returns {boolean} - Returns true if a clock is the same instance.
 */
og.Clock.prototype.equal = function (clock) {
    return this._id === clock._id;
};