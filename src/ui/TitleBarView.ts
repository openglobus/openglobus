import type { EventsHandler } from "../Events";
import { View, type IViewParams, type ViewEventsList } from "./View";

const ICON_EXPANDED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
</svg>`;

const ICON_COLLAPSED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
</svg>`;

interface ITitleBarViewParams extends IViewParams {
    title: string;
    isCollapsed?: boolean;
}

type TitleBarViewEventsList = ["change"];

const TITLE_BAR_VIEW_EVENTS: TitleBarViewEventsList = ["change"];

const TEMPLATE = `<div class="og-titlebar">
    <div class="og-titlebar__title">{title}</div>
    <button type="button" class="og-titlebar__toggle"></button>
</div>`;

export class TitleBarView extends View<null> {
    public override events: EventsHandler<TitleBarViewEventsList> & EventsHandler<ViewEventsList>;

    protected _title: string;
    protected _isCollapsed: boolean;
    protected _toggleBtn: HTMLButtonElement | null;

    constructor(params: ITitleBarViewParams) {
        super({
            template: TEMPLATE
        });

        //@ts-ignore
        this.events = this.events.registerNames(TITLE_BAR_VIEW_EVENTS);

        this._title = params.title;
        this._isCollapsed = params.isCollapsed || false;
        this._toggleBtn = null;
    }

    public get isCollapsed(): boolean {
        return this._isCollapsed;
    }

    public setCollapsed(isCollapsed: boolean, stopPropagation: boolean = false): void {
        if (this._isCollapsed !== isCollapsed) {
            this._isCollapsed = isCollapsed;
            this._syncToggleButton();
            if (!stopPropagation) {
                this.events.dispatch(this.events.change, isCollapsed, this);
            }
        }
    }

    public override render(params?: unknown): this {
        super.render({
            title: this._title
        });

        this._toggleBtn = this.select<HTMLButtonElement>(".og-titlebar__toggle");
        this._toggleBtn!.addEventListener("click", this._onToggleClick);
        this._syncToggleButton();

        return this;
    }

    public override remove(): void {
        if (this._toggleBtn) {
            this._toggleBtn.removeEventListener("click", this._onToggleClick);
            this._toggleBtn = null;
        }

        super.remove();
    }

    protected _syncToggleButton(): void {
        if (!this._toggleBtn) return;

        this._toggleBtn.innerHTML = this._isCollapsed ? ICON_COLLAPSED_SVG : ICON_EXPANDED_SVG;
        this._toggleBtn.title = this._isCollapsed ? "Expand" : "Collapse";
        this._toggleBtn.setAttribute("aria-expanded", (!this._isCollapsed).toString());
    }

    protected _onToggleClick = (e: MouseEvent): void => {
        e.preventDefault();
        e.stopPropagation();
        this.setCollapsed(!this._isCollapsed);
    };
}
