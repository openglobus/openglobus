"use strict";

import { Sphere } from "../bv/Sphere.js";
import { Key } from "../Lock.js";
import { LonLat } from "../LonLat.js";
import { Quat } from "../math/Quat.js";
import { Ray } from "../math/Ray.js";
import { Vec3 } from "../math/Vec3.js";
import { Control } from "./Control.js";
import { Vec2 } from "../math/index.js";
import { math } from "../index.js";

class Touch {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.prev_x = 0;
        this.prev_y = 0;
        this.grabbedPoint = new Vec3();
        this.grabbedSpheroid = new Sphere();
        this._vec = new Vec2();
        this._vecPrev = new Vec2();
    }

    get dY() {
        return this.y - this.prev_y;
    }

    get dX() {
        return this.x - this.prev_x;
    }

    get vec() {
        return this._vec.set(this.x, this.y);
    }

    get vecPrev() {
        return this._vecPrev.set(this.prev_x, this.prev_y);
    }
}

/**
 * Touch pad planet camera dragging control.
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class TouchNavigation extends Control {
    constructor(options) {
        super(options);

        this._name = "touchNavigation";

        this.grabbedPoint = new Vec3();
        this.inertia = 0.007;
        this.grabbedSpheroid = new Sphere();
        this.planet = null;
        this.qRot = new Quat();
        this.scaleRot = 0;
        this.rot = 1;
        this._eye0 = new Vec3();

        this.stepsCount = 5;
        this.stepsForward = null;
        this.stepIndex = 0;

        this.pointOnEarth = null;
        this.earthUp = null;

        this.touches = [new Touch(), new Touch()];

        this._keyLock = new Key();
    }

    oninit() {
        this.renderer.events.on("touchstart", this.onTouchStart, this);
        this.renderer.events.on("touchend", this.onTouchEnd, this);
        this.renderer.events.on("doubletouch", this.onDoubleTouch, this);
        this.renderer.events.on("touchcancel", this.onTouchCancel, this);
        this.renderer.events.on("touchmove", this.onTouchMove, this);
        this.renderer.events.on("draw", this.onDraw, this);
    }

    onTouchStart(e) {
        const handler = this.renderer.handler;
        this._touching = true;

        if (e.sys.touches.length === 2) {
            const t0 = this.touches[0],
                t1 = this.touches[1];

            t0.e = e
            t0.x = (e.sys.touches.item(0).clientX - e.sys.offsetLeft) * handler.pixelRatio;
            t0.y = (e.sys.touches.item(0).clientY - e.sys.offsetTop) * handler.pixelRatio;
            t0.prev_x = t0.x;
            t0.prev_y = t0.y;
            t0.grabbedPoint = this.planet.getCartesianFromPixelTerrain(t0, true);

            t1.x = (e.sys.touches.item(1).clientX - e.sys.offsetLeft) * handler.pixelRatio;
            t1.y = (e.sys.touches.item(1).clientY - e.sys.offsetTop) * handler.pixelRatio;
            t1.prev_x = t1.x;
            t1.prev_y = t1.y;
            t1.grabbedPoint = this.planet.getCartesianFromPixelTerrain(t1, true);

            this.pointOnEarth = this.planet.getCartesianFromPixelTerrain(
                this.renderer.handler.getCenter(),
                true
            );

            if (this.pointOnEarth) {
                this.earthUp = this.pointOnEarth.normal();
            }

            if (t0.grabbedPoint && t1.grabbedPoint) {
                t0.grabbedSpheroid.radius = t0.grabbedPoint.length();
                t1.grabbedSpheroid.radius = t1.grabbedPoint.length();
                this.stopRotation();
            }
        } else if (e.sys.touches.length === 1) {
            this._startTouchOne(e);
        }
    }

    _startTouchOne(e) {
        const t = this.touches[0];
        const handler = this.renderer.handler;

        t.x = (e.sys.touches.item(0).clientX - e.sys.offsetLeft) * handler.pixelRatio;
        t.y = (e.sys.touches.item(0).clientY - e.sys.offsetTop) * handler.pixelRatio;
        t.prev_x = t.x;
        t.prev_y = t.y;

        t.grabbedPoint = this.planet.getCartesianFromPixelTerrain(e, true);
        this._eye0.copy(this.renderer.activeCamera.eye);

        if (t.grabbedPoint) {
            t.grabbedSpheroid.radius = t.grabbedPoint.length();
            this.stopRotation();
        }
    }

    stopRotation() {
        this.qRot.clear();
        this.planet.layerLock.free(this._keyLock);
        this.planet.terrainLock.free(this._keyLock);
        this.planet._normalMapCreator.free(this._keyLock);
    }

    onDoubleTouch(e) {
        if (this.stepIndex) {
            return;
        }

        this.planet.stopFlying();
        this.stopRotation();

        var p = this.planet.getCartesianFromPixelTerrain(e);
        if (p) {
            var g = this.planet.ellipsoid.cartesianToLonLat(p);
            this.planet.flyLonLat(
                new LonLat(g.lon, g.lat, this.renderer.activeCamera.eye.distance(p) * 0.57)
            );
        }
    }

    onTouchEnd(e) {
        if (e.sys.touches.length === 0) {
            this._touching = false;
        }

        if (e.sys.touches.length === 1) {
            this._startTouchOne(e);
        }

        if (
            Math.abs(this.touches[0].x - this.touches[0].prev_x) < 3 &&
            Math.abs(this.touches[0].y - this.touches[0].prev_y) < 3
        ) {
            this.scaleRot = 0;
        }
    }

    onTouchCancel(e) {
    }

    onTouchMove(e) {
        var cam = this.renderer.activeCamera;
        const handler = this.renderer.handler;
        if (e.sys.touches.length === 2) {
            this.renderer.controlsBag.scaleRot = 1;

            var t0 = this.touches[0],
                t1 = this.touches[1];

            if (!t0.grabbedPoint || !t1.grabbedPoint) {
                return;
            }

            this.planet.stopFlying();

            t0.prev_x = t0.x;
            t0.prev_y = t0.y;
            t0.x = (e.sys.touches.item(0).clientX - e.sys.offsetLeft) * handler.pixelRatio;
            t0.y = (e.sys.touches.item(0).clientY - e.sys.offsetTop) * handler.pixelRatio;

            t1.prev_x = t1.x;
            t1.prev_y = t1.y;
            t1.x = (e.sys.touches.item(1).clientX - e.sys.offsetLeft) * handler.pixelRatio;
            t1.y = (e.sys.touches.item(1).clientY - e.sys.offsetTop) * handler.pixelRatio;

            const middle = t0.vec.add(t1.vec).scale(0.5);
            const earthMiddlePoint = this.planet.getCartesianFromPixelTerrain(
                middle
            );
            if (earthMiddlePoint) {
                this.pointOnEarth = earthMiddlePoint

                const prevAngle = Math.atan2(t0.prev_y - t1.prev_y, t0.prev_x - t1.prev_x)
                const curAngle = Math.atan2(t0.y - t1.y, t0.x - t1.x)

                const deltaAngle = curAngle - prevAngle;
                const distanceToPointOnEarth = cam.eye.distance(this.pointOnEarth);

                const zoomCur = t0.vec.sub(t1.vec);
                const zoomPrev = t0.vecPrev.sub(t1.vecPrev);
                const scale = zoomCur.length() / zoomPrev.length();

                let d = distanceToPointOnEarth * -(1 - scale);
                cam.eye.addA(cam.getForward().scale(d));
                cam.rotateAround(-deltaAngle, false, this.pointOnEarth, this.earthUp);

                const panCur = t0.vec.add(t1.vec).scale(0.5);
                const panPrev = t0.vecPrev.add(t1.vecPrev).scale(0.5);
                const panOffset = panCur.sub(panPrev).scale(-1);
                var l = 0.5 / distanceToPointOnEarth * cam._lonLat.height * math.RADIANS;
                if (l > 0.003) l = 0.003;
                cam.rotateHorizontal(l * -panOffset.x, false, this.pointOnEarth, this.earthUp);
                cam.rotateVertical(l * -panOffset.y, this.pointOnEarth);

                cam.checkTerrainCollision();
                cam.update();
            }
            this.scaleRot = 0;
        } else if (e.sys.touches.length === 1) {
            var t = this.touches[0];

            t.prev_x = t.x;
            t.prev_y = t.y;
            t.x = (e.sys.touches.item(0).clientX - e.sys.offsetLeft) * handler.pixelRatio;
            t.y = (e.sys.touches.item(0).clientY - e.sys.offsetTop) * handler.pixelRatio;

            if (!t.grabbedPoint) {
                return;
            }

            this.planet.stopFlying();

            var direction = e.direction
            var targetPoint = new Ray(cam.eye, direction).hitSphere(t.grabbedSpheroid);

            if (targetPoint) {
                if (cam.slope > 0.2) {
                    this.qRot = Quat.getRotationBetweenVectors(
                        targetPoint.normal(),
                        t.grabbedPoint.normal()
                    );
                    var rot = this.qRot;
                    cam.eye = rot.mulVec3(cam.eye);
                    cam._r = rot.mulVec3(cam._r);
                    cam._u = rot.mulVec3(cam._u);
                    cam._b = rot.mulVec3(cam._b);
                    cam.checkTerrainCollision();
                    cam.update();
                    this.scaleRot = 1;
                } else {
                    var p0 = t.grabbedPoint,
                        p1 = Vec3.add(p0, cam._u),
                        p2 = Vec3.add(p0, p0.normal());
                    var dir = cam.unproject(t.x, t.y);
                    var px = new Vec3();
                    if (new Ray(cam.eye, dir).hitPlane(p0, p1, p2, px) === Ray.INSIDE) {
                        cam.eye = this._eye0.addA(px.subA(p0).negate());
                        cam.checkTerrainCollision();
                        cam.update();
                        this.scaleRot = 0;
                    }
                }
            }
        }
    }

    onDraw(e) {
        this.renderer.controlsBag.scaleRot = this.scaleRot;

        if (this._touching) {
            return;
        }

        var r = this.renderer;
        var cam = r.activeCamera;
        var prevEye = cam.eye.clone();

        if (this.stepIndex) {
            r.controlsBag.scaleRot = 1;
            var sf = this.stepsForward[this.stepsCount - this.stepIndex--];
            cam.eye = sf.eye;
            cam._r = sf.v;
            cam._u = sf.u;
            cam._b = sf.n;
            cam.checkTerrainCollision();
            cam.update();
        }

        if (r.events.mouseState.leftButtonDown || !this.scaleRot) {
            return;
        }

        this.scaleRot -= this.inertia;
        if (this.scaleRot <= 0) {
            this.scaleRot = 0;
        } else {
            r.controlsBag.scaleRot = this.scaleRot;
            var rot = this.qRot
                .slerp(Quat.IDENTITY, 1 - this.scaleRot * this.scaleRot * this.scaleRot)
                .normalize();
            if (!(rot.x || rot.y || rot.z)) {
                this.scaleRot = 0;
            }
            cam.eye = rot.mulVec3(cam.eye);
            cam._r = rot.mulVec3(cam._r);
            cam._u = rot.mulVec3(cam._u);
            cam._b = rot.mulVec3(cam._b);
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
    }
}

export { TouchNavigation };

