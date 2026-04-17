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
    "visibility"
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
    "visibility"
];

const ICON_PLAY_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" style="fill: black;"/></svg>';
const ICON_PAUSE_SVG =
    '<?xml version="1.0" ?><!DOCTYPE svg  PUBLIC \'-//W3C//DTD SVG 1.1//EN\'  \'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\'><svg enable-background="new 0 0 512 512" height="512px" version="1.1" viewBox="0 0 512 512" width="512px" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="Layer_6"><rect fill="#252525" height="320" width="60" x="153" y="96"/><rect fill="#252525" height="320" width="60" x="299" y="96"/></g></svg>';

const SCALE_FILL_COLOR = "rgba(64, 59, 59, 1.0)";
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
    <div class="og-timeline-scale"></div>
  </div>

  <div class="og-timeline-bottom">
    <div class="og-timeline-controls">
    </div>
  </div>

</div>`;

type TimelineTouchMode =
    | typeof TOUCH_MODE_NONE
    | typeof TOUCH_MODE_CURRENT
    | typeof TOUCH_MODE_PINCH
    | typeof TOUCH_MODE_SCALE;

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
    protected _canvasEl: HTMLCanvasElement;
    protected _ctx: CanvasRenderingContext2D;
    protected _isMouseOver: boolean;
    protected _isDragging: boolean;
    protected _isCurrentDragging: boolean;
    protected _isCurrentMouseOver: boolean;
    protected _minWidth: number;
    protected _canvasScale: number;
    protected _millisecondsInPixel: number;
    protected _clickPosX: number;
    protected _clickRangeStart: Date;
    protected _clickRangeEnd: Date;
    protected _clickCurrentDate: Date;
    protected _clickTime: number;
    protected _clickDelay: number;
    protected _clickMoveTolerance: number;
    protected _touchMode: TimelineTouchMode;
    protected _touchPinchDistance: number;
    protected _touchPointers: Map<number, ITimelineTouchPointer>;
    protected _touchScalePointerId: number | null;
    protected _touchCurrentPointerId: number | null;
    protected _onResizeObserver_: () => void;
    protected _resizeObserver: ResizeObserver;
    protected _pauseBtn: ToggleButton;
    protected _playBtn: ToggleButton;
    protected _buttons: ButtonGroup;
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
        this._canvasEl = createCanvasHTML();
        this._ctx = this._canvasEl.getContext("2d")!;

        this._isMouseOver = false;
        this._isDragging = false;
        this._isCurrentDragging = false;
        this._isCurrentMouseOver = false;

        this._minWidth = 330;
        this._canvasScale = 2;

        this._millisecondsInPixel = 0;

        this._clickPosX = 0;
        this._clickRangeStart = new Date();
        this._clickRangeEnd = new Date();
        this._clickCurrentDate = new Date();

        this._clickTime = 0;
        this._clickDelay = 450;
        this._clickMoveTolerance = CLICK_MOVE_TOLERANCE_PX;
        this._touchMode = TOUCH_MODE_NONE;
        this._touchPinchDistance = 0;
        this._touchPointers = new Map();
        this._touchScalePointerId = null;
        this._touchCurrentPointerId = null;

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

        this._buttons = new ButtonGroup({
            buttons: [this._pauseBtn, this._playBtn]
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
        this.select(".og-timeline-frame .og-timeline-scale")!.appendChild(this._canvasEl);

        this._resizeObserver.observe(this.el!);

        this.model.events.on("change", () => {
            this.draw();
        });

        this.model.events.on("current", (d: Date) => {
            this._drawCurrent();
            this.events.dispatch(this.events.setcurrent, d);
        });

        this._canvasEl.addEventListener("mouseenter", this._onMouseEnter);
        this._canvasEl.addEventListener("mouseout", this._onMouseOut);
        this._canvasEl.addEventListener("pointerdown", this._onScalePointerDown);
        this._canvasEl.style.touchAction = "none";

        this._currentEl!.addEventListener("mouseenter", this._onCurrentMouseEnter);
        this._currentEl!.addEventListener("mouseout", this._onCurrentMouseOut);
        this._currentEl!.addEventListener("pointerdown", this._onCurrentPointerDown);
        this._currentEl!.style.touchAction = "none";

        document.body.addEventListener("mousemove", this._onMouseMove);
        document.body.addEventListener("mousedown", this._onMouseDown);
        document.body.addEventListener("mouseup", this._onMouseUp);
        document.body.addEventListener("wheel", this._onMouseWheelFF);
        document.addEventListener("pointermove", this._onPointerMove);
        document.addEventListener("pointerup", this._onPointerUp);
        document.addEventListener("pointercancel", this._onPointerUp);

        this._playBtn.appendTo(this.$controls!);
        this._pauseBtn.appendTo(this.$controls!);

        if (this.model.stopped()) {
            this._pauseBtn.setActive(true, true);
            this._pauseBtn.preventClick = true;
        } else {
            this._playBtn.setActive(true, true);
            this._playBtn.preventClick = true;
        }

        this._buttons.events.on("change", (btn: ToggleButton) => {
            switch (btn.name) {
                case "play":
                    this.play();
                    break;
                case "pause":
                    this.pause();
                    break;
            }
        });

        // let mltView = new View({
        //     template: `<div class="og-timeline-multiplier">
        //                 <select>
        //                     <option value="0.25">0.25</option>
        //                     <option value="0.5">0.5</option>
        //                     <option value="1" selected>1.0</option>
        //                     <option value="2">2.0</option>
        //                     <option value="3">3.0</option>
        //                     <option value="5">5.0</option>
        //                 </select>
        //                 </div>`
        // });

        //mltView.appendTo($ctl)

        // let multiplierEl = this.select(".og-timeline-multiplier select");
        //
        // multiplierEl.value = this.model.multiplier.toString();
        // multiplierEl.addEventListener("change", (e) => {
        //     this.model.multiplier = Math.sign(this.model.multiplier) * Number(e.target.value);
        // });

        this.setVisibility(true);

        return this;
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

    public reset() {
        this.model.stop();
        this.events.dispatch(this.events.reset, this.model);
    }

    public play() {
        this.model.multiplier = Math.abs(this.model.multiplier);
        this.model.play();
        this.events.dispatch(this.events.play, this.model);
    }

    public pause() {
        this.model.stop();
        this.events.dispatch(this.events.pause, this.model);
    }

    public playBack() {
        this.model.multiplier = -1 * Math.abs(this.model.multiplier);
        this.model.play();
        this.events.dispatch(this.events.playback, this.model);
    }

    protected _onMouseWheel = (e: MouseEventExt) => {
        if (this._isMouseOver) {
            let rect = this._canvasEl.getBoundingClientRect();
            let pointerPosX = e.clientX - rect.left,
                pointerCenterOffsetX = -(pointerPosX - this.clientWidth * 0.5);
            let pointerTime = this.model.rangeStartTime + this._millisecondsInPixel * pointerPosX;
            this._zoom(pointerTime, pointerCenterOffsetX, Math.sign(e.wheelDelta!));
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

    protected _isClickGesture(clientX: number): boolean {
        return (
            this._clickTime > 0 &&
            Math.abs(this._clickPosX - clientX) <= this._clickMoveTolerance &&
            Date.now() - this._clickTime < this._clickDelay
        );
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
            this._startScaleDrag(e.clientX, e);
        } else if (this._isCurrentMouseOver) {
            this._startCurrentDrag(e.clientX, e);
        }
    };

    protected _onMouseUp = (e: MouseEvent) => {
        if (this._isDragging) {
            this._stopScaleDrag(e.clientX);
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

    protected _onScalePointerDown = (e: PointerEvent) => {
        if (e.pointerType !== "touch") {
            return;
        }

        this._captureTouchPointer(e);

        if (this._isCurrentDragging) {
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
            this._canvasEl.width = this._frameEl.clientWidth * this._canvasScale;
            this._canvasEl.height = this._frameEl.clientHeight * this._canvasScale;
            this._canvasEl.style.width = `${this._frameEl.clientWidth}px`;
            this._canvasEl.style.height = `${this._frameEl.clientHeight}px`;
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
        this._resizeObserver.disconnect();
        super.remove();
        this.model.stop();
    }

    protected _clearCanvas() {
        this._ctx.fillStyle = this.fillStyle;
        this._ctx.fillRect(0, 0, this.clientWidth * this._canvasScale, this.clientHeight * this._canvasScale);
    }

    protected _drawCurrent() {
        let curPosX = (this.model.currentTime - this.model.rangeStartTime) / this._millisecondsInPixel;
        if (this.model.current < this.model.rangeStart || this.model.current > this.model.rangeEnd) {
            this._currentEl!.style.display = "none";
        } else {
            this._currentEl!.style.display = "block";
            this._currentEl!.style.transform = `translateX(${curPosX}px)`;
        }
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
        }
    }
}

export { TimelineView };
