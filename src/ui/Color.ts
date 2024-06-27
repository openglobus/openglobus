import {clamp} from '../math';
import {EventsHandler} from "../Events";
import {IViewParams, View, ViewEventsList} from './View';
import {stringTemplate} from '../utils/shared';

interface IColorParams extends IViewParams {
    label?: string;
    value?: string;
}

type ColorEventsList = ["input"];

const COLOR_EVENTS: ColorEventsList = ["input"];

const TEMPLATE =
    `<div class="og-color">
      <label for="{id}" class="og-color-label">{label}</label>
      <input type="color" name="{id}" value="{value}"/>
    </div>`;

let __labelCounter__ = 0;

class Color extends View<null> {

    public override events: EventsHandler<ColorEventsList> & EventsHandler<ViewEventsList>;

    protected _value: string;
    protected $label: HTMLElement | null;
    protected $input: HTMLInputElement | null;

    constructor(options: IColorParams = {}) {
        super({
            template: stringTemplate(TEMPLATE, {
                id: `color-${__labelCounter__++}`,
                label: options.label || ""
            })
        });

        //@ts-ignore
        this.events = this.events.registerNames(COLOR_EVENTS);

        this._value = options.value || "blue";

        this.$label = null;
        this.$input = null;
    }

    public override render(params: any): this {

        super.render(params);

        this.$label = this.select(".og-color-label")!;
        if (this.$label.innerHTML === "") {
            this.$label.style.display = "none";
        }
        this.$input = this.select<HTMLInputElement>("input");

        this._initEvents();

        return this;
    }

    public set value(val: string) {
        if (val !== this._value) {
            this._value = val;
            this.$input!.value = this._value;
            this.events.dispatch(this.events.input, this._value, this);
        }
    }

    public get value(): string {
        return this._value;
    }

    protected _initEvents() {
        this.$input!.addEventListener("input", this._onInput);
    }

    protected _clearEvents() {
        this.$input!.removeEventListener("input", this._onInput);
    }

    protected _onInput = (e: Event) => {
        //@ts-ignore
        this.value = e.target.value;
    }

    public override remove() {
        this._clearEvents();
        super.remove();
    }
}

export {Color}
