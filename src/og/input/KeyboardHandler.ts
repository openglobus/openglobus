'use strict';

import {input} from './input';
import {stamp} from "../utils/shared";

const STAMP_SPACER = "_";

class KeyboardHandler {

    private _instance: any;

    protected _removeCallback: any;
    protected _getStamp: any;
    protected _stamp: any;

    public getcurrentlyPressedKeys: any;
    public getPressedKeysCallbacks: any;
    public getUnpressedKeysCallbacks: any;
    public getCharkeysCallbacks: any;
    public removeEvent: any;
    public setActivity: any;
    public releaseKeys: any;
    public addEvent: any;
    public isKeyPressed: any;
    public handleKeyDown: any;
    public handleKeyUp: any;
    public handleEvents: any;

    constructor() {
        let _that = this;
        let _currentlyPressedKeys: any = {};
        let _pressedKeysCallbacks: any = {};
        let _unpressedKeysCallbacks: any = {};
        let _charkeysCallbacks: any = {};
        let _anykeyCallback: any = null;
        let _event: any = null;
        let _active: boolean = true;
        let _stampCache: any = {};

        if (KeyboardHandler.prototype._instance) {
            return KeyboardHandler.prototype._instance;
        } else {
            KeyboardHandler.prototype._instance = this;

            document.onkeydown = function (event) {
                _event = event;
                _active && _that.handleKeyDown();
            };
            document.onkeyup = function (event) {
                _event = event;
                _active && _that.handleKeyUp();
            };
        }

        const _sortByPriority = function (a: any, b: any) {
            return a.priority < b.priority;
        };

        this.getcurrentlyPressedKeys = function () {
            return _currentlyPressedKeys;
        }

        this.getPressedKeysCallbacks = function () {
            return _pressedKeysCallbacks;
        }

        this.getUnpressedKeysCallbacks = function () {
            return _unpressedKeysCallbacks;
        }

        this.getCharkeysCallbacks = function () {
            return _charkeysCallbacks;
        }

        this.removeEvent = function (event: string, keyCode: number, callback: any) {
            let st = this._getStamp(event, keyCode, callback._openglobus_id);
            if (callback._openglobus_id && _stampCache[st]) {
                _stampCache[st] = null;
                delete _stampCache[st];

                if (event === "keypress") {
                    this._removeCallback(_pressedKeysCallbacks[keyCode], callback);
                } else if (event === "keyfree") {
                    this._removeCallback(_unpressedKeysCallbacks[keyCode], callback);
                } else if (event === "charkeypress") {
                    this._removeCallback(_charkeysCallbacks[keyCode], callback);
                }
            }
        };

        this._removeCallback = function (handlers: any, callback: any) {
            for (let i = 0; i < handlers.length; i++) {
                if (handlers[i].callback._openglobus_id === callback._openglobus_id) {
                    handlers.splice(i, 1);
                }
            }
        };

        this._getStamp = function (name: string, keyCode: number, ogid: number) {
            return `${name}${STAMP_SPACER}${keyCode}${STAMP_SPACER}${ogid}`;
        };

        this._stamp = function (name: string, keyCode: number, obj: any) {
            let ogid = stamp(obj);

            let st = this._getStamp(name, keyCode, ogid);

            if (!_stampCache[st]) {
                _stampCache[st] = ogid;
                return true;
            }

            return false;
        };

        this.setActivity = function (activity: boolean) {
            _active = activity;
        };

        this.releaseKeys = function () {
            _currentlyPressedKeys = {};
        };

        this.addEvent = function (event: string, keyCode: number, callback: Function, sender?: any, priority?: number) {

            // Event is already bound with the callback
            if (!this._stamp(event, keyCode, callback)) return;

            if (priority === undefined) {
                priority = 1600;
            }
            switch (event) {
                case "keyfree":
                    if (!_unpressedKeysCallbacks[keyCode]) {
                        _unpressedKeysCallbacks[keyCode] = [];
                    }
                    _unpressedKeysCallbacks[keyCode].push({callback: callback, sender: sender, priority: priority});
                    _unpressedKeysCallbacks[keyCode].sort(_sortByPriority);
                    break;

                case "keypress":
                    if (keyCode == null) {
                        _anykeyCallback = {callback: callback, sender: sender || _that};
                    } else {
                        if (!_pressedKeysCallbacks[keyCode]) {
                            _pressedKeysCallbacks[keyCode] = [];
                        }
                        _pressedKeysCallbacks[keyCode].push({callback: callback, sender: sender, priority: priority});
                        _pressedKeysCallbacks[keyCode].sort(_sortByPriority);
                    }
                    break;

                case "charkeypress":
                    if (!_charkeysCallbacks[keyCode]) {
                        _charkeysCallbacks[keyCode] = [];
                    }
                    _charkeysCallbacks[keyCode].push({callback: callback, sender: sender, priority: priority});
                    _charkeysCallbacks[keyCode].sort(_sortByPriority);
                    break;
            }
        };

        this.isKeyPressed = function (keyCode: number) {
            return _currentlyPressedKeys[keyCode];
        };

        this.handleKeyDown = function () {
            _anykeyCallback && _anykeyCallback.callback.call(_anykeyCallback.sender, _event);
            _currentlyPressedKeys[_event.keyCode] = true;
            for (let ch in _charkeysCallbacks) {
                if (String.fromCharCode(_event.keyCode) == String.fromCharCode(Number(ch))) {
                    let ccl = _charkeysCallbacks[ch];
                    for (let i = 0; i < ccl.length; i++) {
                        ccl[i].callback.call(ccl[i].sender, _event);
                    }
                }
            }

            if (_event.keyCode == input.KEY_ALT || _event.keyCode == input.KEY_SHIFT) {
                _event.preventDefault();
            }
        };

        this.handleKeyUp = function () {
            if (_currentlyPressedKeys[_event.keyCode] || _event.keyCode === input.KEY_PRINTSCREEN) {
                for (let pk in _unpressedKeysCallbacks) {
                    if (_currentlyPressedKeys[pk] || _event.keyCode === input.KEY_PRINTSCREEN && Number(pk) === input.KEY_PRINTSCREEN) {
                        let cpk = _unpressedKeysCallbacks[pk];
                        for (let i = 0; i < cpk.length; i++) {
                            cpk[i].callback.call(cpk[i].sender, _event);
                        }
                    }
                }
            }
            _currentlyPressedKeys[_event.keyCode] = false;
        };

        this.handleEvents = function () {
            for (let pk in _pressedKeysCallbacks) {
                if (_currentlyPressedKeys[pk]) {
                    let cpk = _pressedKeysCallbacks[pk];
                    for (let i = 0; i < cpk.length; i++) {
                        cpk[i].callback.call(cpk[i].sender, _event);
                    }
                }
            }
        };
    }
}

export {KeyboardHandler};
