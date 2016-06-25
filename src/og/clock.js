goog.provide('og.Clock');

goog.require('og.jd');

/**
 * Class represents application timer that stores custom current julian datetime, and time speed multiplier.
 * @class
 * @param {Object} currentDate - JavaScript Date objects that is a current application datetime.
 */
og.Clock = function (currentDate) {

    /**
     * Start julian date clock loop.
     * @public
     * @type {number}
     */
    this.startDate = 0

    /**
     * End julian date clock loop.
     * @public
     * @type {number}
     */
    this.endDate = 0;

    /**
     * Current julian datetime.
     * @public
     * @type {number}
     */
    this.currentDate = currentDate || og.jd.DateToUTC(new Date());

    /**
     * Timer speed multiplier.
     * @public
     * @type {number}
     */
    this.multiplier = 1.0;

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

/**
 * Sets current clock datetime.
 * @public
 * @param {Object} date - JavaScript Date object.
 */
og.Clock.prototype.setDate = function (date) {
    this.currentDate = og.jd.DateToUTC(date);
};

/**
 * Returns current application date.
 * @public
 * @returns {Object}
 */
og.Clock.prototype.getDate = function () {
    return og.jd.UTCtoDate(this.currentDate);
};

//tick in handler frame
og.Clock.prototype._tick = function (dt) {
    this.deltaTicks = dt * this.multiplier;
    if (this.active) {
        this.currentDate = og.jd.addMilliseconds(this.currentDate, this.deltaTicks);
    }
};