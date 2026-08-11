import { Control } from "./Control";
import type { IControlParams } from "./Control";
import { Clock } from "../Clock";
import { getSunPosition } from "../astro/earth";
import { DateToUTC } from "../astro/jd";
import type { JulianDate } from "../astro/jd";
import { Quat } from "../math/Quat";
import { Vec3 } from "../math/Vec3";
import * as math from "../math";
import type { PlanetCamera } from "../camera/PlanetCamera";

/**
 * Minimal julian date change that moves the sunlight position, about 30 seconds.
 * @const {number}
 */
const SUN_DATE_THRESHOLD = 0.00034;

interface ISunParams extends IControlParams {
    activationHeight?: number;
    offsetVertical?: number;
    offsetHorizontal?: number;
    stopped?: boolean;
    localDateTime?: Date | null;
}

/**
 * Real Sun geocentric position control that place the Sun on the right place by the Earth.
 * @class
 *
 * @example <caption>Lighting frozen at 21:30 local solar time under the camera</caption>
 * new Sun({ localDateTime: new Date(2026, 7, 3, 21, 30) })
 *
 * @param {ISunParams} [options] - Options:
 * @param {number} [options.activationHeight=12079000.0] - Camera height above which the Sun takes its real position by the clock.
 * @param {number} [options.offsetVertical=-5000000] - Vertical offset of the camera following light.
 * @param {number} [options.offsetHorizontal=5000000] - Horizontal offset of the camera following light.
 * @param {boolean} [options.stopped=false] - Stops the control, leaving the Sun on its real position by the clock.
 * @param {Date} [options.localDateTime] - Lights the scene by a fixed local apparent solar time under the camera
 * instead of the camera following light, below activationHeight. At 12:00 the Sun stands on the meridian there,
 * while the date sets the season. Read for the wall clock numbers it shows locally, so it is not an instant in
 * time: one parsed from an absolute timestamp reads as the machine's time zone renders it. The Clock is left
 * untouched, and while the control is stopped this is ignored.
 */
export class Sun extends Control {
    public activationHeight: number;
    public offsetVertical: number;
    public offsetHorizontal: number;

    /**
     * Fixed local apparent solar time under the camera, or null for the camera following light.
     * @public
     * @type {Date | null}
     */
    public localDateTime: Date | null;

    protected _currDate: number;
    protected _prevDate: number;

    protected _redrawDate: number;

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

        this.localDateTime = options.localDateTime || null;

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

        this._redrawDate = 0;

        this._clockPtr = null;

        this._lightOn = false;

        this._f = 0;
        this._k = 0;

        this._stopped = options.stopped || false;
    }

    public override oninit() {
        // sunlight initialization
        const renderer = this.renderer!;
        renderer._lightPosition.set([this._sunlightPosition.x, this._sunlightPosition.y, this._sunlightPosition.z]);

        this.renderer!.events.on("predraw", this._draw, this);

        if (!this._clockPtr) {
            this._clockPtr = this.renderer!.handler.defaultClock;
        }

        this._redrawDate = this._clockPtr.currentDate;

        this._clockPtr.events.on("tick", this._onClockTick, this);
    }

    protected _onClockTick = () => {
        if (!this._clockPtr) return;

        if (Math.abs(this._clockPtr.currentDate - this._redrawDate) > SUN_DATE_THRESHOLD) {
            this._redrawDate = this._clockPtr.currentDate;
            this.renderer!.requestRedraw();
        }
    };

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

    /**
     * Sets a fixed local apparent solar time under the camera.
     * @public
     * @param {Date | null} localDateTime - Local date and time, or null to restore the camera following light.
     */
    public setLocalDateTime(localDateTime: Date | null) {
        this.localDateTime = localDateTime;
    }

    protected _setSunPosition3v(position: Vec3) {
        this._sunlightPosition.copy(position);
        this.renderer!._lightPosition[0] = position.x;
        this.renderer!._lightPosition[1] = position.y;
        this.renderer!._lightPosition[2] = position.z;
    }

    /**
     * Returns a light position offset from the camera along its own up and right axes,
     * so that nearby terrain is lit regardless of the real Sun direction.
     * @protected
     * @param {PlanetCamera} cam - Planet camera.
     * @returns {Vec3} -
     */
    protected _getCameraFollowingPosition(cam: PlanetCamera): Vec3 {
        let n = cam.eye.normal(),
            u = cam.getForward();

        u.scale(Math.sign(cam.getUp().dot(n))); // up

        if (cam.slope > 0.99) {
            u = cam.getUp();
        }

        let tu = Vec3.proj_b_to_plane(u, n, u).normalize().scale(this.offsetVertical);
        let tr = Vec3.proj_b_to_plane(cam.getRight(), n, cam.getRight()).normalize().scale(this.offsetHorizontal); // right

        let d = tu.add(tr);
        return cam.eye.add(d);
    }

    /**
     * Returns the julian date at which localDateTime is the local apparent solar time at lon.
     * Local mean solar time is the first guess, then the measured subsolar longitude corrects it;
     * that point drifts -360 degrees a day, so a residual of d degrees is worth -d / 360 of a day.
     * @protected
     * @param {number} lon - Longitude under the camera, degrees.
     * @returns {JulianDate} -
     */
    protected _getLocalDateTimeJulian(lon: number): JulianDate {
        let t = this.localDateTime!;

        let hours = t.getHours() + t.getMinutes() / 60.0 + t.getSeconds() / 3600.0;

        let jd =
            DateToUTC(
                new Date(
                    Date.UTC(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), t.getMinutes(), t.getSeconds())
                )
            ) -
            lon / 360.0;

        let subsolarLon = lon - (hours - 12.0) * 15.0;

        for (let i = 0; i < 2; i++) {
            let sun = getSunPosition(jd);
            jd -= math.norm_lon(subsolarLon - Math.atan2(sun.y, sun.x) * math.DEGREES) / 360.0;
        }

        return jd;
    }

    /**
     * Returns the Sun position for localDateTime at the location under the camera.
     * @protected
     * @param {PlanetCamera} cam - Planet camera.
     * @returns {Vec3} -
     */
    protected _getLocalDateTimePosition(cam: PlanetCamera): Vec3 {
        return getSunPosition(this._getLocalDateTimeJulian(cam.getLonLat().lon));
    }

    protected _draw() {
        if (!this._clockPtr) return;
        this._currDate = this._clockPtr.currentDate;

        if (!this._stopped) {
            let cam = this.planet!.camera;
            if (cam.getHeight() < this.activationHeight || !this._active) {
                this._lightOn = true;
                this._f = 1;

                let pos =
                    this.localDateTime != null
                        ? this._getLocalDateTimePosition(cam)
                        : this._getCameraFollowingPosition(cam);

                if (this._k > 0) {
                    this.renderer!.requestRedraw();
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
                    this.renderer!.requestRedraw();
                    this._f -= 0.001;
                    let rot = Quat.getRotationBetweenVectors(
                        this._sunlightPosition.normal(),
                        getSunPosition(this._currDate).normal()
                    );
                    let r = rot.slerp(Quat.IDENTITY, this._f).normalize();
                    this._setSunPosition3v(r.mulVec3(this._sunlightPosition));
                } else {
                    if (
                        (Math.abs(this._currDate - this._prevDate) > SUN_DATE_THRESHOLD && this._active) ||
                        this._lightOn
                    ) {
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
