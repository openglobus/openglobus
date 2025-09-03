import {Control} from "./Control";
import type {IControlParams} from "./Control";
import {input} from "../input/input";
import type {IMouseState} from "../renderer/RendererEvents";
import {Vec2} from "../math/Vec2";
import {Vec3} from "../math/Vec3";
import * as math from "../math";
import {Ray} from "../math/Ray";
import {Plane} from "../math/Plane";
import {Camera} from "../camera/Camera";

interface ISimpleNavigationParams extends IControlParams {
    speed?: number;
}

/**
 * Simple keyboard camera navigation with W,S,A,D and shift keys to fly around the scene.
 */
export class SimpleNavigation extends Control {
    public speed: number;
    public force: Vec3;
    public vel: Vec3;
    public mass: number;

    public focusVel: number = 0;
    public focusForce: number = 0;

    protected _lookPos: Vec3 | undefined;
    protected _up: Vec3 | null;

    protected _grabbedPoint: Vec3 | undefined;
    protected _grabbedScreenPoint: Vec2;
    protected _eye0: Vec3;
    protected _wheelDist: number;
    protected _wheelPos: Vec3;
    protected _nx: number = 0;
    protected _ny: number = 0;

    constructor(options: ISimpleNavigationParams = {}) {
        super({
            name: "SimpleNavigation",
            autoActivate: true, ...options
        });
        this.speed = options.speed || 1.0; // m/s
        this.force = new Vec3();
        this.vel = new Vec3();
        this.mass = 1;

        this._lookPos = undefined;
        this._grabbedPoint = undefined;
        this._grabbedScreenPoint = new Vec2();
        this._up = null;

        this._eye0 = new Vec3();
        this._wheelDist = 0;
        this._wheelPos = new Vec3();
    }

    override oninit() {
    }

    public override onactivate() {
        super.onactivate();

        let r = this.renderer!;

        if (r.activeCamera.isOrthographic) {
            r.getDepthMinDistanceAsync().then((dist) => {
                r.activeCamera.focusDistance = dist;
            });
        }

        r.events.on("mousewheel", this._onMouseWheel);
        r.events.on("keypress", input.KEY_W, this.onCameraMoveForward, this);
        r.events.on("keypress", input.KEY_S, this.onCameraMoveBackward, this);
        r.events.on("keypress", input.KEY_A, this.onCameraStrifeLeft, this);
        r.events.on("keypress", input.KEY_D, this.onCameraStrifeRight, this);
        r.events.on("keypress", input.KEY_UP, this.onCameraLookUp, this);
        r.events.on("keypress", input.KEY_DOWN, this.onCameraLookDown, this);
        r.events.on("keypress", input.KEY_LEFT, this.onCameraTurnLeft, this);
        r.events.on("keypress", input.KEY_RIGHT, this.onCameraTurnRight, this);
        r.events.on("keypress", input.KEY_Q, this.onCameraRollLeft, this);
        r.events.on("keypress", input.KEY_E, this.onCameraRollRight, this);

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
        r.events.off("keypress", input.KEY_W, this.onCameraMoveForward);
        r.events.off("keypress", input.KEY_S, this.onCameraMoveBackward);
        r.events.off("keypress", input.KEY_A, this.onCameraStrifeLeft);
        r.events.off("keypress", input.KEY_D, this.onCameraStrifeRight);
        r.events.off("keypress", input.KEY_UP, this.onCameraLookUp);
        r.events.off("keypress", input.KEY_DOWN, this.onCameraLookDown);
        r.events.off("keypress", input.KEY_LEFT, this.onCameraTurnLeft);
        r.events.off("keypress", input.KEY_RIGHT, this.onCameraTurnRight);
        r.events.off("keypress", input.KEY_Q, this.onCameraRollLeft);
        r.events.off("keypress", input.KEY_E, this.onCameraRollRight);

        r.events.off("rhold", this._onRHold);
        r.events.off("rdown", this._onRDown);

        r.events.off("lhold", this._onMouseLeftButtonHold);
        r.events.off("ldown", this._onMouseLeftButtonDown);
        r.events.off("lup", this._onMouseLeftButtonUp);

        r.events.off("draw", this.onDraw);
    }

    protected _onMouseLeftButtonDown = (e: IMouseState) => {
        if (this._active && this.renderer) {
            this.stop();
            this.renderer.handler.canvas!.classList.add("ogGrabbingPoiner");
            this._grabbedPoint = this.renderer.getCartesianFromPixel(e);
            this._grabbedScreenPoint.set(e.nx, e.ny);
            if (this._grabbedPoint) {
                this._eye0.copy(this.renderer.activeCamera.eye);
            }
        }
    }

    protected _onMouseLeftButtonUp = (e: IMouseState) => {
        this.renderer!.handler.canvas!.classList.remove("ogGrabbingPoiner");
        if (e.x === e.prev_x && e.y === e.prev_y) {
            //this.force.set(0, 0, 0);
        }
    }

    protected _onMouseLeftButtonHold = (e: IMouseState) => {
        if (this.renderer && this._grabbedPoint && e.moving) {
            let cam = this.renderer.activeCamera;
            if (cam.isOrthographic) {
                let nx = e.nx - this._grabbedScreenPoint.x;
                let ny = e.ny - this._grabbedScreenPoint.y;
                let f = cam.frustum;
                let dx = -(f.right - f.left) * nx,
                    dy = (f.top - f.bottom) * ny;
                let cam_sy = cam.getUp().scale(dy),
                    cam_sx = cam.getRight().scale(dx);
                cam.eye = this._eye0.add(cam_sx.add(cam_sy));
            } else {
                let camSlope = Math.abs(cam.getForward().dot(Vec3.UP));
                let p0 = this._grabbedPoint, p1, p2;
                if (camSlope > 0.7) {
                    p1 = Vec3.add(p0, Vec3.LEFT);
                    p2 = Vec3.add(p0, cam.getRight());
                } else {
                    p1 = Vec3.add(p0, cam.getRight());
                    p2 = Vec3.add(p0, Vec3.UP);
                }
                let px = new Vec3();
                if (new Ray(cam.eye, e.direction).hitPlaneRes(Plane.fromPoints(p0, p1, p2), px) === Ray.INSIDE) {
                    cam.eye = cam.eye.add(p0.sub(px));
                }
            }
            cam.update();
        }
    }

    protected _onRHold = (e: IMouseState) => {
        if (this._lookPos && e.moving && this.renderer) {
            const cam = this.renderer.activeCamera;
            this.renderer!.controlsBag.scaleRot = 1.0;
            let l = (0.5 / cam.eye.distance(this._lookPos)) * math.RADIANS;
            if (l > 0.007) {
                l = 0.007;
            } else if (l < 0.003) {
                l = 0.003;
            }
            cam.rotateHorizontal(l * (e.x - e.prev_x), false, this._lookPos, this._up!);
            cam.rotateVertical(l * (e.y - e.prev_y), this._lookPos);
            cam.update();
        }
    }

    protected _onRDown = (e: IMouseState) => {
        if (this.renderer) {
            this.stop();
            this._lookPos = undefined;
            this._lookPos = this.renderer.getCartesianFromPixel(e.pos);
            if (this._lookPos) {
                this._up = Vec3.UP;
            } else {
                const cam = this.renderer.activeCamera;
                let pl = new Plane(Vec3.ZERO, Vec3.UP);
                let ray = new Ray(cam.eye, e.direction);
                this._lookPos = new Vec3();
                ray.hitPlaneRes(pl, this._lookPos)
                this._up = Vec3.UP;
            }
        }
    }

    protected _onMouseWheel = (e: IMouseState) => {
        if (this.renderer) {
            let cam = this.renderer.activeCamera;

            if (cam.isOrthographic) {
                let f = cam.frustums[0];
                let dx = -(f.right - f.left) * (0.5 - e.nx),
                    dy = (f.top - f.bottom) * (0.5 - e.ny);
                let wdy = cam.getUp().scale(dy),
                    wdx = cam.getRight().scale(dx);
                let p = cam.eye.add(wdx.add(wdy));
                this._wheelPos = p.add(cam.getForward());
                this._wheelDist = 1;
                this._nx = e.nx;
                this._ny = e.ny;
                this.focusForce = 0.05 * e.wheelDelta;
            } else {
                let pos = this.renderer.getCartesianFromPixel(e);
                if (!pos) {
                    pos = new Vec3();
                    let pl = new Plane(Vec3.ZERO, Vec3.UP);
                    let ray = new Ray(cam.eye, e.direction);
                    ray.hitPlaneRes(pl, pos);
                }
                let dir = pos.sub(cam.eye).normalize();
                let dist = cam.eye.distance(pos) * 8;
                this.force.addA(dir.scale(e.wheelDelta)).normalize().scale(dist);
            }
        }
    }

    protected onCameraMoveForward = () => {
        this.force.addA(this.renderer!.activeCamera.getForward()).normalize();
    }

    protected onCameraMoveBackward = () => {
        this.force.addA(this.renderer!.activeCamera.getBackward()).normalize();
    }

    protected onCameraStrifeLeft = () => {
        this.force.addA(this.renderer!.activeCamera.getLeft()).normalize();
    }

    protected onCameraStrifeRight = () => {
        this.force.addA(this.renderer!.activeCamera.getRight()).normalize();
    }

    protected onCameraLookUp = () => {
        let cam = this.renderer!.activeCamera!;
        cam.update();
    }

    protected onCameraLookDown = () => {
        let cam = this.renderer!.activeCamera!;
        cam.update();
    }

    protected onCameraTurnLeft = () => {
        let cam = this.renderer!.activeCamera!;
        cam.update();
    }

    protected onCameraTurnRight = () => {
        let cam = this.renderer!.activeCamera!;
        cam.update();
    }

    protected onCameraRollLeft = () => {
        let cam = this.renderer!.activeCamera!;
        cam.update();
    }

    protected onCameraRollRight = () => {
        let cam = this.renderer!.activeCamera!;
        cam.update();
    }

    protected _handleMouseWheel() {
        let cam = this.renderer!.activeCamera;

        if (cam.isOrthographic && Math.abs(this.focusVel) > 0.01) {
            cam.eye = this._wheelPos.add(cam.getBackward().scale(this._wheelDist));
            cam.focusDistance -= cam.focusDistance * this.focusVel * this.dt;

            let f = cam.frustums[0];
            let dx = (f.right - f.left) * (0.5 - this._nx),
                dy = -(f.top - f.bottom) * (0.5 - this._ny);
            let wdy = cam.getUp().scale(dy),
                wdx = cam.getRight().scale(dx);

            cam.eye.addA(wdx.add(wdy));
            cam.update();
        } else if (this.vel.length() > 0.01) {
            cam.eye = cam.eye.add(this.vel.scaleTo(this.dt));
            cam.update();
        }
    }

    protected onDraw() {
        this._updateVel();
        this._handleMouseWheel();
    }

    protected get dt(): number {
        return 0.001 * this.renderer!.handler.deltaTime;
    }

    protected _updateVel() {
        let acc = this.force.scale(1.0 / this.mass);
        this.vel.addA(acc);
        this.vel.scale(0.77);
        this.force.set(0, 0, 0);

        this.focusVel += this.focusForce;
        this.focusVel *= 0.77;
        this.focusForce = 0;
    }

    public stop() {
        this.focusVel = 0;
        this.vel.clear();
    }
}