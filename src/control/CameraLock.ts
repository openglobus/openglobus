import {Control, IControlParams} from "./Control";
import {LonLat} from "../LonLat";
import {Quat} from "../math/Quat";
import {Vec3} from "../math/Vec3";
import {createEvents, Events, EventsHandler} from "../Events";
import {Entity} from "../entity/Entity";
import {IMouseState} from "../renderer/RendererEvents";
import {MouseNavigation} from "./MouseNavigation";
import {Plane} from "../math/Plane";
import {input} from "../input/input";
import {RADIANS} from "../math";

const MIN_LOCK_DISTANCE = 0.001;
const MIN_VIEW_DISTANCE = 120.0;

let qOrientationRot = new Quat();
const t: number = 0.08;

type CameraLockEventsList = ["lockview", "unlockview"];

const CameraLockEvents: CameraLockEventsList = ["lockview", "unlockview"];


interface ICameraLockParams extends IControlParams {
}

export class CameraLock extends Control {

    public events: EventsHandler<CameraLockEventsList>;

    protected _lockDistance: number;
    protected _isFromTheBack: boolean;
    protected _lockEntity: Entity | null;
    protected _viewDir: Vec3;

    constructor(options: ICameraLockParams = {}) {
        super(options);

        this.events = createEvents(CameraLockEvents);

        this._name = "CameraLock";

        this._lockDistance = 0;
        this._isFromTheBack = false;
        this._lockEntity = null;
        this._viewDir = new Vec3(0, 0, 0);
    }

    public override onactivate() {
        if (this.renderer) {
        }
    }

    public override ondeactivate() {
        if (this.renderer) {
            this.unlockView();
        }
    }

    public override oninit() {
        this.activate();
        if (this.renderer) {

        }
    }

    public flyCartesian(cartesian: Vec3, dist = MIN_VIEW_DISTANCE) {
        if (cartesian.isZero() || !this.renderer) {
            return;
        }
        this.unlockView();
        if (this.planet) {
            let cam = this.planet.camera;
            if (this.isVisibleDistance(cartesian)) {
                cam.flyDistance(cartesian, dist);
            }
            if (cam.eye.distance(cartesian) < 1000000.0) {
                cam.flyDistance(cartesian, dist);
            } else {
                cam.viewDistance(cartesian, dist);
            }
        } else {
            this.renderer.activeCamera.viewDistance(cartesian, dist);
        }
    }

    public lockView(entity: Entity, fromTheBack = false) {

        if (!this.renderer) return;

        this._lockDistance = this._getDistance(entity, this._lockEntity);

        this._isFromTheBack = fromTheBack;

        this._deactivateLockViewEvents();

        this._lockEntity = entity;
        let cam = this.renderer.activeCamera;
        if (this.planet) {
            this.planet.camera.stopFlying();
        }
        cam.viewDistance(entity.getCartesian(), this._lockDistance);

        this._deactivateNav();

        this._activateLockViewEvents();

        this._viewDir = entity.getCartesian().sub(cam.eye).normalize();

        this.events.dispatch(this.events.lockview, this._lockEntity, fromTheBack);
    }

    protected _activateNav() {
        if (this.renderer && this.renderer.controls.mouseNavigation) {
            this.renderer.controls.mouseNavigation.activate();
        }

        if (this.renderer && this.renderer.controls.simpleNavigation) {
            this.renderer.controls.simpleNavigation.activate();
        }
    }

    protected _deactivateNav() {
        if (this.renderer && this.renderer.controls.mouseNavigation) {
            this.renderer.controls.mouseNavigation.deactivate();
            (this.renderer.controls.mouseNavigation as MouseNavigation).stopRotation();
        }

        if (this.renderer && this.renderer.controls.simpleNavigation) {
            this.renderer.controls.simpleNavigation.deactivate();
        }
    }

    public unlockView() {
        if (this._lockEntity) {
            this._deactivateLockViewEvents();
            this._activateNav();
            this.events.dispatch(this.events.unlockview, this._lockEntity);
            this._lockEntity = null;
        }
    }

    private _getCenterDist(): number {
        if (this.renderer) {
            return this.renderer.getDistanceFromPixel(this.renderer.handler.getCenter()) || 0;
        }
        return 0;
    }

    protected _getDistance(entity: Entity, prevEntity?: Entity | null): number {
        if (this.renderer) {

            let cartesian = entity.getCartesian();
            let cam = this.renderer.activeCamera;

            let dist = cam.eye.distance(cartesian);
            if (prevEntity) {
                dist = cam.eye.distance(prevEntity.getCartesian());
            }

            if (this.isVisibleDistance(cartesian)) {
                return dist;
            }
            if (cam.eye.distance(cartesian) < 1000000.0) {
                return this._getCenterDist();
            } else {
                return MIN_VIEW_DISTANCE;
            }
        }
        return 0;
    }

    public isVisibleDistance(cart: Vec3, C: number = 0.0): boolean {
        if (this.planet) {
            let R = this.planet.ellipsoid.equatorialSize;
            let eye = this.planet.camera.eye;
            let camDist = eye.distance(cart);
            return camDist < Math.sqrt(eye.length2() - R * R) + C;
        }
        return true;
    }

    public get lockEntity() {
        return this._lockEntity;
    }

    public flyLonLat(lonLat: LonLat, dist = MIN_VIEW_DISTANCE) {
        if (this.planet) {
            let cartesian = this.planet.ellipsoid.lonLatToCartesian(lonLat);
            this.flyCartesian(cartesian, dist);
        }
    }

    protected _activateLockViewEvents() {
        if (this.renderer) {
            this.renderer.events.on("mousewheel", this._onMouseWheel);
            this.renderer.events.on("mousemove", this._onMouseMove);
            this.renderer.events.on("draw", this._onLockViewDraw);
        }
    }

    protected _deactivateLockViewEvents() {
        if (this.renderer) {
            this.renderer.events.off("mousewheel", this._onMouseWheel);
            this.renderer.events.off("mousemove", this._onMouseMove);
            if (this._lockEntity) {
                this.renderer.events.off("draw", this._onLockViewDraw);
            }
        }
    }

    private _onLockViewDraw = () => {
        if (this.renderer && this._lockEntity) {
            if (this._isFromTheBack) {
                // let cam = this.planet.camera;
                // let vehPos = this._lockEntity.getCartesian(),
                //     vehDir = this._lockEntity.direction;
                // let currPos = vehPos.sub(this._viewDir.scaleTo(this._lockDistance));
                // let dh = new Vec3();
                // let currPosProj = new Plane(vehPos, vehPos.normal()).getProjectionPoint(currPos, dh);
                // let projViewDir = vehPos.sub(currPosProj);
                // Quat.getRotationBetweenVectorsRes(projViewDir.normal(), vehDir, qOrientationRot);
                // let rot = qOrientationRot.slerp(Quat.IDENTITY, 1.0 - t).normalize();
                // let projViewDir_t = rot.mulVec3(projViewDir.normal());
                // projViewDir = projViewDir_t.scale(projViewDir.length());
                // let newPos = vehPos.add(dh).sub(projViewDir);
                // this._viewDir = vehPos.sub(newPos).normalize();
                // cam.set(newPos, vehPos, vehPos.normal());
                // cam.update();
            } else {
                this.renderer.activeCamera.viewDistance(this._lockEntity.getCartesian(), this._lockDistance);
            }
        }
    }

    protected _onMouseWheel = (e: IMouseState) => {
        if (this.renderer && this._lockEntity) {
            if (this._isFromTheBack) {
                //...
            } else {
                let d = this.renderer.activeCamera.eye.distance(this._lockEntity.getCartesian());
                this._lockDistance -= 0.33 * d * Math.sign(e.wheelDelta);
                if (this._lockDistance < MIN_LOCK_DISTANCE) {
                    this._lockDistance = MIN_LOCK_DISTANCE;
                }
                this.renderer.activeCamera.viewDistance(this._lockEntity.getCartesian(), this._lockDistance);
            }
        }
    }

    protected _onMouseMove = (ms: IMouseState) => {
        if (this._lockEntity && this.renderer) {
            if (ms.rightButtonDown || this.renderer.events.isKeyPressed(input.KEY_ALT)) {

                let p = this._lockEntity.getCartesian(),
                    cam = this.renderer.activeCamera,
                    l = 0.5 / RADIANS;

                if (l > 0.007) l = 0.007;

                if (this.planet) {
                    cam.rotateHorizontal(l * (ms.x - ms.prev_x), false, p, p.isZero() ? Vec3.UP : p.normal());
                } else {
                    cam.rotateHorizontal(l * (ms.x - ms.prev_x), false, p, Vec3.UP);
                }
                cam.rotateVertical(l * (ms.y - ms.prev_y), p);

                this._viewDir = p.sub(cam.eye).normalize();
            }
        }
    }

}
