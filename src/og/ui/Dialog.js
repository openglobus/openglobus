'use strict'

import { getDefault, stringTemplate } from '../utils/shared';
import { Button } from './Button.js';
import { CLOSE_ICON } from './icons.js';
import { View } from './View.js';

const TEMPLATE = `<div class="og-ddialog" 
        style="display:{display}; resize:{resize}; width: {width}px; {height}; top: {top}px; left: {left}px; min-height: {minHeight}; max-height: {maxHeight}; min-width: {minWidth}; max-width: {maxWidth};">
       <div class="og-ddialog-header">
         <div class="og-ddialog-header__title">{title}</div>      
         <div class="og-ddialog-header__buttons"></div>      
        </div>
       <div class="og-ddialog-container"></div>
    </div>>`;

class Dialog extends View {
    constructor(options = {}) {
        super({
            template: stringTemplate(TEMPLATE, {
                title: options.title || "",
                display: getDefault(options.visible, true) ? "flex" : "none",
                resize: getDefault(options.resizable, true) ? "both" : "none",
                width: options.width || 300,
                height: options.height ? `height:${options.height || 200}` : "",
                left: options.left || 0,
                top: options.top || 0,
                minHeight: options.minHeight ? `${options.minHeight}px` : 'unset',
                maxHeight: options.maxHeight ? `${options.maxHeight}px` : 'unset',
                minWidth: options.minWidth ? `${options.minWidth}px` : 'unset',
                maxWidth: options.maxWidth ? `${options.maxWidth}px` : 'unset',
            }),
            ...options,
            eventList: ["resize", "focus", "visibility", "dragstart", "dragend", ...(options.eventList || [])],
        });

        this._startPosX = 0;
        this._startPosY = 0;

        this.$header;
        this.$title;
        this.$constainer;
        this.$buttons;

        this._closeBtn;

        this.useHide = options.useHide || false;

        this._visibility = getDefault(options.visible, true);
    }

    static set __zIndex(n) {
        this.__zIndex__ = n;
    }

    static get __zIndex() {
        if (!this.__zIndex__ && this.__zIndex__ !== 0) {
            this.__zIndex__ = 0;
        }
        return this.__zIndex__;
    }

    setContainer(htmlStr) {
        this.$constainer.innerHTML = htmlStr;
    }

    get container() {
        return this.$container;
    }

    get width() {
        return this.el ? parseFloat(this.el.style.width) : 0;
    }

    get height() {
        return this.el ? parseFloat(this.el.style.height) : 0;
    }

    bringToFront() {
        this.el.style.zIndex = Dialog.__zIndex++;
    }

    render(params) {
        super.render(params);
        this.bringToFront();
        this.$header = this.select(".og-ddialog-header");
        this.$title = this.select(".og-ddialog-header__title");
        this.$container = this.select(".og-ddialog-container");
        this.$buttons = this.select(".og-ddialog-header__buttons");
        this._initEvents();
        this._initButtons();
        return this;
    }

    show() {
        if (!this._visibility) {
            this._visibility = true;
            this.el.style.display = "flex";
            this.bringToFront();
            this._events.dispatch(this._events.visibility, true, this);
        }
    }

    hide() {
        if (this._visibility) {
            this._visibility = false;
            this.el.style.display = "none";
            this._events.dispatch(this._events.visibility, false, this);
        }
    }

    close() {
        if (this.useHide) {
            this.hide();
        } else {
            this.remove();
        }
    }

    setVisibility(visibility) {
        if (visibility) {
            this.show();
        } else {
            this.hide();
        }
    }

    _initButtons() {
        this._closeBtn = new Button({
            icon: CLOSE_ICON,
            classList: ["og-button-size__20"]
        });

        this._onCloseBtnClick_ = this._onCloseBtnClick.bind(this);
        this._closeBtn.on("click", this._onCloseBtnClick_);

        this._closeBtn.appendTo(this.$buttons);
    }

    _initEvents() {
        this._onMouseDown_ = this._onMouseDown.bind(this);
        this.$header.addEventListener("mousedown", this._onMouseDown_);

        this._onMouseDownAll_ = this._onMouseDownAll.bind(this);
        this.el.addEventListener("mousedown", this._onMouseDownAll_);
    }

    _onCloseBtnClick(e) {
        this.close();
    }

    _onMouseDownAll() {
        this.bringToFront();
    }

    _onMouseDown(e) {
        e = e || window.event;
        e.preventDefault();

        this._startDragging();

        this._startPosX = e.clientX;
        this._startPosY = e.clientY;

        this._onMouseMove_ = this._onMouseMove.bind(this)
        document.addEventListener("mousemove", this._onMouseMove_);

        this._onMouseUp_ = this._onMouseUp.bind(this);
        document.addEventListener("mouseup", this._onMouseUp_);
    }

    setPosition(x, y) {
        if (x != undefined) {
            this.el.style.left = `${x}px`;
        }
        if (y != undefined) {
            this.el.style.top = `${y}px`;
        }
    }

    _onMouseMove(e) {
        e = e || window.event;
        e.preventDefault();
        let dx = this._startPosX - e.clientX;
        let dy = this._startPosY - e.clientY;
        this._startPosX = e.clientX;
        this._startPosY = e.clientY;
        this.setPosition(this.el.offsetLeft - dx, this.el.offsetTop - dy);
    }

    _startDragging() {
        if (!this.el.classList.contains("dragging")) {
            this.el.classList.add("dragging");
            this._events.dispatch(this._events.dragstart, this);
        }
    }

    _clearDragging() {
        if (this.el.classList.contains("dragging")) {
            this._events.dispatch(this._events.dragend, this);
            this.el.classList.remove("dragging");
        }
    }

    _onMouseUp() {
        this._clearDragging();

        document.removeEventListener("mouseup", this._onMouseUp_);
        this._onMouseUp_ = undefined;

        document.removeEventListener("mousemove", this._onMouseMove_);
        this._onMouseMove_ = undefined;
    }

    remove() {
        this._clearDragging();
        this._clearEvents();
        super.remove();
    }

    _clearEvents() {
        this._closeBtn.off("click", this._onCloseBtnClick_);
        this._onCloseBtnClick_ = undefined;

        document.removeEventListener("mouseup", this._onMouseUp_);
        this._onMouseUp_ = undefined;

        document.removeEventListener("mousemove", this._onMouseMove_);
        this._onMouseMove_ = undefined;

        this.$header.removeEventListener("mousedown", this._onMouseDown_);
        this._onMouseDown_ = undefined;

        this.el.removeEventListener("mousedown", this._onMouseDownAll_);
        this._onMouseDownAll_ = undefined;
    }
}

export { Dialog };
