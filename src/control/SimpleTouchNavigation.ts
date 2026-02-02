import {Control} from "./Control";
import type {IControlParams} from "./Control";
import type {IMouseState, ITouchState} from "../renderer/RendererEvents";
import {Vec2} from "../math/Vec2";
import {Vec3} from "../math/Vec3";
import * as math from "../math";
import {Ray} from "../math/Ray";
import {Plane} from "../math/Plane";
import {getLinesIntersection2v} from "../utils/shared";

interface ISimpleTouchNavigationParams extends IControlParams {
}

/**
 * Simple keyboard camera navigation with W,S,A,D and shift keys to fly around the scene.
 */
export class SimpleTouchNavigation extends Control {

    protected _grabbedPoint: Vec3 | undefined;
    protected _grabbedScreenPoint: Vec2;
    protected _eye0: Vec3;

    protected _prev_t0: Vec2 = new Vec2();
    protected _prev_t1: Vec2 = new Vec2();

    constructor(options: ISimpleTouchNavigationParams = {}) {
        super({
            name: "SimpleTouchNavigation",
            autoActivate: true, ...options
        });

        this._grabbedPoint = undefined;
        this._grabbedScreenPoint = new Vec2();
        this._eye0 = new Vec3();
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
            } else {
                grabbedPoint = cam.eye.add(direction.scale(10));
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
            this._grabbedScreenPoint = gp.screenPoint;

        } else if (pointers.length === 2) {

            this._prev_t0 = new Vec2(
                (pointers[0].clientX - sys.offsetLeft) * handler.pixelRatio,
                (pointers[0].clientY - sys.offsetTop) * handler.pixelRatio
            );

            this._prev_t1 = new Vec2(
                (pointers[1].clientX - sys.offsetLeft) * handler.pixelRatio,
                (pointers[1].clientY - sys.offsetTop) * handler.pixelRatio
            );

            let gp1 = this._getPoi(this._prev_t0.x, this._prev_t0.y);
            let gp2 = this._getPoi(this._prev_t1.x, this._prev_t1.y);

            this._grabbedPoint = gp1.grabbedPoint.add(gp2.grabbedPoint).scale(0.5);
            this._grabbedScreenPoint = gp1.screenPoint.add(gp2.screenPoint).scale(0.5);

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

        if (!this.renderer || !this._grabbedPoint) return;

        let cam = this.renderer.activeCamera;
        let handler = this.renderer.handler;
        let sys = e.sys!;
        let pointers = sys.pointers;

        if (pointers.length === 1) {

            let t0 = new Vec2(
                (pointers[0].clientX - sys.offsetLeft) * handler.pixelRatio,
                (pointers[0].clientY - sys.offsetTop) * handler.pixelRatio
            );

            this._prev_t0.copy(t0);
            this._prev_t1.copy(t0);

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

            const handler = this.renderer.handler;

            let t0 = new Vec2();
            t0.x = (pointers[0].clientX - sys.offsetLeft) * handler.pixelRatio;
            t0.y = (pointers[0].clientY - sys.offsetTop) * handler.pixelRatio;

            let t1 = new Vec2();
            t1.x = (pointers[1].clientX - sys.offsetLeft) * handler.pixelRatio;
            t1.y = (pointers[1].clientY - sys.offsetTop) * handler.pixelRatio;

            const middle = t0.add(t1).scale(0.5);
            let nx = middle.x / handler.getWidth() - this._grabbedScreenPoint.x;
            let ny = middle.y / handler.getHeight() - this._grabbedScreenPoint.y;

            if (cam.isOrthographic) {
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

                let direction = cam.unproject(middle.x, middle.y);
                if (new Ray(cam.eye, direction).hitPlaneRes(Plane.fromPoints(p0, p1, p2), px) === Ray.INSIDE) {
                    cam.eye = cam.eye.add(p0.sub(px));
                }
            }

            // cam.update();
            //
            // let plane = new Plane(this._grabbedPoint, Vec3.UP);
            // let dir_t0 = cam.unproject2v(t0);
            // let dir_t1 = cam.unproject2v(t1);
            //
            // let px_t0 = new Vec3(),
            //     px_t1 = new Vec3();
            //
            // if (new Ray(cam.eye, dir_t0).hitPlaneRes(plane, px_t0) === Ray.INSIDE) {
            //
            // }
            //
            // if (new Ray(cam.eye, dir_t1).hitPlaneRes(plane, px_t1) === Ray.INSIDE) {
            //
            // }

            // const d0 = new Vec2(t0.x - this._prev_t0.x, t0.y - this._prev_t0.y);
            // const d1 = new Vec2(t1.x - this._prev_t1.x, t1.y - this._prev_t1.y);
            // const dot = d0.x * d1.x + d0.y * d1.y;
            // const len0 = Math.sqrt(d0.x * d0.x + d0.y * d0.y);
            // const len1 = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
            // const dead = 0.5; // px
            //
            // let c = getLinesIntersection2v(t0, t1, this._prev_t0, this._prev_t1, true);
            //
            // if (c) {
            //
            // }


            const vPrev = this._prev_t1.sub(this._prev_t0);
            const vCurr = t1.sub(t0);

            const dead = 0.5;
            const lenPrev = Math.hypot(vPrev.x, vPrev.y);
            const lenCurr = Math.hypot(vCurr.x, vCurr.y);

            let rotAngle = 0;

            if (lenPrev > dead && lenCurr > dead) {
                // signed angle via atan2(cross, dot)
                const dot = vPrev.x * vCurr.x + vPrev.y * vCurr.y;
                const cross = vPrev.x * vCurr.y - vPrev.y * vCurr.x;

                rotAngle = Math.atan2(cross, dot);

                cam.rotateHorizontal(-rotAngle, false, this._grabbedPoint, Vec3.UP);
            }

            // let isSameDir = false;
            // if (len0 > dead && len1 > dead) {
            //     if (dot >= 0) {
            //         isSameDir = true
            //     }
            // }

            //cam.rotateHorizontal(rotAngle * Math.PI / 180, false, this._grabbedPoint, Vec3.UP);

            this._prev_t0.copy(t0);
            this._prev_t1.copy(t1);
        }

        cam.update();
    }

    protected onDraw() {

    }
}