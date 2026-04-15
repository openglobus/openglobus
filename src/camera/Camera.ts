import { type EventsHandler, createEvents } from "../Events";
import { Frustum } from "./Frustum";
import { Mat3 } from "../math/Mat3";
import type { NumberArray9 } from "../math/Mat3";
import { Mat4 } from "../math/Mat4";
import type { NumberArray16 } from "../math/Mat4";
import { Renderer } from "../renderer/Renderer";
import { Vec2 } from "../math/Vec2";
import type { NumberArray2 } from "../math/Vec2";
import { Vec3 } from "../math/Vec3";
import { Vec4 } from "../math/Vec4";
import { Sphere } from "../bv/Sphere";
import { Quat } from "../math/Quat";
import { DEGREES_DOUBLE, MAX_FLOAT, RADIANS, RADIANS_HALF } from "../math";
import { Easing, EasingFunction } from "../utils/easing";
import { LonLat } from "../LonLat";

export type CameraEvents = ["viewchange", "moveend", "flystart", "flyend", "flystop", "frustumschanged"];

const EVENT_NAMES: CameraEvents = [
    /**
     * When camera has been updated.
     * @event og.Camera#viewchange
     */
    "viewchange",

    /**
     * Camera is stopped.
     * @event og.Camera#moveend
     */
    "moveend",

    /**
     * Triggered before camera flight.
     * @event og.Camera#flystart
     */
    "flystart",

    /**
     * Triggered when camera finished flight.
     * @event og.Camera#flyend
     */
    "flyend",

    /**
     * Triggered when flight was stopped.
     * @event og.Camera#flystop
     */
    "flystop",

    /**
     * Triggered when setFrustums called
     * @event og.Camera#frustumschanged
     */
    "frustumschanged"
];

export interface ICameraParams {
    eye?: Vec3;
    viewAngle?: number;
    look?: Vec3;
    up?: Vec3;
    frustums?: NumberArray2[];
    width?: number;
    height?: number;
    isOrthographic?: boolean;
    focusDistance?: number;
    reverseDepth?: boolean;
}

export interface IFlyCartesianParams extends IFlyBaseParams {
    look?: Vec3 | LonLat;
    up?: Vec3;
}

export interface IFlyBaseParams {
    duration?: number;
    ease?: EasingFunction;
    completeCallback?: Function;
    startCallback?: Function;
    frameCallback?: Function;
}

export const DEFAULT_FLIGHT_DURATION = 800;
export const DEFAULT_EASING = Easing.CubicInOut;

type CameraFrame = {
    eye: Vec3;
    n: Vec3;
    u: Vec3;
    v: Vec3;
};

type CameraFlight = {
    fly: (progress: number) => CameraFrame;
    duration: number;
    startedAt: number;
};

const getHorizontalViewAngleByFov = (fov: number, aspect: number) =>
    DEGREES_DOUBLE * Math.atan(Math.tan(RADIANS_HALF * fov) * aspect);

/**
 * Camera class.
 * @class
 * //@param {Renderer} [renderer] - Renderer uses the camera instance.
 * @param {Object} [options] - Camera options:
 * @param {Object} [options.name] - Camera name.
 * @param {number} [options.viewAngle=47] - Camera angle of view. Default is 47.0
 * @param {number} [options.near=1] - Camera near plane distance. Default is 1.0
 * @param {number} [options.far=og.math.MAX] - Camera far plane distance. Default is og.math.MAX
 * @param {Vec3} [options.eye=[0,0,0]] - Camera eye position. Default (0,0,0)
 * @param {Vec3} [options.look=[0,0,0]] - Camera look position. Default (0,0,0)
 * @param {Vec3} [options.up=[0,1,0]] - Camera eye position. Default (0,1,0)
 *
 * @fires viewchange
 * @fires moveend
 */
class Camera {
    static __counter__: number = 0;
    protected __id: number;

    /**
     * Camera events handler
     * @public
     * @type {Events}
     */
    public events: EventsHandler<CameraEvents>;

    protected _isOrthographic: boolean;

    protected _focusDistance: number;

    /**
     * Camera position.
     * @public
     * @type {Vec3}
     */
    public eye: Vec3;

    /**
     * Camera RTE high position
     * @public
     * @type {Float32Array}
     */
    public eyeHigh: Float32Array;

    /**
     * Camera RTE low position
     * @public
     * @type {Float32Array}
     */
    public eyeLow: Float32Array;

    /**
     * Camera view angle in degrees
     * @protected
     * @type {Number}
     */
    protected _viewAngle: number;

    protected _horizontalViewAngle: number;

    /**
     * Camera view matrix.
     * @protected
     * @type {Mat4}
     */
    protected _viewMatrix: Mat4;
    protected _viewMatrixRTE: Mat4;

    /**
     * Camera normal matrix.
     * @protected
     * @type {Mat3}
     */
    protected _normalMatrix: Mat3;

    /**
     * Camera right vector.
     * @protected
     * @type {Vec3}
     */
    public _r: Vec3;

    /**
     * Camera up vector.
     * @protected
     * @type {Vec3}
     */
    public _u: Vec3;

    /**
     * Camera backward vector.
     * @protected
     * @type {Vec3}
     */
    public _b: Vec3;

    /**
     * Camera forward vector.
     * @protected
     * @type {Vec3}
     */
    public _f: Vec3;

    protected _pr: Vec3;
    protected _pu: Vec3;
    protected _pb: Vec3;
    protected _peye: Vec3;

    public isMoving: boolean;

    protected _tanViewAngle_hrad: number;

    public _tanViewAngle_hradOneByHeight: number;

    protected _projSizeConst: number;

    public frustums: Frustum[];

    public frustumColors: number[];

    public FARTHEST_FRUSTUM_INDEX: number;

    public currentFrustumIndex: number;

    public frustumColorIndex: number;

    public isFarthestFrustumActive: boolean;

    /**
     * Reverse-Z depth: GREATER test, clear 0, infinite projection; single frustum with large `far` for culling.
     * @protected
     */
    protected _reverseDepth: boolean;
    protected _depthZeroToOne: boolean;

    public _width: number;

    public _height: number;

    protected _flight: CameraFlight | null;
    protected _completeCallback: Function | null;
    protected _frameCallback: Function | null;

    protected _flying: boolean;

    public slope: number;

    // public dirForwardNED: Vec3;
    // public dirUpNED: Vec3;
    // public dirRightNED: Vec3;

    constructor(options: ICameraParams = {}) {
        this.__id = Camera.__counter__++;

        this.events = createEvents<CameraEvents>(EVENT_NAMES, this);

        this.slope = 0;

        this._isOrthographic = options.isOrthographic ?? false;

        this._focusDistance = options.focusDistance != undefined ? options.focusDistance : 10;

        this._width = options.width || 1;

        this._height = options.height || 1;

        this.eye = options.eye || new Vec3();

        this.eyeHigh = new Float32Array(3);

        this.eyeLow = new Float32Array(3);

        this._viewAngle = options.viewAngle || 47.0;

        this._horizontalViewAngle = 0;

        this._viewMatrix = new Mat4();
        this._viewMatrixRTE = new Mat4();

        this._normalMatrix = new Mat3();

        this._r = new Vec3(1.0, 0.0, 0.0);
        this._u = new Vec3(0.0, 1.0, 0.0);
        this._b = new Vec3(0.0, 0.0, 1.0);
        this._f = this._b.negateTo();

        // Previous frame values
        this._pr = this._r.clone();
        this._pu = this._u.clone();
        this._pb = this._b.clone();
        this._peye = this.eye.clone();
        this.isMoving = false;

        this._flight = null;
        this._completeCallback = null;
        this._frameCallback = null;
        this._flying = false;

        this._tanViewAngle_hrad = 0.0;
        this._tanViewAngle_hradOneByHeight = 0.0;

        this.frustums = [];

        this.frustumColors = [];

        this._reverseDepth = options.reverseDepth ?? true;
        this._depthZeroToOne = false;

        let initFrustums = options.frustums || [[1, 500]];
        if (this.reverseDepthActive) {
            const [near = 1, far = MAX_FLOAT] = initFrustums[0] ?? [];
            initFrustums = [[near, far]];
        }
        this.setFrustums(initFrustums);

        this.FARTHEST_FRUSTUM_INDEX = this.frustums.length - 1;
        this.currentFrustumIndex = 0;
        this.frustumColorIndex = 0;

        this.isFarthestFrustumActive = false;

        this._projSizeConst = 0;

        this.set(
            options.eye || new Vec3(0.0, 0.0, 1.0),
            options.look || new Vec3(),
            options.up || new Vec3(0.0, 1.0, 0.0)
        );
    }

    /**
     * Returns current projection mode.
     * @public
     * @returns {boolean} `true` when orthographic projection is enabled.
     */
    public get isOrthographic(): boolean {
        return this._isOrthographic;
    }

    /**
     * Returns reverse depth flag.
     * @public
     * @returns {boolean} `true` when reverse depth mode is enabled.
     */
    public get reverseDepth(): boolean {
        return this._reverseDepth;
    }

    /**
     * Returns active reverse depth state.
     * @public
     * @returns {boolean} `true` for perspective reverse-Z mode.
     */
    public get reverseDepthActive(): boolean {
        return this._reverseDepth && !this._isOrthographic;
    }

    /**
     * Returns active depth range mode.
     * @public
     * @returns {boolean} `true` when ZERO_TO_ONE depth range is active.
     */
    public get depthZeroToOne(): boolean {
        return this._depthZeroToOne && this.reverseDepthActive;
    }

    /**
     * Enables or disables ZERO_TO_ONE depth range mode.
     * @public
     * @param {boolean} enabled - Depth range mode flag.
     */
    public setDepthZeroToOne(enabled: boolean) {
        if (this._depthZeroToOne !== enabled) {
            this._depthZeroToOne = enabled;
            this.refresh();
        }
    }

    /**
     * Enables or disables orthographic projection mode.
     * @public
     * @param {boolean} isOrthographic - Orthographic mode flag.
     */
    public set isOrthographic(isOrthographic: boolean) {
        if (this._isOrthographic !== isOrthographic) {
            this._isOrthographic = isOrthographic;
            this.refresh();
        }
    }

    /**
     * Returns focus distance used for orthographic projection size.
     * @public
     * @returns {number} Focus distance.
     */
    public get focusDistance(): number {
        return this._focusDistance;
    }

    /**
     * Sets focus distance used for orthographic projection size.
     * @public
     * @param {number} dist - Focus distance.
     */
    public set focusDistance(dist: number) {
        if (dist !== this._focusDistance) {
            this._focusDistance = dist;
            if (this._isOrthographic) {
                this.refresh();
            }
        }
    }

    /**
     * Returns camera identifier.
     * @public
     * @returns {number} Camera id.
     */
    public get id(): number {
        return this.__id;
    }

    /**
     * Flies to the cartesian coordinates.
     * @public
     * @param {Vec3} [cartesian] - Finish cartesian coordinates.
     * @param {IFlyCartesianParams} [params] - Flight parameters
     */
    flyCartesian(cartesian: Vec3, params: IFlyCartesianParams = {}): void {
        this.stopFlying();
        params.look = params.look || Vec3.ZERO;
        params.up = params.up || Vec3.UP;
        params.duration = params.duration || DEFAULT_FLIGHT_DURATION;
        const ease = params.ease || DEFAULT_EASING;

        this._completeCallback = params.completeCallback || (() => {});

        this._frameCallback = params.frameCallback || (() => {});

        if (params.startCallback) {
            params.startCallback.call(this);
        }

        let ground_a = this.eye.clone();

        let v_a = this._u,
            n_a = this._b;

        let up_b = params.up;
        let ground_b = cartesian.clone();
        let n_b = Vec3.sub(cartesian, params.look as Vec3);
        let u_b = up_b.cross(n_b);
        n_b.normalize();
        u_b.normalize();
        let v_b = n_b.cross(u_b);

        this._flight = {
            fly: (progress: number) => {
                let t = ease(progress);
                let d = 1 - t;
                // camera path and orientations calculation
                let g_i = ground_a.smerp(ground_b, d);
                let eye_i = g_i;
                let up_i = v_a.smerp(v_b, d);
                let look_i = Vec3.add(eye_i, n_a.smerp(n_b, d).negateTo());

                let n = new Vec3(eye_i.x - look_i.x, eye_i.y - look_i.y, eye_i.z - look_i.z);
                let u = up_i.cross(n);
                n.normalize();
                u.normalize();

                let v = n.cross(u);
                return {
                    eye: eye_i,
                    n: n,
                    u: u,
                    v: v
                };
            },
            duration: params.duration,
            startedAt: Date.now()
        };
        this._flying = true;
        this.events.dispatch(this.events.flystart, this);
    }

    /**
     * Breaks the flight.
     * @public
     */
    stopFlying() {
        if (!this._flying) {
            return;
        }
        this._flying = false;
        this._flight = null;
        this._frameCallback = null;
        this.events.dispatch(this.events.flystop, this);
    }

    /**
     * Prepare camera to the frame. Used in render node frame function.
     * @public
     */
    public checkFly() {
        if (this._flying && this._flight !== null) {
            let progress = Math.min((Date.now() - this._flight.startedAt) / this._flight.duration, 1);

            const frame = this._flight.fly(progress);
            this.eye = frame.eye;
            this._r = frame.u;
            this._u = frame.v;
            this._b = frame.n;
            this._f.set(-this._b.x, -this._b.y, -this._b.z);

            if (this._frameCallback) {
                this._frameCallback();
            }

            this.update();

            if (progress >= 1) {
                this.stopFlying();
                if (this._completeCallback) {
                    this.events.dispatch(this.events.flyend, this);
                    this._completeCallback();
                    this._completeCallback = null;
                }
            }
        }
    }

    /**
     * Returns camera is flying.
     * @public
     * @returns {boolean}
     */
    isFlying() {
        return this._flying;
    }

    /**
     * Checks whether the camera stopped moving and dispatches `moveend`.
     * @public
     */
    public checkMoveEnd() {
        let r = this._r,
            u = this._u,
            b = this._b,
            eye = this.eye;

        if (this._peye.equal(eye) && this._pr.equal(r) && this._pu.equal(u) && this._pb.equal(b)) {
            if (this.isMoving) {
                this.events.dispatch(this.events.moveend, this);
            }
            this.isMoving = false;
        } else {
            this.isMoving = true;
        }

        this._pr.copy(r);
        this._pu.copy(u);
        this._pb.copy(b);
        this._peye.copy(eye);
    }

    /**
     * Binds picking colors for all frustums.
     * @public
     * @param {Renderer} renderer - Renderer instance.
     */
    public bindFrustumsPickingColors(renderer: Renderer) {
        for (let i = 0; i < this.frustums.length; i++) {
            renderer.clearPickingColor(this.frustums[i]);
            renderer.assignPickingColor<Frustum>(this.frustums[i]);
        }
    }

    /**
     * Camera initialization.
     * @public
     * @param {Object} [options] - Camera options:
     * @param {number} [options.viewAngle] - Camera angle of view.
     * @param {number} [options.near] - Camera near plane distance. Default is 1.0
     * @param {number} [options.far] - Camera far plane distance. Default is math.MAX
     * @param {Vec3} [options.eye] - Camera eye position. Default (0,0,0)
     * @param {Vec3} [options.look] - Camera look position. Default (0,0,0)
     * @param {Vec3} [options.up] - Camera eye position. Default (0,1,0)
     */
    protected _init(options: ICameraParams) {
        this._setProj(this._viewAngle, this.getAspectRatio());

        this.set(
            options.eye || new Vec3(0.0, 0.0, 1.0),
            options.look || new Vec3(),
            options.up || new Vec3(0.0, 1.0, 0.0)
        );
    }

    /**
     * Returns up direction vector.
     * @public
     * @returns {Vec3} Up direction.
     */
    public getUp(): Vec3 {
        return this._u.clone();
    }

    /**
     * Returns down direction vector.
     * @public
     * @returns {Vec3} Down direction.
     */
    public getDown(): Vec3 {
        return this._u.negateTo();
    }

    /**
     * Returns right direction vector.
     * @public
     * @returns {Vec3} Right direction.
     */
    public getRight(): Vec3 {
        return this._r.clone();
    }

    /**
     * Returns left direction vector.
     * @public
     * @returns {Vec3} Left direction.
     */
    public getLeft(): Vec3 {
        return this._r.negateTo();
    }

    /**
     * Returns forward direction vector.
     * @public
     * @returns {Vec3} Forward direction.
     */
    public getForward(): Vec3 {
        return this._f.clone();
    }

    /**
     * Returns backward direction vector.
     * @public
     * @returns {Vec3} Backward direction.
     */
    public getBackward(): Vec3 {
        return this._b.clone();
    }

    /**
     * Updates camera view space
     * @public
     * @virtual
     */
    public update() {
        let u = this._r,
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

        this._viewMatrixRTE.set([u.x, v.x, n.x, 0.0, u.y, v.y, n.y, 0.0, u.z, v.z, n.z, 0.0, 0, 0, 0, 1.0]);

        // do not clean up, someday it will be using
        //this._normalMatrix = this._viewMatrix.toMatrix3(); // this._viewMatrix.toInverseMatrix3().transposeTo();

        for (let i = 0, len = this.frustums.length; i < len; i++) {
            this.frustums[i].setViewMatrix(this._viewMatrix);
            this.frustums[i].setProjectionViewRTEMatrix(this._viewMatrixRTE);
        }

        this.events.dispatch(this.events.viewchange, this);
    }

    /**
     * Refresh camera matrices
     * @public
     */
    public refresh() {
        this._setProj(this._viewAngle, this.getAspectRatio());
        this.update();
    }

    /**
     * Returns viewport width.
     * @public
     * @returns {number} Viewport width in pixels.
     */
    public get width(): number {
        return this._width;
    }

    /**
     * Returns viewport height.
     * @public
     * @returns {number} Viewport height in pixels.
     */
    public get height(): number {
        return this._height;
    }

    /**
     * Sets viewport size and updates projection.
     * @public
     * @param {number} width - Viewport width in pixels.
     * @param {number} height - Viewport height in pixels.
     */
    public setViewportSize(width: number, height: number) {
        this._width = width;
        this._height = height;
        this.refresh();
    }

    /**
     * Returns aspect ratio.
     * @public
     * @returns {number} Aspect ratio.
     */
    public getAspectRatio(): number {
        return this._width / this._height;
    }

    /**
     * Sets camera projection.
     * @public
     * @param {number} viewAngle - Camera view angle.
     * @param {number} aspect - Screen aspect ratio.
     */
    protected _setProj(viewAngle: number, aspect: number) {
        this._viewAngle = viewAngle;
        for (let i = 0, len = this.frustums.length; i < len; i++) {
            let fi = this.frustums[i];
            fi.setProjectionMatrix(
                viewAngle,
                aspect,
                fi.near,
                fi.far,
                this._isOrthographic,
                this._focusDistance,
                this.reverseDepthActive,
                this.depthZeroToOne
            );
        }
        this._horizontalViewAngle = getHorizontalViewAngleByFov(viewAngle, aspect);
        this._updateViewportParameters();
    }

    /**
     * Updates near/far planes for one frustum.
     * @public
     * @param {number} near - Near clipping plane distance.
     * @param {number} [far] - Far clipping plane distance.
     * @param {number} [frustumIndex=0] - Frustum index.
     */
    public setNearFar(near: number, far?: number, frustumIndex: number = 0) {
        this.frustums[frustumIndex].setNearFar(near, far);
    }

    /**
     * Replaces camera frustum ranges.
     * @public
     * @param {Array.<NumberArray2>} frustums - Array of `[near, far]` ranges.
     */
    public setFrustums(frustums: [number, number][]) {
        if (this.reverseDepthActive && frustums.length > 1) {
            frustums = [frustums[0]];
        }

        let aspect = this.getAspectRatio();

        for (let i = 0; i < frustums.length; i++) {
            if (this.frustums[i]) {
                let near = frustums[i][0],
                    far = frustums[i][1];
                this.frustums[i].setProjectionMatrix(
                    this._viewAngle,
                    aspect,
                    near,
                    far,
                    this._isOrthographic,
                    this._focusDistance,
                    this.reverseDepthActive,
                    this.depthZeroToOne
                );
            } else {
                let near = frustums[i][0],
                    far = frustums[i][1];
                let fi = new Frustum({
                    cameraFrustumIndex: i,
                    fov: this._viewAngle,
                    aspect,
                    near,
                    far,
                    reverseDepth: this.reverseDepthActive,
                    depthZeroToOne: this.depthZeroToOne
                });
                this.frustums.push(fi);
                this.frustumColors.push(fi._pickingColorU[0], fi._pickingColorU[1], fi._pickingColorU[2]);
            }
        }

        this.frustums.length = frustums.length;
        this.frustumColors.length = frustums.length * 3;
        this.FARTHEST_FRUSTUM_INDEX = this.frustums.length - 1;
        this.setCurrentFrustum(0);

        this.events.dispatch(this.events.frustumschanged, this);
    }

    protected _updateViewportParameters() {
        this._tanViewAngle_hrad = Math.tan(this._viewAngle * RADIANS_HALF);
        this._tanViewAngle_hradOneByHeight = this._tanViewAngle_hrad * (1.0 / this._height);
        this._projSizeConst =
            Math.min(this._width < 512 ? 512 : this._width, this._height < 512 ? 512 : this._height) /
            (this._viewAngle * RADIANS);
    }

    /**
     * Sets camera view angle in degrees
     * @public
     * @param {number} angle - View angle
     */
    public setViewAngle(angle: number) {
        this._viewAngle = angle;
        this.refresh();
    }

    /**
     * Returns camera vertical view angle in degrees.
     * @public
     * @returns {number} View angle in degrees.
     */
    public getViewAngle(): number {
        return this._viewAngle;
    }

    /**
     * Returns camera vertical view angle in degrees.
     * @public
     * @returns {number} Vertical view angle.
     */
    public get viewAngle(): number {
        return this._viewAngle;
    }

    /**
     * Returns camera vertical view angle in degrees.
     * @public
     * @returns {number} Vertical view angle.
     */
    public get verticalViewAngle(): number {
        return this._viewAngle;
    }

    /**
     * Returns camera horizontal view angle in degrees.
     * @public
     * @returns {number} Horizontal view angle.
     */
    public get horizontalViewAngle(): number {
        return this._horizontalViewAngle;
    }

    /**
     * Sets camera to eye position
     * @public
     * @param {Vec3} eye - Camera position
     * @param {Vec3} look - Look point
     * @param {Vec3} up - Camera up vector
     * @returns {Camera} - This camera
     */
    public set(eye: Vec3, look?: Vec3, up?: Vec3): this {
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
        this._f.set(-this._b.x, -this._b.y, -this._b.z);
        return this;
    }

    /**
     * Sets camera look point
     * @public
     * @param {Vec3} look - Look point
     * @param {Vec3} [up] - Camera up vector otherwise camera current up vector(this._u)
     */
    public look(look: Vec3, up?: Vec3) {
        this._b.set(this.eye.x - look.x, this.eye.y - look.y, this.eye.z - look.z);
        this._r.copy((up || this._u).cross(this._b));
        this._b.normalize();
        this._f.set(-this._b.x, -this._b.y, -this._b.z);
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
    public slide(du: number, dv: number, dn: number) {
        this.eye.x += du * this._r.x + dv * this._u.x + dn * this._b.x;
        this.eye.y += du * this._r.y + dv * this._u.y + dn * this._b.y;
        this.eye.z += du * this._r.z + dv * this._u.z + dn * this._b.z;
    }

    /**
     * Roll the camera to the angle in radians
     * @public
     * @param {number} angle - Delta roll angle in radians
     */
    public setRoll(angle: number) {
        let cs = Math.cos(angle);
        let sn = Math.sin(angle);
        let t = this._r.clone();
        this._r.set(cs * t.x - sn * this._u.x, cs * t.y - sn * this._u.y, cs * t.z - sn * this._u.z);
        this._u.set(sn * t.x + cs * this._u.x, sn * t.y + cs * this._u.y, sn * t.z + cs * this._u.z);
    }

    /**
     * Pitch the camera to the angle in radians
     * @public
     * @param {number} angle - Delta pitch angle in radians
     */
    public setPitch(angle: number) {
        let cs = Math.cos(angle);
        let sn = Math.sin(angle);
        let t = this._b;
        this._b.set(cs * t.x - sn * this._u.x, cs * t.y - sn * this._u.y, cs * t.z - sn * this._u.z);
        this._u.set(sn * t.x + cs * this._u.x, sn * t.y + cs * this._u.y, sn * t.z + cs * this._u.z);
    }

    /**
     * Yaw the camera to the angle in radians
     * @public
     * @param {number} angle - Delta yaw angle in radians
     */
    public setYaw(angle: number) {
        let cs = Math.cos(angle);
        let sn = Math.sin(angle);
        let t = this._r;
        this._r.set(cs * t.x - sn * this._b.x, cs * t.y - sn * this._b.y, cs * t.z - sn * this._b.z);
        this._b.set(sn * t.x + cs * this._b.x, sn * t.y + cs * this._b.y, sn * t.z + cs * this._b.z);
    }

    /**
     * Sets camera orientation from Euler angles.
     * @public
     * @param {number} pitch - Pitch angle in radians.
     * @param {number} yaw - Yaw angle in radians.
     * @param {number} roll - Roll angle in radians.
     */
    public setPitchYawRoll(pitch: number, yaw: number, roll: number) {
        let qRot = new Quat();
        qRot.setPitchYawRoll(pitch, yaw, roll);
        this.setRotation(qRot);
    }

    /**
     * Returns pitch angle.
     * @public
     * @returns {number} Pitch angle in radians.
     */
    public getPitch(): number {
        return this.getRotation().getPitch();
    }

    /**
     * Returns yaw angle.
     * @public
     * @returns {number} Yaw angle in radians.
     */
    public getYaw(): number {
        return this.getRotation().getYaw();
    }

    /**
     * Returns roll angle.
     * @public
     * @returns {number} Roll angle in radians.
     */
    public getRoll(): number {
        return this.getRotation().getRoll();
    }

    /**
     * Returns absolute pitch angle.
     * @public
     * @returns {number} Absolute pitch angle in radians.
     */
    public getAbsolutePitch(): number {
        return this.getRotation().getPitch();
    }

    /**
     * Returns absolute yaw angle.
     * @public
     * @returns {number} Absolute yaw angle in radians.
     */
    public getAbsoluteYaw(): number {
        return this.getRotation().getYaw();
    }

    /**
     * Returns absolute roll angle.
     * @public
     * @returns {number} Absolute roll angle in radians.
     */
    public getAbsoluteRoll(): number {
        return this.getRotation().getRoll();
    }

    /**
     * Returns camera rotation quaternion.
     * @public
     * @returns {Quat} Camera rotation quaternion.
     */
    public getRotation(): Quat {
        return Quat.getLookRotation(this._f, this._u).conjugate();
    }

    /**
     * Sets camera orientation from a quaternion.
     * @public
     * @param {Quat} rot - Rotation quaternion.
     * @param {Vec3} [up] - Base up vector.
     * @param {Vec3} [right] - Base right vector.
     * @param {Vec3} [back] - Base backward vector.
     */
    public setRotation(rot: Quat, up?: Vec3, right?: Vec3, back?: Vec3) {
        rot.mulVec3Res(up || new Vec3(0, 1, 0), this._u);
        rot.mulVec3Res(right || new Vec3(1, 0, 0), this._r);
        rot.mulVec3Res(back || new Vec3(0, 0, 1), this._b);
        this._f.set(-this._b.x, -this._b.y, -this._b.z);
    }

    /**
     * Rotates current camera basis by quaternion.
     * @public
     * @param {Quat} rot - Rotation quaternion.
     */
    public rotate(rot: Quat) {
        rot.mulVec3Res(this._u, this._u);
        rot.mulVec3Res(this._r, this._r);
        rot.mulVec3Res(this._b, this._b);
        this._f.set(-this._b.x, -this._b.y, -this._b.z);
    }

    /**
     * Returns normal vector direction to the unprojected screen point from camera eye
     * @public
     * @param {Vec2} pos - Screen coordinates in pixels.
     * @param {number} [dist] - Optional projection distance for orthographic mode.
     * @param {Vec3} [outPos] - Optional output world position for orthographic mode.
     * @returns {Vec3} - Direction vector.
     */
    public unproject2v(pos: Vec2, dist?: number, outPos?: Vec3) {
        return this.unproject(pos.x, pos.y, dist, outPos);
    }

    /**
     * Returns normal vector direction to the unprojected screen point from camera eye
     * @public
     * @param {number} x - Screen X coordinate in pixels.
     * @param {number} y - Screen Y coordinate in pixels.
     * @param {number} [dist] - Optional projection distance for orthographic mode.
     * @param {Vec3} [outPos] - Optional output world position for orthographic mode.
     * @returns {Vec3} - Direction vector.
     */
    public unproject(x: number, y: number, dist?: number, outPos?: Vec3) {
        let w = this._width * 0.5,
            h = this._height * 0.5;

        let px = (x - w) / w,
            py = -(y - h) / h;

        let f = this.frustums[0];

        if (this.isOrthographic) {
            if (dist) {
                let dx = 0.5 * (f.right - f.left) * px,
                    dy = 0.5 * (f.top - f.bottom) * py;

                let wdy = this.getUp().scale(dy),
                    wdx = this.getRight().scale(dx);

                let wd = wdy.addA(wdx);
                let p0 = this.eye.add(wd);

                let dir = this.getForward();
                let p1 = p0.addA(dir.scaleTo(dist));

                if (outPos) {
                    outPos.copy(p1);
                }

                return p1.sub(this.eye).normalize();
            } else {
                return this.getForward();
            }
        } else {
            let invPV = f.inverseProjectionViewMatrix;
            let nearPoint: Vec4, farPoint: Vec4;
            if (this.reverseDepthActive) {
                nearPoint = invPV.mulVec4(new Vec4(px, py, 1.0, 1.0)).affinity();
                farPoint = invPV.mulVec4(new Vec4(px, py, this.depthZeroToOne ? 0.5 : 0.0, 1.0)).affinity();
            } else {
                nearPoint = invPV.mulVec4(new Vec4(px, py, -1.0, 1.0)).affinity();
                farPoint = invPV.mulVec4(new Vec4(px, py, 0.0, 1.0)).affinity();
            }
            return farPoint.subA(nearPoint).toVec3().normalize();
        }
    }

    /**
     * Gets projected 3d point to the 2d screen coordinates
     * @public
     * @param {Vec3} v - Cartesian 3d coordinates
     * @returns {Vec2} - Screen point coordinates
     */
    public project3v(v: Vec3): Vec2 {
        return this.project(v.x, v.y, v.z);
    }

    /**
     * Gets projected 3d point to the 2d screen coordinates
     * @public
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @returns {Vec2} - Screen point coordinates
     */
    public project(x: number, y: number, z: number): Vec2 {
        let r = this.frustums[0].projectionViewMatrix.mulVec4(new Vec4(x, y, z, 1.0));
        return new Vec2((1 + r.x / r.w) * this._width * 0.5, (1 - r.y / r.w) * this._height * 0.5);
    }

    /**
     * Rotates camera around center point
     * @public
     * @param {number} angle - Rotation angle in radians
     * @param {boolean} [isArc] - If true camera up vector gets from current up vector every frame,
     * otherwise up is always input parameter.
     * @param {Vec3} [center] - Point that the camera rotates around
     * @param {Vec3} [up] - Camera up vector
     */
    public rotateAround(angle: number, isArc: boolean = false, center: Vec3 = Vec3.ZERO, up: Vec3 = Vec3.UP) {
        up = isArc ? this._u : up;
        let rot = Mat4.getRotation(angle, up);
        let trm = Mat4.getRotationAroundPoint(angle, center, up);
        this.eye = trm.mulVec3(this.eye);
        this._u = rot.mulVec3(this._u).normalize();
        this._r = rot.mulVec3(this._r).normalize();
        this._b = rot.mulVec3(this._b).normalize();
        this._f.set(-this._b.x, -this._b.y, -this._b.z);
    }

    /**
     * Rotates camera around center point by horizontal.
     * @public
     * @param {number} angle - Rotation angle in radians.
     * @param {boolean} [isArc] - If true camera up vector gets from current up vector every frame,
     * otherwise up is always input parameter.
     * @param {Vec3} [center] - Point that the camera rotates around.
     * @param {Vec3} [up] - Camera up vector.
     */
    public rotateHorizontal(angle: number, isArc?: boolean, center?: Vec3, up?: Vec3) {
        this.rotateAround(angle, isArc, center, up);
    }

    /**
     * Rotates camera around center point by vertical.
     * @param {number} angle - Rotation angle in radians.
     * @param {Vec3} [center] - Point that the camera rotates around.
     */
    public rotateVertical(angle: number, center?: Vec3) {
        this.rotateAround(angle, false, center, this._r);
    }

    /**
     * Gets 3d size factor. Uses in LOD distance calculation.
     * It is very important function used in Node.ts
     * @public
     * @param {Vec3} p - Point in 3d.
     * @param {Vec3} r - size.
     * @returns {number} - Size factor.
     */
    public projectedSize(p: Vec3, r: number): number {
        // @todo: cleanup
        if (this.isOrthographic) {
            const m = this.frustums[0].projectionMatrix._m;
            const orthoScale = this._height * m[5] * 0.5;
            return r * orthoScale;
        } else {
            return Math.atan(r / this.eye.distance(p)) * this._projSizeConst;
        }
    }

    /**
     * Returns model matrix.
     * @public
     * @returns {NumberArray16} - View matrix.
     */
    public getViewMatrix(): NumberArray16 {
        return this._viewMatrix._m;
    }

    /**
     * Returns normal matrix.
     * @public
     * @returns {NumberArray9} - Normal matrix.
     */
    public getNormalMatrix(): NumberArray9 {
        return this._normalMatrix._m;
    }

    /**
     * Sets current active frustum index.
     * @public
     * @param {number} k - Frustum index.
     */
    public setCurrentFrustum(k: number) {
        this.currentFrustumIndex = k;
        this.frustumColorIndex = ((k + 1) * 10.0) / 255.0;
        this.isFarthestFrustumActive = k === this.FARTHEST_FRUSTUM_INDEX;
    }

    /**
     * Returns current active frustum index.
     * @public
     * @returns {number} Current frustum index.
     */
    public getCurrentFrustum(): number {
        return this.currentFrustumIndex;
    }

    /**
     * Checks whether sphere intersects any camera frustum.
     * @public
     * @param {Sphere} sphere - Bounding sphere.
     * @returns {boolean} `true` when visible in at least one frustum.
     */
    public containsSphere(sphere: Sphere): boolean {
        for (let i = 0; i < this.frustums.length; i++) {
            if (this.frustums[i].containsSphere(sphere)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Returns current active frustum.
     * @public
     * @returns {Frustum} Active frustum instance.
     */
    public get frustum(): Frustum {
        return this.frustums[this.currentFrustumIndex];
    }

    /**
     * Returns projection matrix.
     * @public
     * @returns {NumberArray16} Projection matrix.
     */
    public getProjectionMatrix(): NumberArray16 {
        return this.frustum.projectionMatrix._m;
    }

    /**
     * Returns projection-view matrix.
     * @public
     * @returns {NumberArray16} Projection-view matrix.
     */
    public getProjectionViewMatrix(): NumberArray16 {
        return this.frustum.projectionViewMatrix._m;
    }

    /**
     * Returns projection-view RTE matrix.
     * @public
     * @returns {NumberArray16} Projection-view RTE matrix.
     */
    public getProjectionViewRTEMatrix(): NumberArray16 {
        return this.frustum.projectionViewRTEMatrix._m;
    }

    /**
     * Returns inverse projection-view matrix.
     * @public
     * @returns {NumberArray16} Inverse projection-view matrix.
     */
    public getInverseProjectionViewMatrix(): NumberArray16 {
        return this.frustum.inverseProjectionViewMatrix._m;
    }

    /**
     * Returns inverse projection matrix.
     * @public
     * @returns {NumberArray16} Inverse projection matrix.
     */
    public getInverseProjectionMatrix(): NumberArray16 {
        return this.frustum.inverseProjectionMatrix._m;
    }

    /**
     * Places camera at a fixed distance from a point and looks at it.
     * @public
     * @param {Vec3} cartesian - Target cartesian point.
     * @param {number} [distance=10000.0] - Distance from the target.
     */
    public viewDistance(cartesian: Vec3, distance: number = 10000.0) {
        let newPos = cartesian.add(this.getBackward().scaleTo(distance));
        this.set(newPos, cartesian);
        this.update();
    }

    /**
     * Copies camera pose and projection settings from another camera.
     * @public
     * @param {Camera} cam - Source camera.
     */
    public copy(cam: Camera) {
        this.eye.copy(cam.eye);
        this._r.copy(cam._r);
        this._u.copy(cam._u);
        this._b.copy(cam._b);
        this._f.copy(cam._f);
        this._width = cam.width;
        this._height = cam.height;
        this.setViewAngle(cam.viewAngle);
        this.update();
    }

    /**
     * Returns camera altitude value for base camera.
     * @public
     * @returns {number} Camera `y` coordinate.
     */
    public getAltitude(): number {
        return this.eye.y;
    }
}

export { Camera };
