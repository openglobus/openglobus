import * as math from "../math";
import {Control, IControlParams} from "./Control";
import {input} from "../input/input";
import {Key} from "../Lock";
import {LonLat} from "../LonLat";
import {Mat4} from "../math/Mat4";
import {Quat} from "../math/Quat";
import {Ray} from "../math/Ray";
import {Sphere} from "../bv/Sphere";
import {Vec3} from "../math/Vec3";
import {Vec2} from "../math/Vec2";
import {Planet} from "../scene/Planet";
import {PlanetCamera} from "../camera/PlanetCamera";

interface IMouseNavigationParams extends IControlParams {
    minSlope?: number;
}

/**
 * Mouse planet camera dragging control.
 */
export class MouseNavigation extends Control {
    protected grabbedPoint: Vec3;
    protected _eye0: Vec3;
    protected pointOnEarth: Vec3;
    protected earthUp: Vec3;
    public inertia: number;
    protected grabbedSpheroid: Sphere;
    protected qRot: Quat;
    protected scaleRot: number;
    protected distDiff: number;
    protected stepsCount: number;
    protected stepsForward: any;
    protected stepIndex: number;
    protected _lmbDoubleClickActive: boolean;
    public minSlope: any;
    protected _wheelDirection: number;
    protected _keyLock: Key;
    protected _deactivate = false;
    protected _shiftBusy = false;

    constructor(options: IMouseNavigationParams = {}) {
        super(options);

        this._name = "mouseNavigation";

        this.grabbedPoint = new Vec3();
        this._eye0 = new Vec3();
        this.pointOnEarth = new Vec3();
        this.earthUp = new Vec3();
        this.inertia = 0.007;
        this.grabbedSpheroid = new Sphere();
        this.planet = null;
        this.qRot = new Quat();
        this.scaleRot = 0.0;

        this.distDiff = 0.3;
        this.stepsCount = 8;
        this.stepsForward = null;
        this.stepIndex = 0;

        this._lmbDoubleClickActive = true;

        this.minSlope = options.minSlope || 0.1;

        this._wheelDirection = +1;

        this._keyLock = new Key();
    }

    static getMovePointsFromPixelTerrain(cam: PlanetCamera, planet: Planet, stepsCount: number, delta: number, point: Vec2, forward: boolean, dir: Vec3): any[] | undefined {
        const steps: any = [];

        let eye = cam.eye.clone(),
            n = cam._b.clone(),
            u = cam._r.clone(),
            v = cam._u.clone();

        let a = planet.getCartesianFromPixelTerrain(point);

        if (!a) {
            a = planet.getCartesianFromPixelTerrain(planet.renderer!.handler.getCenter());
        }

        if (a) {
            if (!dir) {
                dir = Vec3.sub(a, cam.eye).normalize();
            }

            let d = (delta * cam.eye.distance(a)) / stepsCount;

            if (forward) {
                d = -1.25 * d;
            } else {
                d *= 2;
            }

            const scaled_n = n.scaleTo(d);

            const slope = dir.dot(cam.eye.normal().negate());

            if (slope >= 0.1) {
                const grabbedSpheroid = new Sphere();
                grabbedSpheroid.radius = a.length();

                let rotArr = [],
                    eyeArr = [];

                let breaked = false;
                for (let i = 0; i < stepsCount; i++) {
                    eye.addA(scaled_n);
                    const b = new Ray(eye, dir).hitSphere(grabbedSpheroid);
                    eyeArr[i] = eye.clone();
                    if (b) {
                        rotArr[i] = new Mat4().rotateBetweenVectors(a.normal(), b.normal());
                    } else {
                        breaked = true;
                        break;
                    }
                }

                if (!breaked) {
                    for (let i = 0; i < stepsCount; i++) {
                        var rot = rotArr[i];
                        steps[i] = {};
                        steps[i].eye = rot.mulVec3(eyeArr[i]);
                        steps[i].v = rot.mulVec3(v);
                        steps[i].u = rot.mulVec3(u);
                        steps[i].n = rot.mulVec3(n);
                    }
                } else {
                    eye = cam.eye.clone();
                    for (let i = 0; i < stepsCount; i++) {
                        steps[i] = {};
                        steps[i].eye = eye.addA(scaled_n).clone();
                        steps[i].v = v;
                        steps[i].u = u;
                        steps[i].n = n;
                    }
                }
            } else {
                for (let i = 0; i < stepsCount; i++) {
                    steps[i] = {};
                    steps[i].eye = eye.addA(dir.scaleTo(-d)).clone();
                    steps[i].v = v;
                    steps[i].u = u;
                    steps[i].n = n;
                }
            }

            return steps;
        }
    }

    public override onactivate() {
        if (this.renderer) {
            this.renderer.events.on("mousewheel", this.onMouseWheel, this);
            this.renderer.events.on("lhold", this.onMouseLeftButtonDown, this);
            this.renderer.events.on("rhold", this.onMouseRightButtonDown, this);
            this.renderer.events.on("ldown", this.onMouseLeftButtonClick, this);
            this.renderer.events.on("lup", this.onMouseLeftButtonUp, this);
            this.renderer.events.on("rdown", this.onMouseRightButtonClick, this);
            this.renderer.events.on("draw", this.onDraw, this, -1000);
            this.renderer.events.on("mousemove", this.onMouseMove, this);
            this.renderer.events.on("mouseleave", this.onMouseLeave, this);
            this.renderer.events.on("mouseenter", this.onMouseEnter, this);

            if (this._lmbDoubleClickActive) {
                this.renderer.events.on("ldblclick", this.onMouseLeftButtonDoubleClick, this);
            }
        }
    }

    public override ondeactivate() {
        if (this.renderer) {
            this.renderer.events.off("mousewheel", this.onMouseWheel);
            this.renderer.events.off("lhold", this.onMouseLeftButtonDown);
            this.renderer.events.off("rhold", this.onMouseRightButtonDown);
            this.renderer.events.off("ldown", this.onMouseLeftButtonClick);
            this.renderer.events.off("lup", this.onMouseLeftButtonUp);
            this.renderer.events.off("rdown", this.onMouseRightButtonClick);
            this.renderer.events.off("draw", this.onDraw);
            this.renderer.events.off("ldblclick", this.onMouseLeftButtonDoubleClick);
            this.renderer.events.off("mouseleave", this.onMouseLeave);
            this.renderer.events.off("mouseenter", this.onMouseEnter);
        }
    }

    public activateDoubleClickZoom() {
        if (!this._lmbDoubleClickActive) {
            this._lmbDoubleClickActive = true;
            this.renderer && this.renderer.events.on("ldblclick", this.onMouseLeftButtonDoubleClick, this);
        }
    }

    public deactivateDoubleClickZoom() {
        if (this._lmbDoubleClickActive) {
            this._lmbDoubleClickActive = false;
            this.renderer && this.renderer.events.off("ldblclick", this.onMouseLeftButtonDoubleClick);
        }
    }

    protected onMouseEnter(e: any) {
        const renderEvents = this.renderer!.events;
        if (renderEvents.isKeyPressed(input.KEY_ALT)) {
            renderEvents.releaseKeys();
        }

        renderEvents.updateButtonsStates(e.buttons);
        if (renderEvents.mouseState.leftButtonDown) {
            this.renderer!.handler.canvas!.classList.add("ogGrabbingPoiner");
        } else {
            this.renderer!.handler.canvas!.classList.remove("ogGrabbingPoiner");
        }
    }

    protected onMouseLeave(e: any) {
        if (this.renderer!.events.mouseState.leftButtonDown) {
            this.scaleRot = 0;
        }
        this.renderer!.handler.canvas!.classList.remove("ogGrabbingPoiner");
    }

    protected onMouseWheel(event: any) {
        if (this.stepIndex) {
            return;
        }

        this.planet!.stopFlying();

        this.stopRotation();

        this._deactivate = true;

        this.planet!.layerLock.lock(this._keyLock);
        //this.planet!.terrainLock.lock(this._keyLock);
        this.planet!._normalMapCreator.lock(this._keyLock);

        var ms = this.renderer!.events.mouseState;
        this.stepsForward = MouseNavigation.getMovePointsFromPixelTerrain(
            this.planet!.camera,
            this.planet!,
            this.stepsCount,
            this.distDiff,
            ms,
            event.wheelDelta > 0,
            ms.direction
        );

        this._wheelDirection = event.wheelDelta;

        if (this.stepsForward) {
            this.stepIndex = this.stepsCount;
        }
    }

    override oninit() {
        this.activate();
        if (this.renderer) {
            this.renderer.events.on("keyfree", input.KEY_ALT, this.onShiftFree, this);
            this.renderer.events.on("keyfree", input.KEY_PRINTSCREEN, this.onShiftFree, this);
        }
    }

    protected onMouseLeftButtonDoubleClick() {
        this.planet!.stopFlying();
        this.stopRotation();
        const p = this.planet!.getCartesianFromPixelTerrain(this.renderer!.events.mouseState);
        if (p) {
            const cam = this.planet!.camera;
            let maxAlt = cam.maxAltitude + (this.planet!.ellipsoid as any)._b;
            let minAlt = cam.minAltitude + (this.planet!.ellipsoid as any)._b;
            const camAlt = cam.eye.length();
            const g = this.planet!.ellipsoid.cartesianToLonLat(p);
            if (camAlt > maxAlt || camAlt < minAlt) {
                this.planet!.flyLonLat(new LonLat(g.lon, g.lat))
                return;
            }

            if (this.renderer!.events.isKeyPressed(input.KEY_ALT)) {
                this.planet!.flyLonLat(
                    new LonLat(g.lon, g.lat, cam.eye.distance(p) * 2.0)
                );
            } else {
                this.planet!.flyLonLat(
                    new LonLat(g.lon, g.lat, cam.eye.distance(p) * 0.57)
                );
            }
        }
    }

    protected onMouseLeftButtonClick() {
        if (this._active) {
            this.renderer!.handler.canvas!.classList.add("ogGrabbingPoiner");
            this.grabbedPoint = this.planet!.getCartesianFromMouseTerrain()!;
            if (this.grabbedPoint) {
                this._eye0.copy(this.planet!.camera.eye);
                this.grabbedSpheroid.radius = this.grabbedPoint.length();
                this.stopRotation();
            }
        }
    }

    public stopRotation() {
        this.qRot.clear();
        this.planet!.layerLock.free(this._keyLock);
        this.planet!.terrainLock.free(this._keyLock);
        this.planet!._normalMapCreator.free(this._keyLock);
    }

    protected onMouseLeftButtonUp(e: any) {
        this.renderer!.handler.canvas!.classList.remove("ogGrabbingPoiner");
        if (e.x === e.prev_x && e.y === e.prev_y) {
            this.scaleRot = 0.0;
        }
    }

    protected onMouseLeftButtonDown(e: any) {
        if (this._active) {
            if (!this.grabbedPoint) {
                return;
            }

            this.planet!.stopFlying();

            if (this.renderer!.events.mouseState.moving) {
                let cam = this.planet!.camera;

                if (cam.slope > 0.2) {
                    const targetPoint = new Ray(cam.eye, e.direction).hitSphere(this.grabbedSpheroid);
                    if (targetPoint) {
                        this.scaleRot = 1.0;
                        this.qRot = Quat.getRotationBetweenVectors(
                            targetPoint.normal(),
                            this.grabbedPoint.normal()
                        );
                        let rot = this.qRot;
                        cam.eye = rot.mulVec3(cam.eye);
                        cam._u = rot.mulVec3(cam._u);
                        cam._r = rot.mulVec3(cam._r);
                        cam._b = rot.mulVec3(cam._b);
                    }
                } else {
                    let p0 = this.grabbedPoint,
                        p1 = Vec3.add(p0, cam._r),
                        p2 = Vec3.add(p0, p0.normal());

                    let px = new Vec3();
                    if (new Ray(cam.eye, e.direction).hitPlane(p0, p1, p2, px) === Ray.INSIDE) {
                        cam.eye = this._eye0.addA(px.subA(p0).negate());
                    }
                }
            }
        }
    }

    protected onMouseRightButtonClick(e: any) {
        this.stopRotation();
        this.planet!.stopFlying();
        this.pointOnEarth = this.planet!.getCartesianFromPixelTerrain(e)!;
        if (this.pointOnEarth) {
            this.earthUp = this.pointOnEarth.normal();
        }
    }

    protected onMouseRightButtonDown(e: any) {
        const cam = this.planet!.camera;

        if (this.pointOnEarth && this.renderer!.events.mouseState.moving) {
            this.renderer!.controlsBag.scaleRot = 1.0;
            let l = (0.5 / cam.eye.distance(this.pointOnEarth)) * (cam._lonLat.height < 5.0 ? 5.0 : cam._lonLat.height) * math.RADIANS;
            if (l > 0.007) {
                l = 0.007;
            }
            cam.rotateHorizontal(l * (e.x - e.prev_x), false, this.pointOnEarth, this.earthUp);
            cam.rotateVertical(l * (e.y - e.prev_y), this.pointOnEarth, this.minSlope);
        }
    }

    public onShiftFree() {
        this._shiftBusy = false;
    }

    protected onMouseMove(e: any) {
        if (this._active && this.renderer!.events.isKeyPressed(input.KEY_ALT)) {
            if (!this._shiftBusy) {
                this._shiftBusy = true;
                this.onMouseRightButtonClick(e);
            }

            this.onMouseRightButtonDown(e);
        }
    }

    protected onDraw(e: any) {
        if (this._active) {
            const r = this.renderer!;
            const cam = this.planet!.camera;
            let prevEye = cam.eye.clone();

            if (this.stepIndex) {
                r.controlsBag.scaleRot = 1.0;
                const sf = this.stepsForward[this.stepsCount - this.stepIndex--];

                let maxAlt = cam.maxAltitude + (this.planet as any).ellipsoid._b;
                let minAlt = cam.minAltitude + (this.planet as any)?.ellipsoid._b;
                const camAlt = sf.eye.length();
                if (camAlt > maxAlt || camAlt < minAlt && this._wheelDirection > 0) {
                    this._wheelDirection = +1;
                    return;
                }

                cam.eye = sf.eye;
                cam._u = sf.v;
                cam._r = sf.u;
                cam._b = sf.n;
            } else {
                if (this._deactivate) {
                    this._deactivate = false;

                    this.planet!.layerLock.free(this._keyLock);
                    this.planet!.terrainLock.free(this._keyLock);
                    this.planet!._normalMapCreator.free(this._keyLock);
                }
            }

            if (r.events.mouseState.leftButtonDown || !this.scaleRot) {
                return;
            }

            this.scaleRot -= this.inertia;
            if (this.scaleRot <= 0.0) {
                this.scaleRot = 0.0;
            } else {
                r.controlsBag.scaleRot = this.scaleRot;
                let rot = this.qRot
                    .slerp(Quat.IDENTITY, 1.0 - this.scaleRot * this.scaleRot * this.scaleRot)
                    .normalize();
                if (!(rot.x || rot.y || rot.z)) {
                    this.scaleRot = 0.0;
                }
                cam.eye = rot.mulVec3(cam.eye);
                cam._u = rot.mulVec3(cam._u);
                cam._r = rot.mulVec3(cam._r);
                cam._b = rot.mulVec3(cam._b);
            }

            if (cam.eye.distance(prevEye) / cam.getAltitude() > 0.01) {
                this.planet!.layerLock.lock(this._keyLock);
                this.planet!.terrainLock.lock(this._keyLock);
                this.planet!._normalMapCreator.lock(this._keyLock);
            } else {
                this.planet!.layerLock.free(this._keyLock);
                this.planet!.terrainLock.free(this._keyLock);
                this.planet!._normalMapCreator.free(this._keyLock);
            }
        }
    }
}
