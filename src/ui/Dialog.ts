import { getDefault, stringTemplate } from "../utils/shared";
import { Button } from "./Button";
import { CLOSE_ICON } from "./icons";
import { View } from "./View";
import type { IViewParams, ViewEventsList } from "./View";
import type { EventsHandler } from "../Events";

export interface IDialogParams extends IViewParams {
    title?: string;
    visible?: boolean;
    resizable?: boolean;
    width?: number;
    height?: number;
    left?: number;
    right?: number;
    top?: number;
    minHeight?: number;
    maxHeight?: number;
    minWidth?: number;
    maxWidth?: number;
    useHide?: boolean; // Using hide instead of remove when close
}

export type DialogEventsList = ["resize", "focus", "visibility", "dragstart", "dragend"];

const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 200;

const DIALOG_EVENTS: DialogEventsList = ["resize", "focus", "visibility", "dragstart", "dragend"];

const TEMPLATE = `<div class="og-ddialog" 
        style="display:{display}; resize:{resize}; width: {width}px; {height}; top: {top}px; left: {left}px; min-height: {minHeight}; max-height: {maxHeight}; min-width: {minWidth}; max-width: {maxWidth};">
       <div class="og-ddialog-header">
         <div class="og-ddialog-header__title">{title}</div>      
         <div class="og-ddialog-header__buttons"></div>      
        </div>
       <div class="og-ddialog-container"></div>
       <div class="og-ddialog-resize-handle" style="display:{resizeHandleDisplay};"></div>
    </div>`;

class Dialog<M> extends View<M> {
    static __zIndex__: number = 0;

    public override events: EventsHandler<DialogEventsList> & EventsHandler<ViewEventsList>;

    public $header: HTMLElement | null;
    public $title: HTMLElement | null;
    public $container: HTMLElement | null;
    public $buttons: HTMLElement | null;
    public $resizeHandle: HTMLElement | null;

    public useHide: boolean;

    protected _startPosX: number;
    protected _startPosY: number;
    protected _startWidth: number;
    protected _startHeight: number;

    protected _closeBtn: Button;

    protected _visibility: boolean;

    protected _right: number | null;

    protected _width: number;
    protected _height: number;
    protected _firstOpenPositioned: boolean;
    protected _resizable: boolean;
    protected _isResizing: boolean;
    protected _touchDragPointerId: number | null;
    protected _touchResizePointerId: number | null;

    constructor(options: IDialogParams = {}) {
        super({
            template: stringTemplate(TEMPLATE, {
                title: options.title || "",
                display: getDefault(options.visible, true) ? "flex" : "none",
                resize: getDefault(options.resizable, true) ? "both" : "none",
                width: options.width || DEFAULT_WIDTH,
                height: options.height ? `height: ${options.height || DEFAULT_HEIGHT}px` : "",
                left: options.left || 0,
                top: options.top || 0,
                minHeight: options.minHeight ? `${options.minHeight}px` : "unset",
                maxHeight: options.maxHeight ? `${options.maxHeight}px` : "unset",
                minWidth: options.minWidth ? `${options.minWidth}px` : "unset",
                maxWidth: options.maxWidth ? `${options.maxWidth}px` : "unset",
                resizeHandleDisplay: getDefault(options.resizable, true) ? "block" : "none"
            }),
            ...options
        });

        //@ts-ignore
        this.events = this.events.registerNames(DIALOG_EVENTS);

        this._width = options.width || DEFAULT_WIDTH;
        this._height = options.height || DEFAULT_HEIGHT;

        this._startPosX = 0;
        this._startPosY = 0;
        this._startWidth = 0;
        this._startHeight = 0;

        this.$header = null;
        this.$title = null;
        this.$container = null;
        this.$buttons = null;
        this.$resizeHandle = null;

        this._closeBtn = new Button({
            icon: CLOSE_ICON,
            classList: ["og-button-size__20"]
        });

        this.useHide = options.useHide || false;

        this._visibility = getDefault(options.visible, true);

        this._right = options.right != undefined ? options.right : null;
        this._firstOpenPositioned = false;
        this._resizable = getDefault(options.resizable, true);
        this._isResizing = false;
        this._touchDragPointerId = null;
        this._touchResizePointerId = null;
    }

    public setContainer(htmlStr: string) {
        this.$container!.innerHTML = htmlStr;
    }

    public get container(): HTMLElement | null {
        return this.$container;
    }

    public get width(): number {
        return this.el ? parseFloat(this.el.style.width) : this._width;
    }

    public get height(): number {
        return this.el ? parseFloat(this.el.style.height) : this._height;
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
        this.$resizeHandle = this.select(".og-ddialog-resize-handle");
        this._initEvents();
        this._initButtons();

        if (this._right != null) {
            this.el!.style.visibility = "hidden";
            const observer = new IntersectionObserver((entries, obs) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        this.el!.style.visibility = "visible";
                        //@ts-ignore
                        if (this.el!.parentNode) {
                            this.setPosition(
                                (this.el!.parentNode as HTMLElement).clientWidth - this.el!.clientWidth - this._right!
                            );
                            obs.disconnect();
                        }
                    }
                });
            });

            observer.observe(this.el!);
        }

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

    public getVisibility(): boolean {
        return this._visibility;
    }

    public positionNearElementOnFirstOpen(anchorEl: HTMLElement | null, rootEl?: HTMLElement | null, gap: number = 8) {
        if (this._firstOpenPositioned || !this.el || !anchorEl) return;

        const root = rootEl || this.el.parentElement || document.body;
        const rootRect = root.getBoundingClientRect();
        const anchorRect = anchorEl.getBoundingClientRect();

        const dialogWidth = this.el.offsetWidth || this.width || DEFAULT_WIDTH;
        const styleHeight = parseFloat(this.el.style.height || "0");
        const dialogHeight = this.el.offsetHeight || (isNaN(styleHeight) ? 0 : styleHeight) || DEFAULT_HEIGHT;

        const rootWidth = root.clientWidth || rootRect.width || window.innerWidth;
        const rootHeight = root.clientHeight || rootRect.height || window.innerHeight;

        const anchorCenterX = anchorRect.left + anchorRect.width * 0.5 - rootRect.left;
        const anchorTop = anchorRect.top - rootRect.top;
        const openToRight = anchorCenterX <= rootWidth * 0.5;

        let left = openToRight
            ? anchorRect.right - rootRect.left + gap
            : anchorRect.left - rootRect.left - dialogWidth - gap;
        let top = anchorTop;

        left = Math.max(0, Math.min(left, rootWidth - dialogWidth));
        if (rootHeight > dialogHeight) {
            top = Math.max(0, Math.min(top, rootHeight - dialogHeight));
        } else {
            top = Math.max(0, top);
        }

        this.setPosition(left, top);
        this._firstOpenPositioned = true;
    }

    protected _initButtons() {
        this._closeBtn.events.on("click", this._onCloseBtnClick);
        this._closeBtn.appendTo(this.$buttons!);
    }

    protected _initEvents() {
        this.$header!.style.touchAction = "none";
        this.$header!.addEventListener("mousedown", this._onMouseDown);
        this.$header!.addEventListener("pointerdown", this._onPointerDown);
        this.el!.addEventListener("mousedown", this._onMouseDownAll);
        this.el!.addEventListener("pointerdown", this._onPointerDownAll);
        if (this.$resizeHandle && this._resizable) {
            this.$resizeHandle.addEventListener("mousedown", this._onResizeMouseDown);
            this.$resizeHandle.addEventListener("pointerdown", this._onResizePointerDown);
        }
    }

    protected _onCloseBtnClick = () => {
        this.close();
    };

    protected _onMouseDownAll = () => {
        this.bringToFront();
    };

    protected _onPointerDownAll = (e: PointerEvent) => {
        if (e.pointerType !== "touch") {
            return;
        }
        this.bringToFront();
    };

    protected _isHeaderButtonsTarget(target: EventTarget | null): boolean {
        return target instanceof Element && !!target.closest(".og-ddialog-header__buttons");
    }

    protected _onMouseDown = (e: MouseEvent) => {
        if (this._isHeaderButtonsTarget(e.target)) {
            return;
        }
        e.preventDefault();

        this._startDragging();

        this._startPosX = e.clientX;
        this._startPosY = e.clientY;

        document.addEventListener("mousemove", this._onMouseMove);
        document.addEventListener("mouseup", this._onMouseUp);
    };

    protected _onPointerDown = (e: PointerEvent) => {
        if (e.pointerType !== "touch" || this._isHeaderButtonsTarget(e.target) || !e.isPrimary) {
            return;
        }
        e.preventDefault();

        this._startDragging();

        this._startPosX = e.clientX;
        this._startPosY = e.clientY;
        this._touchDragPointerId = e.pointerId;
        this.$header?.setPointerCapture(e.pointerId);

        document.addEventListener("pointermove", this._onPointerMove);
        document.addEventListener("pointerup", this._onPointerUp);
        document.addEventListener("pointercancel", this._onPointerUp);
    };

    public setPosition(x?: number, y?: number) {
        if (x != undefined) {
            this.el!.style.left = `${x}px`;
        }
        if (y != undefined) {
            this.el!.style.top = `${y}px`;
        }
    }

    protected _onMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        let dx = this._startPosX - e.clientX;
        let dy = this._startPosY - e.clientY;
        this._startPosX = e.clientX;
        this._startPosY = e.clientY;
        this.setPosition(this.el!.offsetLeft - dx, this.el!.offsetTop - dy);
    };

    protected _onPointerMove = (e: PointerEvent) => {
        if (e.pointerType !== "touch" || this._touchDragPointerId !== e.pointerId) {
            return;
        }
        e.preventDefault();
        let dx = this._startPosX - e.clientX;
        let dy = this._startPosY - e.clientY;
        this._startPosX = e.clientX;
        this._startPosY = e.clientY;
        this.setPosition(this.el!.offsetLeft - dx, this.el!.offsetTop - dy);
    };

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
    };

    protected _onPointerUp = (e: PointerEvent) => {
        if (e.pointerType !== "touch" || this._touchDragPointerId !== e.pointerId) {
            return;
        }
        this._touchDragPointerId = null;
        if (this.$header?.hasPointerCapture(e.pointerId)) {
            this.$header.releasePointerCapture(e.pointerId);
        }
        this._clearDragging();
        document.removeEventListener("pointermove", this._onPointerMove);
        document.removeEventListener("pointerup", this._onPointerUp);
        document.removeEventListener("pointercancel", this._onPointerUp);
    };

    protected _onResizeMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        this._startResizing(e.clientX, e.clientY);
        document.addEventListener("mousemove", this._onResizeMouseMove);
        document.addEventListener("mouseup", this._onResizeMouseUp);
    };

    protected _onResizePointerDown = (e: PointerEvent) => {
        if (e.pointerType !== "touch" || !e.isPrimary) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        this._startResizing(e.clientX, e.clientY);
        this._touchResizePointerId = e.pointerId;
        this.$resizeHandle?.setPointerCapture(e.pointerId);
        document.addEventListener("pointermove", this._onResizePointerMove);
        document.addEventListener("pointerup", this._onResizePointerUp);
        document.addEventListener("pointercancel", this._onResizePointerUp);
    };

    protected _startResizing(clientX: number, clientY: number) {
        const computedStyle = getComputedStyle(this.el!);
        this._isResizing = true;
        this._startPosX = clientX;
        this._startPosY = clientY;
        this._startWidth = parseFloat(computedStyle.width);
        this._startHeight = parseFloat(computedStyle.height);
        this.bringToFront();
    }

    protected _resize(clientX: number, clientY: number) {
        let width = this._startWidth + (clientX - this._startPosX);
        let height = this._startHeight + (clientY - this._startPosY);

        const minWidth = parseFloat(this.el!.style.minWidth);
        const maxWidth = parseFloat(this.el!.style.maxWidth);
        const minHeight = parseFloat(this.el!.style.minHeight);
        const maxHeight = parseFloat(this.el!.style.maxHeight);

        if (!isNaN(minWidth)) {
            width = Math.max(minWidth, width);
        }
        if (!isNaN(maxWidth)) {
            width = Math.min(maxWidth, width);
        }
        if (!isNaN(minHeight)) {
            height = Math.max(minHeight, height);
        }
        if (!isNaN(maxHeight)) {
            height = Math.min(maxHeight, height);
        }

        this.el!.style.width = `${width}px`;
        this.el!.style.height = `${height}px`;
        this._width = width;
        this._height = height;

        this.events.dispatch(this.events.resize, this);
    }

    protected _onResizeMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        this._resize(e.clientX, e.clientY);
    };

    protected _onResizePointerMove = (e: PointerEvent) => {
        if (e.pointerType !== "touch" || this._touchResizePointerId !== e.pointerId) {
            return;
        }
        e.preventDefault();
        this._resize(e.clientX, e.clientY);
    };

    protected _clearResizing() {
        this._isResizing = false;
    }

    protected _onResizeMouseUp = () => {
        this._clearResizing();
        document.removeEventListener("mousemove", this._onResizeMouseMove);
        document.removeEventListener("mouseup", this._onResizeMouseUp);
    };

    protected _onResizePointerUp = (e: PointerEvent) => {
        if (e.pointerType !== "touch" || this._touchResizePointerId !== e.pointerId) {
            return;
        }
        this._touchResizePointerId = null;
        if (this.$resizeHandle?.hasPointerCapture(e.pointerId)) {
            this.$resizeHandle.releasePointerCapture(e.pointerId);
        }
        this._clearResizing();
        document.removeEventListener("pointermove", this._onResizePointerMove);
        document.removeEventListener("pointerup", this._onResizePointerUp);
        document.removeEventListener("pointercancel", this._onResizePointerUp);
    };

    public override remove() {
        this._clearDragging();
        this._clearResizing();
        this._clearEvents();
        this._firstOpenPositioned = false;
        super.remove();
    }

    protected _clearEvents() {
        this._closeBtn.events.off("click", this._onCloseBtnClick);

        document.removeEventListener("mouseup", this._onMouseUp);
        document.removeEventListener("mousemove", this._onMouseMove);
        document.removeEventListener("pointermove", this._onPointerMove);
        document.removeEventListener("pointerup", this._onPointerUp);
        document.removeEventListener("pointercancel", this._onPointerUp);
        document.removeEventListener("mousemove", this._onResizeMouseMove);
        document.removeEventListener("mouseup", this._onResizeMouseUp);
        document.removeEventListener("pointermove", this._onResizePointerMove);
        document.removeEventListener("pointerup", this._onResizePointerUp);
        document.removeEventListener("pointercancel", this._onResizePointerUp);

        this.$header!.removeEventListener("mousedown", this._onMouseDown);
        this.$header!.removeEventListener("pointerdown", this._onPointerDown);
        this.el!.removeEventListener("mousedown", this._onMouseDownAll);
        this.el!.removeEventListener("pointerdown", this._onPointerDownAll);
        if (this.$resizeHandle && this._resizable) {
            this.$resizeHandle.removeEventListener("mousedown", this._onResizeMouseDown);
            this.$resizeHandle.removeEventListener("pointerdown", this._onResizePointerDown);
        }
    }
}

export { Dialog };
