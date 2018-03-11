/**
 * @module og/control/ZoomControl
 */

'use strict';

import { BaseControl } from './BaseControl.js';
import { Key } from '../Lock.js';
import { MouseNavigation } from './MouseNavigation.js';


/**
 * Planet zoom buttons control.
 * @class
 * @extends {og.control.BaseControl}
 * @params {Object} [options] - Control options.
 */
class ZoomControl extends BaseControl {
    constructor(options) {
        super(options);

        options = options || {};

        this.distDiff = 0.33;
        this.stepsCount = 5;
        this.stepsForward = null;
        this.stepIndex = 0;
        this._keyLock = new Key();

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

        var that = this;
        btnZoomIn.onclick = function (e) {
            that.zoomIn();
        };

        btnZoomOut.onclick = function (e) {
            that.zoomOut();
        };

        this.renderer.events.on("draw", this._draw, this);
    }

    /** 
     * Planet zoom in.
     * @public
     */
    zoomIn() {

        this._deactivate = true;

        this.planet.layerLock.lock(this._keyLock);
        this.planet.terrainLock.lock(this._keyLock);
        this.planet._normalMapCreator.lock(this._keyLock);

        this.stepIndex = this.stepsCount;
        this.stepsForward = MouseNavigation.getMovePointsFromPixelTerrain(this.renderer.activeCamera,
            this.planet, this.stepsCount, this.distDiff * 1.7, this.renderer.getCenter(), true, this.renderer.activeCamera._n.negateTo());
    }

    /** 
     * Planet zoom out.
     * @public
     */
    zoomOut() {

        this._deactivate = true;

        this.planet.layerLock.lock(this._keyLock);
        this.planet.terrainLock.lock(this._keyLock);
        this.planet._normalMapCreator.lock(this._keyLock);

        this.stepIndex = this.stepsCount;
        this.stepsForward = MouseNavigation.getMovePointsFromPixelTerrain(this.renderer.activeCamera,
            this.planet, this.stepsCount, this.distDiff * 2, this.renderer.getCenter(), false, this.renderer.activeCamera._n.negateTo());
    }

    _draw(e) {

        var cam = this.renderer.activeCamera;

        if (this.stepIndex) {
            var sf = this.stepsForward[this.stepsCount - this.stepIndex--];
            cam.eye = sf.eye;
            cam._v = sf.v;
            cam._u = sf.u;
            cam._n = sf.n;
            cam.update();
        } else if (!cam._flying) {
            if (this._deactivate) {

                this.planet.layerLock.free(this._keyLock);
                this.planet.terrainLock.free(this._keyLock);
                this.planet._normalMapCreator.free(this._keyLock);

                this._deactivate = false;
            }
        }
    }
};


export function zoomControl(options) {
    return new ZoomControl(options);
};

export { ZoomControl };
