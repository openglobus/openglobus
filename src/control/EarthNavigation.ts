import {Control, IControlParams} from "./Control";
import {LonLat} from "../LonLat";
import {ITouchState} from "../renderer/RendererEvents";
import {IMouseState} from "../renderer/RendererEvents";
import {Quat} from "../math/Quat";
import {Ray} from "../math/Ray";
import {Sphere} from "../bv/Sphere";
import {Vec2} from "../math/Vec2";
import {Vec3} from "../math/Vec3";
import {Mat4} from "../math/Mat4";
import {input} from "../input/input";
import * as math from "../math";
import {DEGREES} from "../math";

interface IEarthNavigationParams extends IControlParams {
    speed?: number;
}


export class EarthNavigation extends Control {

    public speed: number;
    public force: Vec3;
    public vel: Vec3;
    public mass: number;

    protected _lookPos: Vec3 | undefined;
    protected _up: Vec3 | null;

    protected _grabbedPoint: Vec3 | undefined;
    protected _eye0: Vec3;

    public targetPoint: Vec3 | undefined;

    protected _wheelDirection: number;


    protected currScreenPos: Vec2;

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
        this._up = null;

        this._eye0 = new Vec3();

        this.targetPoint = undefined;

        this._wheelDirection = 0;

        this.currScreenPos = new Vec2();
    }

    override oninit() {

    }

    public override onactivate() {
        super.onactivate();
        let r = this.renderer!;

        r.events.on("mousewheel", this._onMouseWheel);
        r.events.on("touchstart", this._onTouchStart);
        r.events.on("touchend", this._onTouchEnd);

        r.events.on("rhold", this._onRHold, this);
        r.events.on("rdown", this._onRDown, this);

        r.events.on("lhold", this._onMouseLeftButtonHold);
        r.events.on("ldown", this._onMouseLeftButtonDown);
        r.events.on("lup", this._onMouseLeftButtonUp);

        r.events.on("draw", this.onDraw, this, -1000);
    }

    public override ondeactivate() {
        super.ondeactivate();
        let r = this.renderer!;
        r.events.off("mousewheel", this._onMouseWheel);
        r.events.off("touchstart", this._onTouchStart);
        r.events.off("touchend", this._onTouchEnd);

        r.events.off("rhold", this._onRHold);
        r.events.off("rdown", this._onRDown);

        r.events.off("lhold", this._onMouseLeftButtonHold);
        r.events.off("ldown", this._onMouseLeftButtonDown);
        r.events.off("lup", this._onMouseLeftButtonUp);

        r.events.off("draw", this.onDraw);
    }

    protected _onMouseLeftButtonDown = (e: IMouseState) => {
        return;
        if (this._active && this.renderer) {
            this.renderer!.handler.canvas!.classList.add("ogGrabbingPoiner");
            this._grabbedPoint = this.renderer!.getCartesianFromPixel(e);
            if (this._grabbedPoint) {
                this._eye0.copy(this.renderer!.activeCamera.eye);
            }
        }
    }

    protected _onMouseLeftButtonUp = (e: IMouseState) => {
        return;
        this.renderer!.handler.canvas!.classList.remove("ogGrabbingPoiner");
        if (e.x === e.prev_x && e.y === e.prev_y) {
            //this.force.set(0, 0, 0);
        }
    }

    protected _onMouseLeftButtonHold = (e: IMouseState) => {
        return;
        if (this._active && this.renderer) {
            if (!this._grabbedPoint) {
                return;
            }

            if (e.moving) {
                let cam = this.renderer!.activeCamera;

                let camSlope = Math.abs(cam.getForward().dot(Vec3.UP));

                let p0 = this._grabbedPoint!, p1, p2;

                if (camSlope > 0.7) {
                    p1 = Vec3.add(p0, Vec3.LEFT);
                    p2 = Vec3.add(p0, cam.getRight());
                } else {
                    p1 = Vec3.add(p0, cam.getRight());
                    p2 = Vec3.add(p0, Vec3.UP);
                }

                let px = new Vec3();
                if (new Ray(cam.eye, e.direction).hitPlane(p0, p1, p2, px) === Ray.INSIDE) {
                    cam.eye = this._eye0.addA(px.subA(p0).negate());
                }
            }
        }
    }

    protected _onRHold = (e: IMouseState) => {
        return;
        if (this._lookPos && e.moving && this.renderer) {
            const cam = this.renderer!.activeCamera;
            this.renderer!.controlsBag.scaleRot = 1.0;
            let l = (0.5 / cam.eye.distance(this._lookPos!)) * math.RADIANS;
            if (l > 0.007) {
                l = 0.007;
            } else if (l < 0.003) {
                l = 0.003;
            }
            cam.rotateHorizontal(l * (e.x - e.prev_x), false, this._lookPos, this._up);
            cam.rotateVertical(l * (e.y - e.prev_y), this._lookPos);
        }
    }

    protected _onRDown = (e: IMouseState) => {
        return;
        if (this.renderer) {
            this._lookPos = this.renderer!.getCartesianFromPixel(e.pos);
            if (this._lookPos) {
                this._up = Vec3.UP;//this.renderer.activeCamera.getUp();
            }
        }
    }

    protected _onTouchStart = (e: ITouchState) => {
    }

    protected _onTouchEnd = (e: ITouchState) => {

    }

    protected _onMouseWheel = (e: IMouseState) => {
        if (this.planet) {
            //this.vel.set(0, 0, 0);
            if (this.planet.camera.getAltitude() > 10000) {
                this.targetPoint = this.planet.getCartesianFromPixelEllipsoid(e);
            } else {
                this.targetPoint = this.planet.getCartesianFromPixelTerrain(e);
            }
            let dist = 0;
            if (this.targetPoint) {
                dist = this.planet.camera.eye.distance(this.targetPoint) * 2;
            }
            if (Math.sign(e.wheelDelta) !== this._wheelDirection) {
                this.vel.set(0, 0, 0);
            }

            let dd = this.targetPoint!.distance(this.planet.camera.eye);
            let brk = 1;
            // if (this._wheelDirection > 0 && dd < 5000) {
            //     this.vel.set(0, 0, 0);
            //     brk = dist / 5000;
            // }

            this._wheelDirection = Math.sign(e.wheelDelta);
            this.force = (e.direction.scale(Math.sign(this._wheelDirection))).normalize().scale(dist);

            this.currScreenPos.set(e.x, e.y);
        }
    }

    protected onDraw() {
        if (this.targetPoint) {

            let acc = this.force.scale(1.0 / this.mass);
            this.vel.addA(acc);
            this.vel.scale(0.96);
            this.force.set(0, 0, 0);

            let cam = this.planet!.camera;
            let a = this.targetPoint;

            let dir = a.sub(cam.eye).normalize();
            let eye = cam.eye.clone();

            let velMag = Math.sign(this.vel.normal().dot(cam.getForward()));

            //let dist = a.distance(cam.eye);
            let brk = 1;
            // if (/*velMag > 0 &&*/ dist < 5000) {
            //     brk = dist / 1000;
            // }

            let d = this.vel.scaleTo(this.dt).length() * velMag * brk;
            let scale = cam.getForward().add(this.vel.scaleTo(d));
            let sphere = new Sphere(a.length());
            eye.addA(scale);


            // rot UP
            let qFrame = this.planet!.getFrameRotation(eye).conjugate();
            cam._u = qFrame.mulVec3(new Vec3(0, 0, -1));
            cam._r = cam._u.cross(cam.getBackward()).normalize();
            cam._b = cam._r.cross(cam._u).normalize();


            let b = new Ray(eye, dir).hitSphere(sphere);

            if (!b) return;

            let rot = Quat.getRotationBetweenVectors(b.normal(), a.normal());

            cam.eye = rot.mulVec3(eye);
            cam._b = rot.mulVec3(cam._b);
            cam._r = rot.mulVec3(cam._r);
            cam._u = rot.mulVec3(cam._u);


            // // rot UP
            // let qFrame = this.planet!.getFrameRotation(cam.eye).conjugate();
            // cam._u = qFrame.mulVec3(new Vec3(0, 0, -1));
            // cam._r = cam._u.cross(cam.getBackward()).normalize();
            // cam._b = cam._r.cross(cam._u).normalize();
            //
            // cam.update();
            //
            // let newDir = cam.unproject2v(this.currScreenPos);
            //
            // let deg = Math.acos(dir.dot(newDir)) * DEGREES;
            //
            // if (deg > 1) {
            //     console.log(deg);
            // }

            // dir = rot.mulVec3(dir);
            // //dir = a.sub(cam.eye).normalize();
            // eye = cam.eye.clone();
            //
            // b = new Ray(eye, dir).hitSphere(sphere);
            //
            // if (!b) return;
            //
            // rot = Quat.getRotationBetweenVectors(b.normal(), a.normal());
            //
            // cam.eye = rot.mulVec3(eye);
            // cam._b = rot.mulVec3(cam._b);
            // cam._r = rot.mulVec3(cam._r);
            // cam._u = rot.mulVec3(cam._u);
        }
    }

    protected get dt(): number {
        return 0.001 * this.renderer!.handler.deltaTime;
    }
}
