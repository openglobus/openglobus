'use strict';

import { input } from './input.js';
import { stamp } from "../utils/shared";

const STAMP_SPACER = "_";

class KeyboardHandler {

    constructor() {
        let _currentlyPressedKeys = {};
        let _pressedKeysCallbacks = {};
        let _unpressedKeysCallbacks = {};
        let _charkeysCallbacks = {};

        let _that = this;
        let _anykeyCallback = null;
        let _event = null;

        let _active = true;

        let _stampCache = {};

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

        var _sortByPriority = function (a, b) {
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

        this.removeEvent = function (event, keyCode, callback) {
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

        this._removeCallback = function (handlers, callback) {
            for (let i = 0; i < handlers.length; i++) {
                if (handlers[i].callback._openglobus_id === callback._openglobus_id) {
                    handlers.splice(i, 1);
                }
            }
        };

        this._getStamp = function (name, keyCode, ogid) {
            return `${name}${STAMP_SPACER}${keyCode}${STAMP_SPACER}${ogid}`;
        };

        this._stamp = function (name, keyCode, obj) {
            let ogid = stamp(obj);

            let st = this._getStamp(name, keyCode, ogid);

            if (!_stampCache[st]) {
                _stampCache[st] = ogid;
                return true;
            }

            return false;
        };

        this.setActivity = function (activity) {
            _active = activity;
        };

        this.releaseKeys = function () {
            _currentlyPressedKeys = {};
        };

        this.addEvent = function (event, keyCode, callback, sender, priority) {

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
                    _unpressedKeysCallbacks[keyCode].push({ callback: callback, sender: sender, priority: priority });
                    _unpressedKeysCallbacks[keyCode].sort(_sortByPriority);
                    break;

                case "keypress":
                    if (keyCode == null) {
                        _anykeyCallback = { callback: callback, sender: sender || _that };
                    } else {
                        if (!_pressedKeysCallbacks[keyCode]) {
                            _pressedKeysCallbacks[keyCode] = [];
                        }
                        _pressedKeysCallbacks[keyCode].push({ callback: callback, sender: sender, priority: priority });
                        _pressedKeysCallbacks[keyCode].sort(_sortByPriority);
                    }
                    break;

                case "charkeypress":
                    if (!_charkeysCallbacks[keyCode]) {
                        _charkeysCallbacks[keyCode] = [];
                    }
                    _charkeysCallbacks[keyCode].push({ callback: callback, sender: sender, priority: priority });
                    _charkeysCallbacks[keyCode].sort(_sortByPriority);
                    break;
            }
        };

        this.isKeyPressed = function (keyCode) {
            return _currentlyPressedKeys[keyCode];
        };

        this.handleKeyDown = function () {
            _anykeyCallback && _anykeyCallback.callback.call(_anykeyCallback.sender, _event);
            _currentlyPressedKeys[_event.keyCode] = true;
            for (let ch in _charkeysCallbacks) {
                if (String.fromCharCode(_event.keyCode) == String.fromCharCode(ch)) {
                    var ccl = _charkeysCallbacks[ch];
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
                    if (_currentlyPressedKeys[pk] || _event.keyCode === input.KEY_PRINTSCREEN && pk == input.KEY_PRINTSCREEN) {
                        var cpk = _unpressedKeysCallbacks[pk];
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

export { KeyboardHandler };
