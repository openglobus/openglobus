import {Control, IControlParams} from "./Control";
import {LonLat} from "../LonLat";
import {ITouchState} from "../renderer/RendererEvents";
import {IMouseState} from "../renderer/RendererEvents";
import {Quat} from "../math/Quat";
import {Ray} from "../math/Ray";
import {Sphere} from "../bv/Sphere";
import {Vec2} from "../math/Vec2";
import {Vec3} from "../math/Vec3";

interface IEarthNavigationParams extends IControlParams {

}

class TouchExt {
    public x: number;
    public y: number;
    public prev_x: number;
    public prev_y: number;
    public grabbedPoint: Vec3 | null;
    public grabbedSpheroid: Sphere;

    constructor() {
        this.x = 0;
        this.y = 0;
        this.prev_x = 0;
        this.prev_y = 0;
        this.grabbedPoint = new Vec3();
        this.grabbedSpheroid = new Sphere();
    }

    public dX(): number {
        return this.x - this.prev_x;
    }

    public dY(): number {
        return this.y - this.prev_y;
    }
}

export class EarthNavigation extends Control {
    protected grabbedPoint: Vec3 | null;
    protected grabbedDir: Vec3;
    public inertia: number;
    protected grabbedSpheroid: Sphere;
    protected _vRot: Quat;
    protected _hRot: Quat;
    protected _a: number;
    protected scaleRot: number;
    protected currState: number;
    protected positionState: { h: number; max: number; min: number; }[];
    protected touches: TouchExt[];

    constructor(options: IEarthNavigationParams = {}) {
        super(options);

        this.grabbedPoint = new Vec3();
        this.grabbedDir = new Vec3();
        this.inertia = 0.007;
        this.grabbedSpheroid = new Sphere();
        this.planet = null;
        this._vRot = new Quat();
        this._hRot = new Quat();
        this._a = 0.0;
        this.scaleRot = 0;
        this.currState = 0;

        this.positionState = [
            {h: 17119745.303455353, max: 0.98, min: -0.98},
            {h: 6866011, max: 0.98, min: -0.98},
            {h: 3000000, max: 0.98, min: -0.98},
            {h: 1000000, max: 0.98, min: -0.98},
            {h: 500000, max: 0.98, min: -0.98}
        ];

        this.touches = [new TouchExt(), new TouchExt()];
    }

    public switchZoomState(wheelDelta: number) {
        this.stopRotation();

        if (wheelDelta > 0) {
            this.currState++;
        } else {
            this.currState--;
        }

        if (this.currState <= 0) this.currState = 0;

        if (this.currState >= this.positionState.length) {
            this.currState = this.positionState.length - 1;
        }

        this.planet!.stopFlying();

        const ll = this.planet!.camera._lonLat;

        this.planet!.flyLonLat(new LonLat(ll.lon, ll.lat, this.positionState[this.currState].h));
    }

    protected onMouseWheel(event: IMouseState) {
        this.switchZoomState(event.wheelDelta);
    }

    public override oninit() {
        this.activate();
    }

    public override onactivate() {

        let r = this.renderer!;

        r.events.on("mousewheel", this.onMouseWheel, this);
        r.events.on("lhold", this.onMouseLeftButtonDown, this);
        r.events.on("ldown", this.onMouseLeftButtonClick, this);
        r.events.on("lup", this.onMouseLeftButtonUp, this);

        r.events.on("touchstart", this.onTouchStart, this);
        r.events.on("touchend", this.onTouchEnd, this);
        r.events.on("touchmove", this.onTouchMove, this);

        r.events.on("draw", this.onDraw, this);
    }

    protected onTouchStart(e: ITouchState) {
        if (e.sys!.touches.length == 1) {
            const t = this.touches[0];

            t.x = e.sys!.touches.item(0)!.pageX - e.sys!.offsetLeft;
            t.y = e.sys!.touches.item(0)!.pageY - e.sys!.offsetTop;
            t.prev_x = e.sys!.touches.item(0)!.pageX - e.sys!.offsetLeft;
            t.prev_y = e.sys!.touches.item(0)!.pageY - e.sys!.offsetTop;

            // t.grabbedPoint = this.planet!.getCartesianFromPixelTerrain(t, true);
            t.grabbedPoint = this.planet!.getCartesianFromPixelTerrain(new Vec2(t.x, t.y)) || null;

            if (t.grabbedPoint) {
                t.grabbedSpheroid.radius = t.grabbedPoint.length();
                this.stopRotation();
            }
        }
    }

    protected onTouchEnd(e: ITouchState) {
        if (e.sys!.touches.length == 0) {
            this.scaleRot = 1;

            if (
                Math.abs(this.touches[0].x - this.touches[0].prev_x) < 3 &&
                Math.abs(this.touches[0].y - this.touches[0].prev_y) < 3
            )
                this.stopRotation();
        }
    }

    protected onTouchMove(e: ITouchState) {
        if (e.sys!.touches.length == 1) {
            let cam = this.planet!.camera;

            let t = this.touches[0];

            t.prev_x = t.x;
            t.prev_y = t.y;

            t.x = e.sys!.touches.item(0)!.pageX - e.sys!.offsetLeft;
            t.y = e.sys!.touches.item(0)!.pageY - e.sys!.offsetTop;

            if (!t.grabbedPoint) return;

            let direction = cam.unproject(t.x, t.y);
            let targetPoint = new Ray(cam.eye, direction).hitSphere(t.grabbedSpheroid);

            if (targetPoint) {
                this._a =
                    Math.acos(t.grabbedPoint.y / t.grabbedSpheroid.radius) -
                    Math.acos(targetPoint.y / t.grabbedSpheroid.radius);
                this._vRot = Quat.axisAngleToQuat(cam._u, this._a);
                this._hRot = Quat.getRotationBetweenVectors(
                    new Vec3(targetPoint.x, 0.0, targetPoint.z).normal(),
                    new Vec3(t.grabbedPoint.x, 0.0, t.grabbedPoint.z).normal()
                );

                let rot = this._hRot.mul(this._vRot);

                let state = this.positionState[this.currState];

                let lim = rot.mulVec3(cam.eye).normal().dot(Vec3.NORTH);

                if (lim > state.max || lim < state.min) {
                    rot = Quat.yRotation(rot.getYaw());
                }

                cam.set(rot.mulVec3(cam.eye), Vec3.ZERO, Vec3.NORTH);
                cam.update();
            }
        }
    }

    protected onMouseLeftButtonClick(e: IMouseState) {
        this.renderer!.handler.canvas!.classList.add("ogGrabbingPoiner");
        this.grabbedPoint = this.planet!.getCartesianFromMouseTerrain() || null;
        this.grabbedDir.copy(e.direction);
        if (this.grabbedPoint) {
            this.grabbedSpheroid.radius = this.grabbedPoint.length();
            this.stopRotation();
        }
    }

    public stopRotation() {
        this.scaleRot = 0.0;
        this._a = 0.0;
        this._vRot.clear();
        this._hRot.clear();
    }

    protected onMouseLeftButtonUp(e: IMouseState) {
        this.scaleRot = 1;
        this.renderer!.handler.canvas!.classList.remove("ogGrabbingPoiner");
        if (Math.abs(e.x - e.prev_x) < 3 && Math.abs(e.y - e.prev_y) < 3) this.stopRotation();
    }

    protected onMouseLeftButtonDown(e: IMouseState) {
        let cam = this.planet!.camera;

        if (!this.grabbedPoint || cam.isFlying()) return;

        if (this.renderer!.events.mouseState.moving) {
            let targetPoint = new Ray(cam.eye, e.direction).hitSphere(this.grabbedSpheroid);

            if (targetPoint) {

                this._a = Math.acos(this.grabbedPoint.y / this.grabbedSpheroid.radius) -
                    Math.acos(targetPoint.y / this.grabbedSpheroid.radius);

                let rot = this._vRot = Quat.axisAngleToQuat(cam._u, this._a);

                cam.set(rot.mulVec3(cam.eye), Vec3.ZERO, rot.mulVec3(cam.getUp()));

                this._hRot = Quat.getRotationBetweenVectors(
                    new Vec3(targetPoint.x, 0.0, targetPoint.z).normal(),
                    new Vec3(this.grabbedPoint.x, 0.0, this.grabbedPoint.z).normal()
                );

                rot = this._hRot;

                cam.set(rot.mulVec3(cam.eye), Vec3.ZERO, rot.mulVec3(cam.getUp()));
                cam.update();
            }
        } else {
            this.scaleRot = 0;
        }
    }

    protected onDraw() {
        let r = this.renderer!;
        let cam = this.planet!.camera;

        if (r.events.mouseState.leftButtonDown || !this.scaleRot || cam.isFlying()) return;

        this.scaleRot -= this.inertia;
        if (this.scaleRot <= 0) {
            this.scaleRot = 0;
        } else {
            this._vRot = Quat.axisAngleToQuat(cam._u, this._a);

            let rot = this._vRot.mul(this._hRot);

            let lim = rot.mulVec3(cam.eye).normal().dot(Vec3.NORTH);

            let state = this.positionState[this.currState];

            if (lim > state.max || lim < state.min) {
                rot = Quat.yRotation(rot.getYaw());
            }

            r.controlsBag.scaleRot = this.scaleRot;
            rot = rot
                .slerp(Quat.IDENTITY, 1 - this.scaleRot * this.scaleRot * this.scaleRot)
                .normalize();
            if (!(rot.x || rot.y || rot.z)) {
                this.scaleRot = 0;
            }

            cam.set(rot.mulVec3(cam.eye), Vec3.ZERO, Vec3.NORTH);
            cam.update();
        }
    }
}
