import {Button, IButtonParams, ButtonEventsList} from './Button';
import {EventsHandler} from "../Events";
import {ViewEventsList} from "./View";

interface IToggleButtonParams extends IButtonParams {
    isActive?: boolean;
    preventClick?: boolean;
}

type ToggleButtonEventsList = ["change"];

const TOGGLEBUTTON_EVENTS: ToggleButtonEventsList = ["change"];

class ToggleButton extends Button {

    public override events: EventsHandler<ToggleButtonEventsList> & EventsHandler<ButtonEventsList> & EventsHandler<ViewEventsList>;

    protected _isActive: boolean;
    public preventClick: boolean;

    constructor(options: IToggleButtonParams) {
        super({
            ...options
        });

        //@ts-ignore
        this.events = this.events.registerNames(TOGGLEBUTTON_EVENTS);

        this._isActive = options.isActive || false;

        this.preventClick = options.preventClick || false;
    }

    public setActive(isActive: boolean, stopPropagation: boolean = false) {
        if (isActive !== this._isActive) {
            this._isActive = isActive;
            this._toggle();
            if (!stopPropagation) {
                this.events.dispatch(this.events.change, isActive, this);
            }
        }
    }

    protected _toggle() {
        this.el && this.el.classList.toggle("og-button__active");
    }

    public get isActive(): boolean {
        return this._isActive;
    }

    public override render(params: any): this {
        super.render(params);
        if (this._isActive) {
            this._toggle();
        }
        return this;
    }

    protected override _onMouseClick = (e: MouseEvent) => {
        if (!this.preventClick) {
            this._mouseClickHandler(e);
            this.setActive(!this.isActive);
        }
    }
}

export {ToggleButton}