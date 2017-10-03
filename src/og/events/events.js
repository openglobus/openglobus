goog.provide('og.Events');

goog.require('og.utils');

/**
 * Base events class to handle custom events.
 * @class
 * @param {Array.<string>} [eventNames] - Event names that could be dispatched.
 */
og.Events = function (eventNames) {
    /**
     * Registered event names.
     * @protected
     * @type {Array.<string>}
     */
    this._eventNames = [];
    eventNames && this.registerNames(eventNames);

    /**
     * Event identifier.
     * @protected
     * @type {number}
     */
    this._counter = 0;

    /**
     * Stop propagation flag
     * @protected
     * @type {boolean}
     */
    this._stopPropagation = false;

    this._stampCache = {};

    this.__id = og.Events.__staticCounter++;
};

og.Events.__staticCounter = 0;

/**
 * Function that creates event object properties that would be dispatched.
 * @public
 * @param {Array.<string>} eventNames - Specified event names list.
 */
og.Events.prototype.registerNames = function (eventNames) {
    for (var i = 0; i < eventNames.length; i++) {
        this[eventNames[i]] = { "active": true, "handlers": [] };
        this._eventNames.push(eventNames[i]);
    }
};

/**
 * Returns true if event callback has stamped.
 * @protected
 * @param {Object} name - Event identifier.
 * @param {Object} obj - Event callback.
 * @return {boolean} -
 */
og.Events.prototype._stamp = function (name, obj) {

    var ogid = og.utils.stamp(obj);

    var st = name + "_" + this.__id + "_" + ogid;

    if (!this._stampCache[st]) {
        this._stampCache[st] = ogid;
        return true;
    }

    return false;
};

/**
 * Attach listener.
 * @public
 * @param {string} name - Event name to listen.
 * @param {eventCallback} callback - Event callback function.
 * @param {Object} sender - Event callback function owner. 
 */
og.Events.prototype.on = function (name, callback, sender) {
    if (this._stamp(name, callback)) {
        this[name] && this[name].handlers.unshift({ "sender": sender || this, "callback": callback });
    }
};

/**
 * Stop listening event name with specified callback function.
 * @public
 * @param {string} name - Event name.
 * @param {eventCallback} callback - Attached  event callback.
 */
og.Events.prototype.off = function (name, callback) {
    var st = name + "_" + this.__id + "_" + callback._openglobus_id;
    if (callback._openglobus_id && this._stampCache[st]) {
        var h = this[name].handlers;
        var i = h.length;
        var indexToRemove = -1;
        while (i--) {
            var hi = h[i];
            if (hi.callback._openglobus_id === callback._openglobus_id) {
                indexToRemove = i;
                break;
            }
        }

        if (indexToRemove !== -1) {
            h.splice(indexToRemove, 1);
            this._stampCache[st] = undefined;
            delete this._stampCache[st];
        }
    }
};

/**
 * Dispatch event.
 * @public
 * @param {Object} event - Event instance property that created by event name.
 * @param {Object} [obj] - Event object.
 */
og.Events.prototype.dispatch = function (event, obj) {
    if (event && event.active) {
        var h = event.handlers;
        var i = h.length;
        while (i-- && !this._stopPropagation) {
            var e = h[i];
            e.callback.call(e.sender, obj);
        }
    }
    this._stopPropagation = false;
};

/**
 * Brakes events propagation.
 * @public
 */
og.Events.prototype.stopPropagation = function () {
    this._stopPropagation = true;
};

/**
 * Removes all events.
 * @public
 */
og.Events.prototype.clear = function () {
    for (var i = 0; i < this._eventNames.length; i++) {
        var e = this[this._eventNames[i]];
        e.handlers.length = 0;
        e.handlers = [];
    }
    this._eventNames.length = 0;
    this._eventNames = [];
};