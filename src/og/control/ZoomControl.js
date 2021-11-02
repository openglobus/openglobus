/**
 * @module og/control/ZoomControl
 */

"use strict";

import { Control } from "./Control.js";
import { Key } from "../Lock.js";
import { Quat } from "../math/Quat.js";
import { Sphere } from "../bv/Sphere.js";
import { Vec3 } from "../math/Vec3.js";
import { MouseNavigation } from "./MouseNavigation.js";

/**
 * Planet zoom buttons control.
 * @class
 * @extends {Control}
 * @params {Object} [options] - Control options.
 */
class ZoomControl extends Control {
    constructor(options) {
        super(options);

        this._name = "zoomControl";

        options = options || {};

        this.grabbedPoint = new Vec3();
        this._eye0 = new Vec3();
        this.pointOnEarth = new Vec3();
        this.earthUp = new Vec3();
        this.inertia = 0.007;
        this.grabbedSpheroid = new Sphere();
        this.planet = null;
        this.qRot = new Quat();
        this.scaleRot = 0.0;

        this.distDiff = 0.3;
        this.stepsCount = 8;
        this.stepsForward = null;
        this.stepIndex = 0;

        this._lmbDoubleClickActive = true;

        this.minSlope = options.minSlope || 0.1;

        this._keyLock = new Key();
    }

    oninit() {
        var zoomDiv = document.createElement("div"),
            btnZoomIn = document.createElement("button"),
            btnZoomOut = document.createElement("button");

        zoomDiv.className = "ogZoomControl";
        btnZoomIn.className = "ogZoomButton ogZoomIn";
        btnZoomOut.className = "ogZoomButton ogZoomOut";

        zoomDiv.appendChild(btnZoomIn);
        zoomDiv.appendChild(btnZoomOut);

        this.renderer.div.appendChild(zoomDiv);

        btnZoomIn.addEventListener("mousedown", (e) => this.zoomIn());
        btnZoomIn.addEventListener("mouseup", (e) => this.stopZoom());

        btnZoomOut.addEventListener("mousedown", (e) => this.zoomOut());
        btnZoomOut.addEventListener("mouseup", (e) => this.stopZoom());

        btnZoomIn.addEventListener("touchstart", (e) => {
            e.preventDefault();
            this.zoomIn();
        });
        btnZoomIn.addEventListener("touchend", (e) => {
            e.preventDefault();
            this.stopZoom();
        });
        btnZoomIn.addEventListener("touchcancel", (e) => {
            e.preventDefault();
            this.stopZoom();
        });

        btnZoomOut.addEventListener("touchstart", (e) => {
            e.preventDefault();
            this.zoomOut();
        });
        btnZoomOut.addEventListener("touchend", (e) => {
            e.preventDefault();
            this.stopZoom();
        });
        btnZoomOut.addEventListener("touchcancel", (e) => {
            e.preventDefault();
            this.stopZoom();
        });

        this.renderer.events.on("draw", this._draw, this);
    }

    /**
     * Planet zoom in.
     * @public
     */
    zoomIn() {
<<<<<<< HEAD
=======
        if (this.stepIndex) {
            return;
        }

        this.planet.stopFlying();

        this.stopRotation();

        this._deactivate = true;

>>>>>>> 71cd57f7 (fix zoom control too grandular)
        this.planet.layerLock.lock(this._keyLock);
        this.planet.terrainLock.lock(this._keyLock);
        this.planet._normalMapCreator.lock(this._keyLock);

        var ms = this.renderer.events.mouseState;
        this.stepsForward = MouseNavigation.getMovePointsFromPixelTerrain(
            this.renderer.activeCamera,
            this.planet,
            this.stepsCount,
            this.distDiff,
            ms,
            true,
            ms.direction
        );
        if (this.stepsForward) {
            this.stepIndex = this.stepsCount;
        }
    }

    /**
     * Planet zoom out.
     * @public
     */
    zoomOut() {
<<<<<<< HEAD
=======
        if (this.stepIndex) {
            return;
        }

        this.planet.stopFlying();

        this.stopRotation();

        this._deactivate = true;

>>>>>>> 71cd57f7 (fix zoom control too grandular)
        this.planet.layerLock.lock(this._keyLock);
        this.planet.terrainLock.lock(this._keyLock);
        this.planet._normalMapCreator.lock(this._keyLock);

        var ms = this.renderer.events.mouseState;
        this.stepsForward = MouseNavigation.getMovePointsFromPixelTerrain(
            this.renderer.activeCamera,
            this.planet,
            this.stepsCount,
            this.distDiff,
            ms,
            false,
            ms.direction
        );
        if (this.stepsForward) {
            this.stepIndex = this.stepsCount;
        }
    }

<<<<<<< HEAD
=======
    stopRotation() {
        this.qRot.clear();
        this.planet.layerLock.free(this._keyLock);
        this.planet.terrainLock.free(this._keyLock);
        this.planet._normalMapCreator.free(this._keyLock);
    }

>>>>>>> 71cd57f7 (fix zoom control too grandular)
    stopZoom() {
        this._move = 0;

        this.planet.layerLock.free(this._keyLock);
        this.planet.terrainLock.free(this._keyLock);
        this.planet._normalMapCreator.free(this._keyLock);
    }

    _draw(e) {
<<<<<<< HEAD
        var cam = this.renderer.activeCamera;

        if (this._move !== 0) {
            var d =
                cam.eye.distance(
                    this.planet.getCartesianFromPixelTerrain(this._targetPoint, true)
                ) * 0.075;
            cam.eye.addA(cam.getForward().scale(this._move * d));
            cam.checkTerrainCollision();
            cam.update();
=======
        if (this._active) {
            var r = this.renderer;
            var cam = r.activeCamera;
            var prevEye = cam.eye.clone();

            if (this.stepIndex) {
                r.controlsBag.scaleRot = 1.0;
                var sf = this.stepsForward[this.stepsCount - this.stepIndex--];

                let maxAlt = cam.maxAltitude + this.planet.ellipsoid._a;
                let minAlt = cam.minAltitude + this.planet.ellipsoid._a;
                const camAlt = sf.eye.length();
                if (camAlt > maxAlt || camAlt < minAlt) {
                    return;
                }
                if (sf.eye.length() > maxAlt) {
                    return;
                }

                cam.eye = sf.eye;
                cam._v = sf.v;
                cam._u = sf.u;
                cam._n = sf.n;

                cam.checkTerrainCollision();

                cam.update();
            } else {
                if (this._deactivate) {
                    this._deactivate = false;

                    this.planet.layerLock.free(this._keyLock);
                    this.planet.terrainLock.free(this._keyLock);
                    this.planet._normalMapCreator.free(this._keyLock);
                }
            }

            if (r.events.mouseState.leftButtonDown || !this.scaleRot) {
                return;
            }

            this.scaleRot -= this.inertia;
            if (this.scaleRot <= 0.0) {
                this.scaleRot = 0.0;
            } else {
                r.controlsBag.scaleRot = this.scaleRot;
                var rot = this.qRot
                    .slerp(Quat.IDENTITY, 1.0 - this.scaleRot * this.scaleRot * this.scaleRot)
                    .normalize();
                if (!(rot.x || rot.y || rot.z)) {
                    this.scaleRot = 0.0;
                }
                cam.eye = rot.mulVec3(cam.eye);
                cam._v = rot.mulVec3(cam._v);
                cam._u = rot.mulVec3(cam._u);
                cam._n = rot.mulVec3(cam._n);

                cam.checkTerrainCollision();

                cam.update();
            }

            if (cam.eye.distance(prevEye) / cam._terrainAltitude > 0.01) {
                this.planet.layerLock.lock(this._keyLock);
                this.planet.terrainLock.lock(this._keyLock);
                this.planet._normalMapCreator.lock(this._keyLock);
            } else {
                this.planet.layerLock.free(this._keyLock);
                this.planet.terrainLock.free(this._keyLock);
                this.planet._normalMapCreator.free(this._keyLock);
            }
>>>>>>> 71cd57f7 (fix zoom control too grandular)
        }
    }
}

export function zoomControl(options) {
    return new ZoomControl(options);
}

export { ZoomControl };
