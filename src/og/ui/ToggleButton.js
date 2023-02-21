'use strict';

import { Button } from './Button.js';

class ToggleButton extends Button {
    constructor(options) {
        super({
            ...options,
            eventList: ["change", ...(options.eventList || [])]
        });

        this._isActive = options.isActive || false;
    }

    setActive(isActive, stopPropagation) {
        if (isActive !== this._isActive) {
            this._isActive = isActive;
            this._toggle();
            if (!stopPropagation) {
                this._events.dispatch(this._events.change, isActive, this);
            }
        }
    }

    _toggle() {
        this.el.classList.toggle("og-button__active");
    }

    get isActive() {
        return this._isActive;
    }

    render(params) {
        super.render(params);
        if (this._isActive) {
            this._toggle();
        }
        return this;
    }

    _onMouseClick(e) {
        super._onMouseClick(e);
        this.setActive(!this.isActive);
    }
}

export { ToggleButton }