'use strict';

import { Events } from '../Events';

class ButtonGroup {
    constructor(options) {
        this._events = new Events(["change", ...(options.eventList || [])]);

        this._buttons = options.buttons
        for (let i = 0; i < this._buttons.length; i++) {
            this._bindButton(this._buttons[i]);
        }
    }

    on(eventName, callback, sender) {
        this._events.on(eventName, callback, sender);
    }

    off(eventName, callback) {
        this._events.off(eventName, callback);
    }

    _bindButton(button) {
        button.on("change", this._onChange, this);
    }

    add(button) {
        this._buttons.push(button);
        this._bindButton(button);
    }

    _onChange(isActive, btn) {
        if (isActive) {
            btn.preventClick = true;
            for (let i = 0; i < this._buttons.length; i++) {
                let bi = this._buttons[i];
                if (!bi.isEqual(btn)) {
                    bi.setActive(false);
                    bi.preventClick = false;
                }
            }
            this._events.dispatch(this._events.change, btn);
        }
    }

    remove(button) {
        for (let i = 0; i < this._buttons.length; i++) {
            if (this._buttons[i].isEqual(button)) {
                this._buttons.splice(i);
                button.off("change", this._onChange);
                return;
            }
        }
    }
}

export { ButtonGroup }