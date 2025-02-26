import {Control, IControlParams} from "./Control";
import {IMouseState} from "../renderer/RendererEvents";
import {Quat} from "../math/Quat";
import {Ray} from "../math/Ray";
import {Sphere} from "../bv/Sphere";
import {Vec2} from "../math/Vec2";
import {Vec3} from "../math/Vec3";
import {input} from "../input/input";
import * as math from "../math";
import {Plane} from "../math/Plane";
import {Mat4} from "../math/Mat4";

interface IEarthNavigationParams extends IControlParams {
    speed?: number;
    fixedUp?: boolean;
}

const DEFAULT_VELINERTIA = 0.96;


export class EarthNavigation extends Control {

    public speed: number;
    public force: Vec3;
    public force_h: number;
    public force_v: number;
    public vel: Vec3;
    public vel_h: number;
    public vel_v: number;
    public mass: number;

    protected _lookPos: Vec3 | undefined;

    protected _grabbedPoint: Vec3 | null;

    protected _targetZoomPoint: Vec3 | null;

    protected _targetDragPoint: Vec3 | null;

    protected _targetRotationPoint: Vec3 | null;

    protected _grabbedSphere: Sphere;

    protected _wheelDirection: number;

    protected _currScreenPos: Vec2;

    protected _tUp: Vec3;
    protected _tRad: number;

    protected _shiftBusy = false;

    protected fixedUp: boolean;

    protected _curPitch: number;

    protected _curYaw: number;

    protected _curRoll: number;

    protected _rot: Quat;

    protected _eye0: Vec3;

    protected _grabbedCameraHeight: number;

    protected _newEye: Vec3;

    protected _isTouchPad: boolean;

    protected _velInertia: number;

    protected _hold: boolean = false;

    protected _prevVel: Vec3 = new Vec3();

    protected _screenPosIsChanged: boolean = true;

    protected _rotHDir: number;
    protected _rotVDir: number;

    constructor(options: IEarthNavigationParams = {}) {
        super({
            name: "EarthNavigation",
            autoActivate: true,
            ...options
        });

        this.speed = options.speed || 1.0; // m/s
        this.force = new Vec3();
        this.force_h = 0;
        this.force_v = 0;

        this.vel = new Vec3();
        this.vel_h = 0;
        this.vel_v = 0;

        this.mass = 1;
        this._velInertia = DEFAULT_VELINERTIA;

        this._lookPos = undefined;
        this._grabbedPoint = null;

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

        this.fixedUp = options.fixedUp != undefined ? options.fixedUp : true;

        this._rot = new Quat();

        this._curPitch = 0;
        this._curYaw = 0;
        this._curRoll = 0;

        this._eye0 = new Vec3();
        this._newEye = new Vec3();
        this._grabbedCameraHeight = 0;

        this._isTouchPad = false;
    }

    override oninit() {
        if (this.renderer) {
            this.renderer.events.on("keyfree", input.KEY_ALT, this._onShiftFree);
            this.renderer.events.on("keyfree", input.KEY_PRINTSCREEN, this._onShiftFree);
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
        r.events.off("rip", this._onRUp);
        r.events.off("lhold", this._onLHold);
        r.events.off("ldown", this._onLDown);
        r.events.off("lup", this._onLUp);
        r.events.off("draw", this.onDraw);
        r.events.off("mousemove", this._onMouseMove);
        r.events.off("mouseleave", this._onMouseLeave);
        r.events.off("mouseenter", this._onMouseEnter);
    }

    public _onShiftFree = () => {
        this._shiftBusy = false;
    }

    protected _onMouseMove = (e: IMouseState) => {
        if (this._active && this.renderer!.events.isKeyPressed(input.KEY_ALT)) {
            if (!this._shiftBusy) {
                this._shiftBusy = true;
                this._onRHold(e);
            }
            this._onRDown(e);
        }
    }

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
    }

    protected _onMouseLeave = () => {
        if (this.renderer!.events.mouseState.leftButtonDown) {
            this.vel.scale(0);
        }
        this.renderer!.handler.canvas!.classList.remove("ogGrabbingPoiner");
    }

    protected _onRHold = (e: IMouseState) => {
        if (this._targetRotationPoint) {
            let _noRotationInertia = false;
            this._velInertia = 0.8;
            this.force_h = 0.2 * (e.x - e.prev_x);
            this.force_v = 0.2 * (e.y - e.prev_y);
        }
    }

    protected _handleRotation() {
        if (this.planet && this._targetRotationPoint) {
            let cam = this.planet!.camera;

            // let l = (0.3 / this._tRad) * math.RADIANS;
            // if (l > 0.007) {
            //     l = 0.007;
            // } else if (l < 0.003) {
            //     l = 0.003;
            // }

            let d_v_h = this.vel_h * this.dt;
            let d_v_v = this.vel_v * this.dt;

            cam.rotateHorizontal(d_v_h, false, this._targetRotationPoint, this._tUp);
            cam.rotateVertical(d_v_v, this._targetRotationPoint, 0.1);

            this._velInertia = DEFAULT_VELINERTIA;
        }
    }

    protected _onRUp = (e: IMouseState) => {
        this._velInertia = DEFAULT_VELINERTIA;
    }

    protected _onRDown = (e: IMouseState) => {
        if (this.planet) {
            this.planet.stopFlying();
            this._targetRotationPoint = this._getTargetPoint(e.pos)!;
            if (this._targetRotationPoint) {

                this._targetZoomPoint = null;
                this._targetDragPoint = null;

                this.vel.set(0, 0, 0);
                this._tUp = this._targetRotationPoint.getNormal();
                this._tRad = this.planet.camera.eye.distance(this._targetRotationPoint);
            }
        }
    }

    protected _getTargetPoint(p: Vec2): Vec3 | null {
        if (this.planet) {
            if (this.planet.camera.getAltitude() > 10000) {
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
            let _targetZoomPoint = this._getTargetPoint(e.pos);

            if (!_targetZoomPoint)
                return;

            this._targetZoomPoint = _targetZoomPoint;

            this._grabbedSphere.radius = this._targetZoomPoint.length();

            this._curPitch = this.planet.camera.getPitch();
            this._curYaw = this.planet.camera.getYaw();
            this._curRoll = this.planet.camera.getRoll();

            if (Math.sign(e.wheelDelta) !== this._wheelDirection) {
                this.vel.scale(0.3);
                this._currScreenPos.set(e.x, e.y);
                this._wheelDirection = Math.sign(e.wheelDelta);
                return;
            }

            //let dd = this.targetPoint!.distance(this.planet.camera.eye);
            // let brk = 1;
            // if (this._wheelDirection > 0 && dd < 5000) {
            //this.vel.scale(0.3);
            //     brk = dist / 5000;
            // }

            this._currScreenPos.set(e.x, e.y);
            this._wheelDirection = Math.sign(e.wheelDelta);
            let scale = 2;
            this._isTouchPad = e.isTouchPad;
            if (e.isTouchPad) {
                this._velInertia = 0.88;
                scale = 0.5;
            } else {
                this._velInertia = DEFAULT_VELINERTIA;
            }
            let dist = this.planet.camera.eye.distance(this._targetZoomPoint) * scale;
            this.force = (e.direction.scale(Math.sign(this._wheelDirection))).normalize().scale(dist);
        }
    }

    protected onDraw() {
        this._updateVel();
        this._handleZoom();
        this._handleDrag();
        this._handleRotation();
    }

    protected _onLDown = (e: IMouseState) => {
        this.stop();

        this._targetRotationPoint = null
        this._targetZoomPoint = null;

        if (!this.planet) return;

        this._grabbedPoint = this._getTargetPoint(e.pos);

        if (!this._grabbedPoint) return;

        this.renderer!.handler.canvas!.classList.add("ogGrabbingPoiner");

        this._grabbedSphere.radius = this._grabbedPoint.length();

        this._eye0 = this.planet.camera.eye.clone();
        this._grabbedCameraHeight = this._eye0.length();

        this._curPitch = this.planet.camera.getPitch();
        this._curYaw = this.planet.camera.getYaw();
        this._curRoll = this.planet.camera.getRoll();

        this._currScreenPos.copy(e.pos);

        if (this.planet!.camera.getUp().dot(new Vec3(0, 0, 1)) > 0.3) {
            this.fixedUp = true;
        }
    }

    protected _onLHold = (e: IMouseState) => {
        if (this._grabbedPoint && this.planet) {
            let cam = this.planet.camera;

            if (cam.slope > 0.2) {
                let _targetDragPoint = new Ray(cam.eye, e.direction).hitSphere(this._grabbedSphere);

                if (!_targetDragPoint) {
                    return;
                }

                this._targetDragPoint = _targetDragPoint;

                let newEye = new Vec3();

                let rot = Quat.getRotationBetweenVectors(
                    this._targetDragPoint.getNormal(),
                    this._grabbedPoint.getNormal()
                );

                newEye.copy(rot.mulVec3(cam.eye));
                this.force = newEye.sub(cam.eye).scale(70);
            } else {
                let p0 = this._grabbedPoint,
                    p1 = Vec3.add(p0, cam.getRight()),
                    p2 = Vec3.add(p0, p0.getNormal());

                let px = new Vec3();
                new Ray(cam.eye, e.direction).hitPlaneRes(Plane.fromPoints(p0, p1, p2), px);
                let newEye = cam.eye.add(px.subA(p0).negate());
                this.force = newEye.sub(cam.eye).scale(70);
                this._targetDragPoint = px;
            }

            this.vel.set(0.0, 0.0, 0.0);

            if (!this._currScreenPos.equal(e.pos)) {
                this._screenPosIsChanged = true;
                this._currScreenPos.copy(e.pos);
            }

            this._hold = true;
        }
    }

    protected _onLUp = (e: IMouseState) => {
        this._hold = false;
        this.renderer!.handler.canvas!.classList.remove("ogGrabbingPoiner");
    }

    protected _handleDrag() {
        if (this.planet && this._targetDragPoint && this._grabbedPoint && this.vel.length() > 0.0) {
            this._velInertia = DEFAULT_VELINERTIA;
            let cam = this.planet!.camera;

            if (Math.abs(cam.eyeNorm.dot(Vec3.NORTH)) > 0.9) {
                this.fixedUp = false;
            }

            if (!this._screenPosIsChanged) {
                if (this.vel.length() > this._prevVel.length()) {
                    this.fixedUp = false;
                }
            }
            this._screenPosIsChanged = false;
            this._prevVel.copy(this.vel);

            if (cam.slope > 0.2) {
                let d_v = this.vel.scaleTo(this.dt);
                // let d_s = d_v;
                // let newEye = cam.eye.add(d_s).normalize().scale(this._grabbedCameraHeight);
                let d_s = Vec3.proj_b_to_plane(d_v, cam.eyeNorm);
                let newEye = cam.eye.add(d_s).normalize().scale(this._grabbedCameraHeight);
                if (this.fixedUp) {
                    cam.eye.copy(newEye);
                    cam.setPitchYawRoll(this._curPitch, this._curYaw, this._curRoll);
                } else {
                    let rot = Quat.getRotationBetweenVectors(cam.eye.getNormal(), newEye.getNormal());
                    cam.rotate(rot);
                    cam.eye.copy(newEye);
                }
            } else {
                let d_v = this.vel.scaleTo(this.dt);
                let newEye = cam.eye.add(d_v);
                cam.eye.copy(newEye);
                cam.checkTerrainCollision();
            }
        }
    }

    protected _handleZoom() {
        if (this._targetZoomPoint && this.vel.length() > 0.0) {

            // Common
            let cam = this.planet!.camera;
            let a = this._targetZoomPoint;
            let dir = a.sub(cam.eye).normalize();
            let eye = cam.eye.clone();
            let velDir = Math.sign(this.vel.getNormal().dot(cam.getForward()));
            let d_v = this.vel.scaleTo(this.dt);
            let d_s = d_v.projToVec(cam.getForward().scale(velDir));
            //let d_s = cam.getForward().scaleTo(velDir * d_v.length());

            // Braking tweak
            let destDist = cam.eye.distance(a);
            if (d_s.length() * 10 > destDist) {
                let temp = d_s.length();
                d_s.normalize().scale(temp * 0.5);
                this.vel.scale(0.5);
            }

            eye.addA(d_s);

            let b = new Ray(eye, dir).hitSphere(this._grabbedSphere);

            if (!b) {
                this.vel.set(0, 0, 0);
                return;
            }

            let rot = Quat.getRotationBetweenVectors(b.getNormal(), a.getNormal());
            cam.eye = rot.mulVec3(eye);
            cam.rotate(rot);

            if (this.fixedUp) {

                // restore camera direction
                cam.setPitchYawRoll(this._curPitch, this._curYaw, this._curRoll);

                cam.update();
                let dirCurr = cam.unproject2v(this._currScreenPos);
                let dirNew = a.sub(cam.eye).normalize();

                let px0 = new Vec3();
                let px1 = new Vec3();
                let pl = Plane.fromPoints(a, a.add(cam.getUp()), a.add(cam.getRight()));

                new Ray(cam.eye, dirCurr).hitPlaneRes(pl, px0);
                new Ray(cam.eye, dirNew).hitPlaneRes(pl, px1);

                let dp = px1.sub(px0);
                cam.eye = cam.eye.add(dp);

                // ver.2
                // let px0 = new Ray(cam.eye, dirCurr).hitSphere(this._grabbedSphere)!;
                // let px1 = new Ray(cam.eye, dirNew).hitSphere(this._grabbedSphere)!;
            }
        }
    }

    protected _updateVel() {
        let acc = this.force.scale(1.0 / this.mass);
        this.vel.addA(acc);
        this.vel.scale(this._velInertia);
        if (this.vel.length() < 0.001) {
            this.vel.set(0, 0, 0);
        }
        this.force.set(0, 0, 0);

        this._updateVel_h();
        this._updateVel_v();
    }

    protected _updateVel_h() {
        let acc = this.force_h * 1.0 / this.mass;
        this.vel_h += acc;
        this.vel_h *= this._velInertia;
        this.force_h = 0;
    }

    protected _updateVel_v() {
        let acc = this.force_v * 1.0 / this.mass;
        this.vel_v += acc;
        this.vel_v *= this._velInertia;
        this.force_v = 0;
    }


    protected get dt(): number {
        return 0.001 * this.renderer!.handler.deltaTime;
    }

    public stop() {
        this.vel.set(0, 0, 0);
        this._velInertia = DEFAULT_VELINERTIA;
        this._targetZoomPoint = null;
        this._grabbedPoint = null;
        this._targetRotationPoint = null;
    }
}
