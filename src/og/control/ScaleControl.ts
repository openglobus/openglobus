import {binarySearch, parseHTML} from "../utils/shared";
import {Control, IControlParams} from "./Control";
import {RADIANS} from "../math";
import {Vec2} from "../math/Vec2";
import {Vec3} from "../math/Vec3";
import {GlobusTerrain} from "../terrain/GlobusTerrain";

interface IScaleControlParams extends IControlParams {
    isCenter?: boolean
}

const scale: number[] = [
    1, 2, 3, 5, 10, 20, 30, 50, 100, 200, 300, 500, 1e3, 2e3, 3e3, 5e3, 10e3, 20e3, 30e3, 50e3,
    100e3, 200e3, 300e3, 500e3, 1000e3, 2000e3, 3000e3, 5000e3, 10000e3
];

const TEMPLATE = `<div class="og-scale-container">
      <div class="og-scale-label"></div>
      <div class="og-scale-ruler"></div>
    </div>`;

/**
 * Planet zoom buttons control.
 */
export class ScaleControl extends Control {

    public el: HTMLElement | null;
    protected _template: string;
    protected _minWidth: number;
    protected _maxWidth: number;
    protected _isCenter: boolean;
    protected _scaleLabelEl: HTMLElement | null;
    protected _mPx: number;
    protected currWidth: number;
    protected _metersInMinSize: number;

    constructor(options: IScaleControlParams = {}) {
        if (!options.name || options.name === "") {
            options.name = "scaleControl";
        }
        super(options);

        this._template = TEMPLATE;

        this._minWidth = 100;
        this._maxWidth = 150;

        this._isCenter = options.isCenter != undefined ? options.isCenter : true;

        this._mPx = 0
        this.currWidth = 0;
        this._metersInMinSize = 0;

        this.el = null;

        this._scaleLabelEl = null;
    }

    protected _renderTemplate() {
        return parseHTML(this._template)[0];
    }

    public override oninit() {
        this.el = this._renderTemplate()!;

        this._scaleLabelEl = this.el.querySelector<HTMLElement>(".og-scale-label")!;

        this.renderer!.div!.appendChild(this.el);

        if (this._isCenter) {
            this.planet!.camera.events.on("moveend", () => {
                this._drawScreen(this.planet!.renderer!.handler.getCenter());
            });

            !this.planet!.terrain!.isEmpty && (this.planet!.terrain as GlobusTerrain).events.on("loadend", () => {
                this._drawScreen(this.planet!.renderer!.handler.getCenter());
            });
        } else {
            this.renderer!.events.on("mousemove", (e: any) => {
                if (!e.leftButtonHold && !e.rightButtonHold) {
                    this._drawScreen(e);
                }
            });

            this.planet!.camera.events.on("moveend", () => {
                let ms = this.renderer!.events.mouseState;
                if (!ms.leftButtonHold && !ms.rightButtonHold) {
                    this._drawScreen(ms);
                }
            });
        }
    }

    protected _drawScreen(px: Vec2) {
        let cam = this.planet!.camera;
        let s0 = px;
        let dist = this.planet!.getDistanceFromPixel(s0) || 0;
        if (dist === 0) {
            s0 = cam.project(Vec3.ZERO);
            dist = this.planet!.getDistanceFromPixel(s0) || 0;
        }
        let p0 = cam.getForward().scaleTo(dist).addA(cam.eye);
        let tempSize = dist * Math.tan(cam.viewAngle * RADIANS);
        let p1 = p0.add(cam.getRight().scaleTo(tempSize));
        let s1 = cam.project(p1);
        this._mPx = tempSize / s1.distance(s0);

        let metersInMinSize = this._mPx * this._minWidth;

        let index = binarySearch(scale, metersInMinSize, (a: number, b: number) => a - b);
        if (index < 0) {
            index = ~index;
        }
        let minMeters = scale[index],
            maxMeters = scale[index + 1];

        let t = (minMeters - metersInMinSize) / (maxMeters - minMeters);
        this.currWidth = this._minWidth + t * (this._maxWidth - this._minWidth);

        if (minMeters > 1000) {
            this._scaleLabelEl!.innerText = `${minMeters / 1000} km`;
        } else {
            this._scaleLabelEl!.innerText = `${minMeters} m`;
        }

        this._metersInMinSize = metersInMinSize;

        this.el!.style.width = this.currWidth + "px";
    }
}
