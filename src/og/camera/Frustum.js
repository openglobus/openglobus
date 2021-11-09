'use strict';

import { Mat4 } from '../math/Mat4.js';

function planeNormalize(plane) {
    var t = 1.0 / Math.sqrt(plane[0] * plane[0] + plane[1] * plane[1] + plane[2] * plane[2]);
    plane[0] *= t;
    plane[1] *= t;
    plane[2] *= t;
    plane[3] *= t;
}

/**
 * Frustum object, part of the camera object.
 * @class
 */
class Frustum {

    /**
     * @param {*} options 
     */
    constructor(options = {}) {
        /**
         * Frustum planes.
         * @private
         * @type {Array.<Array.<number>>}
         */
        this._f = new Array(6);
        for (var i = 0; i < 6; i++) {
            this._f[i] = new Array(4);
        }

        /**
         * Camera projection matrix.
         * @protected
         * @type {Mat4}
         */
        this._projectionMatrix = new Mat4();

        /**
         * Camera inverse projection matrix.
         * @protected
         * @type {Mat4}
         */
        this._inverseProjectionMatrix = new Mat4();

        /**
         * Product of projection and view matrices.
         * @protected
         * @type {Mat4}
         */
        this._projectionViewMatrix = new Mat4();

        /**
         * Inverse projectionView Matrix.
         * @protected
         * @type {Mat4}
         */
        this._inverseProjectionViewMatrix = new Mat4();

        /**
         * Projection frustum left value.
         * @public
         */
        this.left = 0.0;
        /**
         * Projection frustum right value.
         * @public
         */
        this.right = 0.0;
        /**
         * Projection frustum bottom value.
         * @public
         */
        this.bottom = 0.0;
        /**
         * Projection frustum top value.
         * @public
         */
        this.top = 0.0;
        /**
         * Projection frustum near value.
         * @public
         */
        this.near = 0.0;
        /**
         * Projection frustum far value.
         * @public
         */
        this.far = 0.0;

        this._cameraFrustumIndex = options.cameraFrustumIndex != undefined ? options.cameraFrustumIndex : -1;

        this.setProjectionMatrix(
            options.fov || 30.0,
            options.aspect || 1.0,
            options.near || 1.0,
            options.far || 1000.0
        );
    }

    getRightPlane() {
        return this._f[0];
    }

    getLeftPlane() {
        return this._f[1];
    }

    getBottomPlane() {
        return this._f[2];
    }

    getTopPlane() {
        return this._f[3];
    }

    getBackwardPlane() {
        return this._f[4];
    }

    getForwardPlane() {
        return this._f[5];
    }

    getProjectionViewMatrix() {
        return this._projectionViewMatrix._m;
    }

    getProjectionMatrix() {
        return this._projectionMatrix._m;
    }

    getInverseProjectionMatrix() {
        return this._inverseProjectionMatrix._m;
    }

    /**
     * Sets up camera projection matrix.
     * @public
     * @param {nnumber} angle - Camera's view angle.
     * @param {number} aspect - Screen aspect ration.
     * @param {number} near - Near camera distance.
     * @param {number} far - Far camera distance.
     */
    setProjectionMatrix(angle, aspect, near, far) {

        this.top = near * Math.tan(angle * Math.PI / 360);
        this.bottom = -this.top;
        this.right = this.top * aspect;
        this.left = -this.right;
        this.near = near;
        this.far = far;

        this._projectionMatrix.setPerspective(this.left, this.right, this.bottom, this.top, near, far);
        this._projectionMatrix.inverseTo(this._inverseProjectionMatrix);
    }

    /**
     * Camera's projection matrix values.
     * @public
     * @param {Mat4} projectionView - projectionView matrix.
     */
    setViewMatrix(viewMatrix) {

        this._projectionViewMatrix = this._projectionMatrix.mul(viewMatrix);
        this._projectionViewMatrix.inverseTo(this._inverseProjectionViewMatrix);

        let m = this._projectionViewMatrix._m;

        /* Right */
        this._f[0][0] = m[3] - m[0];
        this._f[0][1] = m[7] - m[4];
        this._f[0][2] = m[11] - m[8];
        this._f[0][3] = m[15] - m[12];
        planeNormalize(this._f[0]);

        /* Left */
        this._f[1][0] = m[3] + m[0];
        this._f[1][1] = m[7] + m[4];
        this._f[1][2] = m[11] + m[8];
        this._f[1][3] = m[15] + m[12];
        planeNormalize(this._f[1]);

        /* Bottom */
        this._f[2][0] = m[3] + m[1];
        this._f[2][1] = m[7] + m[5];
        this._f[2][2] = m[11] + m[9];
        this._f[2][3] = m[15] + m[13];
        planeNormalize(this._f[2]);

        /* Top */
        this._f[3][0] = m[3] - m[1];
        this._f[3][1] = m[7] - m[5];
        this._f[3][2] = m[11] - m[9];
        this._f[3][3] = m[15] - m[13];
        planeNormalize(this._f[3]);

        /* Backward */
        this._f[4][0] = m[3] - m[2];
        this._f[4][1] = m[7] - m[6];
        this._f[4][2] = m[11] - m[10];
        this._f[4][3] = m[15] - m[14];
        planeNormalize(this._f[4]);

        /* Forward */
        this._f[5][0] = m[3] + m[2];
        this._f[5][1] = m[7] + m[6];
        this._f[5][2] = m[11] + m[10];
        this._f[5][3] = m[15] + m[14];
        planeNormalize(this._f[5]);
    }

    /**
     * Returns true if a point in the frustum.
     * @public
     * @param {Vec3} point - Cartesian point.
     * @returns {boolean} -
     */
    containsPoint(point) {
        var d;
        for (var p = 0; p < 6; p++) {
            d = point.dotArr(this._f[p]) + this._f[p][3];
            if (d <= 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * Returns true if the frustum contains a bonding sphere, but bottom plane exclude.
     * @public
     * @param {Sphere} sphere - Bounding sphere.
     * @returns {boolean} -
     */
    containsSphereBottomExc(sphere) {
        var r = -sphere.radius,
            f = this._f;
        if (sphere.center.dotArr(f[0]) + f[0][3] <= r) return false;
        if (sphere.center.dotArr(f[1]) + f[1][3] <= r) return false;
        if (sphere.center.dotArr(f[3]) + f[3][3] <= r) return false;
        if (sphere.center.dotArr(f[4]) + f[4][3] <= r) return false;
        if (sphere.center.dotArr(f[5]) + f[5][3] <= r) return false;
        return true;
    }

    containsSphereButtom(sphere) {
        var r = -sphere.radius,
            f = this._f;
        if (sphere.center.dotArr(f[2]) + f[2][3] <= r) return false;
        return true;
    }

    /**
     * Returns true if the frustum contains a bonding sphere.
     * @public
     * @param {Sphere} sphere - Bounding sphere.
     * @returns {boolean} -
     */
    containsSphere(sphere) {
        var r = -sphere.radius,
            f = this._f;
        if (sphere.center.dotArr(f[0]) + f[0][3] <= r) return false;
        if (sphere.center.dotArr(f[1]) + f[1][3] <= r) return false;
        if (sphere.center.dotArr(f[2]) + f[2][3] <= r) return false;
        if (sphere.center.dotArr(f[3]) + f[3][3] <= r) return false;
        if (sphere.center.dotArr(f[4]) + f[4][3] <= r) return false;
        if (sphere.center.dotArr(f[5]) + f[5][3] <= r) return false;
        return true;
    }

    /**
     * Returns true if the frustum contains a bonding sphere.
     * @public
     * @param {Vec3} center - Sphere center.
     * @param {number} radius - Sphere radius.
     * @returns {boolean} -
     */
    containsSphere2(center, radius) {
        var r = -radius;
        if (center.dotArr(this._f[0]) + this._f[0][3] <= r) return false;
        if (center.dotArr(this._f[1]) + this._f[1][3] <= r) return false;
        if (center.dotArr(this._f[2]) + this._f[2][3] <= r) return false;
        if (center.dotArr(this._f[3]) + this._f[3][3] <= r) return false;
        if (center.dotArr(this._f[4]) + this._f[4][3] <= r) return false;
        if (center.dotArr(this._f[5]) + this._f[5][3] <= r) return false;
        return true;
    }

    /**
     * Returns true if the frustum contains a bounding box.
     * @public
     * @param {Box} box - Bounding box.
     * @returns {boolean} -
     */
    containsBox(box) {
        var result = true, cout, cin;

        for (var i = 0; i < 6; i++) {

            cout = 0; cin = 0;

            for (var k = 0; k < 8 && (cin === 0 || cout === 0); k++) {
                var d = box.vertices[k].dotArr(this._f[i]) + this._f[i][3];
                if (d < 0) {
                    cout++;
                } else {
                    cin++;
                }
            }

            if (cin === 0) {
                return false;
            } else if (cout > 0) {
                result = true;
            }
        }

        return result;
    }
}

export { Frustum };
