import type { EventsHandler } from "../Events";
import { View } from "./View";
import type { IViewParams, ViewEventsList } from "./View";
import { stringTemplate, toFixedMax } from "../utils/shared";

interface IInputParams extends IViewParams {
    label?: string;
    value?: string;
    min?: number;
    max?: number;
    type?: string;
    step?: number | "any";
    maxFixed?: number;
}

type InputEventsList = ["change"];

const SLIDER_EVENTS: InputEventsList = ["change"];

const TEMPLATE = `<div class="og-input">
      <div class="og-input-label">{label}</div>
      <input type="{type}"/>
    </div>`;

class Input extends View<null> {
    public override events: EventsHandler<InputEventsList> & EventsHandler<ViewEventsList>;

    protected _value: string;
    protected _type: string;
    protected _min?: number;
    protected _max?: number;
    protected _step: number | "any";

    protected $label: HTMLElement | null;
    protected $input: HTMLInputElement | null;

    protected _maxFixed: number;

    constructor(options: IInputParams = {}) {
        super({
            template: stringTemplate(TEMPLATE, {
                label: options.label || "",
                type: options.type || "text"
            })
        });

        //@ts-ignore
        this.events = this.events.registerNames(SLIDER_EVENTS);

        this._value = options.value || "";
        this._type = options.type || "text";
        this._min = options.min;
        this._max = options.max;
        this._step = options.step ?? "any";

        this._maxFixed = options.maxFixed != undefined ? options.maxFixed : -1;

        this.$label = null;
        this.$input = null;
    }

    public override render(params: any): this {
        super.render(params);

        this.$label = this.select(".og-input-label")!;
        if (this.$label.innerHTML === "") {
            this.$label.style.display = "none";
        }
        this.$input = this.select<HTMLInputElement>("input");

        if (this.$input && this._type === "number") {
            this.$input.setAttribute("step", this._step.toString());
            this.$input.setAttribute("inputmode", "decimal");

            if (this._min !== undefined) {
                this.$input.min = this._min.toString();
            }
            if (this._max !== undefined) {
                this.$input.max = this._max.toString();
            }
        }

        if (this.$input) {
            this.$input.value = this._value;
        }

        this._initEvents();

        return this;
    }

    protected _onResize = () => {};

    public set value(val: string | number) {
        if (val !== this._value) {
            if (typeof val === "number") {
                this._value = toFixedMax(val, this._maxFixed);
            } else {
                this._value = val;
            }
            if (this.$input) {
                this.$input.value = this._value;
            }
            this.events.dispatch(this.events.change, this._value, this);
        }
    }

    protected _setValue(val: string | number) {
        if (val !== this._value) {
            if (typeof val === "number") {
                this._value = toFixedMax(val, this._maxFixed);
            } else {
                this._value = val;
            }
            this.events.dispatch(this.events.change, this._value, this);
        }
    }

    public get value(): string {
        return this._value;
    }

    protected _initEvents() {
        //@ts-ignore
        this.el!.addEventListener("mousewheel", this._onMouseWheel);
        this.el!.addEventListener("wheel", this._onMouseWheelFF);
        this.$input!.addEventListener("input", this._onInput);
    }

    protected _clearEvents() {
        //@ts-ignore
        this.el!.removeEventListener("mousewheel", this._onMouseWheel);
        this.el!.removeEventListener("wheel", this._onMouseWheelFF);
        this.$input!.removeEventListener("input", this._onInput);
    }

    protected _onMouseWheel = (e: WheelEvent) => {
        //@ts-ignore
        e = e || window.event;
        e.preventDefault();
        e.stopPropagation();
    };

    protected _onMouseWheelFF = (e: WheelEvent) => {
        this._onMouseWheel(e);
    };

    protected _onInput = (e: Event) => {
        //@ts-ignore
        e = e || window.event;
        e.preventDefault();
        e.stopPropagation();
        const target = e.target as HTMLInputElement;
        let nextValue = target.value;

        if (this._type === "number") {
            nextValue = nextValue.replace(",", ".");
            if (nextValue !== target.value) {
                target.value = nextValue;
            }
        }

        this._setValue(nextValue);
    };

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

export { Input };
