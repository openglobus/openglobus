goog.provide('og.Clock');

goog.require('og.jd');

og.Clock = function (currentDate) {

    /**
     * @public
     */
    this.currentDate = currentDate || og.jd.DateToUTC(new Date());

    /**
     * @public
     */
    this.multiplier = 1.0;

    /**
     * @public
     */
    this.deltaTicks = 0;

    /**
     * @public
     */
    this.active = true;
};

og.Clock.prototype.setDate = function (date) {
    this.currentDate = og.jd.DateToUTC(date);
};

og.Clock.prototype.getDate = function () {
    return og.jd.UTCtoDate(this.currentDate);
};

og.Clock.prototype._tick = function (dt) {
    this.deltaTicks = dt * this.multiplier;
    if (this.active) {
        this.currentDate = og.jd.addMilliseconds(this.currentDate, this.deltaTicks);
    }
};

//this.deltaTicks = this.deltaTime * multiplier;
//currentTime = og.jd.addMilliseconds(currentTime, this.deltaTicks);

//_ticks += this.deltaTicks;

//if (_ticks >= 1000) {
//    secs += (_ticks / 1000) | 0;
//    _ticks = _ticks - (_ticks / 1000);
//}