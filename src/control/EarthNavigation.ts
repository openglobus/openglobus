import {Control, IControlParams} from "./Control";
import {LonLat} from "../LonLat";
import {ITouchState} from "../renderer/RendererEvents";
import {IMouseState} from "../renderer/RendererEvents";
import {Quat} from "../math/Quat";
import {Ray} from "../math/Ray";
import {Sphere} from "../bv/Sphere";
import {Vec2} from "../math/Vec2";
import {Vec3} from "../math/Vec3";
import {Mat3} from "../math/Mat3";
import {input} from "../input/input";
import * as math from "../math";
import {DEGREES, RADIANS} from "../math";
import {Plane} from "../math/Plane";

interface IEarthNavigationParams extends IControlParams {
    speed?: number;
    fixedUp?: boolean;
}

let curRot = new Quat();

export class EarthNavigation extends Control {

    public speed: number;
    public force: Vec3;
    public vel: Vec3;
    public mass: number;

    protected _lookPos: Vec3 | undefined;

    protected _grabbedPoint: Vec3 | undefined;

    protected _targetZoomPoint: Vec3 | undefined;

    protected _targetDragPoint: Vec3 | null;

    protected _grabbedSphere: Sphere;

    protected _wheelDirection: number;

    protected _currScreenPos: Vec2;

    protected _tUp: Vec3;

    protected _shiftBusy = false;

    protected fixedUp: boolean;

    protected _curPitch: number;

    protected _curYaw: number;

    protected _curRoll: number;

    protected _rot: Quat;

    protected _eye0: Vec3;

    constructor(options: IEarthNavigationParams = {}) {
        super({
            name: "EarthNavigation",
            autoActivate: true,
            ...options
        });

        this.speed = options.speed || 1.0; // m/s
        this.force = new Vec3();
        this.vel = new Vec3();
        this.mass = 1;

        this._lookPos = undefined;
        this._grabbedPoint = undefined;

        this._targetZoomPoint = undefined;

        this._targetDragPoint = null;

        this._tUp = new Vec3();

        this._wheelDirection = 1;

        this._currScreenPos = new Vec2();

        this._grabbedSphere = new Sphere();

        this.fixedUp = options.fixedUp != undefined ? options.fixedUp : true;

        this._rot = new Quat();

        this._curPitch = 0;
        this._curYaw = 0;
        this._curRoll = 0;

        this._eye0 = new Vec3();
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
        r.events.on("touchstart", this._onTouchStart);
        r.events.on("touchend", this._onTouchEnd);

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
        r.events.off("touchstart", this._onTouchStart);
        r.events.off("touchend", this._onTouchEnd);

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
        let cam = this.planet!.camera;

        if (this._targetZoomPoint && e.moving) {
            let l = (0.5 / cam.eye.distance(this._targetZoomPoint)) * cam._lonLat.height * math.RADIANS;
            if (l > 0.007) {
                l = 0.007;
            } else if (l < 0.003) {
                l = 0.003;
            }
            cam.rotateHorizontal(l * (e.x - e.prev_x), false, this._targetZoomPoint, this._tUp);
            cam.rotateVertical(l * (e.y - e.prev_y), this._targetZoomPoint, 0.1);
        }
    }

    protected _onRDown = (e: IMouseState) => {
        this.planet!.stopFlying();
        this._targetZoomPoint = this._getTargetPoint(e.pos)!;
        if (this._targetZoomPoint) {
            this.vel.scale(0);
            this._tUp = this._targetZoomPoint.normal();
        }
    }

    protected _onTouchStart = (e: ITouchState) => {
    }

    protected _onTouchEnd = (e: ITouchState) => {

    }

    protected _getTargetPoint(p: Vec2): Vec3 | undefined {
        if (this.planet) {
            if (this.planet.camera.getAltitude() > 10000) {
                return this.planet.getCartesianFromPixelEllipsoid(p);
            }
            return this.planet.getCartesianFromPixelTerrain(p);
        }
    }

    protected _onMouseWheel = (e: IMouseState) => {
        if (this.planet) {

            this._targetDragPoint = null;
            this._targetZoomPoint = this._getTargetPoint(e.pos);

            if (!this._targetZoomPoint)
                return;

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
            //     this.vel.set(0, 0, 0);
            //     brk = dist / 5000;
            // }

            this._currScreenPos.set(e.x, e.y);
            this._wheelDirection = Math.sign(e.wheelDelta);
            let dist = this.planet.camera.eye.distance(this._targetZoomPoint) * 2;
            this.force = (e.direction.scale(Math.sign(this._wheelDirection))).normalize().scale(dist);
        }
    }

    protected onDraw() {
        this._updateVel();
        this._handlerZoom();
        this._handleDrag();
    }

    protected _onLDown = (e: IMouseState) => {

        if (!this.planet) return;

        this._grabbedPoint = this._getTargetPoint(e.pos);

        if (!this._grabbedPoint) return;

        this._grabbedSphere.radius = this._grabbedPoint.length();

        this._eye0 = this.planet.camera.eye.clone();

        this._curPitch = this.planet.camera.getPitch();
        this._curYaw = this.planet.camera.getYaw();
        this._curRoll = this.planet.camera.getRoll();
    }

    protected _onLUp = (e: IMouseState) => {
        //this._grabbedPoint = undefined;
    }

    protected _onLHold = (e: IMouseState) => {
        if (this._grabbedPoint && this.planet && e.moving) {

            this._targetZoomPoint = undefined;

            let cam = this.planet.camera;

            this._targetDragPoint = new Ray(cam.eye, e.direction).hitSphere(this._grabbedSphere);

            if (!this._targetDragPoint) return;

            let rot = Quat.getRotationBetweenVectors(
                this._targetDragPoint.normal(),
                this._grabbedPoint.normal()
            );
            cam.eye = rot.mulVec3(cam.eye);
            cam.rotate(rot);
        }
    }

    protected _handleDrag() {
        if (this.planet && this._targetDragPoint && this._grabbedPoint /*&& this.vel.length() > 0.0*/) {
            let cam = this.planet!.camera;
            cam.setPitchYawRoll(this._curPitch, this._curYaw, this._curRoll);
        }
    }

    protected _handlerZoom() {
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

            if (!b) return;

            let rot = Quat.getRotationBetweenVectors(b.getNormal(), a.getNormal());
            cam.eye = rot.mulVec3(eye);
            cam.rotate(rot);

            if (this.fixedUp) {

                // restore camera direction
                cam.setPitchYawRoll(this._curPitch, this._curYaw, this._curRoll);

                cam.update();
                let dirCurr = cam.unproject2v(this._currScreenPos);
                let dirNew = this._targetZoomPoint.sub(cam.eye).normalize();

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
        this.vel.scale(0.96);
        if (this.vel.length() < 0.001) {
            this.vel.set(0, 0, 0);
        }
        this.force.set(0, 0, 0);
    }

    protected get dt(): number {
        return 0.001 * this.renderer!.handler.deltaTime;
    }
}
