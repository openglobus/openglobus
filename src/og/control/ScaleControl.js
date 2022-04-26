/**
 * @module og/control/ZoomControl
 */

"use strict";

import { Control } from "./Control.js";
import { RADIANS } from "../math.js";
import { binarySearch, parseHTML } from "../utils/shared.js";

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
 * @class
 * @extends {Control}
 * @params {Object} [options] - Control options.
 */
class ScaleControl extends Control {
    constructor(options = {}) {
        if (!options.name || options.name === "") {
            options.name = "scaleControl";
        }
        super(options);
        options = options || {};

        this._template = TEMPLATE;

        this.planet = null;

        this._minWidth = 100;
        this._maxWidth = 150;
    }

    _renderTemplate() {
        return parseHTML(this._template)[0];
    }

    oninit() {
        this.el = this._renderTemplate();

        this._scaleLabelEl = this.el.querySelector(".og-scale-label");

        this.renderer.div.appendChild(this.el);

        this.renderer.events.on("draw", (e) => {
            if (e.events.pointerEvent()) {
                this._draw();
            }
        });

        this.renderer.activeCamera.events.on("moveend", (e) => {
            this._draw(e);
        });
    }

    _draw(e) {
        let cam = this.renderer.activeCamera;
        let s0 = this.planet.renderer.handler.getCenter();
        let dist = this.planet.getDistanceFromPixel(s0);
        let p0 = cam.getForward().scaleTo(dist).addA(cam.eye);
        let tempSize = dist * Math.tan(cam._viewAngle * RADIANS);
        let p1 = p0.add(cam.getRight().scaleTo(tempSize));
        let s1 = cam.project(p1);
        this._mPx = tempSize / s1.distance(s0);

        let metersInMinSize = this._mPx * this._minWidth;

        let index = binarySearch(scale, metersInMinSize, (a, b) => a - b);
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

        this.el.style.width = this.currWidth + "px";
    }
}

export function scaleControl(options) {
    return new ScaleControl(options);
}

export { ScaleControl };
