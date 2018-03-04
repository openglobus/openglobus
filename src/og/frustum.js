/**
 * @module og/Frustum
 */

'use strict';

/**
 * Frustum object, part of the camera object.
 * @class
 */
class Frustum {
    constructor() {
        /**
         * Frustum planes.
         * @private
         * @type {Array.<Array.<number>>}
         */
        this._f = new Array(6);
        for (var i = 0; i < 6; i++)
            this._f[i] = new Array(4);
    }
    /**
     * Normalize frustum plane.
     * @static
     * @param {Array.<number>} plane - Frustum plane coordinates.
     */
    static planeNormalize(plane) {
        var t = Math.sqrt(plane[0] * plane[0] + plane[1] * plane[1] + plane[2] * plane[2]);
        plane[0] /= t;
        plane[1] /= t;
        plane[2] /= t;
        plane[3] /= t;
    }

    /**
     * Camera's projection matrix values.
     * @public
     * @param {Array.<number>} clip - Projection matrix parameters.
     */
    setFrustum(clip) {
        /* Right */
        this._f[0][0] = clip[3] - clip[0];
        this._f[0][1] = clip[7] - clip[4];
        this._f[0][2] = clip[11] - clip[8];
        this._f[0][3] = clip[15] - clip[12];
        Frustum.planeNormalize(this._f[0]);

        /* Left */
        this._f[1][0] = clip[3] + clip[0];
        this._f[1][1] = clip[7] + clip[4];
        this._f[1][2] = clip[11] + clip[8];
        this._f[1][3] = clip[15] + clip[12];
        Frustum.planeNormalize(this._f[1]);

        /* Bottom */
        this._f[2][0] = clip[3] + clip[1];
        this._f[2][1] = clip[7] + clip[5];
        this._f[2][2] = clip[11] + clip[9];
        this._f[2][3] = clip[15] + clip[13];
        Frustum.planeNormalize(this._f[2]);

        /* Top */
        this._f[3][0] = clip[3] - clip[1];
        this._f[3][1] = clip[7] - clip[5];
        this._f[3][2] = clip[11] - clip[9];
        this._f[3][3] = clip[15] - clip[13];
        Frustum.planeNormalize(this._f[3]);

        /* Backward */
        this._f[4][0] = clip[3] - clip[2];
        this._f[4][1] = clip[7] - clip[6];
        this._f[4][2] = clip[11] - clip[10];
        this._f[4][3] = clip[15] - clip[14];
        Frustum.planeNormalize(this._f[4]);

        /* Forward */
        this._f[5][0] = clip[3] + clip[2];
        this._f[5][1] = clip[7] + clip[6];
        this._f[5][2] = clip[11] + clip[10];
        this._f[5][3] = clip[15] + clip[14];
        Frustum.planeNormalize(this._f[5]);
    }

    /**
     * Returns true if a point in the frustum.
     * @public
     * @param {og.math.Vec3} point - Cartesian point.
     * @returns {boolean}
     */
    containsPoint(point) {
        var d;
        for (var p = 0; p < 6; p++) {
            d = point.dotArr(this._f[p]) + this._f[p][3];
            if (d <= 0)
                return false;
        }
        return true;
    }

    /**
     * Returns true if the frustum contains a bonding sphere.
     * @public
     * @param {og.bv.Sphere} sphere - Bounding sphere.
     * @returns {boolean}
     */
    containsSphere(sphere) {
        var r = -sphere.radius;
        if (sphere.center.dotArr(this._f[0]) + this._f[0][3] <= r) return false;
        if (sphere.center.dotArr(this._f[1]) + this._f[1][3] <= r) return false;
        if (sphere.center.dotArr(this._f[2]) + this._f[2][3] <= r) return false;
        if (sphere.center.dotArr(this._f[3]) + this._f[3][3] <= r) return false;
        if (sphere.center.dotArr(this._f[4]) + this._f[4][3] <= r) return false;
        if (sphere.center.dotArr(this._f[5]) + this._f[5][3] <= r) return false;
        return true;
    }

    /**
     * Returns true if the frustum contains a bounding box.
     * @public
     * @param {og.bv.Box} box - Bounding box.
     * @returns {boolean}
     */
    containsBox(box) {
        var result = true, cout, cin;

        for (var i = 0; i < 6; i++) {
            cout = 0; cin = 0;
            for (var k = 0; k < 8 && (cin == 0 || cout == 0); k++) {
                var d = box.vertices[k].dotArr(this._f[i]) + this._f[i][3];
                if (d < 0)
                    cout++;
                else
                    cin++;
            }
            if (cin == 0)
                return false;
            else if (cout > 0)
                result = true;
        }
        return (result);
    }
};

export { Frustum };
