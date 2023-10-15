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
const LINE_WIDTH = 6;

interface IElevationProfileViewParams extends IViewParams {
    fillStyle?: string;
}

type ElevationProfileViewEventsList = [];

const ELEVATIONPROFILEVIEW_EVENTS: ElevationProfileViewEventsList = [];

const TEMPLATE = `<div class="og-elevationprofile"></div>`;


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
            for (let i = 1; i < coords.length; i++) {
                let pi = coords[i];
                ctx.lineTo(pi[0] * this._unitPx_x, (maxY - pi[1]) * this._unitPx_y);
            }
            ctx.stroke();
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
            for (let i = 1, len = coords.length; i < len; i++) {
                let pi = coords[i];
                ctx.lineTo(pi[0] * this._unitPx_x, (maxY - pi[1]) * this._unitPx_y);
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