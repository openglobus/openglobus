"use strict";

import {binaryInsert, stamp} from "./utils/shared";

type EventHandlers = Array<() => void>;

export type EventsMap<T extends readonly string[]> = {
    [K in T[number]]: { active: boolean; handlers: EventHandlers }
}

/**
 * Base events class to handle custom events.
 * @class
 * @param {Array.<string>} [eventNames] - Event names that could be dispatched.
 * @param {*} [sender]
 */
class Events<T extends string[]> implements EventsMap<T> {


    /**
     * Registered event names.
     * @protected
     * @type {Array.<string>}
     */
    protected _eventNames: T;


    protected _sender: any;

    /**
     * Stop propagation flag
     * @protected
     * @type {boolean}
     */
    protected _stopPropagation: boolean;

    protected _stampCache: any;

    protected __id: number;

    static __counter__: number;

    constructor(eventNames: T, sender?: any) {

        this.__id = Events.__counter__++;

        this._eventNames = [] as T;

        eventNames && this.registerNames(eventNames);

        this._sender = sender || this;

        this._stopPropagation = false;

        this._stampCache = {};
    }

    static create<T extends string[]>(methodNames: T, sender?: any) {
        return new Events(methodNames, sender) as Events<T> & EventsMap<T>
    }

    public bindSender(sender?: any) {
        this._sender = sender || this;
    }

    /**
     * Function that creates event object properties that would be dispatched.
     * @public
     * @param {Array.<string>} eventNames - Specified event names list.
     */
    public registerNames(eventNames: T) {
        for (let i = 0; i < eventNames.length; i++) {
            (this as any)[eventNames[i]] = {
                active: true,
                handlers: []
            };
            this._eventNames.push(eventNames[i]);
        }
    }

    protected _getStamp(name: string, id: number, ogid: number) {
        return `${name}_${id}_${ogid}`;
    }

    /**
     * Returns true if event callback has stamped.
     * @protected
     * @param {Object} name - Event identifier.
     * @param {Object} obj - Event callback.
     * @return {boolean} -
     */
    protected _stamp(name: string, obj: any) {
        let ogid = stamp(obj);
        let st = this._getStamp(name, this.__id, ogid);

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
     * @param {any} callback - Event callback function.
     * @param {any} [sender] - Event callback function owner.
     * @param {number} [priority] - Priority of event callback.
     */
    public on(name: string, callback: any, sender?: any, priority: number = 0) {
        if (this._stamp(name, callback)) {
            if ((this as any)[name]) {
                let c = callback.bind(sender || this._sender);
                c._openglobus_id = callback._openglobus_id;
                c._openglobus_priority = priority;
                binaryInsert((this as any)[name].handlers, c, (a: any, b: any) => {
                    return b._openglobus_priority - a._openglobus_priority;
                });
            }
        }
    }

    /**
     * Stop listening event name with specified callback function.
     * @public
     * @param {string} name - Event name.
     * @param {any} callback - Attached  event callback.
     */
    public off(name: string, callback: any) {
        if (callback) {
            let st = this._getStamp(name, this.__id, callback._openglobus_id);
            if (callback._openglobus_id && this._stampCache[st]) {
                let h = (this as any)[name].handlers;
                let i = h.length;
                let indexToRemove = -1;
                while (i--) {
                    let hi = h[i];
                    if (hi._openglobus_id === callback._openglobus_id) {
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
    }

    /**
     * Dispatch event.
     * @public
     * @param {Object} event - Event instance property that created by event name.
     * @param {Object} [args] - Callback parameters.
     */
    public dispatch(event: any, ...args: any[]) {
        let result = true;
        if (event && event.active && !this._stopPropagation) {
            let h = event.handlers.slice(0),
                i = h.length;
            while (i--) {
                if (h[i](...args) === false) {
                    result = false;
                }
            }
        }
        this._stopPropagation = false;
        return result;
    }

    /**
     * Brakes events propagation.
     * @public
     */
    public stopPropagation() {
        this._stopPropagation = true;
    }

    /**
     * Removes all events.
     * @public
     */
    public clear() {
        for (let i = 0; i < this._eventNames.length; i++) {
            let e = (this as any)[this._eventNames[i]];
            e.handlers.length = 0;
            e.handlers = [];
        }
        this._eventNames.length = 0;
        this._eventNames = [] as T;
    }
}

export {Events};
