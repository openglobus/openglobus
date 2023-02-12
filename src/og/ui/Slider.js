'use strict';

import { View } from './View.js';

const TEMPLATE =
    `<div class="og-slider">
      <div class="og-slider-label"></div>
      <div class="og-slider-panel">
        <div class="og-slider-progress"></div>      
        <div class="og-slider-pointer"></div>
      </div>
      <input/>
    </div>`;

class Slider extends View {
    constructor(options = {}) {
        super({
            template: TEMPLATE,
            ...options,
            eventList: ["change", ...(options.eventList || [])]
        });

        this._value = options.value || 0.0;
        this._min = options.min || 0.0;
        this._max = options.max || 1.0;
        //this._step = options.step || ((this._max - this._min) / 10.0);

        this.$label;
        this.$pointer;
        this.$progress;
        this.$input;
        this.$panel;
    }

    render(params) {
        super.render(params);
        this.$label = this.select(".og-slider-label");
        this.$pointer = this.select(".og-slider-pointer");
        this.$progress = this.select(".og-slider-progress");
        this.$panel = this.select(".og-slider-panel");
        this.$input = this.select("input");

        this._initEvents();

        return this;
    }

    set value(val) {
        if (val !== this._value && val >= this._min && val <= this._max) {
            this._value = val;
            this.$input.value = val;
            this._setOffset(val * this.$panel.clientWidth / (this._max - this._min));
            this._events.dispatch(this._events.change, val, this);
        }
    }

    get value() {
        return this._value;
    }

    _initEvents() {
        this._onMouseDown_ = this._onMouseDown.bind(this);
        this.$panel.addEventListener("mousedown", this._onMouseDown_);
    }

    _onMouseDown(e) {
        e = e || window.event;
        e.preventDefault();

        this._setOffset(e.offsetX);

        this._onMouseMove_ = this._onMouseMove.bind(this)
        this.$panel.addEventListener("mousemove", this._onMouseMove_);

        this._onMouseUp_ = this._onMouseUp.bind(this);
        document.addEventListener("mouseup", this._onMouseUp_);
    }

    _setOffset(x) {
        if (x >= 0 && x <= this.$panel.clientWidth) {
            this.$pointer.style.left = `${x}px`;
            this.$progress.style.width = `${x}px`;
        }
    }

    _onMouseMove(e) {
        e = e || window.event;
        e.preventDefault();
        this.value = e.offsetX * (this._max - this._min) / this.$panel.clientWidth;
    }

    _onMouseUp() {
        document.removeEventListener("mouseup", this._onMouseUp_);
        this._onMouseUp_ = undefined;

        this.$panel.removeEventListener("mousemove", this._onMouseMove_);
        this._onMouseMove_ = undefined;
    }
}

export { Slider }