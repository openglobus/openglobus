import {Control} from "./Control";
import type {IControlParams} from "./Control";
import type {IMouseState, ITouchState} from "../renderer/RendererEvents";
import {Vec2} from "../math/Vec2";
import {Vec3} from "../math/Vec3";
import * as math from "../math";
import {Ray} from "../math/Ray";
import {Plane} from "../math/Plane";

interface ISimpleTouchNavigationParams extends IControlParams {
}

/**
 * Simple keyboard camera navigation with W,S,A,D and shift keys to fly around the scene.
 */
export class SimpleTouchNavigation extends Control {

    protected _grabbedPoint: Vec3 | undefined;
    protected _grabbedPoint0: Vec3 | undefined;
    protected _grabbedPoint1: Vec3 | undefined;
    protected _grabbedScreenPoint: Vec2;
    protected _eye0: Vec3;
    protected _dist0: number;
    protected _pinchDist0: number;
    protected _pinchAngle0: number;
    protected _pinchAnglePrev: number;

    constructor(options: ISimpleTouchNavigationParams = {}) {
        super({
            name: "SimpleTouchNavigation",
            autoActivate: true, ...options
        });

        this._grabbedPoint = undefined;
        this._grabbedPoint0 = undefined;
        this._grabbedPoint1 = undefined;
        this._grabbedScreenPoint = new Vec2();
        this._eye0 = new Vec3();
        this._dist0 = 0;
        this._pinchDist0 = 0;
        this._pinchAngle0 = 0;
        this._pinchAnglePrev = 0;
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

        r.events.on("touchstart", this.onTouchStart);
        r.events.on("touchend", this.onTouchEnd);
        r.events.on("touchcancel", this.onTouchCancel);
        r.events.on("touchmove", this.onTouchMove);

        r.events.on("draw", this.onDraw, this, -1000);
    }

    public override ondeactivate() {
        super.ondeactivate();
        let r = this.renderer!;

        r.events.off("touchstart", this.onTouchStart);
        r.events.off("touchend", this.onTouchEnd);
        r.events.off("touchcancel", this.onTouchCancel);
        r.events.off("touchmove", this.onTouchMove);

        r.events.off("draw", this.onDraw);
    }

    protected _getPoi(x: number, y: number) {
        let r = this.renderer!;
        let cam = r.activeCamera;
        const handler = r.handler;
        let grabbedPoint = r.getCartesianFromPixel(new Vec2(x, y));
        let direction = cam.unproject(x, y);
        if (!grabbedPoint) {
            let p0 = new Vec3(0, 0, 0),
                p1 = new Vec3(1, 0, 0),
                p2 = new Vec3(0, 0, 1);
            let px = new Vec3();
            if (new Ray(cam.eye, direction).hitPlaneRes(Plane.fromPoints(p0, p1, p2), px) === Ray.INSIDE) {
                grabbedPoint = px;
            }
        }
        return {
            grabbedPoint,
            screenPoint: new Vec2(x / handler.getWidth(), y / handler.getHeight()),
            direction,
        }
    }

    protected onTouchStart = (e: ITouchState) => {
        if (!this._active || !this.renderer) return;

        const handler = this.renderer.handler;

        let sys = e.sys!;
        let pointers = sys.pointers;

        if (pointers.length === 1) {
            let gp = this._getPoi(
                (pointers[0].clientX - sys.offsetLeft) * handler.pixelRatio,
                (pointers[0].clientY - sys.offsetTop) * handler.pixelRatio
            );

            this._grabbedPoint = gp.grabbedPoint;
            this._grabbedPoint0 = gp.grabbedPoint;
            this._grabbedPoint1 = undefined;
            this._grabbedScreenPoint = gp.screenPoint;

        } else if (pointers.length === 2) {

            const px0 = (pointers[0].clientX - sys.offsetLeft) * handler.pixelRatio;
            const py0 = (pointers[0].clientY - sys.offsetTop) * handler.pixelRatio;
            const px1 = (pointers[1].clientX - sys.offsetLeft) * handler.pixelRatio;
            const py1 = (pointers[1].clientY - sys.offsetTop) * handler.pixelRatio;
            const midX = (px0 + px1) * 0.5, midY = (py0 + py1) * 0.5;

            const gp0 = this._getPoi(px0, py0);
            const gp1 = this._getPoi(px1, py1);
            const gpMid = this._getPoi(midX, midY);

            this._grabbedPoint0 = gp0.grabbedPoint;
            this._grabbedPoint1 = gp1.grabbedPoint;
            this._grabbedPoint = gpMid.grabbedPoint || gp0.grabbedPoint || gp1.grabbedPoint;
            if (this._grabbedPoint) {
                this._grabbedScreenPoint.copy(gpMid.screenPoint);
                this._eye0.copy(this.renderer.activeCamera.eye);
                const cam = this.renderer.activeCamera;
                this._dist0 = cam.isOrthographic ? cam.focusDistance : this._eye0.distance(this._grabbedPoint);
                const dx = px1 - px0, dy = py1 - py0;
                this._pinchDist0 = Math.sqrt(dx * dx + dy * dy) || 1;
                this._pinchAngle0 = Math.atan2(dy, dx);
                this._pinchAnglePrev = this._pinchAngle0;
            }

        } else {
            this._grabbedPoint = undefined;
            return;
        }

        if (this._grabbedPoint) {
            this._eye0.copy(this.renderer.activeCamera.eye);
        }
    }

    protected onTouchEnd = (e: ITouchState) => {
        this.onTouchStart(e);
    }

    protected onTouchCancel = (e: ITouchState) => {
        //noop
    }

    protected onTouchMove = (e: ITouchState) => {

        if (!this.renderer || (!this._grabbedPoint && !this._grabbedPoint0 && !this._grabbedPoint1)) return;

        let cam = this.renderer.activeCamera;
        let handler = this.renderer.handler;
        let sys = e.sys!;
        let pointers = sys.pointers;

        if (pointers.length === 1) {

            let t0 = new Vec2(
                (pointers[0].clientX - sys.offsetLeft) * handler.pixelRatio,
                (pointers[0].clientY - sys.offsetTop) * handler.pixelRatio
            );
            if (!this._grabbedPoint) return;

            if (cam.isOrthographic) {
                let nx = t0.x / handler.getWidth() - this._grabbedScreenPoint.x;
                let ny = t0.y / handler.getHeight() - this._grabbedScreenPoint.y;
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

                let direction = cam.unproject(t0.x, t0.y);

                if (new Ray(cam.eye, direction).hitPlaneRes(Plane.fromPoints(p0, p1, p2), px) === Ray.INSIDE) {
                    cam.eye = cam.eye.add(p0.sub(px));
                }
            }

        } else if (pointers.length === 2) {

            const t0 = new Vec2(
                (pointers[0].clientX - sys.offsetLeft) * handler.pixelRatio,
                (pointers[0].clientY - sys.offsetTop) * handler.pixelRatio
            );
            const t1 = new Vec2(
                (pointers[1].clientX - sys.offsetLeft) * handler.pixelRatio,
                (pointers[1].clientY - sys.offsetTop) * handler.pixelRatio
            );

            const pinchDist = Math.sqrt((t1.x - t0.x) ** 2 + (t1.y - t0.y) ** 2) || 1;
            const pinchAngle = Math.atan2(t1.y - t0.y, t1.x - t0.x);
            const scale = pinchDist / this._pinchDist0;

            const pivot = this._grabbedPoint || this._grabbedPoint0 || this._grabbedPoint1;
            if (!pivot) {
                return;
            }

            if (cam.isOrthographic) {
                cam.focusDistance = this._dist0 / scale;
            } else {
                const dir = Vec3.sub(this._eye0, pivot);
                dir.normalize();
                dir.scale(this._dist0 / scale);
                cam.eye.copy(pivot).addA(dir);
            }
            cam.update();

            const deltaAngle = pinchAngle - this._pinchAnglePrev;
            const axis = cam.getForward().normalize();
            cam.rotateAround(deltaAngle, false, pivot, axis);
            cam.update();
            this._pinchAnglePrev = pinchAngle;

            let deltaSum = new Vec3();
            let deltaCount = 0;
            const camSlope = Math.abs(cam.getForward().dot(Vec3.UP));

            if (this._grabbedPoint0) {
                const p0 = this._grabbedPoint0;
                const p1 = camSlope > 0.7 ? Vec3.add(p0, Vec3.LEFT) : Vec3.add(p0, cam.getRight());
                const p2 = camSlope > 0.7 ? Vec3.add(p0, cam.getRight()) : Vec3.add(p0, Vec3.UP);
                const px = new Vec3();
                const direction = cam.unproject(t0.x, t0.y);
                if (new Ray(cam.eye, direction).hitPlaneRes(Plane.fromPoints(p0, p1, p2), px) === Ray.INSIDE) {
                    deltaSum.addA(p0.clone().subA(px));
                    deltaCount++;
                }
            }

            if (this._grabbedPoint1) {
                const p0 = this._grabbedPoint1;
                const p1 = camSlope > 0.7 ? Vec3.add(p0, Vec3.LEFT) : Vec3.add(p0, cam.getRight());
                const p2 = camSlope > 0.7 ? Vec3.add(p0, cam.getRight()) : Vec3.add(p0, Vec3.UP);
                const px = new Vec3();
                const direction = cam.unproject(t1.x, t1.y);
                if (new Ray(cam.eye, direction).hitPlaneRes(Plane.fromPoints(p0, p1, p2), px) === Ray.INSIDE) {
                    deltaSum.addA(p0.clone().subA(px));
                    deltaCount++;
                }
            }

            if (deltaCount) {
                deltaSum.scale(1 / deltaCount);
                cam.eye.addA(deltaSum);
            }
        }

        cam.update();
    }

    protected onDraw() {

    }
}