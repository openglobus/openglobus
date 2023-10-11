import {EventsHandler} from "../../Events";
import {ButtonGroup} from "../../ui/ButtonGroup";
import {IViewParams, View, ViewEventsList} from '../../ui/View';
import {ElevationProfile} from './ElevationProfile';
import {MouseEventExt} from "../../input/MouseHandler";

const FILL_COLOR = "rgba(64, 59, 59, 1.0)";

interface IElevationProfileViewParams extends IViewParams {
    fillStyle?: string;
}

type ElevationProfileViewEventsList = [
    'xxx'
];

const ELEVATIONPROFILEVIEW_EVENTS: ElevationProfileViewEventsList = [
    'xxx'
];

const TEMPLATE = `<div class="og-elevationprofile"></div>`;


class ElevationProfileView extends View<ElevationProfile> {

    public override events: EventsHandler<ElevationProfileViewEventsList> & EventsHandler<ViewEventsList>;

    public fillStyle: string;
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

    public override afterRender(parentNode: HTMLElement) {
        this.resize();
    }

    public override render(): this {
        super.render();

        this._resizeObserver.observe(this.el!);

        this.el!.appendChild(this.$canvas);

        // this.model.events.on("change", () => {
        //     this.draw()
        // });
        //
        // this.model.events.on("current", (d: Date) => {
        //     this._drawCurrent();
        //     this.events.dispatch(this.events.setcurrent, d);
        // });

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


    protected _clearCanvas() {
        this._ctx.fillStyle = this.fillStyle;
        this._ctx.fillRect(0, 0, this.clientWidth * this._canvasScale, this.clientHeight * this._canvasScale);
    }

    public draw() {
        this._clearCanvas();
    }
}

export {ElevationProfileView};