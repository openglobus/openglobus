import {Sphere} from "../bv/Sphere";
import {Key} from "../Lock";
import {Quat} from "../math/Quat";
import {Vec3} from "../math/Vec3";
import {Control, IControlParams} from "./Control";
import {IStepForward, MouseNavigation} from "./MouseNavigation";

interface IMouseWheelZoomControl extends IControlParams {
    minSlope?: number;
}

export class MouseWheelZoomControl extends Control {
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
    protected stepsForward: IStepForward[] | null;
    protected stepIndex: number;
    protected _lmbDoubleClickActive: boolean;
    protected minSlope: number;
    protected _keyLock: Key;
    protected _deactivate: boolean;
    protected _move: number;

    constructor(options: IMouseWheelZoomControl = {}) {
        super(options);

        this._name = "MouseWheelZoomControl";

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

        this._keyLock = new Key();

        this._deactivate = false;

        this._move = 0;
    }

    public override oninit() {
        let zoomDiv = document.createElement("div"),
            btnZoomIn = document.createElement("button"),
            btnZoomOut = document.createElement("button");

        zoomDiv.className = "ogZoomControl";
        btnZoomIn.className = "ogZoomButton ogZoomIn";
        btnZoomOut.className = "ogZoomButton ogZoomOut";

        zoomDiv.appendChild(btnZoomIn);
        zoomDiv.appendChild(btnZoomOut);

        this.renderer!.div!.appendChild(zoomDiv);

        btnZoomIn.addEventListener("mousedown", () => this.zoomIn());
        btnZoomIn.addEventListener("mouseup", () => this.stopZoom());

        btnZoomOut.addEventListener("mousedown", () => this.zoomOut());
        btnZoomOut.addEventListener("mouseup", () => this.stopZoom());

        btnZoomIn.addEventListener("touchstart", (e: TouchEvent) => {
            e.preventDefault();
            this.zoomIn();
        });
        btnZoomIn.addEventListener("touchend", (e: TouchEvent) => {
            e.preventDefault();
            this.stopZoom();
        });
        btnZoomIn.addEventListener("touchcancel", (e: TouchEvent) => {
            e.preventDefault();
            this.stopZoom();
        });

        btnZoomOut.addEventListener("touchstart", (e: TouchEvent) => {
            e.preventDefault();
            this.zoomOut();
        });
        btnZoomOut.addEventListener("touchend", (e: TouchEvent) => {
            e.preventDefault();
            this.stopZoom();
        });
        btnZoomOut.addEventListener("touchcancel", (e: TouchEvent) => {
            e.preventDefault();
            this.stopZoom();
        });

        this.renderer!.events.on("draw", this._draw, this);
    }

    /**
     * Planet zoom in.
     * @public
     */
    public zoomIn() {
        if (this.stepIndex) {
            return;
        }

        this.planet!.stopFlying();

        this.stopRotation();

        this._deactivate = true;

        this.planet!.layerLock.lock(this._keyLock);
        this.planet!.terrainLock.lock(this._keyLock);
        this.planet!._normalMapCreator.lock(this._keyLock);

        this.stepsForward = MouseNavigation.getMovePointsFromPixelTerrain(
            this.planet!.camera,
            this.planet!,
            this.stepsCount,
            this.distDiff,
            this.renderer!.handler.getCenter(),
            true,
            null
        ) || null;

        if (this.stepsForward) {
            this.stepIndex = this.stepsCount;
        }
    }

    /**
     * Planet zoom out.
     * @public
     */
    public zoomOut() {
        if (this.stepIndex) {
            return;
        }

        this.planet!.stopFlying();

        this.stopRotation();

        this._deactivate = true;

        this.planet!.layerLock.lock(this._keyLock);
        this.planet!.terrainLock.lock(this._keyLock);
        this.planet!._normalMapCreator.lock(this._keyLock);

        this.stepsForward = MouseNavigation.getMovePointsFromPixelTerrain(
            this.planet!.camera,
            this.planet!,
            this.stepsCount,
            this.distDiff,
            this.renderer!.handler.getCenter(),
            false,
            null
        ) || null;

        if (this.stepsForward) {
            this.stepIndex = this.stepsCount;
        }
    }

    public stopRotation() {
        this.qRot.clear();
        this.planet!.layerLock.free(this._keyLock);
        this.planet!.terrainLock.free(this._keyLock);
        this.planet!._normalMapCreator.free(this._keyLock);
    }

    public stopZoom() {
        this._move = 0;

        this.planet!.layerLock.free(this._keyLock);
        this.planet!.terrainLock.free(this._keyLock);
        this.planet!._normalMapCreator.free(this._keyLock);
    }

    protected _draw() {
        if (this._active) {
            let r = this.renderer!;
            let cam = this.planet!.camera;
            let prevEye = cam.eye.clone();

            if (this.stepIndex) {
                r.controlsBag.scaleRot = 1.0;
                let sf = this.stepsForward![this.stepsCount - this.stepIndex--];

                let maxAlt = cam.maxAltitude + this.planet!.ellipsoid.equatorialSize;
                let minAlt = cam.minAltitude + this.planet!.ellipsoid.equatorialSize;
                const camAlt = sf.eye.length();
                if (camAlt > maxAlt || camAlt < minAlt) {
                    return;
                }

                cam.eye = sf.eye;
                cam._u = sf.v;
                cam._r = sf.u;
                cam._b = sf.n;

                cam.checkTerrainCollision();

                cam.update();
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

                cam.checkTerrainCollision();

                cam.update();
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