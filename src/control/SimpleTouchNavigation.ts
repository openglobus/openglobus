import { Control, type IControlParams } from '../control/Control';
import type { ITouchState } from '../renderer/RendererEvents';
import { Vec2 } from '../math/Vec2';
import { Vec3 } from '../math/Vec3';
import { Ray } from '../math/Ray';
import { Plane } from '../math/Plane';
import * as math from '../math';

const PLANE_Y = Plane.fromPoints(
    new Vec3(0, 0, 0),
    new Vec3(1, 0, 0),
    new Vec3(0, 0, 1),
);

export class SimpleTouchNavigation extends Control {
    protected _grabbedPoint: Vec3 | undefined;
    protected _grabbedScreenPoint: Vec2;
    protected _eye0: Vec3;

    protected _prev_t0: Vec2 = new Vec2();
    protected _prev_t1: Vec2 = new Vec2();

    protected _dead: number = 0.5;

    protected _orthoMinFocusDistance: number = 1e-6;
    protected _twoFingerTiltMinMove: number = 2.0;
    protected _twoFingerTiltAlignDot: number = 0.85;
    protected _twoFingerTiltVerticalRatio: number = 0.7;
    protected _twoFingerTiltHorizontalLineRatio: number = 0.35;
    protected _twoFingerTiltStrength: number = 0.75;
    protected _twoFingerTiltActive: boolean = false;

    constructor(options: IControlParams = {}) {
        super({
            name: 'SimpleTouchNavigation',
            autoActivate: true,
            ...options,
        });

        this._grabbedPoint = undefined;
        this._grabbedScreenPoint = new Vec2();
        this._eye0 = new Vec3();
    }

    override oninit() {}

    public override onactivate() {
        super.onactivate();

        let r = this.renderer!;

        if (r.activeCamera.isOrthographic) {
            r.getDepthMinDistanceAsync().then((dist) => {
                r.activeCamera.focusDistance = dist;
            });
        }

        r.events.on('touchstart', this.onTouchStart);
        r.events.on('touchend', this.onTouchEnd);
        //r.events.on('touchcancel', this.onTouchCancel);
        r.events.on('touchmove', this.onTouchMove);

        r.events.on('draw', this.onDraw, this, -1000);
    }

    public override ondeactivate() {
        super.ondeactivate();
        let r = this.renderer!;

        r.events.off('touchstart', this.onTouchStart);
        r.events.off('touchend', this.onTouchEnd);
        //r.events.off('touchcancel', this.onTouchCancel);
        r.events.off('touchmove', this.onTouchMove);

        r.events.off('draw', this.onDraw);
    }

    protected onTouchEnd = (e: ITouchState) => {
        this.onTouchStart(e);
    };

    // protected onTouchCancel = (e: ITouchState) => {
    //   //noop
    // };

    protected _pointerToScreenPoint(
        pointer: PointerEvent,
        sys: NonNullable<ITouchState['sys']>,
    ): Vec2 {
        const handler = this.renderer!.handler;
        return new Vec2(
            (pointer.clientX - sys.offsetLeft) * handler.pixelRatio,
            (pointer.clientY - sys.offsetTop) * handler.pixelRatio,
        );
    }

    protected _getGrabbedPoint(screenPoint: Vec2): Vec3 {
        const renderer = this.renderer!;
        const cam = renderer.activeCamera;

        let grabbedPoint = renderer.getCartesianFromPixel(screenPoint);
        if (!grabbedPoint) {
            const direction = cam.unproject(screenPoint.x, screenPoint.y, cam.eye.y);
            const px = new Vec3();
            if (new Ray(cam.eye, direction).hitPlaneRes(PLANE_Y, px) === Ray.INSIDE) {
                grabbedPoint = px;
            } else {
                grabbedPoint = cam.eye.add(direction.scale(10));
            }
        }

        return grabbedPoint;
    }

    protected _updateGrabbedScreenPoint(screenPoint: Vec2) {
        const handler = this.renderer!.handler;
        this._grabbedScreenPoint.set(
            screenPoint.x / handler.getWidth(),
            screenPoint.y / handler.getHeight(),
        );
    }

    protected _startSingleFingerGesture(
        pointer: PointerEvent,
        sys: NonNullable<ITouchState['sys']>,
    ) {
        const t0 = this._pointerToScreenPoint(pointer, sys);
        this._grabbedPoint = this._getGrabbedPoint(t0);
        this._updateGrabbedScreenPoint(t0);
    }

    protected _startTwoFingerGesture(
        pointer0: PointerEvent,
        pointer1: PointerEvent,
        sys: NonNullable<ITouchState['sys']>,
        skipPointGrabbing: boolean,
    ) {
        const t0 = this._pointerToScreenPoint(pointer0, sys);
        const t1 = this._pointerToScreenPoint(pointer1, sys);

        this._prev_t0.copy(t0);
        this._prev_t1.copy(t1);

        const middle_t = t0.add(t1).scale(0.5);
        this._updateGrabbedScreenPoint(middle_t);

        if (!skipPointGrabbing) {
            this._grabbedPoint = this._getGrabbedPoint(middle_t);
        }

        this._twoFingerTiltActive = false;
    }

    protected _getPerspectiveDragPlane(anchor: Vec3): Plane {
        const cam = this.renderer!.activeCamera;
        const camSlope = Math.abs(cam.getForward().dot(Vec3.UP));
        if (camSlope > 0.7) {
            return Plane.fromPoints(anchor, Vec3.add(anchor, Vec3.LEFT), Vec3.add(anchor, cam.getRight()));
        }

        return Plane.fromPoints(anchor, Vec3.add(anchor, cam.getRight()), Vec3.add(anchor, Vec3.UP));
    }

    protected _applyOrthographicDrag(screenPoint: Vec2) {
        const cam = this.renderer!.activeCamera;
        const handler = this.renderer!.handler;

        const nx = screenPoint.x / handler.getWidth() - this._grabbedScreenPoint.x;
        const ny = screenPoint.y / handler.getHeight() - this._grabbedScreenPoint.y;
        const f = cam.frustum;
        const dx = -(f.right - f.left) * nx;
        const dy = (f.top - f.bottom) * ny;
        const cam_sy = cam.getUp().scale(dy);
        const cam_sx = cam.getRight().scale(dx);
        cam.eye = this._eye0.add(cam_sx.add(cam_sy));
    }

    protected _applyPerspectiveDrag(screenPoint: Vec2, anchor: Vec3) {
        const cam = this.renderer!.activeCamera;
        const px = new Vec3();
        const direction = cam.unproject(screenPoint.x, screenPoint.y);
        if (
            new Ray(cam.eye, direction).hitPlaneRes(
                this._getPerspectiveDragPlane(anchor),
                px,
            ) === Ray.INSIDE
        ) {
            cam.eye = cam.eye.add(anchor.sub(px));
        }
    }

    protected _applyDragGesture(screenPoint: Vec2) {
        const cam = this.renderer!.activeCamera;
        if (cam.isOrthographic) {
            this._applyOrthographicDrag(screenPoint);
        } else {
            this._applyPerspectiveDrag(screenPoint, this._grabbedPoint!);
        }
    }

    protected _moveSingleFingerGesture(
        pointer: PointerEvent,
        sys: NonNullable<ITouchState['sys']>,
    ) {
        const t0 = this._pointerToScreenPoint(pointer, sys);
        this._prev_t0.copy(t0);
        this._prev_t1.copy(t0);

        this._applyDragGesture(t0);
    }

    protected _applyTwoFingerZoom(vPrev: Vec2, vCurr: Vec2, middle: Vec2) {
        const cam = this.renderer!.activeCamera;
        const lenPrev = Math.hypot(vPrev.x, vPrev.y);
        const lenCurr = Math.hypot(vCurr.x, vCurr.y);
        if (lenPrev <= this._dead || lenCurr <= this._dead) {
            return;
        }

        let scale = lenPrev / lenCurr;
        if (scale < 0.25) scale = 0.25;
        if (scale > 4.0) scale = 4.0;

        const anchor = this._grabbedPoint!;

        if (cam.isOrthographic) {
            const fBefore = cam.frustum;
            const widthBefore = fBefore.right - fBefore.left;
            const heightBefore = fBefore.top - fBefore.bottom;
            const dxBefore = -widthBefore * (0.5 - this._grabbedScreenPoint.x);
            const dyBefore = heightBefore * (0.5 - this._grabbedScreenPoint.y);
            const worldBefore = cam.eye
                .add(cam.getRight().scale(dxBefore))
                .add(cam.getUp().scale(dyBefore));

            cam.focusDistance = Math.max(
                this._orthoMinFocusDistance,
                cam.focusDistance * scale,
            );
            cam.update();

            const fAfter = cam.frustum;
            const widthAfter = fAfter.right - fAfter.left;
            const heightAfter = fAfter.top - fAfter.bottom;
            const dxAfter = -widthAfter * (0.5 - this._grabbedScreenPoint.x);
            const dyAfter = heightAfter * (0.5 - this._grabbedScreenPoint.y);
            const worldAfter = cam.eye
                .add(cam.getRight().scale(dxAfter))
                .add(cam.getUp().scale(dyAfter));

            cam.eye = cam.eye.add(worldBefore.sub(worldAfter));
            this._eye0.copy(cam.eye);
        } else {
            cam.eye = anchor.add(cam.eye.sub(anchor).scale(scale));
            this._applyPerspectiveDrag(middle, anchor);
        }
    }

    protected _applyTwoFingerRotation(vPrev: Vec2, vCurr: Vec2) {
        const cam = this.renderer!.activeCamera;
        const dot = vPrev.x * vCurr.x + vPrev.y * vCurr.y;
        const cross = vPrev.x * vCurr.y - vPrev.y * vCurr.x;
        const rotAngle = Math.atan2(cross, dot);
        cam.rotateHorizontal(-rotAngle, false, this._grabbedPoint!, Vec3.UP);
    }

    protected _isTwoFingerTiltGesture(d0: Vec2, d1: Vec2, touchLine: Vec2): boolean {
        const len0 = Math.hypot(d0.x, d0.y);
        const len1 = Math.hypot(d1.x, d1.y);
        if (len0 < this._twoFingerTiltMinMove || len1 < this._twoFingerTiltMinMove) {
            return false;
        }

        // Tilt is allowed only if fingers are roughly on the same horizontal line.
        const lineDx = Math.abs(touchLine.x);
        const lineDy = Math.abs(touchLine.y);
        const horizontalLine =
            lineDx > this._twoFingerTiltMinMove && lineDy <= lineDx * this._twoFingerTiltHorizontalLineRatio;
        if (!horizontalLine) {
            return false;
        }

        const dir0 = new Vec2(d0.x / len0, d0.y / len0);
        const dir1 = new Vec2(d1.x / len1, d1.y / len1);
        const sameDirection = dir0.dot(dir1) > this._twoFingerTiltAlignDot;
        const mostlyVertical =
            Math.abs(dir0.y) > this._twoFingerTiltVerticalRatio &&
            Math.abs(dir1.y) > this._twoFingerTiltVerticalRatio;

        return sameDirection && mostlyVertical;
    }

    protected _applyTwoFingerTilt(d0: Vec2, d1: Vec2, touchLine: Vec2): boolean {
        const cam = this.renderer!.activeCamera;
        if (cam.isOrthographic || !this._grabbedPoint) {
            return false;
        }

        // Gesture recognition: two fingers move in one vertical direction.
        if (!this._isTwoFingerTiltGesture(d0, d1, touchLine)) {
            return false;
        }

        // Gesture movement: vertical two-finger swipe changes camera tilt.
        const averageDy = (d0.y + d1.y) * 0.5;
        const distance = Math.max(this._grabbedPoint.distance(cam.eye), this._orthoMinFocusDistance);
        let sensitivity = (0.5 / distance) * math.RADIANS;
        if (sensitivity > 0.007) {
            sensitivity = 0.007;
        } else if (sensitivity < 0.003) {
            sensitivity = 0.003;
        }

        cam.rotateVertical(sensitivity * averageDy * this._twoFingerTiltStrength, this._grabbedPoint);
        return true;
    }

    protected _isTwoFingerTiltHoldGesture(d0: Vec2, d1: Vec2, touchLine: Vec2): boolean {
        const holdMove = this._twoFingerTiltMinMove * 0.5;
        const holdAlignDot = this._twoFingerTiltAlignDot - 0.2;
        const holdVerticalRatio = this._twoFingerTiltVerticalRatio - 0.15;
        const holdHorizontalRatio = this._twoFingerTiltHorizontalLineRatio * 1.6;

        const len0 = Math.hypot(d0.x, d0.y);
        const len1 = Math.hypot(d1.x, d1.y);
        if (len0 < holdMove || len1 < holdMove) {
            return false;
        }

        const lineDx = Math.abs(touchLine.x);
        const lineDy = Math.abs(touchLine.y);
        if (!(lineDx > holdMove && lineDy <= lineDx * holdHorizontalRatio)) {
            return false;
        }

        const dir0 = new Vec2(d0.x / len0, d0.y / len0);
        const dir1 = new Vec2(d1.x / len1, d1.y / len1);

        return (
            dir0.dot(dir1) > holdAlignDot &&
            Math.abs(dir0.y) > holdVerticalRatio &&
            Math.abs(dir1.y) > holdVerticalRatio
        );
    }

    protected _moveTwoFingerGesture(
        e: ITouchState,
        pointer0: PointerEvent,
        pointer1: PointerEvent,
        sys: NonNullable<ITouchState['sys']>,
    ) {
        const cam = this.renderer!.activeCamera;
        const t0 = this._pointerToScreenPoint(pointer0, sys);
        const t1 = this._pointerToScreenPoint(pointer1, sys);
        const middle = t0.add(t1).scale(0.5);
        const d0 = t0.sub(this._prev_t0);
        const d1 = t1.sub(this._prev_t1);
        const vPrev = this._prev_t1.sub(this._prev_t0);
        const vCurr = t1.sub(t0);

        // Keep tilt mode stable to prevent jitter between tilt and drag/zoom.
        if (this._twoFingerTiltActive) {
            if (this._isTwoFingerTiltHoldGesture(d0, d1, vCurr)) {
                this._applyTwoFingerTilt(d0, d1, vCurr);
            } else {
                // Re-anchor two-finger gesture before leaving tilt mode.
                this._startTwoFingerGesture(pointer0, pointer1, sys, false);
            }
            this._prev_t0.copy(t0);
            this._prev_t1.copy(t1);
            return;
        }

        // Gesture recognition: if both fingers move vertically in one direction, use tilt.
        if (this._applyTwoFingerTilt(d0, d1, vCurr)) {
            this._twoFingerTiltActive = true;
            this._prev_t0.copy(t0);
            this._prev_t1.copy(t1);
            return;
        }

        this._applyTwoFingerZoom(vPrev, vCurr, middle);
        this._applyDragGesture(middle);
        this._applyTwoFingerRotation(vPrev, vCurr);

        if (cam.isOrthographic) {
            this.onTouchStart(e, true);
        }

        this._prev_t0.copy(t0);
        this._prev_t1.copy(t1);
    }

    protected onTouchStart = (e: ITouchState, skipPointGrabbing?: boolean) => {
        if (!this._active || !this.renderer) return;

        const sys = e.sys!;
        const pointers = sys.pointers;

        if (pointers.length === 1) {
            this._twoFingerTiltActive = false;
            this._startSingleFingerGesture(pointers[0], sys);
        } else if (pointers.length === 2) {
            this._startTwoFingerGesture(
                pointers[0],
                pointers[1],
                sys,
                !!skipPointGrabbing,
            );
        } else {
            this._twoFingerTiltActive = false;
            this._grabbedPoint = undefined;
            return;
        }

        if (this._grabbedPoint) {
            this._eye0.copy(this.renderer.activeCamera.eye);
        }
    };

    protected onTouchMove = (e: ITouchState) => {
        if (!this.renderer || !this._grabbedPoint) return;

        const sys = e.sys!;
        const pointers = sys.pointers;

        if (pointers.length === 1) {
            this._twoFingerTiltActive = false;
            this._moveSingleFingerGesture(pointers[0], sys);
        } else if (pointers.length === 2) {
            this._moveTwoFingerGesture(
                e,
                pointers[0],
                pointers[1],
                sys,
            );
        } else {
            this._twoFingerTiltActive = false;
        }

        this.renderer.activeCamera.update();
    };

    protected onDraw() {}
}
