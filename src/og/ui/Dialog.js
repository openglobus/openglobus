'use strict'

import { View } from './View.js';
import { getDefault, stringTemplate } from '../utils/shared.js';
import { Button } from './Button.js';

const TEMPLATE = `<div class="og-ddialog" style="display:{display}; resize:{resize}; width: {width}px; height: {height}px">
       <div class="og-ddialog-header">
         <div class="og-ddialog-header__title">{title}</div>      
         <div class="og-ddialog-header__buttons"></div>      
        </div>
       <div class="og-ddialog-container"></div>
    </div>>`;

const CLOSE_ICON = `<svg className="svg-icon" style="width: 1em; height: 1em;vertical-align: middle;fill: currentColor; overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <path d="M777.856 280.192l-33.92-33.952-231.872 231.872-231.84-231.872-33.984 33.888 231.872 231.904-231.84 231.84 33.888 33.984 231.904-231.904 231.84 231.872 33.952-33.888-231.872-231.904z"/>
</svg>`

class Dialog extends View {
    constructor(options = {}) {
        super({
            template: stringTemplate(TEMPLATE, {
                title: options.title || "",
                display: getDefault(options.visibility, true) ? "flex" : "none",
                resize: getDefault(options.resizable, true) ? "both" : "none",
                width: options.width || 300,
                height: options.height || 200
            }),
            eventList: ["resize", "focus", "visibility", "startdrag", "enddrag", ...(options.eventList || [])], ...options
        });

        this.$header;
        this.$title;
        this.$constainer;
        this.$buttons;

        this._closeBtn;

        this.useHide = options.useHide || false;

        this._visibility = getDefault(options.visibility, true);

        if (options.appendTo) {
            this.appendTo(options.appendTo);
        }
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
            this._events.dispatch(this._events.visibility, true);
        }
    }

    hide() {
        if (this._visibility) {
            this._visibility = false;
            this.el.style.display = "none";
            this._events.dispatch(this._events.visibility, false);
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
            icon: CLOSE_ICON, className: "og-button-size__20"
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
        this.el.style.left = `${x}px`;
        this.el.style.top = `${y}px`;
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
            this._events.dispatch(this._events.startdrag, this);
        }
    }

    _clearDragging() {
        if (this.el.classList.contains("dragging")) {
            this._events.dispatch(this._events.enddrag, this);
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

export { Dialog }