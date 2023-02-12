'use strict'

import { View } from './View.js';
import { stringTemplate } from '../utils/shared.js';

const TEMPLATE =
    `<div class="og-button">
       <div class="og-button-icon">{icon}</div>
       <div class="og-button-text">{text}</div>
    </div>`;

class Button extends View {
    constructor(options = {}) {
        super({
            template: stringTemplate(TEMPLATE, {
                icon: options.icon || "",
                text: options.text || ""
            }),
            ...options,
            eventList: ["click", ...(options.eventList || [])]
        });

        this.$icon;
        this.$text;
    }

    render(params) {
        super.render(params);
        this.$icon = this.select(".og-button-icon");
        this.$text = this.select(".og-button-text");
        this.el.__og_button__ = this;
        this._initEvents();
        return this;
    }

    _initEvents() {
        this._onMouseClick_ = this._onMouseClick.bind(this);
        this.el.addEventListener("click", this._onMouseClick_);
    }

    _onMouseClick(e) {
        e = e || window.event;
        e.preventDefault();
        this._events.dispatch(this._events.click, this, e);
    }

    remove() {
        this._clearEvents();
        super.remove();
    }

    _clearEvents() {
        this.el.removeEventListener("click", this._onMouseClick_);
        this._onMouseClick_ = undefined;
    }
}

export { Button }