import {Box} from "../bv/Box";
import {Mat4, NumberArray16} from "../math/Mat4";
import {NumberArray4} from "../math/Vec4";
import {Sphere} from "../bv/Sphere";
import {Vec3} from "../math/Vec3";
import {RADIANS_HALF} from "../math";

function planeNormalize(plane: NumberArray4) {
    let t = 1.0 / Math.sqrt(plane[0] * plane[0] + plane[1] * plane[1] + plane[2] * plane[2]);
    plane[0] *= t;
    plane[1] *= t;
    plane[2] *= t;
    plane[3] *= t;
}

interface IFrustumParams {
    cameraFrustumIndex?: number;
    fov?: number;
    aspect?: number,
    near?: number;
    far?: number;
}

/**
 * Frustum object, part of the camera object.
 * @class
 * @param {*} options
 */
class Frustum {

    protected _f: [NumberArray4, NumberArray4, NumberArray4, NumberArray4, NumberArray4, NumberArray4];

    /**
     * Camera projection matrix.
     * @protected
     * @type {Mat4}
     */
    public projectionMatrix: Mat4;

    /**
     * Camera inverse projection matrix.
     * @protected
     * @type {Mat4}
     */
    public inverseProjectionMatrix: Mat4;

    /**
     * Product of projection and view matrices.
     * @protected
     * @type {Mat4}
     */
    public projectionViewMatrix: Mat4;

    public projectionViewRTEMatrix: Mat4;

    /**
     * Inverse projectionView Matrix.
     * @protected
     * @type {Mat4}
     */
    public inverseProjectionViewMatrix: Mat4;

    /**
     * Projection frustum left value.
     * @public
     */
    public left: number;
    /**
     * Projection frustum right value.
     * @public
     */
    public right: number;
    /**
     * Projection frustum bottom value.
     * @public
     */
    public bottom: number;
    /**
     * Projection frustum top value.
     * @public
     */
    public top: number;
    /**
     * Projection frustum near value.
     * @public
     */
    public near: number;
    /**
     * Projection frustum far value.
     * @public
     */
    public far: number;

    public cameraFrustumIndex: number;

    public _pickingColorU: Float32Array = new Float32Array([0, 0, 0]);

    constructor(options: IFrustumParams = {}) {

        this._f = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];

        this.projectionMatrix = new Mat4();

        this.inverseProjectionMatrix = new Mat4();

        this.projectionViewMatrix = new Mat4();

        this.projectionViewRTEMatrix = new Mat4();

        this.inverseProjectionViewMatrix = new Mat4();

        this.left = 0.0;

        this.right = 0.0;

        this.bottom = 0.0;

        this.top = 0.0;

        this.near = 0.0;

        this.far = 0.0;

        this.cameraFrustumIndex = options.cameraFrustumIndex != undefined ? options.cameraFrustumIndex : -1;

        this.setProjectionMatrix(
            options.fov || 30.0,
            options.aspect || 1.0,
            options.near || 1.0,
            options.far || 1000.0
        );
    }

    public getRightPlane(): NumberArray4 {
        return this._f[0];
    }

    public getLeftPlane(): NumberArray4 {
        return this._f[1];
    }

    public getBottomPlane(): NumberArray4 {
        return this._f[2];
    }

    public getTopPlane(): NumberArray4 {
        return this._f[3];
    }

    public getBackwardPlane(): NumberArray4 {
        return this._f[4];
    }

    public getForwardPlane(): NumberArray4 {
        return this._f[5];
    }

    public getProjectionViewMatrix(): NumberArray16 {
        return this.projectionViewMatrix._m;
    }

    public getProjectionViewRTEMatrix(): NumberArray16 {
        return this.projectionViewRTEMatrix._m;
    }

    public getProjectionMatrix(): NumberArray16 {
        return this.projectionMatrix._m;
    }

    public getInverseProjectionMatrix(): NumberArray16 {
        return this.inverseProjectionMatrix._m;
    }

    /**
     * Sets up camera projection matrix.
     * @public
     * @param {number} angle - Camera's view angle.
     * @param {number} aspect - Screen aspect ratio.
     * @param {number} near - Near camera distance.
     * @param {number} far - Far camera distance.
     */
    public setProjectionMatrix(angle: number, aspect: number, near: number, far: number) {
        this.top = near * Math.tan(angle * RADIANS_HALF);
        this.bottom = -this.top;
        this.right = this.top * aspect;
        this.left = -this.right;
        this.near = near;
        this.far = far;

        this.projectionMatrix.setPerspective(
            this.left,
            this.right,
            this.bottom,
            this.top,
            near,
            far
        );
        this.projectionMatrix.inverseTo(this.inverseProjectionMatrix);
    }

    public setProjectionViewRTEMatrix(viewRTEMatrix: Mat4) {
        this.projectionViewRTEMatrix = this.projectionMatrix.mul(viewRTEMatrix);
    }

    /**
     * Camera's projection matrix values.
     * @public
     * @param {Mat4} viewMatrix - View matrix.
     */
    public setViewMatrix(viewMatrix: Mat4) {
        this.projectionViewMatrix = this.projectionMatrix.mul(viewMatrix);
        this.projectionViewMatrix.inverseTo(this.inverseProjectionViewMatrix);

        let m = this.projectionViewMatrix._m;

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
    public containsPoint(point: Vec3): boolean {
        for (let p = 0; p < 6; p++) {
            let d = point.dotArr(this._f[p]) + this._f[p][3];
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
    public containsSphereBottomExc(sphere: Sphere): boolean {
        let r = -sphere.radius,
            f = this._f;
        if (sphere.center.dotArr(f[0]) + f[0][3] <= r) return false;
        if (sphere.center.dotArr(f[1]) + f[1][3] <= r) return false;
        if (sphere.center.dotArr(f[3]) + f[3][3] <= r) return false;
        if (sphere.center.dotArr(f[4]) + f[4][3] <= r) return false;
        if (sphere.center.dotArr(f[5]) + f[5][3] <= r) return false;
        return true;
    }

    public containsSphereButtom(sphere: Sphere): boolean {
        let r = -sphere.radius,
            f = this._f;
        if (sphere.center.dotArr(f[2]) + f[2][3] <= r)
            return false;
        return true;
    }

    /**
     * Returns true if the frustum contains a bonding sphere.
     * @public
     * @param {Sphere} sphere - Bounding sphere.
     * @returns {boolean} -
     */
    public containsSphere(sphere: Sphere): boolean {
        let r = -sphere.radius,
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
    public containsSphere2(center: Vec3, radius: number): boolean {
        let r = -radius;
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
    public containsBox(box: Box): boolean {
        let result: boolean = true,
            cout: number,
            cin: number;

        for (let i = 0; i < 6; i++) {
            cout = 0;
            cin = 0;
            for (let k = 0; k < 8 && (cin === 0 || cout === 0); k++) {
                let d = box.vertices[k].dotArr(this._f[i]) + this._f[i][3];
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

export {Frustum};
