'use strict'

import { stringTemplate } from '../utils/shared.js';
import { View } from './View.js';

const TEMPLATE =
    `<div class="og-button" title="{title}">
       <div class="og-button-icon">{icon}</div>
       <div class="og-button-text">{text}</div>
    </div>`;

class Button extends View {
    constructor(options = {}) {
        super({
            template: stringTemplate(TEMPLATE, {
                icon: options.icon || "",
                text: options.text || "",
                title: options.title || ""
            }),
            ...options,
            eventList: ["click", "mousedown", "mouseup", "touchstart", "touchend", "touchcancel", ...(options.eventList || [])]
        });

        this.name = options.name || "";

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

        this._onMouseDown_ = this._onMouseDown.bind(this);
        this.el.addEventListener("mousedown", this._onMouseDown_);

        this._onMouseUp_ = this._onMouseUp.bind(this);
        this.el.addEventListener("mouseup", this._onMouseUp_);

        this._onTouchStart_ = this._onTouchStart.bind(this);
        this.el.addEventListener("touchstart", this._onTouchStart_);

        this._onTouchEnd_ = this._onTouchEnd.bind(this);
        this.el.addEventListener("touchend", this._onTouchEnd_);

        this._onTouchCancel_ = this._onTouchCancel.bind(this);
        this.el.addEventListener("touchcancel", this._onTouchCancel_);

    }

    _onMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        this._events.dispatch(this._events.mousedown, this, e);
    }

    _onMouseUp(e) {
        e = e || window.event;
        e.preventDefault();
        this._events.dispatch(this._events.mouseup, this, e);
    }

    _onTouchStart(e) {
        e = e || window.event;
        e.preventDefault();
        this._events.dispatch(this._events.touchstart, this, e);
    }

    _onTouchEnd(e) {
        e = e || window.event;
        e.preventDefault();
        this._events.dispatch(this._events.touchend, this, e);
    }

    _onTouchCancel(e) {
        e = e || window.event;
        e.preventDefault();
        this._events.dispatch(this._events.touchcancel, this, e);
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

export { Button };
