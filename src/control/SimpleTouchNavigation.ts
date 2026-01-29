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

function activePointersString(activePointers: any) {
    let text = "";
    activePointers.forEach((pointer, id) => {
        text += `ID ${id}: (${Math.round(pointer.clientX)}, ${Math.round(pointer.clientY)})\n`;
    });
    return text;
}

/**
 * Simple keyboard camera navigation with W,S,A,D and shift keys to fly around the scene.
 */
export class SimpleTouchNavigation extends Control {

    protected _grabbedPoint: Vec3 | undefined;
    protected _grabbedScreenPoint: Vec2;
    protected _eye0: Vec3;

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

    protected onTouchStart = (e: ITouchState) => {
        if (!this._active || !this.renderer) return;

        if (e.sys!.pointers.length === 1) {

            this._grabbedPoint = this.renderer.getCartesianFromPixel(e);
            this._grabbedScreenPoint.set(e.nx, e.ny);

            if (!this._grabbedPoint) {
                let cam = this.renderer.activeCamera;
                let p0 = new Vec3(),
                    p1 = new Vec3(1, 0, 0),
                    p2 = new Vec3(0, 0, 1);
                let px = new Vec3();
                if (new Ray(cam.eye, e.direction).hitPlaneRes(Plane.fromPoints(p0, p1, p2), px) === Ray.INSIDE) {
                    this._grabbedPoint = px;
                }
            }

            if (this._grabbedPoint) {
                this._eye0.copy(this.renderer.activeCamera.eye);
            }

        } else if (e.sys!.pointers.length === 2) {

        }
    }

    protected onTouchEnd = (e: ITouchState) => {
        console.log("onTouchEnd", activePointersString(e.sys!.activePointers));
    }

    protected onTouchCancel = (e: ITouchState) => {
        console.log("onTouchCancel", activePointersString(e.sys!.activePointers));
    }

    protected onTouchMove = (e: ITouchState) => {

        if (!this.renderer || !this._grabbedPoint) return;

        let cam = this.renderer.activeCamera;

        if (e.sys!.pointers.length === 1) {
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

    protected onDraw() {

    }
}