/**
 * @module og/Lock
 */

'use strict';

class Lock {

    constructor() {
        this._lock = 0;
    }

    lock(key) {
        this._lock |= (1 << key._id);
    }

    free(key) {
        this._lock &= ~(1 << key._id);
    }

    isFree() {
        return this._lock === 0;
    }

    isLocked() {
        return this._lock !== 0;
    }
};

class Key {

    static get _staticCounter() {
        if (!this._counter && this._counter !== 0) {
            this._counter = 0;
        }
        return this._counter;
    }

    static set _staticCounter(n) {
        this._counter = n;
    }

    constructor() {
        this._id = Key._staticCounter++;
    }
};

export { Lock, Key };
