"use strict";

import * as math from "../math.js";
import { Events } from "../Events.js";
import { Frustum } from "./Frustum.js";
import { Vec2 } from "../math/Vec2.js";
import { Vec3 } from "../math/Vec3.js";
import { Vec4 } from "../math/Vec4.js";
import { Mat3 } from "../math/Mat3.js";
import { Mat4 } from "../math/Mat4.js";

/**
 * Camera class.
 * @class
 * @param {Renderer} [renderer] - Renderer uses the camera instance.
 * @param {Object} [options] - Camera options:
 * @param {Object} [options.name] - Camera name.
 * @param {number} [options.viewAngle=47] - Camera angle of view. Default is 47.0
 * @param {number} [options.near=1] - Camera near plane distance. Default is 1.0
 * @param {number} [options.far=og.math.MAX] - Camera far plane distance. Deafult is og.math.MAX
 * @param {Vec3} [options.eye=[0,0,0]] - Camera eye position. Default (0,0,0)
 * @param {Vec3} [options.look=[0,0,0]] - Camera look position. Default (0,0,0)
 * @param {Vec3} [options.up=[0,1,0]] - Camera eye position. Default (0,1,0)
 *
 * @fires og.Camera#viewchange
 */
class Camera {
    /**
     * @param {Renderer} [renderer] - Renderer uses the camera instance.
     * @param {Object} [options] - Camera options:
     */
    constructor(renderer, options) {
        /**
         * Assigned renderer
         * @public
         * @type {Renderer}
         */
        this.renderer = renderer;

        /**
         * Camera events handler
         * @public
         * @type {Events}
         */
        this.events = new Events(EVENT_NAMES, this);

        /**
         * Camera position.
         * @public
         * @type {Vec3}
         */
        this.eye = new Vec3();

        /**
         * Camera RTE high position
         * @public
         * @type {Vec3}
         */
        this.eyeHigh = new Float32Array(3);

        /**
         * Camera RTE low position
         * @public
         * @type {Vec3}
         */
        this.eyeLow = new Float32Array(3);

        /**
         * Aspect ratio.
         * @protected
         * @type {Number}
         */
        this._aspect = options.aspect || this.renderer.handler.getClientAspect();

        /**
         * Camera view angle in degrees
         * @protected
         * @type {Number}
         */
        this._viewAngle = options.viewAngle || 47.0;

        /**
         * Camera normal matrix.
         * @protected
         * @type {Mat3}
         */
        this._normalMatrix = new Mat3();

        /**
         * Camera view matrix.
         * @protected
         * @type {Mat4}
         */
        this._viewMatrix = new Mat4();

        /**
         * Camera right vector.
         * @protected
         * @type {Vec3}
         */
        this._r = new Vec3(1.0, 0.0, 0.0); // up x n

        /**
         * Camera up vector.
         * @protected
         * @type {Vec3}
         */
        this._u = new Vec3(0.0, 1.0, 0.0); // n x u - UP

        /**
         * Camera forward vector.
         * @protected
         * @type {Vec3}
         */
        this._b = new Vec3(0.0, 0.0, 1.0); // eye - look - FORWARD

        // Previous frame values
        this._pu = this._r.clone();
        this._pv = this._u.clone();
        this._pn = this._b.clone();
        this._peye = this.eye.clone();
        this.isMoved = false;

        this._tanViewAngle_hrad = 0.0;
        this._tanViewAngle_hradOneByHeight = 0.0;

        this.frustums = [];

        this.nearFarArr = [];

        this.frustumColors = [];

        if (options.frustums) {
            for (let i = 0, len = options.frustums.length; i < len; i++) {
                let fi = options.frustums[i];

                let fr = new Frustum({
                    fov: this._viewAngle,
                    aspect: this._aspect,
                    near: fi[0],
                    far: fi[1]
                });

                fr._cameraFrustumIndex = this.frustums.length;
                this.frustums.push(fr);
                this.renderer.assignPickingColor(fr);
                this.nearFarArr.push.apply(this.nearFarArr, [fi[0], fi[1]]);
                this.frustumColors.push.apply(this.frustumColors, fr._pickingColorU);
            }
        } else {
            let near = 1.0,
                far = 10000.0;

            let fr = new Frustum({
                fov: this._viewAngle,
                aspect: this._aspect,
                near: near,
                far: far
            });

            fr._cameraFrustumIndex = this.frustums.length;
            this.frustums.push(fr);
            this.renderer.assignPickingColor(fr);
            this.nearFarArr = new Array([near, far]);
            this.frustumColors.push.apply(this.frustumColors, fr._pickingColorU);
        }

        this.FARTHEST_FRUSTUM_INDEX = this.frustums.length - 1;

        this._currentFrustum = 0;

        renderer && this._init(options);
    }

    checkMoveEnd() {
        var u = this._r,
            v = this._u,
            n = this._b,
            eye = this.eye;

        if (this._peye.equal(eye) && this._pu.equal(u) && this._pv.equal(v) && this._pn.equal(n)) {
            if (this.isMoved) {
                this.events.dispatch(this.events.moveend, this);
            }
            this.isMoved = false;
        } else {
            this.isMoved = true;
        }

        this._pu.copy(u);
        this._pv.copy(v);
        this._pn.copy(n);
        this._peye.copy(eye);
    }

    /**
     * Camera initialization.
     * @public
     * @param {Renderer} renderer - OpenGlobus renderer object.
     * @param {Object} [options] - Camera options:
     * @param {number} [options.viewAngle] - Camera angle of view. Default is 30.0
     * @param {number} [options.near] - Camera near plane distance. Default is 1.0
     * @param {number} [options.far] - Camera far plane distance. Deafult is og.math.MAX
     * @param {Vec3} [options.eye] - Camera eye position. Default (0,0,0)
     * @param {Vec3} [options.look] - Camera look position. Default (0,0,0)
     * @param {Vec3} [options.up] - Camera eye position. Default (0,1,0)
     */
    _init(options) {
        this._setProj(this._viewAngle, this._aspect);

        this.set(
            options.eye || new Vec3(0.0, 0.0, 1.0),
            options.look || new Vec3(),
            options.up || new Vec3(0.0, 1.0, 0.0)
        );
    }

    getUp() {
        return this._u.clone();
    }

    getDown() {
        return this._u.negateTo();
    }

    getRight() {
        return this._r.clone();
    }

    getLeft() {
        return this._r.negateTo();
    }

    getForward() {
        return this._b.negateTo();
    }

    getBackward() {
        return this._b.clone();
    }

    /**
     * Updates camera view space
     * @public
     * @virtual
     */
    update() {
        var u = this._r,
            v = this._u,
            n = this._b,
            eye = this.eye;

        Vec3.doubleToTwoFloat32Array(eye, this.eyeHigh, this.eyeLow);

        this._viewMatrix.set([
            u.x,
            v.x,
            n.x,
            0.0,
            u.y,
            v.y,
            n.y,
            0.0,
            u.z,
            v.z,
            n.z,
            0.0,
            -eye.dot(u),
            -eye.dot(v),
            -eye.dot(n),
            1.0
        ]);

        this._normalMatrix = this._viewMatrix.toMatrix3(); // this._viewMatrix.toInverseMatrix3().transposeTo();

        for (let i = 0, len = this.frustums.length; i < len; i++) {
            this.frustums[i].setViewMatrix(this._viewMatrix);
        }

        this.events.dispatch(this.events.viewchange, this);
    }

    /**
     * Refresh camera matrices
     * @public
     */
    refresh() {
        this._setProj(this._viewAngle, this._aspect);
        this.update();
    }

    /**
     * Sets aspect ratio
     * @public
     * @param {Number} aspect - Camera aspect ratio
     */
    setAspectRatio(aspect) {
        this._aspect = aspect;
        this.refresh();
    }

    /**
     * Returns aspect ratio
     * @public
     * @returns {number} - Aspect ratio
     */
    getAspectRatio() {
        return this._aspect;
    }

    /**
     * Sets up camera projection
     * @public
     * @param {nnumber} angle - Camera's view angle
     * @param {number} aspect - Screen aspect ration
     */
    _setProj(angle, aspect) {
        this._viewAngle = angle;
        this._aspect = aspect;
        this._tanViewAngle_hrad = Math.tan(angle * math.RADIANS_HALF);
        this._tanViewAngle_hradOneByHeight =
            this._tanViewAngle_hrad * this.renderer.handler._oneByHeight;
        var c = this.renderer.handler.canvas;
        this._projSizeConst = Math.min(c.clientWidth < 256 ? 256 : c.clientWidth, c.clientHeight < 256 ? 256 : c.clientHeight) / (angle * math.RADIANS);
        for (let i = 0, len = this.frustums.length; i < len; i++) {
            this.frustums[i].setProjectionMatrix(
                angle,
                aspect,
                this.frustums[i].near,
                this.frustums[i].far
            );
        }
    }

    /**
     * Sets camera view angle in degrees
     * @public
     * @param {number} angle - View angle
     */
    setViewAngle(angle) {
        this._viewAngle = angle;
        this.refresh();
    }

    /**
     * Gets camera view angle in degrees
     * @public
     * @returns {number} angle -
     */
    getViewAngle() {
        return this._viewAngle;
    }

    /**
     * Sets camera to eye position
     * @public
     * @param {Vec3} eye - Camera position
     * @param {Vec3} look - Look point
     * @param {Vec3} up - Camera up vector
     * @returns {Camera} - This camera
     */
    set(eye, look, up) {
        this.eye.x = eye.x;
        this.eye.y = eye.y;
        this.eye.z = eye.z;
        look = look || this._b;
        up = up || this._u;
        this._b.x = eye.x - look.x;
        this._b.y = eye.y - look.y;
        this._b.z = eye.z - look.z;
        this._r.copy(up.cross(this._b));
        this._b.normalize();
        this._r.normalize();
        this._u.copy(this._b.cross(this._r));
        return this;
    }

    /**
     * Sets camera look point
     * @public
     * @param {Vec3} look - Look point
     * @param {Vec3} [up] - Camera up vector otherwise camera current up vector(this._u)
     */
    look(look, up) {
        this._b.set(this.eye.x - look.x, this.eye.y - look.y, this.eye.z - look.z);
        this._r.copy((up || this._u).cross(this._b));
        this._b.normalize();
        this._r.normalize();
        this._u.copy(this._b.cross(this._r));
    }

    /**
     * Slides camera to vector d - (du, dv, dn)
     * @public
     * @param {number} du - delta X
     * @param {number} dv - delta Y
     * @param {number} dn - delta Z
     */
    slide(du, dv, dn) {
        this.eye.x += du * this._r.x + dv * this._u.x + dn * this._b.x;
        this.eye.y += du * this._r.y + dv * this._u.y + dn * this._b.y;
        this.eye.z += du * this._r.z + dv * this._u.z + dn * this._b.z;
    }

    /**
     * Roll the camera to the angle in degrees
     * @public
     * @param {number} angle - Delta roll angle in degrees
     */
    roll(angle) {
        var cs = Math.cos(math.RADIANS * angle);
        var sn = Math.sin(math.RADIANS * angle);
        var t = this._r.clone();
        this._r.set(
            cs * t.x - sn * this._u.x,
            cs * t.y - sn * this._u.y,
            cs * t.z - sn * this._u.z
        );
        this._u.set(
            sn * t.x + cs * this._u.x,
            sn * t.y + cs * this._u.y,
            sn * t.z + cs * this._u.z
        );
    }

    /**
     * Pitch the camera to the angle in degrees
     * @public
     * @param {number} angle - Delta pitch angle in degrees
     */
    pitch(angle) {
        var cs = Math.cos(math.RADIANS * angle);
        var sn = Math.sin(math.RADIANS * angle);
        var t = this._b.clone();
        this._b.set(
            cs * t.x - sn * this._u.x,
            cs * t.y - sn * this._u.y,
            cs * t.z - sn * this._u.z
        );
        this._u.set(
            sn * t.x + cs * this._u.x,
            sn * t.y + cs * this._u.y,
            sn * t.z + cs * this._u.z
        );
    }

    /**
     * Yaw the camera to the angle in degrees
     * @public
     * @param {number} angle - Delta yaw angle in degrees
     */
    yaw(angle) {
        var cs = Math.cos(math.RADIANS * angle);
        var sn = Math.sin(math.RADIANS * angle);
        var t = this._r.clone();
        this._r.set(
            cs * t.x - sn * this._b.x,
            cs * t.y - sn * this._b.y,
            cs * t.z - sn * this._b.z
        );
        this._b.set(
            sn * t.x + cs * this._b.x,
            sn * t.y + cs * this._b.y,
            sn * t.z + cs * this._b.z
        );
    }

    /**
     * Returns normal vector direction to to the unprojected screen point from camera eye
     * @public
     * @param {number} x - Scren X coordinate
     * @param {number} y - Scren Y coordinate
     * @returns {Vec3} - Direction vector
     */
    unproject(x, y) {
        var c = this.renderer.handler.canvas,
            w = c.width * 0.5,
            h = c.height * 0.5;

        var px = (x - w) / w,
            py = -(y - h) / h;

        var world1 = this.frustums[0]._inverseProjectionViewMatrix.mulVec4(new Vec4(px, py, -1.0, 1.0)).affinity(),
            world2 = this.frustums[0]._inverseProjectionViewMatrix.mulVec4(new Vec4(px, py, 0.0, 1.0)).affinity();

        return world2.subA(world1).toVec3().normalize();
    }

    /**
     * Gets projected 3d point to the 2d screen coordiantes
     * @public
     * @param {Vec3} v - Cartesian 3d coordiantes
     * @returns {Vec2} - Screen point coordinates
     */
    project(v) {
        var r = this.frustums[0]._projectionViewMatrix.mulVec4(v.toVec4()),
            c = this.renderer.handler.canvas;
        return new Vec2((1 + r.x / r.w) * c.width * 0.5, (1 - r.y / r.w) * c.height * 0.5);
    }

    /**
     * Rotates camera around center point
     * @public
     * @param {number} angle - Rotation angle in radians
     * @param {boolean} isArc - If true camera up vector gets from current up vector every frame,
     * otherwise up is always input parameter.
     * @param {Vec3} center - Point that the camera rotates around
     * @param {Vecto3} [up] - Camera up vector
     */
    rotateAround(angle, isArc, center, up) {
        center = center || Vec3.ZERO;
        up = up || Vec3.UP;

        var rot = new Mat4().setRotation(isArc ? this._u : up, angle);
        var tr = new Mat4().setIdentity().translate(center);
        var ntr = new Mat4().setIdentity().translate(center.negateTo());

        var trm = tr.mul(rot).mul(ntr);

        this.eye = trm.mulVec3(this.eye);
        this._u = rot.mulVec3(this._u).normalize();
        this._r = rot.mulVec3(this._r).normalize();
        this._b = rot.mulVec3(this._b).normalize();
    }

    /**
     * Rotates camera around center point by horizontal.
     * @public
     * @param {number} angle - Rotation angle in radians.
     * @param {boolaen} isArc - If true camera up vector gets from current up vector every frame,
     * otherwise up is always input parameter.
     * @param {Vec3} center - Point that the camera rotates around.
     * @param {Vec3} [up] - Camera up vector.
     */
    rotateHorizontal(angle, isArc, center, up = Vec3.ZERO) {
        this.rotateAround(angle, isArc, center, up);
    }

    /**
     * Rotates camera around center point by vecrtical.
     * @param {number} angle - Rotation angle in radians.
     * @param {Vec3} center - Point that the camera rotates around.
     */
    rotateVertical(angle, center) {
        this.rotateAround(angle, false, center, this._r);
    }

    /**
     * Gets 3d size factor. Uses in LOD distance calculation.
     * @public
     * @param {Vec3} p - Far point.
     * @param {Vec3} r - Far point.
     * @returns {number} - Size factor.
     */
    projectedSize(p, r) {
        return Math.atan(r / this.eye.distance(p)) * this._projSizeConst;
    }

    /**
     * Returns normal matrix.
     * @public
     * @returns {Mat3} - Normal matrix.
     */
    getNormalMatrix() {
        return this._normalMatrix._m;
    }

    /**
     * Returns model matrix.
     * @public
     * @returns {Mat4} - View matrix.
     */
    getViewMatrix() {
        return this._viewMatrix._m;
    }

    setCurrentFrustum(k) {
        this._currentFrustum = k;
    }

    getCurrentFrustum() {
        return this._currentFrustum;
    }

    get frustum() {
        return this.frustums[this._currentFrustum];
    }

    /**
     * Returns projection matrix.
     * @public
     * @returns {Mat4} - Projection matrix.
     */
    getProjectionMatrix() {
        return this.frustum._projectionMatrix._m;
    }

    /**
     * Returns projection and model matrix product.
     * @public
     * @return {Mat4} - Projection-view matrix.
     */
    getProjectionViewMatrix() {
        return this.frustum._projectionViewMatrix._m;
    }

    /**
     * Returns inverse projection and model matrix product.
     * @public
     * @returns {Mat4} - Inversed projection-view matrix.
     */
    getInverseProjectionViewMatrix() {
        return this.frustum._inverseProjectionViewMatrix._m;
    }

    /**
     * Returns inverse projection matrix.
     * @public
     * @returns {Mat4} - Inversed projection-view matrix.
     */
    getInverseProjectionMatrix() {
        return this.frustum._inverseProjectionMatrix._m;
    }
}

const EVENT_NAMES = [
    /**
     * When camera has been updated.
     * @event og.Camera#viewchange
     */
    "viewchange",

    /**
     * Camera is stopped.
     * @event og.Camera#moveend
     */
    "moveend"
];

export { Camera };
