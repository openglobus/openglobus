import {input} from './input';
import {stamp} from "../utils/shared";
import {EventCallback, EventCallbackStamp} from "../Events";

const STAMP_SPACER = "_";

interface ICallbackHandler {
    callback: EventCallbackStamp,
    sender: any,
    priority: number
}

const _sortByPriority = function (a: ICallbackHandler, b: ICallbackHandler): number {
    return Number(a.priority < b.priority);
};

class KeyboardHandler {
    protected _currentlyPressedKeys: Record<number, boolean>;
    protected _pressedKeysCallbacks: Record<number, ICallbackHandler[]>;
    protected _unpressedKeysCallbacks: Record<number, ICallbackHandler[]>;
    protected _charkeysCallbacks: Record<number, ICallbackHandler[]>;
    protected _anykeyCallback: any;
    protected _event: KeyboardEvent | null;
    protected _active: boolean;
    protected _stampCache: Record<string, number>;

    constructor() {
        this._currentlyPressedKeys = {};
        this._pressedKeysCallbacks = {};
        this._unpressedKeysCallbacks = {};
        this._charkeysCallbacks = {};
        this._anykeyCallback = null;
        this._event = null;
        this._active = true;
        this._stampCache = {};

        document.onkeydown = (event: KeyboardEvent) => {
            this._event = event;
            this._active && this.handleKeyDown();
        };

        document.onkeyup = (event: KeyboardEvent) => {
            this._event = event;
            this._active && this.handleKeyUp();
        };
    }

    public getcurrentlyPressedKeys(): Record<number, boolean> {
        return this._currentlyPressedKeys;
    }

    public getPressedKeysCallbacks() {
        return this._pressedKeysCallbacks;
    }

    public getUnpressedKeysCallbacks() {
        return this._unpressedKeysCallbacks;
    }

    public getCharkeysCallbacks() {
        return this._charkeysCallbacks;
    }

    public removeEvent(event: string, keyCode: number, callback: EventCallback) {
        let st = this._getStamp(event, keyCode, (callback as EventCallbackStamp)._openglobus_id!);
        if ((callback as EventCallbackStamp)._openglobus_id && this._stampCache[st]) {
            //this._stampCache[st] = null;
            delete this._stampCache[st];

            if (event === "keypress") {
                this._removeCallback(this._pressedKeysCallbacks[keyCode], callback);
            } else if (event === "keyfree") {
                this._removeCallback(this._unpressedKeysCallbacks[keyCode], callback);
            } else if (event === "charkeypress") {
                this._removeCallback(this._charkeysCallbacks[keyCode], callback);
            }
        }
    }

    protected _removeCallback(handlers: ICallbackHandler[], callback: EventCallbackStamp) {
        for (let i = 0; i < handlers.length; i++) {
            if (handlers[i].callback._openglobus_id === callback._openglobus_id) {
                handlers.splice(i, 1);
            }
        }
    }

    protected _getStamp(name: string, keyCode: number, ogid: number) {
        return `${name}${STAMP_SPACER}${keyCode}${STAMP_SPACER}${ogid}`;
    }

    protected _stamp(name: string, keyCode: number, obj: any) {
        const ogid = stamp(obj);
        const st = this._getStamp(name, keyCode, ogid);
        if (!this._stampCache[st]) {
            this._stampCache[st] = ogid;
            return true;
        }
        return false;
    }

    public setActivity(activity: boolean) {
        this._active = activity;
    }

    public releaseKeys() {
        this._currentlyPressedKeys = {};
    }

    public addEvent(event: string, keyCode: number, callback: EventCallback, sender?: any, priority?: number) {

        // Event is already bound with the callback
        if (!this._stamp(event, keyCode, callback)) return;

        if (priority === undefined) {
            priority = 1600;
        }
        switch (event) {
            case "keyfree":
                if (!this._unpressedKeysCallbacks[keyCode]) {
                    this._unpressedKeysCallbacks[keyCode] = [];
                }
                this._unpressedKeysCallbacks[keyCode].push({callback: callback, sender: sender, priority: priority});
                this._unpressedKeysCallbacks[keyCode].sort(_sortByPriority);
                break;

            case "keypress":
                if (keyCode == null) {
                    this._anykeyCallback = {callback: callback, sender: sender || this};
                } else {
                    if (!this._pressedKeysCallbacks[keyCode]) {
                        this._pressedKeysCallbacks[keyCode] = [];
                    }
                    this._pressedKeysCallbacks[keyCode].push({callback: callback, sender: sender, priority: priority});
                    this._pressedKeysCallbacks[keyCode].sort(_sortByPriority);
                }
                break;

            case "charkeypress":
                if (!this._charkeysCallbacks[keyCode]) {
                    this._charkeysCallbacks[keyCode] = [];
                }
                this._charkeysCallbacks[keyCode].push({callback: callback, sender: sender, priority: priority});
                this._charkeysCallbacks[keyCode].sort(_sortByPriority);
                break;
        }
    }

    public isKeyPressed(keyCode: number) {
        return this._currentlyPressedKeys[keyCode];
    }

    public handleKeyDown() {
        // If you want to get a key code just uncomment and check console
        //console.log(this._event!.keyCode);
        this._anykeyCallback && this._anykeyCallback.callback.call(this._anykeyCallback.sender, this._event);
        this._currentlyPressedKeys[this._event!.keyCode] = true;
        for (let ch in this._charkeysCallbacks) {
            if (String.fromCharCode(this._event!.keyCode) === String.fromCharCode(Number(ch))) {
                let ccl = this._charkeysCallbacks[ch];
                for (let i = 0; i < ccl.length; i++) {
                    (ccl[i].callback as Function).call(ccl[i].sender, this._event);
                }
            }
        }

        if (this._event!.keyCode == input.KEY_ALT || this._event!.keyCode == input.KEY_SHIFT) {
            this._event!.preventDefault();
        }
    }

    public handleKeyUp() {
        if (this._currentlyPressedKeys[this._event!.keyCode] || this._event!.keyCode === input.KEY_PRINTSCREEN) {
            for (let pk in this._unpressedKeysCallbacks) {
                if (this._currentlyPressedKeys[pk] || this._event!.keyCode === input.KEY_PRINTSCREEN && Number(pk) === input.KEY_PRINTSCREEN) {
                    let cpk = this._unpressedKeysCallbacks[pk];
                    for (let i = 0; i < cpk.length; i++) {
                        (cpk[i].callback as Function).call(cpk[i].sender, this._event);
                    }
                }
            }
        }
        this._currentlyPressedKeys[this._event!.keyCode] = false;
    }

    public handleEvents() {
        for (let pk in this._pressedKeysCallbacks) {
            if (this._currentlyPressedKeys[pk]) {
                let cpk = this._pressedKeysCallbacks[pk];
                for (let i = 0; i < cpk.length; i++) {
                    (cpk[i].callback as Function).call(cpk[i].sender, this._event);
                }
            }
        }
    }
}

export {KeyboardHandler};
