/**
 * @module og/control/ZoomControl
 */

'use strict';

import { Control } from './Control.js';
import { RADIANS } from '../math.js';

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
    }

    oninit() {
        var zoomDiv = document.createElement('div'),
            btnZoomIn = document.createElement('button'),
            btnZoomOut = document.createElement('button');

        zoomDiv.className = 'ogZoomControl';
        btnZoomIn.className = 'ogZoomButton ogZoomIn';
        btnZoomOut.className = 'ogZoomButton ogZoomOut';

        zoomDiv.appendChild(btnZoomIn);
        zoomDiv.appendChild(btnZoomOut);

        this.renderer.div.appendChild(zoomDiv);

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
    }
}

export function scaleControl(options) {
    return new ScaleControl(options);
}

export { ScaleControl };
