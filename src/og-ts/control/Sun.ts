/**
 * @module og/control/Sun
 */

"use strict";

import { Control } from "./Control.js";
import { getSunPosition } from "../astro/earth.js";
import { LightSource } from "../light/LightSource.js";
import { Quat } from "../math/Quat.js";
import { Vec3 } from "../math/Vec3.js";

const ACTIVATION_HEIGHT = 12079000.0;
/**
 * Real Sun geocentric position control that place the Sun on the right place by the Earth.
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class Sun extends Control {
    constructor(options) {
        super(options);

        this._name = "sun";

        options = options || {};

        /**
         * Earth planet node.
         * @public
         * @type {Planet}
         */
        this.planet = null;

        /**
         * Sunlight position placed in the camera eye.
         * @private
         * @type {boolean}
         */
        // this._isCameraSunlight = false;

        this.offsetVertical = options.offsetVertical || -5000000;

        this.offsetHorizontal = options.offsetHorizontal || 5000000;

        /**
         * Light source.
         * @public
         * @type {LightSource}
         */
        this.sunlight = null;

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

        this._stopped = options.stopped || false;
    }

    oninit() {
        this.planet.lightEnabled = true;

        // sunlight initialization
        this.sunlight = new LightSource("Sun", {
            ambient: new Vec3(0.15, 0.15, 0.25),
            diffuse: new Vec3(0.9, 0.9, 0.8),
            specular: new Vec3(0.1, 0.1, 0.06),
            shininess: 110
        });
        this.sunlight.addTo(this.planet);

        this.renderer.events.on("draw", this._draw, this);

        if (!this._clockPtr) {
            this._clockPtr = this.renderer.handler.defaultClock;
        }
    }

    stop() {
        this._stopped = true;
    }

    onactivate() {
        this._stopped = false;
    }

    bindClock(clock) {
        this._clockPtr = clock;
    }

    _draw() {
        this._currDate = this._clockPtr.currentDate;
        if (!this._stopped) {
            var cam = this.renderer.activeCamera;
            if (cam.getHeight() < ACTIVATION_HEIGHT || !this._active) {
                this._lightOn = true;
                this._f = 1;
                var n = cam.eye.normal(),
                    u = cam.getForward();

                u.scale(Math.sign(cam._u.dot(n))); // up

                if (cam.slope > 0.99) {
                    u = cam._u;
                }

                var tu = Vec3.proj_b_to_plane(u, n, u).normalize().scale(this.offsetVertical);
                var tr = Vec3.proj_b_to_plane(cam._r, n, cam._r)
                    .normalize()
                    .scale(this.offsetHorizontal); // right
                var d = tu.add(tr);
                var pos = cam.eye.add(d);
                if (this._k > 0) {
                    this._k -= 0.01;
                    let rot = Quat.getRotationBetweenVectors(
                        this.sunlight._position.normal(),
                        pos.normal()
                    );
                    let r = rot.slerp(Quat.IDENTITY, this._k).normalize();
                    this.sunlight.setPosition3v(r.mulVec3(this.sunlight._position));
                } else {
                    this.sunlight.setPosition3v(pos);
                }
            } else {
                this._k = 1;
                if (this._f > 0) {
                    this._f -= 0.01;
                    let rot = Quat.getRotationBetweenVectors(
                        this.sunlight._position.normal(),
                        getSunPosition(this._currDate).normal()
                    );
                    let r = rot.slerp(Quat.IDENTITY, this._f).normalize();
                    this.sunlight.setPosition3v(r.mulVec3(this.sunlight._position));
                } else {
                    if (
                        (Math.abs(this._currDate - this._prevDate) > 0.00034 && this._active) ||
                        this._lightOn
                    ) {
                        this._lightOn = false;
                        this._prevDate = this._currDate;
                        this.sunlight.setPosition3v(getSunPosition(this._currDate));
                        this._f = 0;
                    }
                }
            }
        } else {
            this.sunlight.setPosition3v(getSunPosition(this._currDate));
        }
    }
}

export function sun(options) {
    return Sun(options);
}

export { Sun };
