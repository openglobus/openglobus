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

const INPUT_EVENTS: InputEventsList = ["change"];

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
        this.events = this.events.registerNames(INPUT_EVENTS);

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
        this._setCommittedValue(this._formatValue(val));
    }

    protected _setCommittedValue(value: string, forceSync: boolean = false): void {
        if (value !== this._value) {
            this._value = value;
            this._syncInputValue();
            this.events.dispatch(this.events.change, this._value, this);
        } else {
            if (forceSync || document.activeElement !== this.$input) {
                this._syncInputValue();
            }
            this.events.stopPropagation();
            this.events.dispatch(this.events.change, this._value, this);
        }
    }

    public get value(): string {
        return this._value;
    }

    protected _formatValue(val: string | number): string {
        return typeof val === "number" ? this._formatNumber(val) : val;
    }

    protected _formatNumber(val: number): string {
        return toFixedMax(this._clampNumber(val), this._getMaxFixed());
    }

    protected _getMaxFixed(): number {
        if (this._maxFixed >= 0 || typeof this._step !== "number") {
            return this._maxFixed;
        }

        const stepStr = this._step.toString().toLowerCase();
        if (stepStr.includes("e-")) {
            return parseInt(stepStr.split("e-")[1]);
        }

        const decimalPart = stepStr.split(".")[1];
        return decimalPart ? decimalPart.length : -1;
    }

    protected _clampNumber(value: number): number {
        if (this._min !== undefined) {
            value = Math.max(this._min, value);
        }
        if (this._max !== undefined) {
            value = Math.min(this._max, value);
        }
        return value;
    }

    protected _parseNumber(value: string): number | null {
        const normalized = value.trim().replace(",", ".");
        if (normalized === "") return null;

        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }

    protected _normalizeUserValue(value: string): string | null {
        if (this._type === "number") {
            const parsed = this._parseNumber(value);
            return parsed !== null ? this._formatNumber(parsed) : null;
        }

        return value;
    }

    protected _syncInputValue(): void {
        if (this.$input) {
            this.$input.value = this._value;
        }
    }

    protected _initEvents() {
        //@ts-ignore
        this.el!.addEventListener("mousewheel", this._onMouseWheel);
        this.el!.addEventListener("wheel", this._onMouseWheelFF);
        this.$input!.addEventListener("input", this._onInput);
        this.$input!.addEventListener("keydown", this._onKeyDown);
        this.$input!.addEventListener("blur", this._onBlur);
    }

    protected _clearEvents() {
        //@ts-ignore
        this.el!.removeEventListener("mousewheel", this._onMouseWheel);
        this.el!.removeEventListener("wheel", this._onMouseWheelFF);
        this.$input!.removeEventListener("input", this._onInput);
        this.$input!.removeEventListener("keydown", this._onKeyDown);
        this.$input!.removeEventListener("blur", this._onBlur);
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

    };

    protected _onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            this._commitUserInput();
        } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            this._syncInputValue();
        } else if (this._type === "number" && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault();
            e.stopPropagation();
            this._stepValue(e.key === "ArrowUp" ? 1 : -1);
        }
    };

    protected _onBlur = () => {
        this._commitUserInput();
    };

    protected _commitUserInput(): void {
        if (!this.$input) return;

        const value = this._normalizeUserValue(this.$input.value);
        if (value === null || (this._type === "number" && this.$input.value.trim() === "")) {
            this._syncInputValue();
            return;
        }

        this._setCommittedValue(value, true);
    }

    protected _stepValue(direction: number): void {
        if (!this.$input) return;

        const step = typeof this._step === "number" ? this._step : 1;
        const current = this._parseNumber(this.$input.value);
        const committed = this._parseNumber(this._value);
        const base = current ?? committed ?? this._min ?? 0;
        this._setCommittedValue(this._formatNumber(base + direction * step), true);
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
