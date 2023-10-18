import {EventsHandler} from "../../Events";
import {IViewParams, View, ViewEventsList} from '../../ui/View';
import {ElevationProfile, ElevationProfileDrawData} from './ElevationProfile';

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

type ElevationProfileViewEventsList = [];

const ELEVATIONPROFILEVIEW_EVENTS: ElevationProfileViewEventsList = [];

const TEMPLATE =
    `<div class="og-elevationprofile">
      <div class="og-elevationprofile-legend">
        <div class="og-elevationprofile-legend__row og-elevationprofile-legend__track">
          <div class="og-elevationprofile-square"></div>
          <div class="og-elevationprofile-value"></div>
          <div class="og-elevationprofile-units"></div>
        </div>
        <div class="og-elevationprofile-legend__row og-elevationprofile-legend__ground">
          <div class="og-elevationprofile-square"></div>
          <div class="og-elevationprofile-value"></div>
          <div class="og-elevationprofile-units"></div>
        </div>
        <div class="og-elevationprofile-legend__row og-elevationprofile-legend__warning">        
          <div class="og-elevationprofile-square"></div>
          <div class="og-elevationprofile-value"></div>
          <div class="og-elevationprofile-units"></div>
        </div>
        <div class="og-elevationprofile-legend__row og-elevationprofile-legend__collision">
          <div class="og-elevationprofile-square"></div>
          <div class="og-elevationprofile-value"></div>
          <div class="og-elevationprofile-units"></div>
        </div>
      </div>
    </div>`;


class ElevationProfileView extends View<ElevationProfile> {

    public override events: EventsHandler<ElevationProfileViewEventsList> & EventsHandler<ViewEventsList>;

    public fillStyle: string;

    protected _unitPx_x: number;
    protected _unitPx_y: number;
    protected _canvasScale: number;
    protected $canvas: HTMLCanvasElement;
    protected _ctx: CanvasRenderingContext2D;
    protected _onResizeObserver_: () => void;
    protected _resizeObserver: ResizeObserver;

    protected $groundValue: HTMLElement | null;
    protected $trackValue: HTMLElement | null;
    protected $warningValue: HTMLElement | null;
    protected $collisionValue: HTMLElement | null;

    protected $trackUnits: HTMLElement | null;
    protected $groundUnits: HTMLElement | null;
    protected $warningUnits: HTMLElement | null;
    protected $collisionUnits: HTMLElement | null;

    constructor(options: IElevationProfileViewParams = {}) {
        super({
            template: TEMPLATE,
            model: new ElevationProfile()
        });

        //@ts-ignore
        this.events = this.events.registerNames(ELEVATIONPROFILEVIEW_EVENTS);

        this.fillStyle = options.fillStyle || FILL_COLOR;

        this._unitPx_x = 0;
        this._unitPx_y = 0;
        this._canvasScale = 2;
        this.$canvas = document.createElement("canvas");
        this._ctx = this.$canvas.getContext('2d')!;

        this.$groundValue = null;
        this.$trackValue = null;
        this.$warningValue = null;
        this.$collisionValue = null;

        this.$trackUnits = null;
        this.$groundUnits = null;
        this.$warningUnits = null;
        this.$collisionUnits = null;

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

        this.model.events.on("profilecollected", (data: ElevationProfileDrawData) => {
            this.draw();
        });

        this.$trackValue = this.select(".og-elevationprofile-legend__track .og-elevationprofile-value");
        this.$groundValue = this.select(".og-elevationprofile-legend__ground .og-elevationprofile-value");
        this.$warningValue = this.select(".og-elevationprofile-legend__warning .og-elevationprofile-value");
        this.$collisionValue = this.select(".og-elevationprofile-legend__collision .og-elevationprofile-value");

        this.$trackUnits = this.select(".og-elevationprofile-legend__track .og-elevationprofile-units");
        this.$groundUnits = this.select(".og-elevationprofile-legend__ground .og-elevationprofile-units");
        this.$warningUnits = this.select(".og-elevationprofile-legend__warning .og-elevationprofile-units");
        this.$collisionUnits = this.select(".og-elevationprofile-legend__collision .og-elevationprofile-units");

        // this.$canvas.addEventListener("mouseenter", this._onMouseEnter);
        // this.$canvas.addEventListener("mouseout", this._onMouseOut);
        //
        // document.body.addEventListener("mousemove", this._onMouseMove);
        // document.body.addEventListener("mousedown", this._onMouseDown);
        // document.body.addEventListener("mouseup", this._onMouseUp);
        // document.body.addEventListener("wheel", this._onMouseWheelFF);

        return this;
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
        }
    }

    public clearCanvas() {
        this._ctx.fillStyle = this.fillStyle;
        this._ctx.fillRect(0, 0, this.clientWidth * this._canvasScale, this.clientHeight * this._canvasScale);
    }

    public _updateUnits() {
        this._unitPx_x = this._canvasScale * this.clientWidth / (this.model.maxX - this.model.minX);
        this._unitPx_y = this._canvasScale * this.clientHeight / (this.model.maxY - this.model.minY);

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
            ctx.moveTo(p0[0] * this._unitPx_x, (maxY - p0[1]) * this._unitPx_y);
            let trackLength = 0;
            for (let i = 1; i < coords.length; i++) {
                let pi = coords[i];
                ctx.lineTo(pi[0] * this._unitPx_x, (maxY - pi[1]) * this._unitPx_y);
                let prevP = coords[i - 1];
                let a = pi[0] - prevP[0],
                    b = pi[1] - prevP[1],
                    aa = a * a,
                    bb = b * b;
                trackLength += Math.sqrt(aa + bb);
            }
            ctx.stroke();

            this.$trackValue!.innerText = trackLength.toFixed(1);
            this.$trackUnits!.innerText = 'm';
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
            ctx.moveTo(0, this.$canvas.height);
            ctx.lineTo(p0[0] * this._unitPx_x, (maxY - p0[1]) * this._unitPx_y);
            let groundLength = 0;
            console.log(coords);
            for (let i = 1, len = coords.length; i < len; i++) {
                let pi = coords[i];
                ctx.lineTo(pi[0] * this._unitPx_x, (maxY - pi[1]) * this._unitPx_y);
                let prevP = coords[i - 1];
                let a = pi[0] - prevP[0],
                    b = pi[1] - prevP[1],
                    aa = a * a,
                    bb = b * b;
                groundLength += Math.sqrt(aa + bb);
            }

            ctx.lineTo(this.$canvas.width, this.$canvas.height);
            ctx.closePath();
            ctx.stroke();
            ctx.save();
            ctx.fillStyle = TERRAIN_FILL_COLOR;
            ctx.globalAlpha = TERRAIN_ALPHA;
            ctx.fill();
            ctx.restore();
            ctx.globalAlpha = 1;

            this.$groundValue!.innerText = groundLength.toFixed(1);
            this.$groundUnits!.innerText = 'm';
        }
    }

    private _drawWarningAndCollision(coords: number[][]) {
        let ctx = this._ctx;
        if (ctx && coords.length > 1) {
            let maxY = this.model.maxY;
            ctx.lineWidth = LINE_WIDTH;
            ctx.beginPath();
            for (let i = 0, len = coords.length - 1; i < len; i++) {
                if (coords[i][2] > 0 && coords[i + 1][2] > 0) {

                    let pi0 = coords[i],
                        pi1 = coords[i + 1];

                    if (pi0[2] > pi1[2]) {
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.strokeStyle = LINE_COLORS[pi1[2]];
                    } else if (pi0[2] !== 0) {
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.strokeStyle = LINE_COLORS[pi0[2]];
                    }

                    ctx.moveTo(pi0[0] * this._unitPx_x, (maxY - pi0[1]) * this._unitPx_y);
                    ctx.lineTo(pi1[0] * this._unitPx_x, (maxY - pi1[1]) * this._unitPx_y);
                }
            }
            ctx.stroke();
        }
    }
}

export {ElevationProfileView};