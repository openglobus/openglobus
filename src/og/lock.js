goog.provide('og.idle');

og.idle.Lock = function () {
    this._lock = 0;

    this.lock = function (key) {
        this._lock |= (1 << key._id);
    };

    this.free = function (key) {
        this._lock &= ~( 1 << key._id);
    };

    this.isFree = function () {
        return this._lock === 0;
    };

    this.isLocked = function () {
        return this._lock !== 0;
    };
};

og.idle.Key = function () {
    this._id = og.idle.Key._staticCounter++;
};

og.idle.Key._staticCounter = 0;
