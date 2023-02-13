'use strict';

import { View } from '../../ui/View.js';
import { TimelineModel } from './TimelineModel.js';
import {
    addSeconds,
    createCanvasHTML,
    dateToStr,
    drawNotch,
    drawText,
    getNearestTimeLeft,
    getScale
} from './timelineUtils.js';

const SECONDS_TO_MILLISECONDS = 1000.0;
const MILLISECONDS_TO_SECONDS = 1.0 / SECONDS_TO_MILLISECONDS;
const EVENT_LIST = [
    'startdrag',
    'stopdrag',
    'startdragcurrent',
    'stopdragcurrent',
    'setcurrent',
    'reset',
    'play',
    'playback',
    'pause',
    'visibility'
];

const SCALE_FILL_COLOR = "rgba(64, 59, 59, 1.0)";
const SCALE_NOTCH_COLOR = "#bfbfbf";
const SCALE_TIME_COLOR = "#bfbfbf";

const TEMPLATE =
    `<div class="og-timeline">

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

class TimelineView extends View {

    constructor(options = {}) {
        super({
            template: TEMPLATE,
            eventList: EVENT_LIST,
            model: new TimelineModel({
                rangeStart: options.rangeStart,
                rangeEnd: options.rangeEnd,
                current: options.currentDate,
                minDate: options.minDate,
                maxDate: options.maxDate
            })
        });

        this.fillStyle = options.fillStyle || SCALE_FILL_COLOR;

        this._frameEl = null;
        this._currentEl = null;
        this._canvasEl = createCanvasHTML();
        this._ctx = this._canvasEl.getContext('2d');

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

        this._onResizeObserver_ = this._onResizeObserver.bind(this);
        this._resizeObserver = new ResizeObserver(this._onResizeObserver_);

        // this._resetBtn = new ButtonView({
        //     icon: "stop",
        //     title: "Stop",
        //     className: "og-timeline-btn og-timeline-reset",
        // });

        // this._playBackBtn = new ButtonView({
        //     icon: "play",
        //     title: "play back",
        //     tag: "timeline",
        //     togglable: true,
        //     className: "og-timeline-btn og-timeline-play_back"
        // });

        // this._pauseBtn = new ButtonView({
        //     icon: "pause",
        //     title: "pause",
        //     tag: "timeline",
        //     togglable: true,
        //     className: "og-timeline-btn og-timeline-pause",
        //     isAlways: true,
        //     active: true
        // });

        // this._playBtn = new ButtonView({
        //     icon: "play",
        //     title: "Play",
        //     tag: "timeline",
        //     togglable: true,
        //     className: "og-timeline-btn"
        // });

        this._visibility = null;
    }

    _onResizeObserver() {
        this.resize();
    }

    get canvasScale() {
        return this._canvasScale;
    }

    set canvasScale(scale) {
        if (scale !== this._canvasScale) {
            this._canvasScale = scale;
            this.resize();
        }
    }

    resize() {
        this._resize();
        this.draw();
    }

    afterRender(parentNode) {
        this.resize();
    }

    render() {
        super.render();

        this._frameEl = this.select(".og-timeline-frame");
        this._currentEl = this.select(".og-timeline-current");
        this.select(".og-timeline-frame .og-timeline-scale").appendChild(this._canvasEl);

        this._resizeObserver.observe(this.el);

        this.model.on("change", () => {
            this.draw()
        });

        this.model.on("current", (d) => {
            this._drawCurrent();
            this._events.dispatch(this._events.setcurrent, d);
        });

        this._canvasEl.addEventListener("mouseenter", this._onMouseEnter.bind(this));
        this._canvasEl.addEventListener("mouseout", this._onMouseOut.bind(this));

        this._currentEl.addEventListener("mouseenter", this._onCurrentMouseEnter.bind(this));
        this._currentEl.addEventListener("mouseout", this._onCurrentMouseOut.bind(this));

        document.body.addEventListener("mousemove", this._onMouseMove.bind(this));
        document.body.addEventListener("mousedown", this._onMouseDown.bind(this));
        document.body.addEventListener("mouseup", this._onMouseUp.bind(this));
        document.body.addEventListener("mousewheel", this._onMouseWheel.bind(this));

        // this._resetBtn.on("click", (e, btn) => {
        //     this.reset();
        // });

        // this._playBackBtn.on("toggle", (e, btn) => {
        //     if (btn.isActive()) {
        //         this.playBack();
        //     } else {
        //         this._pauseBtn.setActive(true);
        //     }
        // });

        // this._pauseBtn.on("toggle", (e, btn) => {
        //     this.pause();
        // });

        // this._playBtn.on("toggle", (e, btn) => {
        //     if (btn.isActive()) {
        //         this.play();
        //     } else {
        //         this._pauseBtn.setActive(true);
        //     }
        // });

        //let $ctl = this.select(".og-timeline-controls");

        // this._resetBtn.appendTo($ctl);
        // this._playBackBtn.appendTo($ctl);
        // this._pauseBtn.appendTo($ctl);
        // this._playBtn.appendTo($ctl);

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

    setVisibility(visibility) {
        if (visibility !== this._visibility) {
            this._visibility = visibility;
            if (visibility) {
                this.el.style.display = "block";
            } else {
                this.el.style.display = "none";
            }
            this._events.dispatch(this._events.visibility, visibility);
        }
    }

    reset() {
        //this._pauseBtn.setActive(true);
        this._events.dispatch(this._events.reset, this.model);
    }

    play() {
        this.model.multiplier = Math.abs(this.model.multiplier);
        this.model.play();
        this._events.dispatch(this._events.play, this.model);
    }

    pause() {
        this.model.stop();
        this._events.dispatch(this._events.pause, this.model);
    }

    playBack() {
        this.model.multiplier = -1 * Math.abs(this.model.multiplier);
        this.model.play();
        this._events.dispatch(this._events.playback, this.model);
    }

    _onMouseWheel(e) {
        if (this._isMouseOver) {
            let rect = this._canvasEl.getBoundingClientRect();
            let pointerPosX = e.clientX - rect.left,
                pointerCenterOffsetX = -(pointerPosX - this.clientWidth * 0.5);
            let pointerTime = this.model.rangeStartTime + this._millisecondsInPixel * pointerPosX;
            this._zoom(pointerTime, pointerCenterOffsetX, Math.sign(e.wheelDelta));
        } else if (this._isCurrentMouseOver) {
            let pointerCenterOffsetX = -((this.model.currentTime - this.model.rangeStartTime) / this._millisecondsInPixel - this.clientWidth * 0.5);
            this._zoom(this.model.currentTime, pointerCenterOffsetX, Math.sign(e.wheelDelta));
        }
    }

    _zoom(pointerTime, pointerCenterOffsetX, dir) {
        let centerTime = this.model.rangeStartTime + 0.5 * this.model.range;

        let centerTimeOffset = (pointerTime - centerTime) * MILLISECONDS_TO_SECONDS;

        let rangeStart = addSeconds(this.model.rangeStart, centerTimeOffset),
            rangeEnd = addSeconds(this.model.rangeEnd, centerTimeOffset);

        let delta = ((rangeEnd.getTime() - rangeStart.getTime()) / 20) * MILLISECONDS_TO_SECONDS;

        let newRangeStart = addSeconds(rangeStart, delta * dir);
        let newRangeEnd = addSeconds(rangeEnd, -delta * dir);
        let msPx = (newRangeEnd.getTime() - newRangeStart.getTime()) / this.clientWidth;

        if (msPx < 31536000000 && msPx > 0.1) {
            let timeOffset = msPx * pointerCenterOffsetX * MILLISECONDS_TO_SECONDS;

            this.model.set(
                addSeconds(newRangeStart, timeOffset),
                addSeconds(newRangeEnd, timeOffset)
            );
        }
    }

    _onMouseDown(e) {
        if (this._isMouseOver) {
            this._isDragging = true;
            document.body.classList.add("og-timeline-unselectable");

            this._clickPosX = e.clientX;
            this._clickTime = Date.now();

            this._clickRangeStart = this.model.rangeStart;
            this._clickRangeEnd = this.model.rangeEnd;

            this._events.dispatch(this._events.startdrag, e);
        } else if (this._isCurrentMouseOver) {
            this._isCurrentDragging = true;
            document.body.classList.add("og-timeline-unselectable");

            this._clickPosX = e.clientX;

            this._clickCurrentDate = this.model.current;

            this._events.dispatch(this._events.startdragcurrent, e);
        }
    }

    _onMouseUp(e) {
        if (this._isDragging) {
            this._isDragging = false;
            document.body.classList.remove("og-timeline-unselectable");
            if (this._clickPosX === e.clientX && (Date.now() - this._clickTime) < this._clickDelay) {
                let rect = this._canvasEl.getBoundingClientRect();
                let current = new Date(this.model.rangeStartTime + (e.clientX - rect.left) * this._millisecondsInPixel);
                this.model.current = current;
                this._events.dispatch(this._events.stopdrag, current);
                this._events.dispatch(this._events.setcurrent, current);
            } else {
                this._events.dispatch(this._events.stopdrag, this.model.current);
            }
        } else if (this._isCurrentDragging) {
            this._isCurrentDragging = false;
            document.body.classList.remove("og-timeline-unselectable");
            this._events.dispatch(this._events.stopdragcurrent, this.model.current);
        }
    }

    _onMouseEnter() {
        this._isMouseOver = true;
    }

    _onMouseOut() {
        this._isMouseOver = false;
    }

    _onCurrentMouseEnter() {
        this._isCurrentMouseOver = true;
    }

    _onCurrentMouseOut() {
        this._isCurrentMouseOver = false;
    }

    _onMouseMove(e) {
        if (this._isDragging) {
            let offsetSec = (this._clickPosX - e.clientX) * this._millisecondsInPixel * MILLISECONDS_TO_SECONDS;
            this.model.set(addSeconds(this._clickRangeStart, offsetSec), addSeconds(this._clickRangeEnd, offsetSec))
        } else if (this._isCurrentDragging) {
            let offsetSec = (this._clickPosX - e.clientX) * this._millisecondsInPixel * MILLISECONDS_TO_SECONDS;
            let newCurrent = addSeconds(this._clickCurrentDate, -offsetSec);
            if (newCurrent >= this.model.rangeStart && newCurrent <= this.model.rangeEnd) {
                this.model.current = addSeconds(this._clickCurrentDate, -offsetSec);
            }
        }
    }

    get clientWidth() {
        return this._canvasEl ? this._canvasEl.width / this._canvasScale : 0;
    }

    get clientHeight() {
        return this._canvasEl ? this._canvasEl.height / this._canvasScale : 0;
    }

    _resize() {
        if (this._canvasEl && this._frameEl) {
            this._canvasEl.width = this._frameEl.clientWidth * this._canvasScale;
            this._canvasEl.height = this._frameEl.clientHeight * this._canvasScale;
            this._canvasEl.style.width = `${this._frameEl.clientWidth}px`;
            this._canvasEl.style.height = `${this._frameEl.clientHeight}px`;
        }
    }

    getOffsetbyTime(milliseconds) {
        return (milliseconds - this.model.rangeStartTime) / this._millisecondsInPixel;
    }

    remove() {
        super.remove();
        this.model.stop();
    }

    _clearCanvas() {
        if (this._ctx) {
            this._ctx.fillStyle = this.fillStyle;
            this._ctx.fillRect(0, 0, this.clientWidth * this._canvasScale, this.clientHeight * this._canvasScale);
        }
    }

    _drawCurrent() {
        let curPosX = (this.model.currentTime - this.model.rangeStartTime) / this._millisecondsInPixel;
        if (this.model.current < this.model.rangeStart || this.model.current > this.model.rangeEnd) {
            this._currentEl.style.display = "none";
        } else {
            this._currentEl.style.display = "block";
            this._currentEl.style.transform = `translateX(${curPosX}px)`;
        }
    }

    draw() {
        if (this._ctx) {
            this._millisecondsInPixel = (this.model.range / this.clientWidth);
            let minWidthMs = this._minWidth * this._millisecondsInPixel;
            let scaleData = getScale(minWidthMs * MILLISECONDS_TO_SECONDS);
            if (scaleData) {

                this._clearCanvas();

                let scaleMs = scaleData[0] * SECONDS_TO_MILLISECONDS,
                    scalePx = scaleMs / this._millisecondsInPixel,
                    segCount = scaleData[1];

                let originTime = getNearestTimeLeft(this.model.rangeStartTime, scaleMs);

                let showMillisconds = scaleData[0] < 1.0,
                    showTime = scaleData[0] < 86400.0;

                for (let i = originTime, rangeEnd = this.model.rangeEndTime + scaleMs; i < rangeEnd; i += scaleMs) {
                    let x = this.getOffsetbyTime(i);
                    if (x >= 0 && x <= this.clientWidth * this._canvasScale) {
                        drawNotch(this._ctx, x * this._canvasScale, 10 * this._canvasScale, 2 * this._canvasScale, SCALE_NOTCH_COLOR);
                    }
                    for (let j = 1; j < segCount; j++) {
                        let xx = x + j * (scalePx / segCount);
                        if (xx >= 0 && xx <= this.clientWidth * this._canvasScale) {
                            drawNotch(this._ctx, xx * this._canvasScale, 5 * this._canvasScale, 1 * this._canvasScale, SCALE_NOTCH_COLOR);
                        }
                    }
                    drawText(this._ctx, dateToStr(new Date(i), showTime, showMillisconds), x * this._canvasScale, 26 * this._canvasScale, "24px monospace", SCALE_TIME_COLOR, "center");
                }

                this._drawCurrent();
            }
        }
    }
}

export { TimelineView }
