import { Box } from "../bv/Box";
import { Mat4, type NumberArray16 } from "../math/Mat4";
import type { NumberArray4 } from "../math/Vec4";
import { Sphere } from "../bv/Sphere";
import { Vec3 } from "../math/Vec3";
import { RADIANS_HALF } from "../math";

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
    aspect?: number;
    near?: number;
    far?: number;
    reverseDepth?: boolean;
    depthZeroToOne?: boolean;
}

/**
 * Frustum object, part of the camera object.
 * @class
 * @param {*} options
 */
class Frustum {
    protected _f: [NumberArray4, NumberArray4, NumberArray4, NumberArray4, NumberArray4, NumberArray4];
    protected _isOrthographic: boolean;
    protected _aspect: number;
    protected _tanViewAngle_hrad: number;
    protected _reverseDepth: boolean;
    protected _depthZeroToOne: boolean;

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
     * Near-plane safety value used by depth offset logic in shaders.
     * Updated together with `near`.
     * @public
     */
    public depthOffsetNear: number;

    /**
     * Projection frustum far value.
     * @public
     */
    public far: number;

    public cameraFrustumIndex: number;

    public _pickingColorU: Float32Array = new Float32Array([0, 0, 0]);

    constructor(options: IFrustumParams = {}) {
        this._f = [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ];

        this.projectionMatrix = new Mat4();

        this.inverseProjectionMatrix = new Mat4();

        this.projectionViewMatrix = new Mat4();

        this.projectionViewRTEMatrix = new Mat4();

        this.inverseProjectionViewMatrix = new Mat4();

        this._isOrthographic = false;

        this._aspect = 1.0;

        this._tanViewAngle_hrad = 0.0;

        this._reverseDepth = false;
        this._depthZeroToOne = false;

        this.left = 0.0;

        this.right = 0.0;

        this.bottom = 0.0;

        this.top = 0.0;

        this.near = 0.0;
        this.depthOffsetNear = 0.0;

        this.far = 0.0;

        this.cameraFrustumIndex = options.cameraFrustumIndex != undefined ? options.cameraFrustumIndex : -1;

        this.setProjectionMatrix(
            options.fov || 30.0,
            options.aspect || 1.0,
            options.near || 1.0,
            options.far || 1000.0,
            false,
            10,
            options.reverseDepth,
            options.depthZeroToOne
        );
    }

    /**
     * Returns right clipping plane.
     * @public
     * @returns {NumberArray4} Right clipping plane coefficients.
     */
    public getRightPlane(): NumberArray4 {
        return this._f[0];
    }

    /**
     * Returns left clipping plane.
     * @public
     * @returns {NumberArray4} Left clipping plane coefficients.
     */
    public getLeftPlane(): NumberArray4 {
        return this._f[1];
    }

    /**
     * Returns bottom clipping plane.
     * @public
     * @returns {NumberArray4} Bottom clipping plane coefficients.
     */
    public getBottomPlane(): NumberArray4 {
        return this._f[2];
    }

    /**
     * Returns top clipping plane.
     * @public
     * @returns {NumberArray4} Top clipping plane coefficients.
     */
    public getTopPlane(): NumberArray4 {
        return this._f[3];
    }

    /**
     * Returns backward clipping plane.
     * @public
     * @returns {NumberArray4} Backward clipping plane coefficients.
     */
    public getBackwardPlane(): NumberArray4 {
        return this._f[4];
    }

    /**
     * Returns forward clipping plane.
     * @public
     * @returns {NumberArray4} Forward clipping plane coefficients.
     */
    public getForwardPlane(): NumberArray4 {
        return this._f[5];
    }

    /**
     * Returns projection-view matrix.
     * @public
     * @returns {NumberArray16} Projection-view matrix values.
     */
    public getProjectionViewMatrix(): NumberArray16 {
        return this.projectionViewMatrix._m;
    }

    /**
     * Returns projection-view RTE matrix.
     * @public
     * @returns {NumberArray16} Projection-view RTE matrix values.
     */
    public getProjectionViewRTEMatrix(): NumberArray16 {
        return this.projectionViewRTEMatrix._m;
    }

    /**
     * Returns projection matrix.
     * @public
     * @returns {NumberArray16} Projection matrix values.
     */
    public getProjectionMatrix(): NumberArray16 {
        return this.projectionMatrix._m;
    }

    /**
     * Returns inverse projection matrix.
     * @public
     * @returns {NumberArray16} Inverse projection matrix values.
     */
    public getInverseProjectionMatrix(): NumberArray16 {
        return this.inverseProjectionMatrix._m;
    }

    /**
     * Sets up camera projection matrix.
     * @public
     * @param {number} viewAngle - Camera vertical field of view angle in degrees.
     * @param {number} aspect - Viewport aspect ratio (`width / height`).
     * @param {number} near - Near clipping plane distance.
     * @param {number} far - Far clipping plane distance.
     * @param {boolean} [isOrthographic=false] - Enables orthographic projection mode.
     * @param {number} [focusDistance=10] - Reference distance used to compute orthographic frustum size.
     * @param {boolean} [reverseDepth=false] - Enables reverse-Z infinite perspective projection.
     * @param {boolean} [depthZeroToOne=false] - Uses `[0, 1]` NDC depth range for reverse-Z projection.
     */
    public setProjectionMatrix(
        viewAngle: number,
        aspect: number,
        near: number,
        far: number,
        isOrthographic: boolean = false,
        focusDistance: number = 10,
        reverseDepth: boolean = false,
        depthZeroToOne: boolean = false
    ) {
        this._isOrthographic = isOrthographic;
        this._reverseDepth = reverseDepth;
        this._depthZeroToOne = depthZeroToOne;
        this._aspect = aspect;
        this._tanViewAngle_hrad = Math.tan(viewAngle * RADIANS_HALF);

        if (this._isOrthographic) {
            let h = focusDistance * this._tanViewAngle_hrad;
            let w = h * aspect;
            this._setFrustumParams(h, w, near, far);
            this.projectionMatrix.setOrthographic(this.left, this.right, this.bottom, this.top, this.near, this.far);
        } else {
            let h = near * this._tanViewAngle_hrad;
            let w = h * aspect;
            this._setFrustumParams(h, w, near, far);
            // reverseDepth: `far` on this frustum is for CPU culling only; projection uses infinite reverse-Z.
            if (reverseDepth) {
                this.projectionMatrix.setPerspectiveReverseInfinite(
                    this.left,
                    this.right,
                    this.bottom,
                    this.top,
                    this.near,
                    depthZeroToOne
                );
            } else {
                this.projectionMatrix.setPerspective(this.left, this.right, this.bottom, this.top, this.near, this.far);
            }
        }

        this.projectionMatrix.inverseTo(this.inverseProjectionMatrix);
    }

    /**
     * Updates near and far clipping planes.
     * @public
     * @param {number} near - Near clipping plane distance.
     * @param {number} [far=this.far] - Far clipping plane distance.
     */
    public setNearFar(near: number, far: number = this.far) {
        if (this._isOrthographic) {
            this.near = near;
            this.far = far;
            this.projectionMatrix.setOrthographic(this.left, this.right, this.bottom, this.top, this.near, this.far);
        } else {
            let h = near * this._tanViewAngle_hrad;
            let w = h * this._aspect;
            this._setFrustumParams(h, w, near, far);
            if (this._reverseDepth) {
                this.projectionMatrix.setPerspectiveReverseInfinite(
                    this.left,
                    this.right,
                    this.bottom,
                    this.top,
                    this.near,
                    this._depthZeroToOne
                );
            } else {
                this.projectionMatrix.setPerspective(this.left, this.right, this.bottom, this.top, this.near, this.far);
            }
        }

        this.projectionMatrix.inverseTo(this.inverseProjectionMatrix);
    }

    protected _setFrustumParams(top: number, right: number, near: number, far: number) {
        this.top = top;
        this.right = right;
        this.bottom = -this.top;
        this.left = -this.right;
        this.near = near;
        this.far = far;
        this.depthOffsetNear = near * 1.001 + 1e-6;
    }

    /**
     * Updates projection-view RTE matrix.
     * @public
     * @param {Mat4} viewRTEMatrix - View matrix in RTE coordinates.
     */
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
     * Returns true if the point is inside the frustum.
     * @public
     * @param {Vec3} point - Cartesian point.
     * @returns {boolean} `true` when the point is inside.
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
     * Returns true if the sphere is inside the frustum, ignoring the bottom plane.
     * @public
     * @param {Sphere} sphere - Bounding sphere.
     * @returns {boolean} `true` when the sphere passes all checked planes.
     */
    public containsSphereBottomExc(sphere: Sphere): boolean {
        let r = -sphere.radius,
            f = this._f;
        if (sphere.center.dotArr(f[0]) + f[0][3] <= r) return false;
        if (sphere.center.dotArr(f[1]) + f[1][3] <= r) return false;
        if (sphere.center.dotArr(f[3]) + f[3][3] <= r) return false;
        if (sphere.center.dotArr(f[4]) + f[4][3] <= r) return false;
        return sphere.center.dotArr(f[5]) + f[5][3] > r;
    }

    /**
     * Checks sphere intersection with the bottom frustum plane only.
     * @public
     * @param {Sphere} sphere - Bounding sphere.
     * @returns {boolean} `true` when the sphere is not clipped by the bottom plane.
     */
    public containsSphereButtom(sphere: Sphere): boolean {
        let r = -sphere.radius,
            f = this._f;
        return sphere.center.dotArr(f[2]) + f[2][3] > r;
    }

    /**
     * Returns true if the sphere is inside the frustum.
     * @public
     * @param {Sphere} sphere - Bounding sphere.
     * @returns {boolean} `true` when the sphere is inside.
     */
    public containsSphere(sphere: Sphere): boolean {
        let r = -sphere.radius,
            f = this._f;
        if (sphere.center.dotArr(f[0]) + f[0][3] <= r) return false;
        if (sphere.center.dotArr(f[1]) + f[1][3] <= r) return false;
        if (sphere.center.dotArr(f[2]) + f[2][3] <= r) return false;
        if (sphere.center.dotArr(f[3]) + f[3][3] <= r) return false;
        if (sphere.center.dotArr(f[4]) + f[4][3] <= r) return false;
        return sphere.center.dotArr(f[5]) + f[5][3] > r;
    }

    /**
     * Returns true if the sphere is inside the frustum.
     * @public
     * @param {Vec3} center - Sphere center.
     * @param {number} radius - Sphere radius.
     * @returns {boolean} `true` when the sphere is inside.
     */
    public containsSphere2(center: Vec3, radius: number): boolean {
        let r = -radius;
        if (center.dotArr(this._f[0]) + this._f[0][3] <= r) return false;
        if (center.dotArr(this._f[1]) + this._f[1][3] <= r) return false;
        if (center.dotArr(this._f[2]) + this._f[2][3] <= r) return false;
        if (center.dotArr(this._f[3]) + this._f[3][3] <= r) return false;
        if (center.dotArr(this._f[4]) + this._f[4][3] <= r) return false;
        return center.dotArr(this._f[5]) + this._f[5][3] > r;
    }

    /**
     * Returns true if the box intersects or is inside the frustum.
     * @public
     * @param {Box} box - Bounding box.
     * @returns {boolean} `true` when the box is not fully outside.
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

export { Frustum };
