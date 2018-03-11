/**
 * @module og/control/Sun
 */

'use strict';

import { BaseControl } from './BaseControl.js';
import { getSunPosition } from '../astro/earth.js';
import { input } from '../input/input.js';
import { LightSource } from '../light/LightSource.js';
import { Quat } from '../math/Quat.js';
import { Vec3 } from '../math/Vec3.js';

/**
 * Real Sun geocentric position control that place the Sun on the right place by the Earth.
 * @class
 * @extends {og.control.BaseControl}
 * @param {Object} [options] - Control options.
 */
class Sun extends BaseControl {
    constructor(options) {
        super(options);

        options = options || {};

        /**
         * Earth planet node.
         * @public
         * @type {og.scene.Planet}
         */
        this.planet = null;

        /**
         * Sunlight position placed in the camera eye.
         * @private
         * @type {boolean}
         */
        //this._isCameraSunlight = false;

        this.offsetVertical = options.offsetVertical || -5000000;

        this.offsetHorizontal = options.offsetHorizontal || 5000000;

        /**
         * Light source.
         * @public
         * @type {og.LightSource}
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

        //sunlight initialization
        this.sunlight = new LightSource("Sun", {
            'ambient': new Vec3(0.15, 0.15, 0.25),
            'diffuse': new Vec3(0.9, 0.9, 0.8),
            'specular': new Vec3(0.1, 0.1, 0.06),
            'shininess': 110
        });
        this.sunlight.addTo(this.planet);

        var that = this;
        this.renderer.events.on("draw", this._draw, this);

        this.renderer.events.on("charkeypress", input.KEY_L, function () {
            that.planet.lightEnabled = !that.planet.lightEnabled;
        });

        if (!this._clockPtr)
            this._clockPtr = this.renderer.handler.defaultClock;
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
        if (!this._stopped) {
            this._currDate = this._clockPtr.currentDate;
            var cam = this.renderer.activeCamera;
            if (cam.getHeight() < 4650000 || !this._active) {
                this._lightOn = true;
                this._f = 1;
                var n = cam.eye.normal();
                var tu = Vec3.proj_b_to_plane(cam._v, n, cam._v).normalize().scale(this.offsetVertical);
                var tr = Vec3.proj_b_to_plane(cam._u, n, cam._u).normalize().scale(this.offsetHorizontal);
                var d = tu.add(tr);
                var pos = cam.eye.add(d);
                if (this._k > 0) {
                    this._k -= 0.01;
                    var rot = Quat.getRotationBetweenVectors(this.sunlight._position.normal(), pos.normal());
                    var r = rot.slerp(Quat.IDENTITY, this._k).normalize();
                    this.sunlight.setPosition(r.mulVec3(this.sunlight._position));
                } else {
                    this.sunlight.setPosition(pos);
                }
            } else {
                this._k = 1;
                if (this._f > 0) {
                    this._f -= 0.01;
                    var rot = Quat.getRotationBetweenVectors(this.sunlight._position.normal(), getSunPosition(this._currDate).normal());
                    var r = rot.slerp(Quat.IDENTITY, this._f).normalize();
                    this.sunlight.setPosition(r.mulVec3(this.sunlight._position));
                } else {
                    if (Math.abs(this._currDate - this._prevDate) > 0.00034 && this._active || this._lightOn) {
                        this._lightOn = false;
                        this._prevDate = this._currDate;
                        this.sunlight.setPosition(getSunPosition(this._currDate));
                        this._f = 0;
                    }
                }
            }
        }
    }
};

export function sun(options) {
    return Sun(options);
};

export { Sun };

