import type { EventsHandler } from "../Events";
import { View } from "./View";
import type { IViewParams, ViewEventsList } from "./View";
import { stringTemplate } from "../utils/shared";

interface IColorParams extends IViewParams {
    label?: string;
    value?: string;
}

type ColorEventsList = ["input"];

const COLOR_EVENTS: ColorEventsList = ["input"];

const TEMPLATE = `<div class="og-color">
      <label for="{id}" class="og-color-label">{label}</label>
      <div class="og-color-controls">
        <input class="og-color-picker" type="color" id="{id}" name="{id}" value="{value}"/>
        <input class="og-color-value" type="text" value="{value}" placeholder="#ffffff"/>
      </div>
    </div>`;

let __labelCounter__ = 0;

class Color extends View<null> {
    public override events: EventsHandler<ColorEventsList> & EventsHandler<ViewEventsList>;

    protected _value: string;
    protected $label: HTMLElement | null;
    protected $pickerInput: HTMLInputElement | null;
    protected $valueInput: HTMLInputElement | null;

    constructor(options: IColorParams = {}) {
        const value = Color.normalizeColor(options.value) || "#000000";

        super({
            template: stringTemplate(TEMPLATE, {
                id: `color-${__labelCounter__++}`,
                label: options.label || "",
                value
            })
        });

        //@ts-ignore
        this.events = this.events.registerNames(COLOR_EVENTS);

        this._value = value;

        this.$label = null;
        this.$pickerInput = null;
        this.$valueInput = null;
    }

    static normalizeColor(color: string | undefined): string | null {
        if (!color) return null;

        let value = color.trim();
        const shortMatch = value.match(/^#([0-9a-fA-F]{3})$/);
        if (shortMatch) {
            value = `#${shortMatch[1]
                .split("")
                .map((ch) => ch + ch)
                .join("")}`;
        }

        return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : null;
    }

    public override render(params: any): this {
        super.render(params);

        this.$label = this.select(".og-color-label")!;
        if (this.$label.innerHTML === "") {
            this.$label.style.display = "none";
        }
        this.$pickerInput = this.select<HTMLInputElement>(".og-color-picker");
        this.$valueInput = this.select<HTMLInputElement>(".og-color-value");

        this._initEvents();

        return this;
    }

    public set value(val: string) {
        const color = Color.normalizeColor(val);
        if (color && color !== this._value) {
            this._value = color;
            this.$pickerInput!.value = this._value;
            this.$valueInput!.value = this._value;
            this.events.dispatch(this.events.input, this._value, this);
        }
    }

    public get value(): string {
        return this._value;
    }

    protected _initEvents() {
        this.$pickerInput!.addEventListener("input", this._onPickerInput);
        this.$valueInput!.addEventListener("input", this._onValueInput);
    }

    protected _clearEvents() {
        this.$pickerInput!.removeEventListener("input", this._onPickerInput);
        this.$valueInput!.removeEventListener("input", this._onValueInput);
    }

    protected _onPickerInput = (e: Event) => {
        this.value = (e.target as HTMLInputElement).value;
    };

    protected _onValueInput = (e: Event) => {
        const color = Color.normalizeColor((e.target as HTMLInputElement).value);
        if (color) {
            this.value = color;
        }
    };

    public override remove() {
        this._clearEvents();
        super.remove();
    }
}

export { Color };
