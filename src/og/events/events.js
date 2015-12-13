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

/**
 * Function that creates event object properties that would be dispatched.
 * @public
 * @param {Array.<string>} eventNames - Specified event names list.
 */
og.Events.prototype.registerNames = function (eventNames) {
    for (var i = 0; i < eventNames.length; i++) {
        this[eventNames[i]] = { "active": true, "handlers": [] };
    }
};

og.Events.prototype._stamp = function (obj) {
    if (!obj._openglobus_id) {
        obj._openglobus_id = ++this._counter;
        return true;
    }
    return false;
};

/**
 * Attach listener.
 * @public
 * @param {string} name - Event name to listen.
 * @param {Object} sender - Event callback function context. 
 * @param {eventCallback} callback - Event callback.
 */
og.Events.prototype.on = function (name, sender, callback) {
    if (this._stamp(callback)) {
        this[name].handlers.unshift({ "sender": sender, "callback": callback });
    }
};

/**
 * Stop listening event name with specified callback function.
 * @public
 * @param {string} name - Event name.
 * @param {eventCallback} callback - attached to the event callback.
 */
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

/**
 * Dispatch event.
 * @public
 * @param {Object} event - Event instance property that created by event name.
 * @param {*} obj - Event object.
 */
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