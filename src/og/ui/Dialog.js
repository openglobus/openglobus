'use strict'

import { View } from './View.js';

const TEMPLATE =
    `<div class="og-ddialog">
       <div class="og-ddialog-header">
         <div class="og-ddialog-header__title"></div>      
        </div>
       <div class="og-ddialog-container"></div>
    </div>>
`

class Dialog extends View {
    constructor(options) {
        super({
            template: TEMPLATE,
            ...options
        });

        this.$header;
        this.$title;
        this.$constainer;
    }

    render(params) {
        super.render(params);
        this.$header = this.select(".og-ddialog-header");
        this.$title = this.select(".og-ddialog-header__title");
        this.$container = this.select(".og-ddialog-container");
        this._initEvents();
        return this;
    }

    _initEvents() {
        this.$header.addEventListener("mousedown", this._onMouseDown.bind(this));
    }

    _onMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        this._startPosX = e.clientX;
        this._startPosY = e.clientY;

        this._onMouseMove_ = this._onMouseMove.bind(this)
        document.addEventListener("mousemove", this._onMouseMove_);

        this._onMouseUp_ = this._onMouseUp.bind(this);
        document.addEventListener("mouseup", this._onMouseUp_);
    }

    _onMouseMove(e) {
        e = e || window.event;
        e.preventDefault();
        let dx = this._startPosX - e.clientX;
        let dy = this._startPosY - e.clientY;
        this._startPosX = e.clientX;
        this._startPosY = e.clientY;
        this.el.style.left = `${this.el.offsetLeft - dx}px`;
        this.el.style.top = `${this.el.offsetTop - dy}px`;
    }

    _onMouseUp() {
        document.removeEventListener("mouseup", this._onMouseUp_);
        document.removeEventListener("mousemove", this._onMouseMove_);
    }
}

export { Dialog }