import type { IControlParams } from "./Control";
import { Control } from "./Control";
import type { IMouseState } from "../renderer/RendererEvents";
import { Quat } from "../math/Quat";
import { Ray } from "../math/Ray";
import { Sphere } from "../bv/Sphere";
import { Vec2 } from "../math/Vec2";
import { Vec3 } from "../math/Vec3";
import { input } from "../input/input";
import { Plane } from "../math/Plane";
import { createEvents, type EventsHandler } from "../Events";

export type NavigationMode = "north" | "adaptive" | "free";

export interface INavigationParams extends IControlParams {
    inertia?: number;
    dragInertia?: number;
    minSlope?: number;
    mass?: number;
    zoomSpeed?: number;
    mode?: NavigationMode;
    poleThreshold?: number;
    disableRotation?: boolean;
    disableTilt?: boolean;
}

export type NavigationEventsList = ["drag", "zoom", "rotate"];

const NAVIGATION_EVENTS: NavigationEventsList = [
    /**
     * Triggered on view drag.
     * @event og.Navigation#drag
     */
    "drag",

    /**
     * Triggered on zoom.
     * @event og.Navigation#zoom
     */
    "zoom",

    /**
     * Triggered on rotate.
     * @event og.Navigation#rotate
     */
    "rotate"
];

const DEFAULT_VELINERTIA = 0.96;

const DEFAULT_DRAG_INERTIA = 170;

// Camera moves vertically (up/down) when slope is less than this threshold
const MIN_SLOPE = 0.35;

// Vertical rotation is reduced when camera is close to poles
const DEFAULT_POLE_THRESHOLD = 0.999;

const MODE_FREE = 0;
const MODE_NORTH = 1;
const MODE_ADAPTIVE = 2;

/**
 * Navigation.
 * @class
 * @extends {Control}
 * @param {INavigationParams} [options] - Navigation options:
 * @param {NavigationMode} [options.mode] - Navigation mode: "north" (keeps north fixed), "adaptive" (default, auto-detects arc mode), "free" (arc rotation mode)
 * @param {number} [options.inertia] - inertia factor
 * @param {number} [options.dragInertia] - drag inertia
 * @param {number} [options.mass] - camera mass, affects velocity. Default is 1
 * @param {number} [options.minSlope] - minimal slope for vertical camera movement. Default is 0.35
 * @param {number} [options.poleThreshold] - Vertical rotation is reduced when camera is close to poles
 * @param {boolean} [options.disableRotation] - Disables horizontal rotation controls (right mouse button and touchpad). Default is false
 * @param {boolean} [options.disableTilt] - Disables vertical tilt controls (right mouse button and touchpad). Default is false
 * @fires drag
 * @fires zoom
 * @fires rotate
 */
export class Navigation extends Control {
    public force: Vec3;
    public force_h: number;
    public force_v: number;
    public vel: Vec3;
    public vel_h: number;
    public vel_v: number;
    public mass: number;
    public minSlope: number;
    public inertia: number;
    public dragInertia: number;
    public zoomSpeed: number;
    public poleThreshold: number;
    public mode: number;
    public disableRotation: boolean;
    public disableTilt: boolean;

    public vel_roll: number;
    public force_roll: number;

    protected _freeMode: boolean = false;

    public events: EventsHandler<NavigationEventsList>;

    protected _lookPos: Vec3 | undefined;

    protected _grabbedPoint: Vec3 | null;

    protected _grabbedDist: number;

    protected _targetZoomPoint: Vec3 | null;

    protected _targetDragPoint: Vec3 | null;

    protected _targetRotationPoint: Vec3 | null;

    protected _grabbedSphere: Sphere;

    protected _wheelDirection: number;

    protected _currScreenPos: Vec2;

    protected _tUp: Vec3;
    protected _tRad: number;

    protected _shiftBusy = false;

    protected _curPitch: number;

    protected _curYaw: number;

    protected _curRoll: number;

    protected _rot: Quat;

    protected _eye0: Vec3;

    protected _grabbedCameraHeight: number;

    protected _newEye: Vec3;

    protected _isTouchPad: boolean;

    protected _velInertia: number;

    // Ortho zoom: focusDistance = _orthoZoomScale * |forward·(a - eye)|.
    // Captured on wheel event so the first frame does not snap focusDistance to an
    // absolute value (which would cause a visible jerk on the very first wheel tick).
    protected _orthoZoomScale: number = 1;

    protected _hold: boolean = false;

    //protected _prevVel: Vec3 = new Vec3();

    //protected _screenPosIsChanged: boolean = true;

    protected _rotHDir: number;
    protected _rotVDir: number;

    constructor(options: INavigationParams = {}) {
        super({
            name: "navigation",
            autoActivate: true,
            ...options
        });

        this.events = createEvents<NavigationEventsList>(NAVIGATION_EVENTS, this);

        this.force = new Vec3();
        this.force_h = 0;
        this.force_v = 0;

        this.vel = new Vec3();
        this.vel_h = 0;
        this.vel_v = 0;

        this.vel_roll = 0;
        this.force_roll = 0;

        this.mass = options.mass != undefined ? options.mass : 1;
        this.inertia = options.inertia != undefined ? options.inertia : 1;
        this._velInertia = DEFAULT_VELINERTIA;
        this.minSlope = options.minSlope != undefined ? options.minSlope : MIN_SLOPE;
        this.dragInertia = options.dragInertia != undefined ? options.dragInertia : DEFAULT_DRAG_INERTIA;
        this.zoomSpeed = options.zoomSpeed != undefined ? options.zoomSpeed : 1;
        this.poleThreshold = options.poleThreshold != undefined ? options.poleThreshold : DEFAULT_POLE_THRESHOLD;
        this.disableRotation = options.disableRotation != undefined ? options.disableRotation : false;
        this.disableTilt = options.disableTilt != undefined ? options.disableTilt : false;

        this._lookPos = undefined;
        this._grabbedPoint = null;
        this._grabbedDist = 0;

        this._targetZoomPoint = null;
        this._targetDragPoint = null;
        this._targetRotationPoint = null;
        this._tUp = new Vec3();
        this._tRad = 0;
        this._rotHDir = 0;
        this._rotVDir = 0;

        this._wheelDirection = 1;

        this._currScreenPos = new Vec2();

        this._grabbedSphere = new Sphere();

        this._rot = new Quat();

        this._curPitch = 0;
        this._curYaw = 0;
        this._curRoll = 0;

        this._eye0 = new Vec3();
        this._newEye = new Vec3();
        this._grabbedCameraHeight = 0;

        this._isTouchPad = false;

        this._freeMode = false;

        this.mode = this._modeToNumber(options.mode || "adaptive");
    }

    override oninit() {
        if (this.renderer) {
            this.renderer.events.on("keyfree", input.KEY_ALT, this._onShiftFree);
            this.renderer.events.on("keyfree", input.KEY_PRINTSCREEN, this._onShiftFree);
        }
    }

    override onadd(): void {
        if (this.planet?.camera) {
            this.planet.camera.events.on("flystart", this._onCameraFly);
        }
    }

    override onremove(): void {
        if (this.planet?.camera) {
            this.planet.camera.events.off("flystart", this._onCameraFly);
        }
    }

    public override onactivate() {
        super.onactivate();
        let r = this.renderer!;
        r.events.on("mousewheel", this._onMouseWheel);
        r.events.on("rhold", this._onRHold);
        r.events.on("rdown", this._onRDown);
        r.events.on("lhold", this._onLHold);
        r.events.on("ldown", this._onLDown);
        r.events.on("lup", this._onLUp);
        r.events.on("draw", this.onDraw, this, -1000);
        r.events.on("mousemove", this._onMouseMove);
        r.events.on("mouseleave", this._onMouseLeave);
        r.events.on("mouseenter", this._onMouseEnter);
    }

    public override ondeactivate() {
        super.ondeactivate();
        let r = this.renderer!;
        r.events.off("mousewheel", this._onMouseWheel);
        r.events.off("rhold", this._onRHold);
        r.events.off("rdown", this._onRDown);
        r.events.off("lhold", this._onLHold);
        r.events.off("ldown", this._onLDown);
        r.events.off("lup", this._onLUp);
        r.events.off("draw", this.onDraw);
        r.events.off("mousemove", this._onMouseMove);
        r.events.off("mouseleave", this._onMouseLeave);
        r.events.off("mouseenter", this._onMouseEnter);
    }

    protected onDraw() {
        this._updateVel();
        this._handleZoom();
        this._handleDrag();
        this._handleRotation();
    }

    public _onShiftFree = () => {
        this._shiftBusy = false;
    };

    private _onCameraFly = () => {
        this.stop();
    };

    protected _onMouseMove = (e: IMouseState) => {
        if (this._active && this.renderer!.events.isKeyPressed(input.KEY_ALT)) {
            if (!this._shiftBusy) {
                this._shiftBusy = true;
                this._onRHold(e);
            }
            this._onRDown(e);
        }
    };

    protected _onMouseEnter = (e: IMouseState) => {
        const renderEvents = this.renderer!.events;
        if (renderEvents.isKeyPressed(input.KEY_ALT)) {
            renderEvents.releaseKeys();
        }

        renderEvents.updateButtonsStates(e.sys!.buttons);
        if (renderEvents.mouseState.leftButtonDown) {
            this.renderer!.handler.canvas!.classList.add("ogGrabbingPoiner");
        } else {
            this.renderer!.handler.canvas!.classList.remove("ogGrabbingPoiner");
        }
    };

    protected _onMouseLeave = () => {
        if (this.renderer!.events.mouseState.leftButtonDown) {
            this.vel.scale(0);
        }
        this.renderer!.handler.canvas!.classList.remove("ogGrabbingPoiner");
    };

    protected _onRHold = (e: IMouseState) => {
        if (this.disableRotation && this.disableTilt) {
            return;
        }
        if (this._targetRotationPoint) {
            this._velInertia = 0.6; //0.8, 0.2
            if (!this.disableRotation) {
                this.force_h = 0.5 * (e.x - e.prev_x);
            }
            if (!this.disableTilt) {
                this.force_v = 0.5 * (e.y - e.prev_y);
            }

            // temporary fix
            let hdg = this.planet!.camera.getHeading();

            this._freeMode = !isNaN(hdg) && hdg > 45 && hdg < 340;
        }
    };

    protected _handleRotation() {
        if (this.disableRotation && this.disableTilt) {
            return;
        }
        if (this.planet && this._targetRotationPoint) {
            let cam = this.planet!.camera;
            if ((this.disableRotation || this.vel_h === 0.0) && (this.disableTilt || this.vel_v === 0.0)) {
                return;
            }
            // let l = (0.3 / this._tRad) * math.RADIANS;
            // if (l > 0.007) {
            //     l = 0.007;
            // } else if (l < 0.003) {
            //     l = 0.003;
            // }

            if (!this.disableRotation) {
                let d_v_h = this.vel_h * this.dt;
                cam.rotateHorizontal(d_v_h, false, this._targetRotationPoint, this._tUp);
            }
            if (!this.disableTilt) {
                let d_v_v = this.vel_v * this.dt;
                cam.rotateVertical(d_v_v, this._targetRotationPoint, 0.1);
            }
            this.events.dispatch(this.events.rotate, this);
            this._curPitch = cam.getPitch();
            this._curYaw = cam.getYaw();
            this._curRoll = cam.getRoll();
            this._velInertia = DEFAULT_VELINERTIA;
        }
    }

    protected _onRDown = (e: IMouseState) => {
        if (this.disableRotation && this.disableTilt) {
            return;
        }
        if (this.planet) {
            this.planet.stopFlying();
            const tp = this._getTargetPoint(e.pos);
            this._targetRotationPoint = tp ? tp : null;
            if (tp) {
                this._targetZoomPoint = null;
                this._targetDragPoint = null;

                this.vel.set(0, 0, 0);
                this._tUp = tp.getNormal();
                this._tRad = this.planet.camera.eye.distance(tp);
            }
        }
    };

    protected _getTargetPoint(p: Vec2): Vec3 | null {
        if (this.planet) {
            if (this.planet.camera.isOrthographic) {
                return this.renderer!.getCartesianFromPixel(p) || null;
            }

            if (this.planet.camera.getAltitude() > 80000) {
                return this.planet.getCartesianFromPixelEllipsoid(p) || null;
            }

            return this.planet.getCartesianFromPixelTerrain(p) || null;
        }
        return null;
    }

    protected _onMouseWheel = (e: IMouseState) => {
        if (this.planet) {
            this._targetRotationPoint = null;
            this._targetDragPoint = null;

            let sx = e.x,
                sy = e.y;

            let cam = this.planet.camera;

            if (cam.isOrthographic) {
                // Zoom anchored to the map point under the mouse cursor.
                // `_getTargetPoint` uses depth buffer + unproject, so it returns the
                // exact world point visible at (sx, sy). The previous refinement via
                // `Ray(p0, dir).hitSphere(...)` was written for the center-case
                // (offset=0, dir=forward) and produces a wrong point for off-center
                // cursor — it was removed to fix zoom-anchor drift.
                let _targetZoomPoint = this._getTargetPoint(new Vec2(sx, sy));
                if (!_targetZoomPoint) return;

                this._targetZoomPoint = _targetZoomPoint;
                this._grabbedSphere.radius = this._targetZoomPoint.length();

                // Capture the ratio `focusDistance / |forward·(a - eye)|` at click time
                // so the first zoom frame keeps focusDistance essentially unchanged
                // (no visible jerk on the very first wheel tick).
                const fwd0 = cam.getForward();
                const fwdDepth0 = Math.abs(fwd0.dot(_targetZoomPoint.sub(cam.eye)));
                this._orthoZoomScale = fwdDepth0 > 0 ? cam.focusDistance / fwdDepth0 : 1;
            } else {
                let _targetZoomPoint = this._getTargetPoint(new Vec2(sx, sy));
                if (!_targetZoomPoint) return;

                this._targetZoomPoint = _targetZoomPoint;
                this._grabbedSphere.radius = this._targetZoomPoint.length();
            }

            this._curPitch = cam.getPitch();
            this._curYaw = cam.getYaw();
            this._curRoll = cam.getRoll();

            if (Math.sign(e.wheelDelta) !== this._wheelDirection) {
                this.vel.scale(0.3);
                this._currScreenPos.set(sx, sy);
                this._wheelDirection = Math.sign(e.wheelDelta);
                return;
            }

            this._currScreenPos.set(sx, sy);
            this._wheelDirection = Math.sign(e.wheelDelta);
            let scale = 20;
            this._velInertia = 0.83;

            this._isTouchPad = e.isTouchPad;
            if (e.isTouchPad) {
                this._velInertia = 0.63;
                scale = 17;
            }

            let dir = this._targetZoomPoint.sub(cam.eye);
            if (
                dir.length() > 6000 &&
                this._wheelDirection > 0 &&
                cam.eye.getNormal().negate().dot(dir.normalize()) < 0.3
            ) {
                scale = 4.3;
            }

            let dist = this.planet.camera.eye.distance(this._targetZoomPoint) * scale;

            this.force = e.direction
                .scale(this._wheelDirection)
                .normalize()
                .scale(this._wheelDirection < 0 ? dist * 1.3 : dist)
                .scale(this.zoomSpeed);

            this.vel.set(0, 0, 0);

            this.force_roll = this._curRoll;
        }
    };

    protected _onLDown = (e: IMouseState) => {
        this.stop();

        this._targetRotationPoint = null;
        this._targetZoomPoint = null;

        if (!this.planet) return;

        this.planet.stopFlying();

        this._grabbedPoint = this._getTargetPoint(e.pos);

        if (!this._grabbedPoint) return;

        this._targetDragPoint = this._grabbedPoint;

        if (this.planet.camera.isOrthographic) {
            this._grabbedDist = this.renderer!.getDistanceFromPixel(e.pos)!;
        } else {
            this._grabbedDist = this.renderer!.activeCamera.eye.distance(this._grabbedPoint);
        }

        this.renderer!.handler.canvas!.classList.add("ogGrabbingPoiner");

        this._grabbedSphere.radius = this._grabbedPoint.length();

        this._eye0 = this.planet.camera.eye.clone();
        this._grabbedCameraHeight = this._eye0.length();

        this._curPitch = this.planet.camera.getPitch();
        this._curYaw = this.planet.camera.getYaw();
        this._curRoll = this.planet.camera.getRoll();

        this._currScreenPos.copy(e.pos);
    };

    protected _onLHold = (e: IMouseState) => {
        if (this._grabbedPoint && this.planet) {
            let cam = this.planet.camera;

            if (cam.isOrthographic) {
                const dist = this._grabbedDist;
                const p1 = new Vec3();
                const dir = cam.unproject(e.x, e.y, dist, p1);

                const p0 = p1.sub(dir.scaleTo(dist));
                const _targetDragPoint = new Ray(p0, dir).hitSphere(this._grabbedSphere);

                if (!_targetDragPoint) {
                    return;
                }

                this._targetDragPoint = _targetDragPoint;

                let rot = Quat.getRotationBetweenVectors(
                    this._targetDragPoint.getNormal(),
                    this._grabbedPoint.getNormal()
                );

                let newEye = rot.mulVec3(cam.eye);
                this.force = newEye.sub(cam.eye).scale(this.dragInertia);
            } else if (cam.slope > this.minSlope) {
                // Need distance for orthographic camera
                this._grabbedDist = cam.eye.distance(this._grabbedPoint);
                let dir = cam.unproject(e.x, e.y, this._grabbedDist);
                let _targetDragPoint = new Ray(cam.eye, dir).hitSphere(this._grabbedSphere);

                if (!_targetDragPoint) {
                    return;
                }

                this._targetDragPoint = _targetDragPoint;

                let rot: Quat;

                if (this.freeMode) {
                    rot = Quat.getRotationBetweenVectors(
                        this._targetDragPoint.getNormal(),
                        this._grabbedPoint.getNormal()
                    );
                } else {
                    let upProj = Vec3.NORTH;

                    // Calculate angle along the projected up axis
                    let _a =
                        Math.acos(_targetDragPoint.dot(upProj) / this._grabbedSphere.radius) -
                        Math.acos(this._grabbedPoint.dot(upProj) / this._grabbedSphere.radius);

                    // Reduce vertical rotation when camera is close to poles (only when moving towards pole)
                    let northProximity = cam.eyeNorm.dot(Vec3.NORTH);
                    if (_a > 0 && northProximity >= this.poleThreshold) {
                        _a = 0;
                    } else if (_a < 0 && northProximity <= -this.poleThreshold) {
                        _a = 0;
                    }

                    //let _vRot = Quat.axisAngleToQuat(cam.getRight(), -_a);
                    let _vRot = Quat.axisAngleToQuat(upProj.cross(cam.eyeNorm).normalize(), -_a);

                    let targetProj = Vec3.proj_b_to_plane(_targetDragPoint, upProj);
                    let grabbedProj = Vec3.proj_b_to_plane(this._grabbedPoint, upProj);

                    // Calculate horizontal rotation around upProj axis
                    let _hRot = Quat.getRotationBetweenVectors(targetProj.getNormal(), grabbedProj.getNormal());

                    rot = _hRot.mul(_vRot);
                }

                let newEye = rot.mulVec3(cam.eye);
                this.force = newEye.sub(cam.eye).scale(this.dragInertia);
            } else {
                let p0 = this._grabbedPoint,
                    p1 = Vec3.add(p0, cam.getRight()),
                    p2 = Vec3.add(p0, p0.getNormal());

                let px = new Vec3();
                new Ray(cam.eye, e.direction).hitPlaneRes(Plane.fromPoints(p0, p1, p2), px);
                let newEye = cam.eye.add(px.subA(p0).negate());
                this.force = newEye.sub(cam.eye).scale(this.dragInertia);
                this._targetDragPoint = px;
            }

            this.vel.set(0.0, 0.0, 0.0);

            if (!this._currScreenPos.equal(e.pos)) {
                //this._screenPosIsChanged = true;
                this._currScreenPos.copy(e.pos);
            }

            this._hold = true;
        }
    };

    protected _onLUp = (e: IMouseState) => {
        this._hold = false;
        this.renderer!.handler.canvas!.classList.remove("ogGrabbingPoiner");
    };

    public get freeMode(): boolean {
        if (this.mode === MODE_NORTH) {
            return false;
        }
        if (this.mode === MODE_FREE) {
            return true;
        }
        return this._freeMode;
    }

    public setMode(mode: NavigationMode): void {
        this.mode = this._modeToNumber(mode);
    }

    protected _modeToNumber(mode: NavigationMode): number {
        switch (mode) {
            case "north":
                return MODE_NORTH;
            case "free":
                return MODE_FREE;
            case "adaptive":
            default:
                return MODE_ADAPTIVE;
        }
    }

    protected _getSurfaceDragAxes(eyeNorm: Vec3, fallbackAxis: Vec3): { north: Vec3; east: Vec3 } | null {
        const eps = 1e-12;

        let north = Vec3.proj_b_to_plane(Vec3.NORTH, eyeNorm);
        if (north.length2() < eps) {
            north = Vec3.proj_b_to_plane(fallbackAxis, eyeNorm);
            if (north.length2() < eps) {
                return null;
            }
        }
        north.normalize();

        let east = north.cross(eyeNorm);
        if (east.length2() < eps) {
            return null;
        }
        east.normalize();
        north = eyeNorm.cross(east).normalize();

        return { north, east };
    }

    protected _transportDragInertiaVelocity(
        velocity: Vec3,
        fromEyeNorm: Vec3,
        toEyeNorm: Vec3,
        fallbackAxis: Vec3
    ): Vec3 | null {
        const fromAxes = this._getSurfaceDragAxes(fromEyeNorm, fallbackAxis);
        const toAxes = this._getSurfaceDragAxes(toEyeNorm, fallbackAxis);
        if (!fromAxes || !toAxes) {
            return null;
        }

        const northVel = velocity.dot(fromAxes.north);
        const eastVel = velocity.dot(fromAxes.east);

        return toAxes.north.scaleTo(northVel).addA(toAxes.east.scaleTo(eastVel));
    }

    protected _handleDrag() {
        if (this.planet && this._targetDragPoint && this._grabbedPoint && this.vel.length() > 0.1) {
            this._velInertia = DEFAULT_VELINERTIA;
            let cam = this.planet!.camera;

            // if (Math.abs(cam.eyeNorm.dot(Vec3.NORTH)) > 0.9) {
            //     this.fixedUp = false;
            // }
            //
            // if (!this._screenPosIsChanged) {
            //     if (this.vel.length() > this._prevVel.length()) {
            //         this.fixedUp = false;
            //     }
            // }
            // this._screenPosIsChanged = false;
            // this._prevVel.copy(this.vel);

            if (cam.slope > this.minSlope) {
                const dt = this.dt;
                const startEyeNorm = cam.eyeNorm;
                let d_v = this.vel.scaleTo(dt);
                let d_s = Vec3.proj_b_to_plane(d_v, startEyeNorm);
                let newEye = cam.eye.add(d_s).normalize().scale(this._grabbedCameraHeight);
                const newEyeNorm = newEye.getNormal();

                if (this.freeMode) {
                    let rot = Quat.getRotationBetweenVectors(cam.eye.getNormal(), newEyeNorm);
                    cam.rotate(rot);
                    cam.eye.copy(newEye);
                } else {
                    let inertiaDamping = 1.0;

                    // Check if newEye exceeds pole threshold
                    let newNorthProximity = newEyeNorm.dot(Vec3.NORTH);
                    let northProximity = cam.eyeNorm.dot(Vec3.NORTH);
                    if (
                        (newNorthProximity > northProximity && newNorthProximity >= this.poleThreshold) ||
                        (newNorthProximity < northProximity && newNorthProximity <= -this.poleThreshold)
                    ) {
                        inertiaDamping = 0.8;
                    }

                    cam.eye.copy(newEye);
                    this._corrRoll();
                    cam.setPitchYawRoll(this._curPitch, this._curYaw, this._curRoll);

                    const transportedVel = this._transportDragInertiaVelocity(
                        this.vel,
                        startEyeNorm,
                        newEyeNorm,
                        cam.getUp()
                    );
                    if (transportedVel) {
                        this.vel.copy(transportedVel);
                    }
                    if (inertiaDamping !== 1.0) {
                        this.vel.scale(inertiaDamping);
                    }
                }
            } else {
                let d_v = this.vel.scaleTo(this.dt);
                let newEye = cam.eye.add(d_v);
                cam.eye.copy(newEye);
                cam.checkTerrainCollision();
                this._corrRoll();
                cam.setPitchYawRoll(this._curPitch, this._curYaw, this._curRoll);
            }

            this.events.dispatch(this.events.drag, this);
        }
    }

    protected _corrRoll() {
        if (this.planet!.camera.slope < 0.5) {
            this._curRoll -= this.vel_roll * this.dt;
            if (this._curRoll < (0.01 * Math.PI) / 180) {
                this._curRoll = (0.01 * Math.PI) / 180;
            }
        }
    }

    protected _handleZoom() {
        if (this._targetZoomPoint && this.vel.length() > 0.1) {
            // Common
            let cam = this.planet!.camera;
            let a = this._targetZoomPoint;
            let eye = cam.eye.clone();
            let dir = a.sub(cam.eye).normalize();

            let vel_normal = this.vel.getNormal();
            let velDir = Math.sign(vel_normal.dot(cam.getForward()));

            let d_v = this.vel.scaleTo(this.dt);

            // if camera eye position under the dome of the grabbed sphere
            if (this._grabbedSphere.radius > eye.length()) {
                velDir *= -1;
            }

            //let d_s = d_v.projToVec(cam.getForward().scale(velDir));
            let d_s = cam.getForward().scaleTo(velDir * d_v.length());

            eye.addA(d_s);
            this.events.dispatch(this.events.zoom, this);
            // Check max camera distance
            let maxAlt = cam.maxAltitude + this.planet!.ellipsoid.getEquatorialSize();
            if (eye.length() > maxAlt) {
                eye.copy(eye.getNormal().scale(maxAlt));
                return;
            }

            let b = new Ray(eye, dir).hitSphere(this._grabbedSphere);

            if (!b) {
                this.vel.set(0, 0, 0);
                return;
            }

            // Sphere-rotation: slide eye along the globe so the view's "forward" is
            // pulled towards the target. This is what gives the perspective-like
            // trajectory (and, together with `setPitchYawRoll` below, keeps north up).
            let rot = Quat.getRotationBetweenVectors(b.getNormal(), a.getNormal());
            cam.eye = rot.mulVec3(eye);
            cam.rotate(rot);

            if (!this.freeMode) {
                this._corrRoll();
                // restore camera direction — keeps north up at the NEW eye location
                cam.setPitchYawRoll(this._curPitch, this._curYaw, this._curRoll);

                cam.update();

                // In orthographic the actual picking ray for `_currScreenPos` starts
                // at `cam.eye + offset_cursor` and goes along forward, not from
                // `cam.eye` along `dirCurr`. So the perspective ray-plane correction
                // below is invalid for ortho — we use an explicit lateral compensation
                // after `focusDistance` is updated (see the ortho block further down).
                if (!cam.isOrthographic) {
                    let dirCurr = cam.unproject2v(this._currScreenPos, cam.eye.distance(this._targetZoomPoint));
                    let dirNew = a.sub(cam.eye).normalize();

                    let px0 = new Vec3();
                    let px1 = new Vec3();
                    let pl = Plane.fromPoints(a, a.add(cam.getUp()), a.add(cam.getRight()));

                    new Ray(cam.eye, dirCurr).hitPlaneRes(pl, px0);
                    new Ray(cam.eye, dirNew).hitPlaneRes(pl, px1);

                    let dp = px1.sub(px0);
                    cam.eye = cam.eye.add(dp);
                }

                // Looks like it helps to fix unpredictable camera loose focus wheb zoomOut
                this._corrRoll();
                cam.setPitchYawRoll(this._curPitch, this._curYaw, this._curRoll);

                // ver.2
                // let px0 = new Ray(cam.eye, dirCurr).hitSphere(this._grabbedSphere)!;
                // let px1 = new Ray(cam.eye, dirNew).hitSphere(this._grabbedSphere)!;
            }

            cam.checkTerrainCollision();

            if (cam.isOrthographic) {
                // `focusDistance = K · |forward·(a - eye)|` where K is captured in
                // `_onMouseWheel`. This (a) is invariant under the lateral eye shift
                // applied below (shift is perpendicular to forward) so focusDistance
                // does not wobble frame-to-frame, and (b) matches the pre-zoom value
                // exactly on the first frame — preventing a visible jerk on the very
                // first wheel tick (when the absolute formula used to snap to a new
                // value inconsistent with the previous focusDistance).
                const fwd = cam.getForward();
                const eyeToA = a.sub(cam.eye);
                const fwdDepth = Math.abs(fwd.dot(eyeToA));
                if (fwdDepth > 0) {
                    cam.focusDistance = this._orthoZoomScale * fwdDepth;

                    // Shift eye laterally so that `a` projects exactly to
                    // `_currScreenPos` in the NEW frustum.
                    const w2 = cam.width * 0.5;
                    const h2 = cam.height * 0.5;
                    const px = (this._currScreenPos.x - w2) / w2;
                    const py = -(this._currScreenPos.y - h2) / h2;
                    const f = cam.frustums[0];
                    const Wx = 0.5 * (f.right - f.left);
                    const Wy = 0.5 * (f.top - f.bottom);
                    const offCursor = cam.getRight().scaleTo(Wx * px).addA(cam.getUp().scaleTo(Wy * py));
                    const aLat = eyeToA.sub(fwd.scaleTo(fwd.dot(eyeToA)));
                    cam.eye.addA(aLat.subA(offCursor));
                    cam.update();
                }
            }
        }
    }

    protected _updateVel() {
        let acc = this.force.scale(1.0 / this.mass);
        this.vel.addA(acc);
        this.vel.scale(this.velocityInertia);
        if (this.vel.length() < 0.001) {
            this.vel.set(0, 0, 0);
        }
        this.force.set(0, 0, 0);

        this._updateVel_h();
        this._updateVel_v();
        this._updateVel_roll();
    }

    protected _updateVel_h() {
        let acc = this.force_h / this.mass;
        this.vel_h += acc;
        this.vel_h *= this.velocityInertia;
        if (Math.abs(this.vel_h) < 0.001) {
            this.vel_h = 0;
        }
        this.force_h = 0;
    }

    protected _updateVel_v() {
        let acc = this.force_v / this.mass;
        this.vel_v += acc;
        this.vel_v *= this.velocityInertia;
        if (Math.abs(this.vel_v) < 0.001) {
            this.vel_v = 0;
        }
        this.force_v = 0;
    }

    protected _updateVel_roll() {
        let acc = this.force_roll / this.mass;
        this.vel_roll += acc;
        this.vel_roll *= this.velocityInertia;
        this.force_roll = 0;
    }

    protected get dt(): number {
        return 0.001 * this.renderer!.handler.deltaTime;
    }

    protected get velocityInertia(): number {
        return this._velInertia * this.inertia;
    }

    public stop() {
        this.vel.set(0, 0, 0);
        this.vel_h = 0;
        this.vel_v = 0;
        this._velInertia = DEFAULT_VELINERTIA;
        this._targetZoomPoint = null;
        this._grabbedPoint = null;
        this._targetRotationPoint = null;
        this._targetDragPoint = null;
    }
}
