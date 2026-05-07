import { stringTemplate } from "../utils/shared";
import { View } from "./View";
import type { IViewParams, ViewEventsList } from "./View";
import type { EventsHandler } from "../Events";

const TEMPLATE = `<div class="og-button" title="{title}">
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
    protected _skipMouseClickOnce: boolean;

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
        this._skipMouseClickOnce = false;
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
            this.el.addEventListener("click", this._onClick);
            this.el.addEventListener("mousedown", this._onMouseDown);
            this.el.addEventListener("mouseup", this._onMouseUp);
            this.el.addEventListener("pointerdown", this._onPointerDown);
            this.el.addEventListener("pointerup", this._onPointerUp);
            this.el.addEventListener("pointercancel", this._onPointerCancel);
        }
    }

    protected _onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        this.events.dispatch(this.events.mousedown, this, e);
    };

    protected _onMouseUp = (e: MouseEvent) => {
        e.preventDefault();
        this.events.dispatch(this.events.mouseup, this, e);
    };

    protected _onPointerDown = (e: PointerEvent) => {
        if (e.pointerType !== "touch") {
            return;
        }
        e.preventDefault();
        this.el?.setPointerCapture(e.pointerId);
        this.events.dispatch(this.events.touchstart, this, e);
    };

    protected _onPointerUp = (e: PointerEvent) => {
        if (e.pointerType !== "touch") {
            return;
        }
        e.preventDefault();
        if (this.el?.hasPointerCapture(e.pointerId)) {
            this.el.releasePointerCapture(e.pointerId);
        }
        this.events.dispatch(this.events.touchend, this, e);
        this._skipMouseClickOnce = true;
        this._onMouseClick(e as unknown as MouseEvent);
    };

    protected _onPointerCancel = (e: PointerEvent) => {
        if (e.pointerType !== "touch") {
            return;
        }
        e.preventDefault();
        if (this.el?.hasPointerCapture(e.pointerId)) {
            this.el.releasePointerCapture(e.pointerId);
        }
        this.events.dispatch(this.events.touchcancel, this, e);
    };

    protected _mouseClickHandler(e: MouseEvent) {
        e.preventDefault();
        this.events.dispatch(this.events.click, this, e);
    }

    protected _onClick = (e: MouseEvent) => {
        if (this._skipMouseClickOnce) {
            this._skipMouseClickOnce = false;
            e.preventDefault();
            return;
        }
        this._onMouseClick(e);
    };

    protected _onMouseClick = (e: MouseEvent) => {
        this._mouseClickHandler(e);
    };

    public override remove() {
        this._clearEvents();
        super.remove();
    }

    protected _clearEvents() {
        if (this.el) {
            this.el.removeEventListener("click", this._onClick);
            this.el.removeEventListener("mousedown", this._onMouseDown);
            this.el.removeEventListener("mouseup", this._onMouseUp);
            this.el.removeEventListener("pointerdown", this._onPointerDown);
            this.el.removeEventListener("pointerup", this._onPointerUp);
            this.el.removeEventListener("pointercancel", this._onPointerCancel);
        }
    }
}

export { Button };
