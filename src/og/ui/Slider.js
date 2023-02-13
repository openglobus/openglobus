'use strict';

import { View } from './View.js';
import { stringTemplate } from '../utils/shared.js';
import { clamp } from '../math.js';

const TEMPLATE = `<div class="og-slider">
      <div class="og-slider-label">{label}</div>
      <div class="og-slider-panel">
        <div class="og-slider-progress"></div>      
        <div class="og-slider-pointer"></div>
      </div>
      <input type="number"/>
    </div>`;

class Slider extends View {
    constructor(options = {}) {
        super({
            template: stringTemplate(TEMPLATE, {
                label: options.label || ""
            }), ...options, eventList: ["change", ...(options.eventList || [])]
        });

        this._value = options.value || 0.0;
        this._min = options.min || 0.0;
        this._max = options.max || 1.0;
        //this._step = options.step || ((this._max - this._min) / 10.0);

        this._onResize_ = this._onResize.bind(this);
        this._resizeObserver = new ResizeObserver(this._onResize_);

        this.$label;
        this.$pointer;
        this.$progress;
        this.$input;
        this.$panel;
    }

    render(params) {
        super.render(params);
        this.$label = this.select(".og-slider-label");
        if (this.$label.innerHTML === "") {
            this.$label.style.display = "none";
        }
        this.$pointer = this.select(".og-slider-pointer");
        this.$progress = this.select(".og-slider-progress");
        this.$panel = this.select(".og-slider-panel");
        this.$input = this.select("input");


        this._resizeObserver.observe(this.el);

        this._initEvents();

        return this;
    }

    _onResize(e) {
        this._setOffset(this._value * this.$panel.clientWidth / (this._max - this._min));
    }

    set value(val) {
        if (val !== this._value) {
            this._value = clamp(val, this._min, this._max);
            this.$input.value = this._value.toString();
            this._setOffset(this._value * this.$panel.clientWidth / (this._max - this._min));
            this._events.dispatch(this._events.change, this._value, this);
        }
    }

    get value() {
        return this._value;
    }

    _initEvents() {
        this._onMouseDown_ = this._onMouseDown.bind(this);
        this.$panel.addEventListener("mousedown", this._onMouseDown_);

        this._onInput_ = this._onInput.bind(this);
        this.$input.addEventListener("input", this._onInput_);
    }

    _onInput(e) {
        e = e || window.event;
        e.preventDefault();
        e.stopPropagation();
        this.value = parseFloat(e.target.value);
    }

    _onMouseDown(e) {
        e = e || window.event;
        e.preventDefault();

        this._startPosX = e.clientX;

        this._setOffset(e.offsetX);

        this._onMouseMove_ = this._onMouseMove.bind(this)
        document.addEventListener("mousemove", this._onMouseMove_);

        this._onMouseUp_ = this._onMouseUp.bind(this);
        document.addEventListener("mouseup", this._onMouseUp_);
    }

    _setOffset(x) {
        if (x >= 0 && x <= this.$panel.clientWidth) {
            this.$pointer.style.left = this.$progress.style.width = `${x * 100 / this.$panel.clientWidth}%`;
        }
    }

    _onMouseMove(e) {
        e = e || window.event;
        e.preventDefault();
        e.stopPropagation();

        let rect = this.$panel.getBoundingClientRect();
        let clientX = clamp(e.clientX, rect.left, rect.right);
        let dx = this._startPosX - clientX;
        this._startPosX = clientX;
        this.value = (this.$pointer.offsetLeft - dx) * (this._max - this._min) / this.$panel.clientWidth;
    }

    _onMouseUp() {
        document.removeEventListener("mouseup", this._onMouseUp_);
        this._onMouseUp_ = undefined;

        document.removeEventListener("mousemove", this._onMouseMove_);
        this._onMouseMove_ = undefined;
    }
}

export {
    Slider
}