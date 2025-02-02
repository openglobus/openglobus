import {Control, IControlParams} from "./Control";
import {LonLat} from "../LonLat";
import {ITouchState} from "../renderer/RendererEvents";
import {IMouseState} from "../renderer/RendererEvents";
import {Quat} from "../math/Quat";
import {Ray} from "../math/Ray";
import {Sphere} from "../bv/Sphere";
import {Vec2} from "../math/Vec2";
import {Vec3} from "../math/Vec3";
import {input} from "../input/input";
import * as math from "../math";

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

    constructor(options: IEarthNavigationParams = {}) {
        super(options);

        this.speed = options.speed || 1.0; // m/s
        this.force = new Vec3();
        this.vel = new Vec3();
        this.mass = 1;

        this._lookPos = undefined;
        this._grabbedPoint = undefined;
        this._up = null;

        this._eye0 = new Vec3();

    }

    override oninit() {

    }

    public override onactivate() {
        super.onactivate();
        let r = this.renderer!;

        r.events.on("mousewheel", this._onMouseWheel);

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

        r.events.off("rhold", this._onRHold);
        r.events.off("rdown", this._onRDown);

        r.events.off("lhold", this._onMouseLeftButtonHold);
        r.events.off("ldown", this._onMouseLeftButtonDown);
        r.events.off("lup", this._onMouseLeftButtonUp);

        r.events.off("draw", this.onDraw);
    }

    protected _onMouseLeftButtonDown = (e: IMouseState) => {
        if (this._active && this.renderer) {
            this.renderer.handler.canvas!.classList.add("ogGrabbingPoiner");
            this._grabbedPoint = this.renderer.getCartesianFromPixel(e);
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
        if (this._active && this.renderer) {
            if (!this._grabbedPoint) {
                return;
            }

            if (e.moving) {
                let cam = this.renderer.activeCamera;

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
                if (new Ray(cam.eye, e.direction).hitPlane(p0, p1, p2, px) === Ray.INSIDE) {
                    cam.eye = this._eye0.addA(px.subA(p0).negate());
                }
            }
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
            cam.rotateHorizontal(l * (e.x - e.prev_x), false, this._lookPos, this._up);
            cam.rotateVertical(l * (e.y - e.prev_y), this._lookPos);
        }
    }

    protected _onRDown = (e: IMouseState) => {
        if (this.renderer) {
            this._lookPos = this.renderer.getCartesianFromPixel(e.pos);
            if (this._lookPos) {
                this._up = Vec3.UP;//this.renderer.activeCamera.getUp();
            }
        }
    }

    protected _onMouseWheel = (e: IMouseState) => {
        if (this.renderer) {
            let pos = this.renderer.getCartesianFromPixel(e),
                dist = 10;
            if (pos) {
                dist = this.renderer.activeCamera.eye.distance(pos);
            }
            this.force.addA(e.direction.scale(e.wheelDelta)).normalize().scale(dist);
        }
    }

    protected get dt(): number {
        return 0.001 * this.renderer!.handler.deltaTime;
    }

    protected onDraw() {
        if (this.renderer) {

            let acc = this.force.scale(1.0 / this.mass);
            this.vel.addA(acc);
            this.vel.scale(0.96);
            this.force.set(0, 0, 0);

            let cam = this.renderer.activeCamera;
            cam.eye = cam.eye.add(this.vel.scaleTo(this.dt));
            cam.update();
        }
    }
}
