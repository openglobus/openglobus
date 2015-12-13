goog.provide('og.Events');

/**
 * Base events class to handle custom events.
 * @class
 * @param {Array.<string>} [eventNames] - Event names that could be dispatched.
 */
og.Events = function (eventNames) {
    eventNames && this.registerNames(eventNames);
    this._counter = 0;
};

og.Events.prototype.registerNames = function (eventNames) {
    for (var i = 0; i < eventNames.length; i++) {
        this[eventNames[i]] = { "active": true, "handlers": [] };
    }
};

og.Events.prototype._stamp = function (obj) {
    if (!obj._openglobus_id) {
        obj._openglobus_id = ++this._counter;
    }
};

og.Events.prototype.on = function (name, sender, callback) {
    this._stamp(callback);
    this[name].handlers.unshift({ "sender": sender, "callback": callback });
};

og.Events.prototype.off = function (name, callback) {
    if (callback._openglobus_id) {
        var h = this[name].handlers;
        var i = h.length;
        var indexToRemove = -1;
        while (i--) {
            var hi = h[i];
            if (hi.callback._openglobus_id == callback._openglobus_id) {
                indexToRemove = i;
                break;
            }
        }

        if (indexToRemove != -1) {
            h.splice(indexToRemove, 1);
            callback._openglobus_id = null;
        }
    }
};

og.Events.prototype.dispatch = function (event, obj) {
    if (event && event.active) {
        var h = event.handlers;
        var i = h.length;
        while (i--) {
            var e = h[i];
            e.callback.call(e.sender, obj);
        }
    }
};