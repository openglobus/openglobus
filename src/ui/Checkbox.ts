import type {EventsHandler} from "../Events";
import {View} from './View';
import type {IViewParams, ViewEventsList} from './View';
import {stringTemplate, toFixedMax} from '../utils/shared';

interface ICheckboxParams extends IViewParams {
    label?: string;
    checked?: boolean;
    disabled?: boolean;
}

type CheckboxEventsList = ["change"];

const SLIDER_EVENTS: CheckboxEventsList = ["change"];

const TEMPLATE = `<div class="og-checkbox">
      <div class="og-input-label">{label}</div>
      <div class="og-checkbox-input">
        <input type="checkbox" {checked}/>
      </div>
    </div>`;

class Checkbox extends View<null> {

    public override events: EventsHandler<CheckboxEventsList> & EventsHandler<ViewEventsList>;

    protected $label: HTMLElement | null;
    protected $input: HTMLInputElement | null;

    protected _checked: boolean;
    protected _disabled: boolean;

    constructor(options: ICheckboxParams = {}) {
        super({
            template: stringTemplate(TEMPLATE, {
                label: options.label || "",
                checked: options.checked ? "checked" : ""
            })
        });

        this._checked = options.checked || false;
        this._disabled = options.disabled || false;

        //@ts-ignore
        this.events = this.events.registerNames(SLIDER_EVENTS);

        this.$label = null;
        this.$input = null;
    }

    public set disabled(disabled: boolean) {
        this._disabled = disabled;
        this._updateDisabled();
    }

    protected _updateDisabled() {
        if (!this.el) return;
        if (this._disabled) {
            this.el.classList.add("og-input-disabled");
        } else {
            this.el.classList.remove("og-input-disabled");
        }
    }

    public get disabled(): boolean {
        return this._disabled;
    }

    public override render(params: any): this {

        super.render(params);

        this.$label = this.select(".og-input-label")!;
        if (this.$label.innerHTML === "") {
            this.$label.style.display = "none";
        }
        this.$input = this.select<HTMLInputElement>("input");
        this.$input!.checked = this._checked;

        this._updateDisabled();

        this._initEvents();

        return this;
    }

    protected _onResize = () => {
    }

    public set checked(isChecked: boolean) {
        if (isChecked !== this._checked) {
            this._checked = isChecked;
            if (this.$input) {
                this.$input.checked = this._checked;
            }
            this.events.dispatch(this.events.change, this._checked, this);
        }
    }

    public get checked(): boolean {
        return this._checked;
    }

    protected _initEvents() {
        //@ts-ignore
        this.el!.addEventListener("mousewheel", this._onMouseWheel);
        this.el!.addEventListener("wheel", this._onMouseWheelFF);
        this.$input!.addEventListener("click", this._onClick);
    }

    protected _clearEvents() {
        //@ts-ignore
        this.el!.removeEventListener("mousewheel", this._onMouseWheel);
        this.el!.removeEventListener("wheel", this._onMouseWheelFF);
        this.$input!.removeEventListener("click", this._onClick);
    }

    protected _onMouseWheel = (e: WheelEvent) => {
        //@ts-ignore
        e = e || window.event;
        e.preventDefault();
        e.stopPropagation();
    }

    protected _onMouseWheelFF = (e: WheelEvent) => {
        this._onMouseWheel(e);
    }

    protected _onClick = (e: Event) => {
        //@ts-ignore
        e = e || window.event;
        e.stopPropagation();

        this.checked = !this._checked;
    }


    public override remove() {
        this._clearEvents();
        super.remove();
    }

    set visibility(visibility: boolean) {
        if (this.el) {
            if (visibility) {
                this.el.style.display = "";
            } else {
                this.el.style.display = "none";
            }
        }
    }
}

export {Checkbox}
