import { RADIANS } from "../math";
import { Vec3 } from "../math/Vec3";
import { binarySearch, parseHTML } from "../utils/shared";
import { Control } from "./Control";

const scale = [
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
    _template: string;
    _minWidth: number;
    _maxWidth: number;
    _isCenter: any;
    el: HTMLElement | null = null;
    _scaleLabelEl: any;
    _mPx = 0;
    currWidth: any;
    _metersInMinSize = 0;
    constructor(options: { name?: string, isCenter?: boolean } = {}) {
        if (!options.name || options.name === "") {
            options.name = "scaleControl";
        }
        super(options);

        this._template = TEMPLATE;

        this.planet = null;

        this._minWidth = 100;
        this._maxWidth = 150;

        this._isCenter = options.isCenter != undefined ? options.isCenter : true;
    }

    _renderTemplate() {
        return parseHTML(this._template)[0];
    }

    override oninit() {
        this.el = this._renderTemplate();

        this._scaleLabelEl = this.el.querySelector(".og-scale-label");

        this.renderer.div.appendChild(this.el);

        if (this._isCenter) {
            this.renderer.activeCamera.events.on("moveend", () => {
                this._drawScreen(this.planet!.renderer!.handler.getCenter());
            });

            !this.planet!.terrain!.isEmpty && (this.planet!.terrain as any).events.on("loadend", () => {
                this._drawScreen(this.planet!.renderer!.handler.getCenter());
            });
        } else {
            this.renderer.events.on("mousemove", (e: any) => {
                if (!e.leftButtonHold && !e.rightButtonHold) {
                    this._drawScreen(e);
                }
            });

            this.renderer.activeCamera.events.on("moveend", () => {
                let ms = this.renderer.events.mouseState;
                if (!ms.leftButtonHold && !ms.rightButtonHold) {
                    this._drawScreen(ms);
                }
            });
        }
    }

    _drawScreen(px: any) {
        let cam = this.renderer.activeCamera;
        let s0 = px;
        let dist = this.planet!.getDistanceFromPixel(s0) || 0;
        if (dist === 0) {
            s0 = cam.project(Vec3.ZERO);
            dist = this.planet!.getDistanceFromPixel(s0) || 0;
        }
        let p0 = cam.getForward().scaleTo(dist).addA(cam.eye);
        let tempSize = dist * Math.tan(cam._viewAngle * RADIANS);
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
            this._scaleLabelEl.innerText = `${minMeters / 1000} km`;
        } else {
            this._scaleLabelEl.innerText = `${minMeters} m`;
        }

        this._metersInMinSize = metersInMinSize;

        (this.el as any).style.width = this.currWidth + "px";
    }
}

/**
 * @deprecated
 */
export const scaleControl = (options: any) => new ScaleControl(options);
