/**
 * @module og/control/ZoomControl
 */

'use strict';

import { Control } from './Control.js';
import { RADIANS } from '../math.js';
import { binarySearch } from '../utils/shared.js';

const scale = [
    1,
    2,
    3,
    5,
    10,
    20,
    30,
    50,
    100,
    200,
    300,
    500,
    1e3,
    2e3,
    3e3,
    5e3,
    10e3,
    20e3,
    30e3,
    50e3,
    100e3,
    200e3,
    300e3,
    500e3,
    1000e3,
    2000e3,
    3000e3,
    5000e3,
    10000e3
];

/**
 * Planet zoom buttons control.
 * @class
 * @extends {og.control.Control}
 * @params {Object} [options] - Control options.
 */
class ScaleControl extends Control {
    constructor(options = {}) {
        if (!options.name || options.name === "") {
            options.name = "scaleControl";
        }
        super(options);
        options = options || {};

        this.planet = null;

        this._minWidth = 100;
        this._maxWidth = 150;
    }

    oninit() {

        this.el = document.createElement('div');

        this.el.style.position = "absolute";
        this.el.style.backgroundColor = "white";
        this.el.style.height = "5px";
        this.el.style.width = "0";

        this.el.style.right = "88px";
        this.el.style.bottom = "68px";

        this.renderer.div.appendChild(this.el);

        this.renderer.events.on("draw", this._draw, this);
    }

    _draw(e) {
        let cam = this.renderer.activeCamera;
        let s0 = this.planet.renderer.handler.getCenter();
        let dist = this.planet.getDistanceFromPixel(s0, true);
        let p0 = cam.getForward().scaleTo(dist).addA(cam.eye);
        let tempSize = dist * Math.tan(cam._viewAngle * 0.25 * RADIANS);
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

        let minWidth = this._minWidth * minMeters / metersInMinSize;

        let t = (metersInMinSize - minMeters) / (maxMeters - minMeters);
        this.currWidth = this._minWidth + t * (this._maxWidth - this._minWidth);

        this.currScale = minMeters;

        this.el.style.width = this.currWidth + "px";
        this._metersInMinSize = metersInMinSize;
    }
}

export function scaleControl(options) {
    return new ScaleControl(options);
}

export { ScaleControl };
