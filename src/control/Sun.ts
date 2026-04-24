import { Control } from "./Control";
import type { IControlParams } from "./Control";
import { Clock } from "../Clock";
import { getSunPosition } from "../astro/earth";
import { Quat } from "../math/Quat";
import { Vec3 } from "../math/Vec3";

interface ISunParams extends IControlParams {
    activationHeight?: number;
    offsetVertical?: number;
    offsetHorizontal?: number;
    stopped?: boolean;
}

/**
 * Real Sun geocentric position control that place the Sun on the right place by the Earth.
 */
export class Sun extends Control {
    public activationHeight: number;
    public offsetVertical: number;
    public offsetHorizontal: number;

    protected _currDate: number;
    protected _prevDate: number;
    protected _clockPtr: Clock | null;
    protected _lightOn: boolean;
    protected _stopped: boolean;
    protected _f: number;
    protected _k: number;
    protected _sunlightPosition: Vec3;

    constructor(options: ISunParams = {}) {
        super({ autoActivate: true, ...options });

        this._name = "sun";

        this.activationHeight = options.activationHeight || 12079000.0;

        this.offsetVertical = options.offsetVertical || -5000000;

        this.offsetHorizontal = options.offsetHorizontal || 5000000;

        this._sunlightPosition = new Vec3();

        /**
         * Current frame handler clock date and time.
         * @private
         * @type {Number}
         */
        this._currDate = 0;

        /**
         * Previous frame handler clock date and time.
         * @private
         * @type {Number}
         */
        this._prevDate = 0;

        this._clockPtr = null;

        this._lightOn = false;

        this._f = 0;
        this._k = 0;

        this._stopped = options.stopped || false;
    }

    public override oninit() {
        // sunlight initialization
        const renderer = this.renderer!;
        renderer.lightPosition.set([this._sunlightPosition.x, this._sunlightPosition.y, this._sunlightPosition.z]);

        this.renderer!.events.on("draw", this._draw, this);

        if (!this._clockPtr) {
            this._clockPtr = this.renderer!.handler.defaultClock;
        }
    }

    public stop() {
        this._stopped = true;
        this.deactivate();
    }

    public start() {
        this._stopped = false;
        this.activate();
    }

    public override onactivate() {
        super.onactivate();
        this._stopped = false;
    }

    public bindClock(clock: Clock) {
        this._clockPtr = clock;
    }

    public getPosition(): Vec3 {
        return this._sunlightPosition.clone();
    }

    protected _setSunPosition3v(position: Vec3) {
        this._sunlightPosition.copy(position);
        this.renderer!.lightPosition[0] = position.x;
        this.renderer!.lightPosition[1] = position.y;
        this.renderer!.lightPosition[2] = position.z;
    }

    protected _draw() {
        if (!this._clockPtr) return;
        this._currDate = this._clockPtr.currentDate;
        if (!this._stopped) {
            let cam = this.planet!.camera;
            if (cam.getHeight() < this.activationHeight || !this._active) {
                this._lightOn = true;
                this._f = 1;
                let n = cam.eye.normal(),
                    u = cam.getForward();

                u.scale(Math.sign(cam.getUp().dot(n))); // up

                if (cam.slope > 0.99) {
                    u = cam.getUp();
                }

                let tu = Vec3.proj_b_to_plane(u, n, u).normalize().scale(this.offsetVertical);
                let tr = Vec3.proj_b_to_plane(cam.getRight(), n, cam.getRight())
                    .normalize()
                    .scale(this.offsetHorizontal); // right

                let d = tu.add(tr);
                let pos = cam.eye.add(d);

                if (this._k > 0) {
                    this._k -= 0.001;
                    let rot = Quat.getRotationBetweenVectors(this._sunlightPosition.normal(), pos.normal());
                    let r = rot.slerp(Quat.IDENTITY, this._k).normalize();
                    this._setSunPosition3v(r.mulVec3(this._sunlightPosition));
                } else {
                    this._setSunPosition3v(pos);
                }
            } else {
                this._k = 1;
                if (this._f > 0) {
                    this._f -= 0.001;
                    let rot = Quat.getRotationBetweenVectors(
                        this._sunlightPosition.normal(),
                        getSunPosition(this._currDate).normal()
                    );
                    let r = rot.slerp(Quat.IDENTITY, this._f).normalize();
                    this._setSunPosition3v(r.mulVec3(this._sunlightPosition));
                } else {
                    if ((Math.abs(this._currDate - this._prevDate) > 0.00034 && this._active) || this._lightOn) {
                        this._lightOn = false;
                        this._prevDate = this._currDate;
                        this._setSunPosition3v(getSunPosition(this._currDate));
                        this._f = 0;
                    }
                }
            }
        } else {
            this._setSunPosition3v(getSunPosition(this._currDate));
        }
    }
}
