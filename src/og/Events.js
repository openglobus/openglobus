/**
 * @module og/Events
 */

'use strict';

import { stamp } from './utils/shared.js';

/**
 * Base events class to handle custom events.
 * @class
 * @param {Array.<string>} [eventNames] - Event names that could be dispatched.
 */
class Events {

    constructor(eventNames, sender) {
        /**
         * Registered event names.
         * @protected
         * @type {Array.<string>}
         */
        this._eventNames = [];

        eventNames && this.registerNames(eventNames);

        this._sender = sender || this;

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

        this.__id = Events.__staticCounter++;
    }

    static get _staticCounter() {
        if (!this._counter && this._counter !== 0) {
            this._counter = 0;
        }
        return this._counter;
    }

    static set _staticCounter(n) {
        this._counter = n;
    }

    bindSender(sender) {
        this._sender = sender || this;
    }

    /**
     * Function that creates event object properties that would be dispatched.
     * @public
     * @param {Array.<string>} eventNames - Specified event names list.
     */
    registerNames(eventNames) {
        for (var i = 0; i < eventNames.length; i++) {
            this[eventNames[i]] = { "active": true, "handlers": [] };
            this._eventNames.push(eventNames[i]);
        }
    }

    /**
     * Returns true if event callback has stamped.
     * @protected
     * @param {Object} name - Event identifier.
     * @param {Object} obj - Event callback.
     * @return {boolean} -
     */
    _stamp(name, obj) {

        var ogid = stamp(obj);

        var st = name + "_" + this.__id + "_" + ogid;

        if (!this._stampCache[st]) {
            this._stampCache[st] = ogid;
            return true;
        }

        return false;
    }

    /**
     * Attach listener.
     * @public
     * @param {string} name - Event name to listen.
     * @param {eventCallback} callback - Event callback function.
     * @param {Object} sender - Event callback function owner. 
     */
    on(name, callback, sender) {
        if (this._stamp(name, callback)) {
            this[name] && this[name].handlers.unshift({ "sender": sender || this._sender, "callback": callback });
        }
    }

    /**
     * Stop listening event name with specified callback function.
     * @public
     * @param {string} name - Event name.
     * @param {eventCallback} callback - Attached  event callback.
     */
    off(name, callback) {
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
    }

    /**
     * Dispatch event.
     * @public
     * @param {Object} event - Event instance property that created by event name.
     * @param {Object} [obj] - Event object.
     */
    dispatch(event, obj) {
        if (event && event.active) {
            var h = event.handlers;
            var i = h.length;
            while (i-- && !this._stopPropagation) {
                var e = h[i];
                e.callback.call(e.sender, obj);
            }
        }
        this._stopPropagation = false;
    }

    /**
     * Brakes events propagation.
     * @public
     */
    stopPropagation() {
        this._stopPropagation = true;
    }

    /**
     * Removes all events.
     * @public
     */
    clear() {
        for (var i = 0; i < this._eventNames.length; i++) {
            var e = this[this._eventNames[i]];
            e.handlers.length = 0;
            e.handlers = [];
        }
        this._eventNames.length = 0;
        this._eventNames = [];
    }
};

export { Events };