import {getDefault, stringTemplate} from '../utils/shared';
import {Button} from './Button';
import {CLOSE_ICON} from './icons.js';
import {IViewParams, View, ViewEventsList} from './View';
import {EventsHandler} from "../Events";

export interface IDialogParams extends IViewParams {
    title?: string;
    visible?: boolean;
    resizable?: boolean;
    width?: number;
    height?: number;
    left?: number;
    top?: number;
    minHeight?: number;
    maxHeight?: number;
    minWidth?: number;
    maxWidth?: number;
    useHide?: boolean;
}

type DialogEventsList = ["resize", "focus", "visibility", "dragstart", "dragend"];

const DIALOG_EVENTS: DialogEventsList = ["resize", "focus", "visibility", "dragstart", "dragend"];

const TEMPLATE = `<div class="og-ddialog" 
        style="display:{display}; resize:{resize}; width: {width}px; {height}; top: {top}px; left: {left}px; min-height: {minHeight}; max-height: {maxHeight}; min-width: {minWidth}; max-width: {maxWidth};">
       <div class="og-ddialog-header">
         <div class="og-ddialog-header__title">{title}</div>      
         <div class="og-ddialog-header__buttons"></div>      
        </div>
       <div class="og-ddialog-container"></div>
    </div>>`;

class Dialog<M> extends View<M> {

    static __zIndex__: number = 0;

    public override events: EventsHandler<DialogEventsList> & EventsHandler<ViewEventsList>;

    public $header: HTMLElement | null;
    public $title: HTMLElement | null;
    public $container: HTMLElement | null;
    public $buttons: HTMLElement | null;

    public useHide: boolean;

    protected _startPosX: number;
    protected _startPosY: number;

    protected _closeBtn: Button;

    protected _visibility: boolean;

    constructor(options: IDialogParams = {}) {
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
            ...options
        });

        this.events = this.events.registerNames(DIALOG_EVENTS);

        this._startPosX = 0;
        this._startPosY = 0;

        this.$header = null;
        this.$title = null;
        this.$container = null;
        this.$buttons = null;

        this._closeBtn = new Button({
            icon: CLOSE_ICON,
            classList: ["og-button-size__20"]
        });

        this.useHide = options.useHide || false;

        this._visibility = getDefault(options.visible, true);
    }

    public setContainer(htmlStr: string) {
        this.$container!.innerHTML = htmlStr;
    }

    public get container(): HTMLElement | null {
        return this.$container;
    }

    public get width(): number {
        return this.el ? parseFloat(this.el.style.width) : 0;
    }

    public get height(): number {
        return this.el ? parseFloat(this.el.style.height) : 0;
    }

    public bringToFront() {
        this.el!.style.zIndex = String(Dialog.__zIndex__++);
    }

    public override render(params: any): this {
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

    public show() {
        if (!this._visibility) {
            this._visibility = true;
            this.el!.style.display = "flex";
            this.bringToFront();
            this.events.dispatch(this.events.visibility, true, this);
        }
    }

    public hide() {
        if (this._visibility) {
            this._visibility = false;
            this.el!.style.display = "none";
            this.events.dispatch(this.events.visibility, false, this);
        }
    }

    public close() {
        if (this.useHide) {
            this.hide();
        } else {
            this.remove();
        }
    }

    public setVisibility(visibility: boolean) {
        if (visibility) {
            this.show();
        } else {
            this.hide();
        }
    }

    protected _initButtons() {
        this._closeBtn.events.on("click", this._onCloseBtnClick);
        this._closeBtn.appendTo(this.$buttons!);
    }

    protected _initEvents() {
        this.$header!.addEventListener("mousedown", this._onMouseDown);
        this.el!.addEventListener("mousedown", this._onMouseDownAll);
    }

    protected _onCloseBtnClick = () => {
        this.close();
    }

    protected _onMouseDownAll = () => {
        this.bringToFront();
    }

    protected _onMouseDown = (e: MouseEvent) => {
        //@ts-ignore
        e = e || window.event;
        e.preventDefault();

        this._startDragging();

        this._startPosX = e.clientX;
        this._startPosY = e.clientY;

        document.addEventListener("mousemove", this._onMouseMove);
        document.addEventListener("mouseup", this._onMouseUp);
    }

    public setPosition(x?: number, y?: number) {
        if (x != undefined) {
            this.el!.style.left = `${x}px`;
        }
        if (y != undefined) {
            this.el!.style.top = `${y}px`;
        }
    }

    protected _onMouseMove(e: MouseEvent) {
        //@ts-ignore
        e = e || window.event;
        e.preventDefault();
        let dx = this._startPosX - e.clientX;
        let dy = this._startPosY - e.clientY;
        this._startPosX = e.clientX;
        this._startPosY = e.clientY;
        this.setPosition(this.el!.offsetLeft - dx, this.el!.offsetTop - dy);
    }

    protected _startDragging() {
        if (!this.el!.classList.contains("dragging")) {
            this.el!.classList.add("dragging");
            this.events.dispatch(this.events.dragstart, this);
        }
    }

    protected _clearDragging() {
        if (this.el!.classList.contains("dragging")) {
            this.events.dispatch(this.events.dragend, this);
            this.el!.classList.remove("dragging");
        }
    }

    protected _onMouseUp = () => {
        this._clearDragging();
        document.removeEventListener("mouseup", this._onMouseUp);
        document.removeEventListener("mousemove", this._onMouseMove);
    }

    public override remove() {
        this._clearDragging();
        this._clearEvents();
        super.remove();
    }

    protected _clearEvents() {
        this._closeBtn.events.off("click", this._onCloseBtnClick);

        document.removeEventListener("mouseup", this._onMouseUp);
        document.removeEventListener("mousemove", this._onMouseMove);

        this.$header!.removeEventListener("mousedown", this._onMouseDown);
        this.el!.removeEventListener("mousedown", this._onMouseDownAll);
    }
}

export {Dialog};
