import {stringTemplate} from '../utils/shared';
import {IViewParams, View, ViewEventsList} from './View';
import {EventsHandler} from "../Events";

const TEMPLATE =
    `<div class="og-button" title="{title}">
       <div class="og-button-icon">{icon}</div>
       <div class="og-button-text">{text}</div>
    </div>`;

interface HTMLElementExt extends HTMLElement {
    __og_button__: Button;
}

export type ButtonEventsList = ["click", "mousedown", "mouseup", "touchstart", "touchend", "touchcancel"];

const BUTTON_EVENTS: ButtonEventsList = ["click", "mousedown", "mouseup", "touchstart", "touchend", "touchcancel"];

export interface IButtonParams extends IViewParams {
    icon?: string;
    text?: string;
    title?: string;
    name?: string;
}

class Button extends View<null> {

    public override events: EventsHandler<ButtonEventsList> & EventsHandler<ViewEventsList>;

    public override el: HTMLElementExt | null;

    public name: string;
    public $icon: HTMLElement | null;
    public $text: HTMLElement | null;

    constructor(options: IButtonParams = {}) {
        super({
            template: stringTemplate(TEMPLATE, {
                icon: options.icon || "",
                text: options.text || "",
                title: options.title || ""
            }),
            ...options
        });

        //@ts-ignore
        this.events = this.events.registerNames(BUTTON_EVENTS);

        this.el = null;

        this.name = options.name || "";

        this.$icon = null;
        this.$text = null;
    }

    public override render(params: any): this {
        super.render(params);
        this.$icon = this.select(".og-button-icon");
        this.$text = this.select(".og-button-text");
        this.el!.__og_button__ = this;
        this._initEvents();
        return this;
    }

    protected _initEvents() {
        if (this.el) {
            this.el.addEventListener("click", this._onMouseClick);
            this.el.addEventListener("mousedown", this._onMouseDown);
            this.el.addEventListener("mouseup", this._onMouseUp);
            this.el.addEventListener("touchstart", this._onTouchStart);
            this.el.addEventListener("touchend", this._onTouchEnd);
            this.el.addEventListener("touchcancel", this._onTouchCancel);
        }
    }

    protected _onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        this.events.dispatch(this.events.mousedown, this, e);
    }

    protected _onMouseUp = (e: MouseEvent) => {
        e.preventDefault();
        this.events.dispatch(this.events.mouseup, this, e);
    }

    protected _onTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        this.events.dispatch(this.events.touchstart, this, e);
    }

    protected _onTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        this.events.dispatch(this.events.touchend, this, e);
    }

    protected _onTouchCancel = (e: TouchEvent) => {
        e.preventDefault();
        this.events.dispatch(this.events.touchcancel, this, e);
    }

    protected _mouseClickHandler(e: MouseEvent) {
        e.preventDefault();
        this.events.dispatch(this.events.click, this, e);
    }

    protected _onMouseClick = (e: MouseEvent) => {
        this._mouseClickHandler(e)
    }

    public override remove() {
        this._clearEvents();
        super.remove();
    }

    protected _clearEvents() {
        this.el && this.el.removeEventListener("click", this._onMouseClick);
    }
}

export {Button};
