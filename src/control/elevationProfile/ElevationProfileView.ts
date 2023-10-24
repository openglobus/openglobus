import {EventsHandler} from "../../Events";
import {IViewParams, View, ViewEventsList} from '../../ui/View';
import {
    SAFE,
    WARNING,
    COLLISION,
    ElevationProfile,
    ElevationProfileDrawData,
    GroundItem,
    TrackItem
} from './ElevationProfile';
import {distanceFormatExt, binarySearch} from "../../utils/shared";
import {MouseEventExt} from "../../input/MouseHandler";

const FILL_COLOR = "rgb(45, 45, 45)";
const TRACK_COLOR = "rgb(0, 255, 50)";
const TERRAIN_COLOR = "rgb(198, 198, 198)";
const TERRAIN_FILL_COLOR = "rgb(64, 68, 82)";
const WARNING_COLOR = "rgb(255, 255, 0)";
const COLLISION_COLOR = "rgb(255, 0, 0)";
const LINE_COLORS = [TERRAIN_COLOR, WARNING_COLOR, COLLISION_COLOR];
const TERRAIN_ALPHA = 0.5;
const LINE_WIDTH = 5;

interface IElevationProfileViewParams extends IViewParams {
    fillStyle?: string;
}

type ElevationProfileViewEventsList = ["startdrag", "stopdrag"];

const ELEVATIONPROFILEVIEW_EVENTS: ElevationProfileViewEventsList = ["startdrag", "stopdrag"];

const TEMPLATE =
    `<div class="og-elevationprofile">
      <div class="og-elevationprofile-legend">
        <div class="og-elevationprofile-legend__row og-elevationprofile-legend__track">
          <div class="og-elevationprofile-square"></div>
          <div class="og-elevationprofile-value">0</div>
          <div class="og-elevationprofile-units">m</div>
        </div>
        <div class="og-elevationprofile-legend__row og-elevationprofile-legend__ground">
          <div class="og-elevationprofile-square"></div>
          <div class="og-elevationprofile-value">0</div>
          <div class="og-elevationprofile-units">m</div>
        </div>
        <div class="og-elevationprofile-legend__row og-elevationprofile-legend__warning">        
          <div class="og-elevationprofile-square"></div>
          <div class="og-elevationprofile-value">0</div>
          <div class="og-elevationprofile-units">m</div>
        </div>
        <div class="og-elevationprofile-legend__row og-elevationprofile-legend__collision">
          <div class="og-elevationprofile-square"></div>
          <div class="og-elevationprofile-value">0</div>
          <div class="og-elevationprofile-units">m</div>
        </div>
      </div>
    </div>`;


class ElevationProfileView extends View<ElevationProfile> {

    public override events: EventsHandler<ElevationProfileViewEventsList> & EventsHandler<ViewEventsList>;

    public fillStyle: string;

    protected _pixelsInMeter_x: number;
    protected _pixelsInMeter_y: number;
    protected _canvasScale: number;
    public $canvas: HTMLCanvasElement;
    public $pointerCanvas: HTMLCanvasElement;
    protected _ctx: CanvasRenderingContext2D;
    protected _pointerCtx: CanvasRenderingContext2D;
    protected _onResizeObserver_: () => void;
    protected _resizeObserver: ResizeObserver;

    public $groundValue: HTMLElement | null;
    public $trackValue: HTMLElement | null;
    public $warningValue: HTMLElement | null;
    public $collisionValue: HTMLElement | null;

    protected $trackUnits: HTMLElement | null;
    protected $groundUnits: HTMLElement | null;
    protected $warningUnits: HTMLElement | null;
    protected $collisionUnits: HTMLElement | null;

    protected _isMouseOver: boolean;
    protected _isDragging: boolean;

    protected _clickPosX: number;
    protected _clickLeftDistance: number;
    protected _clickRightDistance: number;

    protected _leftDistance: number;
    protected _rightDistance: number;

    protected _customFrame: boolean;

    constructor(options: IElevationProfileViewParams = {}) {
        super({
            template: TEMPLATE,
            model: new ElevationProfile()
        });

        //@ts-ignore
        this.events = this.events.registerNames(ELEVATIONPROFILEVIEW_EVENTS);

        this.fillStyle = options.fillStyle || FILL_COLOR;

        this._customFrame = false;
        this._leftDistance = 0;
        this._rightDistance = 0;
        this._pixelsInMeter_x = 0;
        this._pixelsInMeter_y = 0;
        this._canvasScale = 2;
        this.$canvas = document.createElement("canvas");
        this.$canvas.style.position = "absolute";
        this._ctx = this.$canvas.getContext('2d')!;

        this.$pointerCanvas = document.createElement("canvas");
        this.$pointerCanvas.style.pointerEvents = "none";
        this.$pointerCanvas.style.position = "absolute";
        this._pointerCtx = this.$pointerCanvas.getContext('2d')!;

        this.$groundValue = null;
        this.$trackValue = null;
        this.$warningValue = null;
        this.$collisionValue = null;

        this.$trackUnits = null;
        this.$groundUnits = null;
        this.$warningUnits = null;
        this.$collisionUnits = null;

        this._isMouseOver = false;
        this._isDragging = false;
        this._clickPosX = 0;
        this._clickLeftDistance = 0;
        this._clickRightDistance = 0;

        this._onResizeObserver_ = this._onResizeObserver.bind(this);
        this._resizeObserver = new ResizeObserver(this._onResizeObserver_);
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

    //public override afterRender(parentNode: HTMLElement) {
    //this.resize();
    //}

    public override render(): this {
        super.render();

        this._resizeObserver.observe(this.el!);

        this.el!.appendChild(this.$canvas);
        this.el!.appendChild(this.$pointerCanvas);

        this.model.events.on("profilecollected", (data: ElevationProfileDrawData) => {
            this.clearPointerCanvas();
            this.draw();
        });

        this.model.events.on("clear", () => {
            this._customFrame = false;
            this._leftDistance = 0;
            this._clearLegend();
            this.clearCanvas();
            this.clearPointerCanvas();
        });

        this.$trackValue = this.select(".og-elevationprofile-legend__track .og-elevationprofile-value");
        this.$groundValue = this.select(".og-elevationprofile-legend__ground .og-elevationprofile-value");
        this.$warningValue = this.select(".og-elevationprofile-legend__warning .og-elevationprofile-value");
        this.$collisionValue = this.select(".og-elevationprofile-legend__collision .og-elevationprofile-value");

        this.$trackUnits = this.select(".og-elevationprofile-legend__track .og-elevationprofile-units");
        this.$groundUnits = this.select(".og-elevationprofile-legend__ground .og-elevationprofile-units");
        this.$warningUnits = this.select(".og-elevationprofile-legend__warning .og-elevationprofile-units");
        this.$collisionUnits = this.select(".og-elevationprofile-legend__collision .og-elevationprofile-units");

        this.$canvas.addEventListener("mouseenter", this._onMouseEnter);
        this.$canvas.addEventListener("mouseout", this._onMouseOut);

        this.$canvas.addEventListener("mousemove", this._onCanvasMouseMove);
        document.body.addEventListener("mousemove", this._onMouseMove);
        document.body.addEventListener("mousedown", this._onMouseDown);
        document.body.addEventListener("mouseup", this._onMouseUp);
        document.body.addEventListener("wheel", this._onMouseWheelFF);

        return this;
    }

    protected _onMouseEnter = () => {
        this._isMouseOver = true;
    }

    protected _onMouseOut = () => {
        this._isMouseOver = false;
    }

    protected _onMouseDown = (e: MouseEvent) => {
        if (this._isMouseOver) {
            this._isDragging = true;
            document.body.classList.add("og-timeline-unselectable");

            this._clickPosX = e.clientX;

            if (!this._customFrame) {
                this._leftDistance = this.model.minX;
                this._rightDistance = this.model.maxX;
            }

            this._clickLeftDistance = this._leftDistance;
            this._clickRightDistance = this._rightDistance;

            this.events.dispatch(this.events.startdrag, e);
        }
    }

    protected _onMouseUp = (e: MouseEvent) => {
        if (this._isDragging) {
            this._isDragging = false;
            document.body.classList.remove("og-timeline-unselectable");
            this.events.dispatch(this.events.stopdrag, e);
        }
    }

    protected _onCanvasMouseMove = (e: MouseEvent) => {
        if (this.model.pointsReady) {
            if (!this._isDragging) {
                let rect = this.$pointerCanvas.getBoundingClientRect();
                let x = e.clientX - rect.left;
                this.redrawPointerCanvas(x);
            } else {
                this.clearPointerCanvas();
            }
        }
    }

    public redrawPointerCanvas(x: number) {
        this.clearPointerCanvas();


        let pointerDistance = this.model.minX + (this.model.maxX - this.model.minX) * x / this.clientWidth;

        //this.model.drawData;
        if (pointerDistance < 0) {
            pointerDistance = 0;
            x = (0 - this.model.minX) * this.clientWidth / (this.model.maxX - this.model.minX);
        } else if (pointerDistance > this.model.planeDistance) {
            pointerDistance = this.model.planeDistance;
            x = (pointerDistance - this.model.minX) * this.clientWidth / (this.model.maxX - this.model.minX);
        }

        let ctx = this._pointerCtx;

        // Vertical grey line
        ctx.lineWidth = 3;
        ctx.strokeStyle = "grey";
        ctx.beginPath();
        ctx.moveTo(x * this._canvasScale, 0);
        ctx.lineTo(x * this._canvasScale, this.clientHeight * this._canvasScale);
        ctx.stroke();

        // Ground point

        let groundData = this.model.drawData[1];
        let groundPoiIndex = -1 * binarySearch(groundData, pointerDistance, (a: number, b: GroundItem) => {
            return a - b[0];
        });

        console.log(groundData[groundPoiIndex]);

        // distance from the begining label
        ctx.fillStyle = "white";
        ctx.font = `${28 / devicePixelRatio}px Arial`;
        ctx.textAlign = "right";
        let distStr = distanceFormatExt(pointerDistance);
        ctx.fillText(`${distStr[0]} ${distStr[1]}`, (x - 5) * this._canvasScale, (this.clientHeight - 5) * this._canvasScale);
    }

    protected _onMouseMove = (e: MouseEvent) => {
        if (this._isDragging) {
            let offset = (this._clickPosX - e.clientX);
            let distanceOffset = offset * this._canvasScale / this._pixelsInMeter_x;
            this.setFrame(this._clickLeftDistance + distanceOffset, this._clickRightDistance + distanceOffset);
        }
    }

    protected _onMouseWheelFF = (e: MouseEventExt) => {
        this._onMouseWheel(e);
    }
    protected _onMouseWheel = (e: MouseEventExt) => {
        if (this._isMouseOver) {

            if (!this._customFrame) {
                this._leftDistance = this.model.minX;
                this._rightDistance = this.model.maxX;
            }

            this._customFrame = true;

            let padDist = Math.sign(e.wheelDelta!) * (this._rightDistance - this._leftDistance) / 20;

            let rect = this.$canvas.getBoundingClientRect();
            let pointerPosX = e.clientX - rect.left,
                pointerCenterOffsetX = pointerPosX - this.$canvas.clientWidth * 0.5;
            let distanceCenterOffsetX = pointerCenterOffsetX * this._canvasScale / this._pixelsInMeter_x;

            // Move distance under pointer to a screen center
            let leftDistance = distanceCenterOffsetX + this._leftDistance + padDist;
            let rightDistance = distanceCenterOffsetX + this._rightDistance - padDist;

            // move center back to the mouse pointer
            distanceCenterOffsetX = -pointerCenterOffsetX * (rightDistance - leftDistance) / this.clientWidth;

            this.setFrame(leftDistance + distanceCenterOffsetX, rightDistance + distanceCenterOffsetX);

            this.redrawPointerCanvas(pointerPosX);
        }
    }


    public get clientWidth(): number {
        return this.$canvas ? this.$canvas.width / this._canvasScale : 0;
    }

    public get clientHeight(): number {
        return this.$canvas ? this.$canvas.height / this._canvasScale : 0;
    }

    protected _resize() {
        if (this.el) {
            this.$canvas.width = this.el.clientWidth * this._canvasScale;
            this.$canvas.height = this.el.clientHeight * this._canvasScale;
            this.$canvas.style.width = `${this.el.clientWidth}px`;
            this.$canvas.style.height = `${this.el.clientHeight}px`;

            this.$pointerCanvas.width = this.el.clientWidth * this._canvasScale;
            this.$pointerCanvas.height = this.el.clientHeight * this._canvasScale;
            this.$pointerCanvas.style.width = `${this.el.clientWidth}px`;
            this.$pointerCanvas.style.height = `${this.el.clientHeight}px`;
        }
    }

    public clearPointerCanvas() {
        this._pointerCtx.fillStyle = "rgba(0,0,0,0)";
        this._pointerCtx.clearRect(0, 0, this.clientWidth * this._canvasScale, this.clientHeight * this._canvasScale);
    }

    public clearCanvas() {
        const grd = this._ctx.createLinearGradient(0, 0, 0, this.clientHeight * this._canvasScale);
        grd.addColorStop(0, "black");
        grd.addColorStop(1, this.fillStyle);

        this._ctx.fillStyle = grd;
        this._ctx.fillRect(0, 0, this.clientWidth * this._canvasScale, this.clientHeight * this._canvasScale);
    }

    protected _clearLegend() {
        this.$trackValue && (this.$trackValue.innerText = "0");
        this.$trackUnits && (this.$trackUnits.innerText = "m");
        this.$groundValue && (this.$groundValue.innerText = "0");
        this.$groundUnits && (this.$groundUnits.innerText = "m");
        this.$warningValue && (this.$warningValue.innerText = "0");
        this.$warningUnits && (this.$warningUnits.innerText = "m");
        this.$collisionValue && (this.$collisionValue.innerText = "0");
        this.$collisionUnits && (this.$collisionUnits.innerText = "m");
    }


    public setFrame(leftDistance: number, rightDistance: number) {
        this._leftDistance = leftDistance;
        this._rightDistance = rightDistance;
        this._customFrame = true;
        this._pixelsInMeter_x = this._canvasScale * this.clientWidth / (this._rightDistance - this._leftDistance);
        this.model.setRange(leftDistance, rightDistance);
        this.draw();
    }

    public _updateUnits() {
        if (!this._customFrame) {
            this._pixelsInMeter_x = this._canvasScale * this.clientWidth / (this.model.maxX - this.model.minX);
        }
        this._pixelsInMeter_y = this._canvasScale * this.clientHeight / (this.model.maxY - this.model.minY);
    }

    public clear() {
        this.model.clear();
        this._clearLegend();
        this.clearCanvas();
    }

    public draw() {
        let trackCoords = this.model.drawData[0];
        if (trackCoords.length > 1) {

            this._updateUnits();

            let groundCoords = this.model.drawData[1];

            this.clearCanvas();

            //
            // Draw track
            //
            this._drawLine(trackCoords);

            //
            // Draw terrain
            //
            this._drawTerrain(groundCoords);

            //
            // Draw warning and collision
            //
            this._drawWarningAndCollision(groundCoords);
        } else {
            this.clearCanvas();
        }
    }

    private _drawLine(coords: number[][]) {
        let p0 = coords[0];
        let ctx = this._ctx;
        if (ctx) {
            const maxY = this.model.maxY;
            ctx.lineWidth = LINE_WIDTH;
            ctx.strokeStyle = TRACK_COLOR;
            ctx.beginPath();
            ctx.moveTo((-this._leftDistance + p0[0]) * this._pixelsInMeter_x, (maxY - p0[1]) * this._pixelsInMeter_y);
            let trackLength = 0;
            for (let i = 1; i < coords.length; i++) {
                let pi = coords[i];
                ctx.lineTo((-this._leftDistance + pi[0]) * this._pixelsInMeter_x, (maxY - pi[1]) * this._pixelsInMeter_y);
                let prevP = coords[i - 1];
                let a = pi[0] - prevP[0],
                    b = pi[1] - prevP[1],
                    aa = a * a,
                    bb = b * b;
                trackLength += Math.sqrt(aa + bb);
            }
            ctx.stroke();

            let dist = distanceFormatExt(trackLength);
            this.$trackValue!.innerText = dist[0];
            this.$trackUnits!.innerText = dist[1];
        }
    }

    private _drawTerrain(coords: number[][]) {
        let p0 = coords[0];
        let ctx = this._ctx;
        if (ctx) {
            const maxY = this.model.maxY;
            ctx.lineWidth = LINE_WIDTH;
            ctx.strokeStyle = TERRAIN_COLOR;
            ctx.beginPath();
            ctx.moveTo((-this._leftDistance + p0[0]) * this._pixelsInMeter_x, this.$canvas.height);
            ctx.lineTo((-this._leftDistance + p0[0]) * this._pixelsInMeter_x, (maxY - p0[1]) * this._pixelsInMeter_y);
            let groundLength = 0;
            for (let i = 1, len = coords.length; i < len; i++) {
                let pi = coords[i];
                ctx.lineTo((-this._leftDistance + pi[0]) * this._pixelsInMeter_x, (maxY - pi[1]) * this._pixelsInMeter_y);
                let prevP = coords[i - 1];
                let a = pi[0] - prevP[0],
                    b = pi[1] - prevP[1],
                    aa = a * a,
                    bb = b * b;
                groundLength += Math.sqrt(aa + bb);
            }

            ctx.lineTo((-this._leftDistance + coords[coords.length - 1][0]) * this._pixelsInMeter_x, this.$canvas.height);
            ctx.closePath();
            ctx.stroke();
            ctx.save();
            ctx.fillStyle = TERRAIN_FILL_COLOR;
            ctx.globalAlpha = TERRAIN_ALPHA;
            ctx.fill();
            ctx.restore();
            ctx.globalAlpha = 1;

            let dist = distanceFormatExt(groundLength);
            this.$groundValue!.innerText = dist[0];
            this.$groundUnits!.innerText = dist[1];
        }
    }

    private _drawWarningAndCollision(coords: number[][]) {
        let ctx = this._ctx;
        if (ctx && coords.length > 1) {
            let maxY = this.model.maxY;
            ctx.lineWidth = LINE_WIDTH;
            ctx.beginPath();

            let warningLength = 0,
                collisionLength = 0;

            for (let i = 0, len = coords.length - 1; i < len; i++) {

                let pi0 = coords[i],
                    pi1 = coords[i + 1];

                if (pi0[2] !== SAFE && pi1[2] !== SAFE) {

                    // if (pi0[2] > pi1[2]) {
                    //     ctx.stroke();
                    //     ctx.beginPath();
                    //     ctx.strokeStyle = LINE_COLORS[pi1[2]];
                    // } else if (pi0[2] !== 0) {
                    //     ctx.stroke();
                    //     ctx.beginPath();
                    //     ctx.strokeStyle = LINE_COLORS[pi0[2]];
                    // }
                    let a = pi1[0] - pi0[0],
                        b = pi1[1] - pi0[1],
                        aa = a * a,
                        bb = b * b;

                    if (pi0[2] === COLLISION) {
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.strokeStyle = LINE_COLORS[COLLISION];
                        collisionLength += Math.sqrt(aa + bb);
                    } else if (pi0[2] === WARNING) {
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.strokeStyle = LINE_COLORS[WARNING];
                        warningLength += Math.sqrt(aa + bb);
                    }

                    ctx.moveTo((-this._leftDistance + pi0[0]) * this._pixelsInMeter_x, (maxY - pi0[1]) * this._pixelsInMeter_y);
                    ctx.lineTo((-this._leftDistance + pi1[0]) * this._pixelsInMeter_x, (maxY - pi1[1]) * this._pixelsInMeter_y);
                }
            }
            ctx.stroke();

            let warningDist = distanceFormatExt(warningLength);
            this.$warningValue!.innerText = warningDist[0];
            this.$warningUnits!.innerText = warningDist[1];

            let collisionDist = distanceFormatExt(collisionLength);
            this.$collisionValue!.innerText = collisionDist[0];
            this.$collisionUnits!.innerText = collisionDist[1];
        }
    }
}

export {ElevationProfileView};