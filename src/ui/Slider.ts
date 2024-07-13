import {clamp} from '../math';
import {EventsHandler} from "../Events";
import {IViewParams, View, ViewEventsList} from './View';
import {stringTemplate} from '../utils/shared';

interface ISliderParams extends IViewParams {
    label?: string;
    value?: number;
    min?: number;
    max?: number;
}

type SliderEventsList = ["change"];

const SLIDER_EVENTS: SliderEventsList = ["change"];

const TEMPLATE = `<div class="og-slider">
      <div class="og-slider-label">{label}</div>
      <div class="og-slider-panel">
        <div class="og-slider-progress"></div>      
        <div class="og-slider-pointer"></div>
      </div>
      <input type="number"/>
    </div>`;

class Slider extends View<null> {

    public override events: EventsHandler<SliderEventsList> & EventsHandler<ViewEventsList>;

    protected _value: number;
    protected _min: number;
    protected _max: number;

    protected _startPosX: number;

    protected _resizeObserver: ResizeObserver;

    protected $label: HTMLElement | null;
    protected $pointer: HTMLElement | null;
    protected $progress: HTMLElement | null;
    protected $input: HTMLInputElement | null;
    protected $panel: HTMLElement | null;

    constructor(options: ISliderParams = {}) {
        super({
            template: stringTemplate(TEMPLATE, {
                label: options.label || ""
            })
        });

        //@ts-ignore
        this.events = this.events.registerNames(SLIDER_EVENTS);

        this._value = options.value || 0.0;
        this._min = options.min || 0.0;
        this._max = options.max || 1.0;
        //this._step = options.step || ((this._max - this._min) / 10.0);

        this._resizeObserver = new ResizeObserver(this._onResize);

        this._startPosX = 0;

        this.$label = null;
        this.$pointer = null;
        this.$progress = null;
        this.$input = null;
        this.$panel = null;
    }

    public override render(params: any): this {

        super.render(params);

        this.$label = this.select(".og-slider-label")!;
        if (this.$label.innerHTML === "") {
            this.$label.style.display = "none";
        }
        this.$pointer = this.select(".og-slider-pointer");
        this.$progress = this.select(".og-slider-progress");
        this.$panel = this.select(".og-slider-panel");
        this.$input = this.select<HTMLInputElement>("input");

        this._resizeObserver.observe(this.el!);

        this._initEvents();

        return this;
    }

    protected _onResize = () => {
        this._setOffset((this._value - this._min) * this.$panel!.clientWidth / (this._max - this._min));
    }

    public set value(val: number) {
        if (val !== this._value) {
            this._value = clamp(val, this._min, this._max);
            this.$input!.value = this._value.toString();
            this._setOffset((this._value - this._min) * this.$panel!.clientWidth / (this._max - this._min));
            this.events.dispatch(this.events.change, this._value, this);
        }
    }

    public get value(): number {
        return this._value;
    }

    protected _initEvents() {
        this.$panel!.addEventListener("mousedown", this._onMouseDown);
        //@ts-ignore
        this.$panel!.addEventListener("mousewheel", this._onMouseWheel);
        this.$panel!.addEventListener("wheel", this._onMouseWheelFF);
        this.$input!.addEventListener("input", this._onInput);
    }

    protected _clearEvents() {
        this.$panel!.removeEventListener("mousedown", this._onMouseDown);
        //@ts-ignore
        this.$panel!.removeEventListener("mousewheel", this._onMouseWheel);
        this.$panel!.removeEventListener("wheel", this._onMouseWheelFF);
        this.$input!.removeEventListener("input", this._onInput);
    }

    protected _onMouseWheel = (e: WheelEvent) => {
        //@ts-ignore
        e = e || window.event;
        e.preventDefault();
        e.stopPropagation();
        //@ts-ignore
        this.value = this._value + Math.sign(e.wheelDelta) * (this._max - this._min) / 100.0;
    }

    protected _onMouseWheelFF = (e: WheelEvent) => {
        this._onMouseWheel(e);
    }

    protected _onInput = (e: Event) => {
        //@ts-ignore
        e = e || window.event;
        e.preventDefault();
        e.stopPropagation();
        //@ts-ignore
        this.value = parseFloat(e.target.value);
    }

    protected _onMouseDown = (e: MouseEvent) => {
        //@ts-ignore
        e = e || window.event;
        e.preventDefault();

        this._startPosX = e.clientX;

        this.value = this._min + (this._max - this._min) * (e.offsetX / this.$panel!.clientWidth);

        document.addEventListener("mousemove", this._onMouseMove);
        document.addEventListener("mouseup", this._onMouseUp);
    }

    protected _setOffset(x: number) {
        if (x >= 0 && x <= this.$panel!.clientWidth) {
            this.$pointer!.style.left = this.$progress!.style.width = `${x * 100 / this.$panel!.clientWidth}%`;
        }
    }

    protected _onMouseMove = (e: MouseEvent) => {
        //@ts-ignore
        e = e || window.event;
        e.preventDefault();
        e.stopPropagation();

        let rect = this.$panel!.getBoundingClientRect();
        let clientX = clamp(e.clientX, rect.left, rect.right);
        let dx = this._startPosX - clientX;
        this._startPosX = clientX;
        this.value = this._value - dx * (this._max - this._min) / this.$panel!.clientWidth;
    }

    protected _onMouseUp = () => {
        document.removeEventListener("mouseup", this._onMouseUp);
        document.removeEventListener("mousemove", this._onMouseMove);
    }

    public override remove() {
        this._clearEvents();
        super.remove();
    }
}

export {Slider}
