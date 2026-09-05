import type { EventsHandler } from "../../Events";
import { ButtonGroup } from "../../ui/ButtonGroup";
import { View } from "../../ui/View";
import type { IViewParams, ViewEventsList } from "../../ui/View";
import { ToggleButton } from "../../ui/ToggleButton";
import { TimelineModel } from "./TimelineModel";
import {
    addSeconds,
    createCanvasHTML,
    dateToStr,
    drawNotch,
    drawText,
    getNearestTimeLeft,
    getScale
} from "./timelineUtils";
import type { MouseEventExt } from "../../input/MouseHandler";

interface ITimelineViewParams extends IViewParams {
    currentDate?: Date;
    rangeStart?: Date;
    rangeEnd?: Date;
    minDate?: Date;
    maxDate?: Date;
    fillStyle?: string;
}

const SECONDS_TO_MILLISECONDS = 1000.0;
const MILLISECONDS_TO_SECONDS = 1.0 / SECONDS_TO_MILLISECONDS;
const CLICK_MOVE_TOLERANCE_PX = 4;
const PINCH_SCALE_MIN = 0.5;
const PINCH_SCALE_MAX = 2.0;
const TOUCH_MODE_NONE = 0;
const TOUCH_MODE_CURRENT = 1;
const TOUCH_MODE_PINCH = 2;
const TOUCH_MODE_SCALE = 3;
const TOUCH_MODE_SUN = 4;

type TimelineViewEventsList = [
    "startdrag",
    "stopdrag",
    "startdragcurrent",
    "stopdragcurrent",
    "setcurrent",
    "reset",
    "play",
    "playback",
    "pause",
    "visibility",
    "localtime",
    "suntime",
    "sundate"
];

const TIMELINEVIEW_EVENTS: TimelineViewEventsList = [
    "startdrag",
    "stopdrag",
    "startdragcurrent",
    "stopdragcurrent",
    "setcurrent",
    "reset",
    "play",
    "playback",
    "pause",
    "visibility",
    "localtime",
    "suntime",
    "sundate"
];

const ICON_PLAY_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" style="fill: black;"/></svg>';
const ICON_PLAY_BACK_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M16 5v14L5 12z" style="fill: black;"/></svg>';
const ICON_PAUSE_SVG =
    '<?xml version="1.0" ?><!DOCTYPE svg  PUBLIC \'-//W3C//DTD SVG 1.1//EN\'  \'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\'><svg enable-background="new 0 0 512 512" height="512px" version="1.1" viewBox="0 0 512 512" width="512px" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="Layer_6"><rect fill="#252525" height="320" width="60" x="153" y="96"/><rect fill="#252525" height="320" width="60" x="299" y="96"/></g></svg>';

const ICON_SUN_TIME_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.9961869,19.0105094 C12.3758826,19.0105094 12.6896778,19.2926633 12.7393402,19.6587388 L12.7461869,19.7605094 L12.7461869,21.2605094 C12.7461869,21.6747229 12.4104004,22.0105094 11.9961869,22.0105094 C11.6164911,22.0105094 11.3026959,21.7283555 11.2530335,21.3622799 L11.2461869,21.2605094 L11.2461869,19.7605094 C11.2461869,19.3462958 11.5819733,19.0105094 11.9961869,19.0105094 Z M18.0178855,16.9376929 L19.0785457,17.9983531 C19.3714389,18.2912463 19.3714389,18.76612 19.0785457,19.0590132 C18.7856525,19.3519065 18.3107787,19.3519065 18.0178855,19.0590132 L16.9572253,17.9983531 C16.6643321,17.7054599 16.6643321,17.2305861 16.9572253,16.9376929 C17.2501185,16.6447997 17.7249923,16.6447997 18.0178855,16.9376929 Z M7.03465577,16.9376929 C7.32754899,17.2305861 7.32754899,17.7054599 7.03465577,17.9983531 L5.97399559,19.0590132 C5.68110238,19.3519065 5.20622864,19.3519065 4.91333542,19.0590132 C4.6204422,18.76612 4.6204422,18.2912463 4.91333542,17.9983531 L5.97399559,16.9376929 C6.26688881,16.6447997 6.74176255,16.6447997 7.03465577,16.9376929 Z M12,6.475 C15.0513732,6.475 17.525,8.94862676 17.525,12 C17.525,15.0513732 15.0513732,17.525 12,17.525 C8.94862676,17.525 6.475,15.0513732 6.475,12 C6.475,8.94862676 8.94862676,6.475 12,6.475 Z M12,7.975 C9.77705388,7.975 7.975,9.77705388 7.975,12 C7.975,14.2229461 9.77705388,16.025 12,16.025 C14.2229461,16.025 16.025,14.2229461 16.025,12 C16.025,9.77705388 14.2229461,7.975 12,7.975 Z M11.25,9 C11.6296958,9 11.943491,9.28215388 11.9931534,9.64822944 L12,9.75 L12,12.003 L13.2496681,12.0037222 C13.6293639,12.0037222 13.9431591,12.2858761 13.9928215,12.6519516 L13.9996681,12.7537222 C13.9996681,13.133418 13.7175142,13.4472132 13.3514387,13.4968756 L13.2496681,13.5037222 L11.25,13.5037222 C10.8703042,13.5037222 10.556509,13.2215683 10.5068466,12.8554928 L10.5,12.7537222 L10.5,9.75 C10.5,9.33578644 10.8357864,9 11.25,9 Z M21.2497537,11.2682976 C21.6639673,11.2682976 21.9997537,11.604084 21.9997537,12.0182976 C21.9997537,12.3979933 21.7175998,12.7117885 21.3515242,12.7614509 L21.2497537,12.7682976 L19.7497537,12.7682976 C19.3355401,12.7682976 18.9997537,12.4325111 18.9997537,12.0182976 C18.9997537,11.6386018 19.2819076,11.3248066 19.6479831,11.2751442 L19.7497537,11.2682976 L21.2497537,11.2682976 Z M4.25024631,11.2394906 C4.66445987,11.2394906 5.00024631,11.5752771 5.00024631,11.9894906 C5.00024631,12.3691864 4.71809243,12.6829816 4.35201687,12.732644 L4.25024631,12.7394906 L2.75024631,12.7394906 C2.33603275,12.7394906 2.00024631,12.4037042 2.00024631,11.9894906 C2.00024631,11.6097949 2.28240019,11.2959997 2.64847575,11.2463372 L2.75024631,11.2394906 L4.25024631,11.2394906 Z M5.88987716,4.86836861 L5.97399559,4.94098676 L7.03465577,6.00164693 C7.32754899,6.29454015 7.32754899,6.76941388 7.03465577,7.0623071 C6.7683892,7.32857367 6.35172552,7.35277972 6.05811403,7.13492526 L5.97399559,7.0623071 L4.91333542,6.00164693 C4.6204422,5.70875371 4.6204422,5.23387998 4.91333542,4.94098676 C5.17960199,4.6747202 5.59626567,4.65051415 5.88987716,4.86836861 Z M19.0785457,4.94098676 C19.3448122,5.20725332 19.3690183,5.623917 19.1511638,5.9175285 L19.0785457,6.00164693 L18.0178855,7.0623071 C17.7249923,7.35520032 17.2501185,7.35520032 16.9572253,7.0623071 C16.6909588,6.79604054 16.6667527,6.37937686 16.8846072,6.08576536 L16.9572253,6.00164693 L18.0178855,4.94098676 C18.3107787,4.64809354 18.7856525,4.64809354 19.0785457,4.94098676 Z M12.0002463,1.98949062 C12.3799421,1.98949062 12.6937373,2.27164451 12.7433997,2.63772007 L12.7502463,2.73949062 L12.7502463,4.23949062 C12.7502463,4.65370419 12.4144599,4.98949062 12.0002463,4.98949062 C11.6205505,4.98949062 11.3067553,4.70733674 11.2570929,4.34126118 L11.2502463,4.23949062 L11.2502463,2.73949062 C11.2502463,2.32527706 11.5860327,1.98949062 12.0002463,1.98949062 Z"/></svg>';
const ICON_LOCAL_TIME_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256,0C114.6,0,0,114.6,0,256s114.6,256,256,256s256-114.6,256-256S397.4,0,256,0z M256,469.3 c-117.8,0-213.3-95.5-213.3-213.3c0-117.8,95.5-213.3,213.3-213.3c117.8,0,213.3,95.5,213.3,213.3 C469.3,373.8,373.8,469.3,256,469.3z M277.3,213.3v-128h-42.7V320l128-128l-32-32L277.3,213.3z"/></svg>';

const PLAYBACK_RATES = [0.1, 0.2, 0.5, 1, 2, 4, 8];

const SCALE_FILL_COLOR = "rgba(64, 59, 59, 1.0)";
const SPAN_THICKNESS_PX = 3;
const SPAN_MIN_WIDTH_PX = 2;
const SCALE_NOTCH_COLOR = "#bfbfbf";
const SCALE_TIME_COLOR = "#bfbfbf";

const TEMPLATE = `<div class="og-timeline">

  <div class="og-timeline-top">
  </div>

  <div class="og-timeline-frame">
    <div class="og-timeline-current">
      <div class="og-timeline-current-spin">
        <div class="og-timeline-current-arrow"></div>
      </div>
    </div>
    <div class="og-timeline-sun">
      <div class="og-timeline-sun-spin">
        <div class="og-timeline-sun-arrow"></div>
      </div>
    </div>
    <div class="og-timeline-scale"></div>
  </div>

  <div class="og-timeline-bottom">
    <div class="og-timeline-controls">
    </div>
    <div class="og-timeline-localtime">
    </div>
  </div>

</div>`;

type TimelineTouchMode =
    | typeof TOUCH_MODE_NONE
    | typeof TOUCH_MODE_CURRENT
    | typeof TOUCH_MODE_PINCH
    | typeof TOUCH_MODE_SCALE
    | typeof TOUCH_MODE_SUN;

interface ITimelineTouchPointer {
    pointerId: number;
    clientX: number;
    clientY: number;
}

class TimelineView extends View<TimelineModel> {
    public override events: EventsHandler<TimelineViewEventsList> & EventsHandler<ViewEventsList>;
    public fillStyle: string;
    public $controls: HTMLElement | null;
    protected _frameEl: HTMLElement | null;
    protected _currentEl: HTMLElement | null;
    protected _sunEl: HTMLElement | null;
    protected _canvasEl: HTMLCanvasElement;
    protected _ctx: CanvasRenderingContext2D;
    protected _spansCanvasEl: HTMLCanvasElement;
    protected _spansCtx: CanvasRenderingContext2D;
    protected _appliedFillStyle: string;
    protected _isMouseOver: boolean;
    protected _isDragging: boolean;
    protected _isCurrentDragging: boolean;
    protected _isCurrentMouseOver: boolean;
    protected _isSunDragging: boolean;
    protected _isSunMouseOver: boolean;
    protected _sunDate: Date;
    protected _sunTime: boolean;
    protected _minWidth: number;
    protected _canvasScale: number;
    protected _millisecondsInPixel: number;
    protected _clickPosX: number;
    protected _clickRangeStart: Date;
    protected _clickRangeEnd: Date;
    protected _clickCurrentDate: Date;
    protected _clickSunDate: Date;
    protected _clickTime: number;
    protected _clickDelay: number;
    protected _clickMoveTolerance: number;
    protected _touchMode: TimelineTouchMode;
    protected _touchPinchDistance: number;
    protected _touchPointers: Map<number, ITimelineTouchPointer>;
    protected _touchScalePointerId: number | null;
    protected _touchCurrentPointerId: number | null;
    protected _touchSunPointerId: number | null;
    protected _onResizeObserver_: () => void;
    protected _resizeObserver: ResizeObserver;
    protected _pauseBtn: ToggleButton;
    protected _playBtn: ToggleButton;
    protected _playBackBtn: ToggleButton;
    protected _multiplierEl: HTMLSelectElement | null;
    protected _buttons: ButtonGroup;
    protected _localTimeBtn: ToggleButton;
    protected _sunTimeBtn: ToggleButton;
    protected _visibility: boolean;

    constructor(options: ITimelineViewParams = {}) {
        super({
            template: TEMPLATE,
            model: new TimelineModel({
                rangeStart: options.rangeStart,
                rangeEnd: options.rangeEnd,
                current: options.currentDate,
                minDate: options.minDate,
                maxDate: options.maxDate
            })
        });

        //@ts-ignore
        this.events = this.events.registerNames(TIMELINEVIEW_EVENTS);

        this.fillStyle = options.fillStyle || SCALE_FILL_COLOR;

        this.$controls = null;

        this._frameEl = null;
        this._currentEl = null;
        this._sunEl = null;
        this._canvasEl = createCanvasHTML();
        this._ctx = this._canvasEl.getContext("2d")!;

        this._spansCanvasEl = createCanvasHTML();
        this._spansCanvasEl.classList.add("og-timeline-spans");
        this._spansCtx = this._spansCanvasEl.getContext("2d")!;
        this._appliedFillStyle = "";

        this._isMouseOver = false;
        this._isDragging = false;
        this._isCurrentDragging = false;
        this._isCurrentMouseOver = false;
        this._isSunDragging = false;
        this._isSunMouseOver = false;
        this._sunDate = this.model.current;
        this._sunTime = false;

        this._minWidth = 330;
        this._canvasScale = 2;

        this._millisecondsInPixel = 0;

        this._clickPosX = 0;
        this._clickRangeStart = new Date();
        this._clickRangeEnd = new Date();
        this._clickCurrentDate = new Date();
        this._clickSunDate = new Date();

        this._clickTime = 0;
        this._clickDelay = 450;
        this._clickMoveTolerance = CLICK_MOVE_TOLERANCE_PX;
        this._touchMode = TOUCH_MODE_NONE;
        this._touchPinchDistance = 0;
        this._touchPointers = new Map();
        this._touchScalePointerId = null;
        this._touchCurrentPointerId = null;
        this._touchSunPointerId = null;

        this._onResizeObserver_ = this._onResizeObserver.bind(this);
        this._resizeObserver = new ResizeObserver(this._onResizeObserver_);

        this._pauseBtn = new ToggleButton({
            classList: ["og-timeline-control_button"],
            icon: ICON_PAUSE_SVG,
            name: "pause"
        });

        this._playBtn = new ToggleButton({
            classList: ["og-timeline-control_button"],
            icon: ICON_PLAY_SVG,
            name: "play"
        });

        this._playBackBtn = new ToggleButton({
            classList: ["og-timeline-control_button"],
            icon: ICON_PLAY_BACK_SVG,
            name: "playback"
        });

        this._multiplierEl = null;

        this._buttons = new ButtonGroup({
            buttons: [this._pauseBtn, this._playBtn, this._playBackBtn]
        });

        this._localTimeBtn = new ToggleButton({
            classList: ["og-suncontrol-button", "og-timeline-localtime_button"],
            icon: ICON_LOCAL_TIME_SVG,
            title: "Local time"
        });

        this._sunTimeBtn = new ToggleButton({
            classList: ["og-suncontrol-button"],
            icon: ICON_SUN_TIME_SVG,
            title: "Sun time - Shift-drag to set"
        });

        this._visibility = false;
    }

    protected _onResizeObserver() {
        this.resize();
    }

    public get canvasScale(): number {
        return this._canvasScale;
    }

    public set canvasScale(scale: number) {
        if (scale !== this._canvasScale) {
            this._canvasScale = scale;
            this.resize();
        }
    }

    public resize() {
        this._resize();
        this.draw();
    }

    public override afterRender(parentNode: HTMLElement) {
        this.resize();
    }

    public override render(): this {
        super.render();

        this.$controls = this.select(".og-timeline-controls");

        this._frameEl = this.select(".og-timeline-frame");
        this._currentEl = this.select(".og-timeline-current");
        this._sunEl = this.select(".og-timeline-sun");
        this.select(".og-timeline-frame .og-timeline-scale")!.appendChild(this._canvasEl);
        this._frameEl!.insertBefore(this._spansCanvasEl, this._frameEl!.firstChild);

        this._resizeObserver.observe(this.el!);

        this.model.events.on("change", () => {
            this.draw();
        });

        this.model.events.on("current", (d: Date) => {
            this._drawCurrent();
            this.events.dispatch(this.events.setcurrent, d);
        });

        this.model.events.on("spanschange", this._drawSpans);

        this._canvasEl.addEventListener("mouseenter", this._onMouseEnter);
        this._canvasEl.addEventListener("mouseout", this._onMouseOut);
        this._canvasEl.addEventListener("pointerdown", this._onScalePointerDown);
        this._canvasEl.style.touchAction = "none";

        this._currentEl!.addEventListener("mouseenter", this._onCurrentMouseEnter);
        this._currentEl!.addEventListener("mouseout", this._onCurrentMouseOut);
        this._currentEl!.addEventListener("pointerdown", this._onCurrentPointerDown);
        this._currentEl!.style.touchAction = "none";

        this._sunEl!.addEventListener("mouseenter", this._onSunMouseEnter);
        this._sunEl!.addEventListener("mouseout", this._onSunMouseOut);
        this._sunEl!.addEventListener("pointerdown", this._onSunPointerDown);
        this._sunEl!.style.touchAction = "none";

        document.body.addEventListener("mousemove", this._onMouseMove);
        document.body.addEventListener("mousedown", this._onMouseDown);
        document.body.addEventListener("mouseup", this._onMouseUp);
        document.body.addEventListener("wheel", this._onMouseWheelFF);
        document.addEventListener("pointermove", this._onPointerMove);
        document.addEventListener("pointerup", this._onPointerUp);
        document.addEventListener("pointercancel", this._onPointerUp);

        this._playBackBtn.appendTo(this.$controls!);
        this._playBtn.appendTo(this.$controls!);
        this._pauseBtn.appendTo(this.$controls!);

        this._multiplierEl = this._createMultiplier();
        this.$controls!.appendChild(this._multiplierEl);

        this._syncPlayButtons();

        this.model.events.on("play", this._syncPlayButtons);
        this.model.events.on("stop", this._syncPlayButtons);

        this._buttons.events.on("change", (btn: ToggleButton) => {
            switch (btn.name) {
                case "play":
                    this.play();
                    break;
                case "playback":
                    this.playBack();
                    break;
                case "pause":
                    this.pause();
                    break;
            }
        });

        this._localTimeBtn.appendTo(this.select(".og-timeline-localtime")!);

        this._localTimeBtn.events.on("change", (isActive: boolean) => {
            this.events.dispatch(this.events.localtime, isActive);
        });

        this._sunTimeBtn.appendTo(this.select(".og-timeline-localtime")!);

        this._sunTimeBtn.events.on("change", (isActive: boolean) => {
            this._sunTime = isActive;
            this._drawSun();
            this.events.dispatch(this.events.suntime, isActive);
        });

        this._playBtn.events.on("change", (isActive: boolean) => {
            if (!isActive && !this._pauseBtn.isActive && !this._playBackBtn.isActive) {
                this.pause();
            }
        });

        this._playBackBtn.events.on("change", (isActive: boolean) => {
            if (!isActive && !this._pauseBtn.isActive && !this._playBtn.isActive) {
                this.pause();
            }
        });

        this.setVisibility(true);

        return this;
    }

    /**
     * True when the timeline scale is read as the local date and time at the viewed location.
     * @public
     * @type {boolean}
     */
    public get localTime(): boolean {
        return this._localTimeBtn.isActive;
    }

    public set localTime(localTime: boolean) {
        this._localTimeBtn.setActive(localTime, true);
    }

    /**
     * True while the Sun is set from its own marker instead of the timeline.
     * @public
     * @type {boolean}
     */
    public get sunTime(): boolean {
        return this._sunTime;
    }

    public set sunTime(sunTime: boolean) {
        this._sunTime = sunTime;
        this._sunTimeBtn.setActive(sunTime, true);
        this._drawSun();
    }

    /**
     * Date the Sun marker stands on.
     * @public
     * @type {Date}
     */
    public get sunDate(): Date {
        return this._sunDate;
    }

    public set sunDate(date: Date) {
        this._sunDate = date;
        this._drawSun();
    }

    public setVisibility(visibility: boolean) {
        if (visibility !== this._visibility) {
            this._visibility = visibility;
            if (this.el) {
                if (visibility) {
                    this.el.style.display = "block";
                } else {
                    this.el.style.display = "none";
                }
            }
            this.events.dispatch(this.events.visibility, visibility);
        }
    }

    protected _createMultiplier(): HTMLSelectElement {
        const el = document.createElement("select");

        el.className = "og-timeline-multiplier";
        el.title = "Playback rate";

        for (const rate of PLAYBACK_RATES) {
            const option = document.createElement("option");

            option.value = String(rate);
            option.textContent = `${rate}x`;

            el.appendChild(option);
        }

        el.addEventListener("change", () => {
            const rate = Number(el.value);
            this.model.multiplier = this.model.multiplier < 0 ? -rate : rate;
        });

        return el;
    }

    protected _syncMultiplier() {
        if (this._multiplierEl) {
            this._multiplierEl.value = String(Math.abs(this.model.multiplier));
        }
    }

    protected _syncPlayButtons = () => {
        const stopped = this.model.stopped();
        const backwards = this.model.multiplier < 0;

        this._pauseBtn.setActive(stopped, true);
        this._pauseBtn.preventClick = stopped;

        this._playBtn.setActive(!stopped && !backwards, true);
        this._playBtn.preventClick = false;

        this._playBackBtn.setActive(!stopped && backwards, true);
        this._playBackBtn.preventClick = false;

        this._syncMultiplier();
    };

    public reset() {
        this.model.stop();
        this.events.dispatch(this.events.reset, this.model);
    }

    public play() {
        this.model.multiplier = Math.abs(this.model.multiplier);
        this.model.play();
        this._syncPlayButtons();
        this.events.dispatch(this.events.play, this.model);
    }

    public pause() {
        this.model.stop();
        this._syncPlayButtons();
        this.events.dispatch(this.events.pause, this.model);
    }

    public playBack() {
        this.model.multiplier = -1 * Math.abs(this.model.multiplier);
        this.model.play();
        this._syncPlayButtons();
        this.events.dispatch(this.events.playback, this.model);
    }

    protected _onMouseWheel = (e: MouseEventExt) => {
        if (this._isMouseOver) {
            let rect = this._canvasEl.getBoundingClientRect();
            let pointerPosX = e.clientX - rect.left,
                pointerCenterOffsetX = -(pointerPosX - this.clientWidth * 0.5);
            let pointerTime = this.model.rangeStartTime + this._millisecondsInPixel * pointerPosX;
            this._zoom(pointerTime, pointerCenterOffsetX, Math.sign(e.wheelDelta!));
        } else if (this._isSunMouseOver) {
            let pointerCenterOffsetX = -(
                (this._sunDate.getTime() - this.model.rangeStartTime) / this._millisecondsInPixel -
                this.clientWidth * 0.5
            );
            this._zoom(this._sunDate.getTime(), pointerCenterOffsetX, Math.sign(e.wheelDelta!));
        } else if (this._isCurrentMouseOver) {
            let pointerCenterOffsetX = -(
                (this.model.currentTime - this.model.rangeStartTime) / this._millisecondsInPixel -
                this.clientWidth * 0.5
            );
            this._zoom(this.model.currentTime, pointerCenterOffsetX, Math.sign(e.wheelDelta!));
        }
    };

    protected _onMouseWheelFF = (e: MouseEventExt) => {
        this._onMouseWheel(e);
    };

    protected _zoom(pointerTime: number, pointerCenterOffsetX: number, dir: number) {
        this._zoomByScale(pointerTime, pointerCenterOffsetX, 1 - dir * 0.1);
    }

    protected _zoomByScale(pointerTime: number, pointerCenterOffsetX: number, scale: number) {
        if (!isFinite(scale) || scale <= 0) {
            return;
        }
        let centerTime = this.model.rangeStartTime + 0.5 * this.model.range;

        let centerTimeOffset = (pointerTime - centerTime) * MILLISECONDS_TO_SECONDS;

        let rangeStart = addSeconds(this.model.rangeStart, centerTimeOffset),
            rangeEnd = addSeconds(this.model.rangeEnd, centerTimeOffset);

        let shiftedRange = rangeEnd.getTime() - rangeStart.getTime();
        let scaledRange = shiftedRange * scale;
        let shiftedCenter = rangeStart.getTime() + shiftedRange * 0.5;
        let newRangeStart = new Date(shiftedCenter - scaledRange * 0.5);
        let newRangeEnd = new Date(shiftedCenter + scaledRange * 0.5);
        let msPx = scaledRange / this.clientWidth;

        if (msPx < 31536000000 && msPx > 0.1) {
            let timeOffset = msPx * pointerCenterOffsetX * MILLISECONDS_TO_SECONDS;

            this.model.set(addSeconds(newRangeStart, timeOffset), addSeconds(newRangeEnd, timeOffset));
        }
    }

    protected _startScaleDrag(
        clientX: number,
        sourceEvent: Event,
        allowClick: boolean = true,
        pointerId: number | null = this._touchScalePointerId
    ) {
        if (!this._isDragging) {
            this._isDragging = true;
            document.body.classList.add("og-timeline-unselectable");
            this.events.dispatch(this.events.startdrag, sourceEvent);
        }

        this._clickPosX = clientX;
        this._clickRangeStart = this.model.rangeStart;
        this._clickRangeEnd = this.model.rangeEnd;
        this._clickTime = allowClick ? Date.now() : 0;
        this._touchScalePointerId = pointerId;
    }

    protected _moveScaleDrag(clientX: number) {
        let offsetSec = (this._clickPosX - clientX) * this._millisecondsInPixel * MILLISECONDS_TO_SECONDS;
        this.model.set(addSeconds(this._clickRangeStart, offsetSec), addSeconds(this._clickRangeEnd, offsetSec));
    }

    protected _stopScaleDrag(clientX: number | null, allowClick: boolean = true) {
        if (!this._isDragging) {
            return;
        }

        this._isDragging = false;
        this._touchScalePointerId = null;
        document.body.classList.remove("og-timeline-unselectable");

        if (allowClick && clientX != null && this._isClickGesture(clientX)) {
            let current = this._setCurrentByClientX(clientX);
            this.events.dispatch(this.events.stopdrag, current);
            this.events.dispatch(this.events.setcurrent, current);
        } else {
            this.events.dispatch(this.events.stopdrag, this.model.current);
        }
    }

    protected _startCurrentDrag(
        clientX: number,
        sourceEvent: Event,
        pointerId: number | null = this._touchCurrentPointerId
    ) {
        if (!this._isCurrentDragging) {
            this._isCurrentDragging = true;
            document.body.classList.add("og-timeline-unselectable");
            this.events.dispatch(this.events.startdragcurrent, sourceEvent);
        }

        this._clickPosX = clientX;
        this._clickCurrentDate = this.model.current;
        this._touchCurrentPointerId = pointerId;
    }

    protected _moveCurrentDrag(clientX: number) {
        let offsetSec = (this._clickPosX - clientX) * this._millisecondsInPixel * MILLISECONDS_TO_SECONDS;
        let newCurrent = addSeconds(this._clickCurrentDate, -offsetSec);
        if (newCurrent >= this.model.rangeStart && newCurrent <= this.model.rangeEnd) {
            this.model.current = newCurrent;
        }
    }

    protected _stopCurrentDrag() {
        if (!this._isCurrentDragging) {
            return;
        }

        this._isCurrentDragging = false;
        this._touchCurrentPointerId = null;
        document.body.classList.remove("og-timeline-unselectable");
        this.events.dispatch(this.events.stopdragcurrent, this.model.current);
    }

    protected _startSunDrag(clientX: number, pointerId: number | null = this._touchSunPointerId) {
        if (!this._isSunDragging) {
            this._isSunDragging = true;
            document.body.classList.add("og-timeline-unselectable");
        }

        this._clickPosX = clientX;
        this._clickSunDate = this._sunDate;
        this._touchSunPointerId = pointerId;
    }

    /** The Sun marker carries its own date: the model, and everything reading it, stay put. */
    protected _moveSunDrag(clientX: number) {
        const offsetSec = (this._clickPosX - clientX) * this._millisecondsInPixel * MILLISECONDS_TO_SECONDS;
        const sunDate = addSeconds(this._clickSunDate, -offsetSec);

        if (sunDate >= this.model.rangeStart && sunDate <= this.model.rangeEnd) {
            this._sunDate = sunDate;
            this._drawSun();
            this.events.dispatch(this.events.sundate, sunDate);
        }
    }

    protected _stopSunDrag() {
        if (!this._isSunDragging) {
            return;
        }

        this._isSunDragging = false;
        this._touchSunPointerId = null;
        document.body.classList.remove("og-timeline-unselectable");
    }

    protected _isClickGesture(clientX: number): boolean {
        return (
            this._clickTime > 0 &&
            Math.abs(this._clickPosX - clientX) <= this._clickMoveTolerance &&
            Date.now() - this._clickTime < this._clickDelay
        );
    }

    protected _setSunByClientX(clientX: number): Date {
        const rect = this._canvasEl.getBoundingClientRect();
        const posX = Math.max(0, Math.min(clientX - rect.left, this.clientWidth));
        const sunDate = new Date(this.model.rangeStartTime + posX * this._millisecondsInPixel);

        this._sunDate = sunDate;
        this._drawSun();

        return sunDate;
    }

    protected _setCurrentByClientX(clientX: number): Date {
        let rect = this._canvasEl.getBoundingClientRect();
        let posX = Math.max(0, Math.min(clientX - rect.left, this.clientWidth));
        let current = new Date(this.model.rangeStartTime + posX * this._millisecondsInPixel);
        this.model.current = current;
        return current;
    }

    protected _captureTouchPointer(e: PointerEvent) {
        this._touchPointers.set(e.pointerId, {
            pointerId: e.pointerId,
            clientX: e.clientX,
            clientY: e.clientY
        });
        (e.currentTarget as Element | null)?.setPointerCapture?.(e.pointerId);
    }

    protected _updateTouchPointer(e: PointerEvent) {
        this._touchPointers.set(e.pointerId, {
            pointerId: e.pointerId,
            clientX: e.clientX,
            clientY: e.clientY
        });
    }

    protected _releaseTouchPointerCapture(pointerId: number) {
        if (this._canvasEl.hasPointerCapture(pointerId)) {
            this._canvasEl.releasePointerCapture(pointerId);
        }
        if (this._currentEl?.hasPointerCapture(pointerId)) {
            this._currentEl.releasePointerCapture(pointerId);
        }
    }

    protected _getFirstTouchPointer(): ITimelineTouchPointer | null {
        const iter = this._touchPointers.values();
        const first = iter.next();
        return first.done ? null : first.value;
    }

    protected _getTwoTouchPointers(): [ITimelineTouchPointer, ITimelineTouchPointer] | null {
        const iter = this._touchPointers.values();
        const first = iter.next();
        const second = iter.next();
        if (first.done || second.done) {
            return null;
        }
        return [first.value, second.value];
    }

    protected _getTouchPointer(pointerId: number | null): ITimelineTouchPointer | null {
        if (pointerId == null) {
            return null;
        }
        return this._touchPointers.get(pointerId) || null;
    }

    protected _getTouchDistance(t0: ITimelineTouchPointer, t1: ITimelineTouchPointer): number {
        return Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
    }

    protected _startPinchGesture(t0: ITimelineTouchPointer, t1: ITimelineTouchPointer, sourceEvent: Event) {
        this._startScaleDrag((t0.clientX + t1.clientX) * 0.5, sourceEvent, false, null);
        this._touchMode = TOUCH_MODE_PINCH;
        this._touchPinchDistance = this._getTouchDistance(t0, t1);
    }

    protected _movePinchGesture(t0: ITimelineTouchPointer, t1: ITimelineTouchPointer) {
        let distance = this._getTouchDistance(t0, t1);
        if (distance <= 0 || this._touchPinchDistance <= 0) {
            return;
        }

        let scale = this._touchPinchDistance / distance;
        if (scale < PINCH_SCALE_MIN) {
            scale = PINCH_SCALE_MIN;
        } else if (scale > PINCH_SCALE_MAX) {
            scale = PINCH_SCALE_MAX;
        }

        let centerX = (t0.clientX + t1.clientX) * 0.5;
        let rect = this._canvasEl.getBoundingClientRect();
        let pointerPosX = centerX - rect.left;
        let pointerCenterOffsetX = -(pointerPosX - this.clientWidth * 0.5);
        let pointerTime = this.model.rangeStartTime + this._millisecondsInPixel * pointerPosX;
        this._zoomByScale(pointerTime, pointerCenterOffsetX, scale);

        this._touchPinchDistance = distance;
    }

    protected _onMouseDown = (e: MouseEvent) => {
        if (this._isMouseOver) {
            if (e.shiftKey && this._sunTime) {
                this.events.dispatch(this.events.sundate, this._setSunByClientX(e.clientX));
                this._startSunDrag(e.clientX);
                return;
            }

            this._startScaleDrag(e.clientX, e);
        } else if (this._isSunMouseOver) {
            this._startSunDrag(e.clientX);
        } else if (this._isCurrentMouseOver) {
            this._startCurrentDrag(e.clientX, e);
        }
    };

    protected _onMouseUp = (e: MouseEvent) => {
        if (this._isDragging) {
            this._stopScaleDrag(e.clientX);
        } else if (this._isSunDragging) {
            this._stopSunDrag();
        } else if (this._isCurrentDragging) {
            this._stopCurrentDrag();
        }
    };

    protected _onMouseEnter = () => {
        this._isMouseOver = true;
    };

    protected _onMouseOut = () => {
        this._isMouseOver = false;
    };

    protected _onCurrentMouseEnter = () => {
        this._isCurrentMouseOver = true;
    };

    protected _onCurrentMouseOut = () => {
        this._isCurrentMouseOver = false;
    };

    protected _onSunMouseEnter = () => {
        this._isSunMouseOver = true;
    };

    protected _onSunMouseOut = () => {
        this._isSunMouseOver = false;
    };

    protected _onScalePointerDown = (e: PointerEvent) => {
        if (e.pointerType !== "touch") {
            return;
        }

        this._captureTouchPointer(e);

        if (this._isCurrentDragging || this._isSunDragging) {
            return;
        }

        const pointersCount = this._touchPointers.size;
        if (pointersCount === 1) {
            this._touchMode = TOUCH_MODE_SCALE;
            this._startScaleDrag(e.clientX, e, true, e.pointerId);
            e.preventDefault();
        } else if (pointersCount >= 2) {
            const pair = this._getTwoTouchPointers();
            if (pair) {
                this._startPinchGesture(pair[0], pair[1], e);
            }
            e.preventDefault();
        }
    };

    protected _onCurrentPointerDown = (e: PointerEvent) => {
        if (e.pointerType !== "touch") {
            return;
        }

        this._captureTouchPointer(e);

        if (this._touchPointers.size !== 1) {
            return;
        }

        this._touchMode = TOUCH_MODE_CURRENT;
        this._startCurrentDrag(e.clientX, e, e.pointerId);
        e.preventDefault();
    };

    protected _onSunPointerDown = (e: PointerEvent) => {
        if (e.pointerType !== "touch") {
            return;
        }

        this._captureTouchPointer(e);

        if (this._touchPointers.size !== 1) {
            return;
        }

        this._touchMode = TOUCH_MODE_SUN;
        this._startSunDrag(e.clientX, e.pointerId);
        e.preventDefault();
    };

    protected _onPointerMove = (e: PointerEvent) => {
        if (e.pointerType !== "touch" || !this._touchPointers.has(e.pointerId)) {
            return;
        }

        this._updateTouchPointer(e);

        if (this._touchMode === TOUCH_MODE_NONE) {
            return;
        }

        if (this._touchMode === TOUCH_MODE_CURRENT) {
            if (this._touchPointers.size === 1 && this._touchCurrentPointerId === e.pointerId) {
                this._moveCurrentDrag(e.clientX);
                e.preventDefault();
            }
            return;
        }

        if (this._touchMode === TOUCH_MODE_SUN) {
            if (this._touchPointers.size === 1 && this._touchSunPointerId === e.pointerId) {
                this._moveSunDrag(e.clientX);
                e.preventDefault();
            }
            return;
        }

        if (this._touchPointers.size >= 2) {
            const pair = this._getTwoTouchPointers();
            if (!pair) {
                return;
            }
            if (this._touchMode !== TOUCH_MODE_PINCH) {
                this._startPinchGesture(pair[0], pair[1], e);
            }
            this._movePinchGesture(pair[0], pair[1]);
            e.preventDefault();
            return;
        }

        if (this._touchPointers.size === 1) {
            const pointer = this._getTouchPointer(this._touchScalePointerId) || this._getFirstTouchPointer();
            if (!pointer) {
                return;
            }
            if (this._touchMode === TOUCH_MODE_PINCH) {
                this._touchMode = TOUCH_MODE_SCALE;
                this._startScaleDrag(pointer.clientX, e, false, pointer.pointerId);
            }
            if (this._touchMode === TOUCH_MODE_SCALE) {
                this._moveScaleDrag(pointer.clientX);
                e.preventDefault();
            }
        }
    };

    protected _onPointerUp = (e: PointerEvent) => {
        if (e.pointerType !== "touch") {
            return;
        }

        const endedPointer = this._touchPointers.get(e.pointerId) || {
            pointerId: e.pointerId,
            clientX: e.clientX,
            clientY: e.clientY
        };
        this._touchPointers.delete(e.pointerId);
        this._releaseTouchPointerCapture(e.pointerId);

        if (this._touchMode === TOUCH_MODE_NONE) {
            return;
        }

        if (this._touchMode === TOUCH_MODE_CURRENT) {
            if (this._touchPointers.size === 0) {
                this._stopCurrentDrag();
                this._touchMode = TOUCH_MODE_NONE;
                e.preventDefault();
            } else if (this._touchCurrentPointerId === e.pointerId) {
                const nextPointer = this._getFirstTouchPointer();
                if (nextPointer) {
                    this._startCurrentDrag(nextPointer.clientX, e, nextPointer.pointerId);
                }
            }
            return;
        }

        if (this._touchMode === TOUCH_MODE_SUN) {
            if (this._touchPointers.size === 0) {
                this._stopSunDrag();
                this._touchMode = TOUCH_MODE_NONE;
                e.preventDefault();
            } else if (this._touchSunPointerId === e.pointerId) {
                const nextPointer = this._getFirstTouchPointer();
                if (nextPointer) {
                    this._startSunDrag(nextPointer.clientX, nextPointer.pointerId);
                }
            }
            return;
        }

        if (this._touchPointers.size >= 2) {
            const pair = this._getTwoTouchPointers();
            if (!pair) {
                return;
            }
            if (this._touchMode !== TOUCH_MODE_PINCH) {
                this._startPinchGesture(pair[0], pair[1], e);
            }
            return;
        }

        if (this._touchPointers.size === 1) {
            const pointer = this._getFirstTouchPointer();
            if (!pointer) {
                return;
            }
            if (this._touchMode === TOUCH_MODE_PINCH) {
                this._touchMode = TOUCH_MODE_SCALE;
                this._startScaleDrag(pointer.clientX, e, false, pointer.pointerId);
                e.preventDefault();
            } else if (this._touchMode === TOUCH_MODE_SCALE && this._touchScalePointerId === e.pointerId) {
                this._startScaleDrag(pointer.clientX, e, false, pointer.pointerId);
            }
            return;
        }

        if (this._touchMode === TOUCH_MODE_PINCH) {
            this._stopScaleDrag(null, false);
        } else {
            this._stopScaleDrag(endedPointer.clientX, true);
        }
        this._touchMode = TOUCH_MODE_NONE;
        e.preventDefault();
    };

    protected _onMouseMove = (e: MouseEvent) => {
        if (this._isDragging) {
            this._moveScaleDrag(e.clientX);
        } else if (this._isSunDragging) {
            this._moveSunDrag(e.clientX);
        } else if (this._isCurrentDragging) {
            this._moveCurrentDrag(e.clientX);
        }
    };

    public get clientWidth(): number {
        return this._canvasEl ? this._canvasEl.width / this._canvasScale : 0;
    }

    public get clientHeight(): number {
        return this._canvasEl ? this._canvasEl.height / this._canvasScale : 0;
    }

    protected _resize() {
        if (this._frameEl) {
            for (const canvas of [this._canvasEl, this._spansCanvasEl]) {
                canvas.width = this._frameEl.clientWidth * this._canvasScale;
                canvas.height = this._frameEl.clientHeight * this._canvasScale;
                canvas.style.width = `${this._frameEl.clientWidth}px`;
                canvas.style.height = `${this._frameEl.clientHeight}px`;
            }
        }
    }

    public getOffsetByTime(milliseconds: number): number {
        return (milliseconds - this.model.rangeStartTime) / this._millisecondsInPixel;
    }

    protected _clearEvents() {
        this._canvasEl.removeEventListener("mouseenter", this._onMouseEnter);
        this._canvasEl.removeEventListener("mouseout", this._onMouseOut);
        this._canvasEl.removeEventListener("pointerdown", this._onScalePointerDown);

        if (this._currentEl) {
            this._currentEl.removeEventListener("mouseenter", this._onCurrentMouseEnter);
            this._currentEl.removeEventListener("mouseout", this._onCurrentMouseOut);
            this._currentEl.removeEventListener("pointerdown", this._onCurrentPointerDown);
        }

        document.body.removeEventListener("mousemove", this._onMouseMove);
        document.body.removeEventListener("mousedown", this._onMouseDown);
        document.body.removeEventListener("mouseup", this._onMouseUp);
        document.body.removeEventListener("wheel", this._onMouseWheelFF);
        document.removeEventListener("pointermove", this._onPointerMove);
        document.removeEventListener("pointerup", this._onPointerUp);
        document.removeEventListener("pointercancel", this._onPointerUp);

        for (const pointerId of this._touchPointers.keys()) {
            this._releaseTouchPointerCapture(pointerId);
        }
        this._touchPointers.clear();
        this._touchScalePointerId = null;
        this._touchCurrentPointerId = null;
        this._touchMode = TOUCH_MODE_NONE;
        document.body.classList.remove("og-timeline-unselectable");
    }

    public override remove() {
        this._clearEvents();
        this.model.events.off("play", this._syncPlayButtons);
        this.model.events.off("stop", this._syncPlayButtons);
        this.model.events.off("spanschange", this._drawSpans);
        this._resizeObserver.disconnect();
        super.remove();
        this.model.stop();
    }

    protected _clearCanvas() {
        this._applyScaleBackground();
        this._ctx.clearRect(0, 0, this.clientWidth * this._canvasScale, this.clientHeight * this._canvasScale);
    }

    protected _applyScaleBackground() {
        if (this._frameEl && this._appliedFillStyle !== this.fillStyle) {
            this._appliedFillStyle = this.fillStyle;
            this._frameEl.style.background = this.fillStyle;
        }
    }

    protected _drawSpans = () => {
        const width = this.clientWidth;
        const height = this.clientHeight;
        const scale = this._canvasScale;

        this._spansCtx.clearRect(0, 0, width * scale, height * scale);

        const laneCount = this.model.laneCount;

        if (!laneCount || !width) return;

        const pitch = Math.max(height / (laneCount + 1), SPAN_THICKNESS_PX);
        const top = (height - pitch * (laneCount + 1)) * 0.5;

        for (const span of this.model.getSpans()) {
            const left = this.getOffsetByTime(span.start.getTime());
            const right = this.getOffsetByTime(span.end.getTime());

            if (right < 0 || left > width) continue;

            const x = Math.max(0, left);
            const spanWidth = Math.max(Math.min(right, width) - x, SPAN_MIN_WIDTH_PX);
            const y = top + pitch * (span.lane + 1) - SPAN_THICKNESS_PX * 0.5;

            this._spansCtx.fillStyle = span.color;
            this._spansCtx.fillRect(x * scale, y * scale, spanWidth * scale, SPAN_THICKNESS_PX * scale);
        }
    };

    protected _drawCurrent() {
        let curPosX = (this.model.currentTime - this.model.rangeStartTime) / this._millisecondsInPixel;
        if (this.model.current < this.model.rangeStart || this.model.current > this.model.rangeEnd) {
            this._currentEl!.style.display = "none";
        } else {
            this._currentEl!.style.display = "block";
            this._currentEl!.style.transform = `translateX(${curPosX}px)`;
        }
    }

    protected _drawSun() {
        if (!this._sunEl || !this._millisecondsInPixel) return;

        if (!this._sunTime || this._sunDate < this.model.rangeStart || this._sunDate > this.model.rangeEnd) {
            this._sunEl.style.display = "none";
            return;
        }

        const posX = (this._sunDate.getTime() - this.model.rangeStartTime) / this._millisecondsInPixel;

        this._sunEl.style.display = "block";
        this._sunEl.style.transform = `translateX(${posX}px)`;
    }

    public draw() {
        this._millisecondsInPixel = this.model.range / this.clientWidth;
        let minWidthMs = this._minWidth * this._millisecondsInPixel;
        let scaleData = getScale(minWidthMs * MILLISECONDS_TO_SECONDS);
        if (scaleData) {
            this._clearCanvas();

            let scaleMs = scaleData[0] * SECONDS_TO_MILLISECONDS,
                scalePx = scaleMs / this._millisecondsInPixel,
                segCount = scaleData[1];

            let originTime = getNearestTimeLeft(this.model.rangeStartTime, scaleMs);

            let showMilliseconds = scaleData[0] < 1.0,
                showTime = scaleData[0] < 86400.0;

            for (let i = originTime, rangeEnd = this.model.rangeEndTime + scaleMs; i < rangeEnd; i += scaleMs) {
                let x = this.getOffsetByTime(i);
                if (x >= 0 && x <= this.clientWidth * this._canvasScale) {
                    drawNotch(
                        this._ctx,
                        x * this._canvasScale,
                        10 * this._canvasScale,
                        2 * this._canvasScale,
                        SCALE_NOTCH_COLOR
                    );
                }
                for (let j = 1; j < segCount; j++) {
                    let xx = x + j * (scalePx / segCount);
                    if (xx >= 0 && xx <= this.clientWidth * this._canvasScale) {
                        drawNotch(
                            this._ctx,
                            xx * this._canvasScale,
                            5 * this._canvasScale,
                            this._canvasScale,
                            SCALE_NOTCH_COLOR
                        );
                    }
                }
                drawText(
                    this._ctx,
                    dateToStr(new Date(i), showTime, showMilliseconds),
                    x * this._canvasScale,
                    26 * this._canvasScale,
                    "24px monospace",
                    SCALE_TIME_COLOR,
                    "center"
                );
            }

            this._drawCurrent();
            this._drawSun();
        }

        this._drawSpans();
    }
}

export { TimelineView };
