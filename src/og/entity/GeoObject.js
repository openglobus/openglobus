/**
 * @module og/shape/BaseShape
 */

"use strict";

import { Quat, Vec3 } from "../math/index.js";
import { MAX32, RADIANS, lerp } from "../math.js";
import { LonLat } from "../LonLat.js";
import * as utils from "../utils/shared.js";
import { Planet } from "../scene/Planet.js";

/**
 * @class
 * @param {Object} options - Sphere parameters:
 * @param {og.Vec3} [options.position] - Sphere position.
 * @param {og.Quat} [options.orientation] - Sphere orientation(rotation).
 * @param {og.Vec3} [options.scale] - Scale vector.
 * @param {Array.<number,number,number,number>} [options.color] - Sphere RGBA color.
 * @param {string} [options.src] - Texture image url source.
 * @param {boolean} [options.visibility] - Sphere visibility.
 * @param {number} [options.radius=100] - Sphere radius.
 * @param {number} [options.latBands=16] - Number of latitude bands.
 * @param {number} [options.lonBands=16] - Number of longitude bands.
 */

const MIN_SCALE = 0.003;
const MAX_SCALE_HEIGHT = 3000.0;
const MIN_SCALE_HEIGHT = 1900000.0;

class GeoObject {
    constructor(options) {
        options = options || {};

        this.scale = options.scale || 0.02;
        this.scaleByDistance = new Float32Array(options.scaleByDistance || [MAX32, MAX32, MAX32]);

        /**
         * Geo object center cartesian position.
         * @protected
         * @type {og.Vec3}
         */
        this._position = utils.createVector3(options.position);

        this._positionHigh = new Vec3();

        this._positionLow = new Vec3();

        Vec3.doubleToTwoFloats(this._position, this._positionHigh, this._positionLow);

        this._pitch = options.pitch || 0.0;
        this._yaw = options.yaw || 0.0;
        this._roll = options.roll || 0.0;

        this._planet = options.planet || null;
        this._lonLatAlt = new LonLat(0, 0, 100000);

        /**
         * RGBA color.
         * @protected
         * @type {og.Vec4}
         */
        this._color = utils.createColorRGBA(options.color);

        this._direction = new Vec3(0, 0, 0);

        this._handler = null;
        this._handlerIndex = -1;
        this._vertices = options.vertices;
        this._normals = options.normals;
        this._indices = options.indices;
        this.instanced = options.instanced;
        this.tag = options.tag || "none";
        if (options.indices) {
            this._indicesCount = options.indices.length;
        }
        if (options.vertices) {
            this._verticesCount = Math.floor(options.vertices.length / 3);
        }
    }

    get planet() {
        return this._handler && this._handler._planet;
    }

    get renderer() {
        return this.planet && this.planet.renderer;
    }

    /**
     * Sets geo object opacity.
     * @public
     * @param {number} a - Billboard opacity.
     */
    setOpacity(a) {
        this._color.w = a;
        this.setColor(this._color.x, this._color.y, this._color.z, a);
    }

    /**
     * Sets RGBA color. Each channel from 0.0 to 1.0.
     * @public
     * @param {number} r - Red.
     * @param {number} g - Green.
     * @param {number} b - Blue.
     * @param {number} a - Alpha.
     */
    setColor(r, g, b, a) {
        this._color.x = r;
        this._color.y = g;
        this._color.z = b;
        a != undefined && (this._color.w = a);
        this._handler && this._handler.setRgbaArr(this._handlerIndex, this._color);
    }

    /**
     * Sets RGBA color. Each channel from 0.0 to 1.0.
     * @public
     * @param {og.Vec4} color - RGBA vector.
     */
    setColor4v(color) {
        this._color.x = color.x;
        this._color.y = color.y;
        this._color.z = color.z;
        color.w != undefined && (this._color.w = color.w);
        this._handler && this._handler.setRgbaArr(this._handlerIndex, color);
    }

    /**
     * Sets geo object visibility.
     * @public
     * @param {boolean} visibility - Visibility flag.
     */
    setVisibility(visibility) {
        this._visibility = visibility;
        this._handler && this._handler.setVisibility(this._handlerIndex, visibility);
    }

    /**
     * Returns  geo object visibility.
     * @public
     * @returns {boolean}
     */
    getVisibility() {
        return this._visibility;
    }

    setLonLat(lon, lat, alt) {
        this._lonLatAlt.lon = lon;
        this._lonLatAlt.lat = lat;
        this._lonLatAlt.height = alt;
        this._handler._planet.ellipsoid.lonLatToCartesianRes(this._lonLatAlt, this._position);
        this.setPosition3v(this._position);
    }

    /**
     * Sets geoObject position.
     * @public
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     * @param {number} z - Z coordinate.
     */
    setPosition(x, y, z) {
        this._position.x = x;
        this._position.y = y;
        this._position.z = z;
        Vec3.doubleToTwoFloats(position, this._positionHigh, this._positionLow);
        this._handler &&
            this._handler.setPositionArr(this._handlerIndex, this._positionHigh, this._positionLow);
        this.updateDirection();
    }

    /**
     * Sets billboard position.
     * @public
     * @param {og.Vec3} position - Cartesian coordinates.
     */
    setPosition3v(position) {
        this._position.x = position.x;
        this._position.y = position.y;
        this._position.z = position.z;
        Vec3.doubleToTwoFloats(position, this._positionHigh, this._positionLow);
        this._handler &&
            this._handler.setPositionArr(this._handlerIndex, this._positionHigh, this._positionLow);
        this.updateDirection();
    }

    setYaw(yaw) {
        this._yaw = yaw;
        this.updateDirection();
    }

    setPitch(pitch) {
        this._pitch = pitch;
        this._handler && this._handler.setPitchRollArr(this._handlerIndex, pitch, this._roll);
    }

    setRoll(roll) {
        this._roll = roll;
        this._handler && this._handler.setPitchRollArr(this._handlerIndex, this._pitch, roll);
    }

    setScale(scale) {
        const r = this.renderer,
            camera = r.activeCamera,
            t =
                1.0 -
                (camera._lonLat.height - MAX_SCALE_HEIGHT) / (MIN_SCALE_HEIGHT - MAX_SCALE_HEIGHT);
        this._distanceToCamera = this._position.distance(camera.eye);
        this.scale = lerp(t < 0 ? 0 : t, scale, MIN_SCALE) * this._distanceToCamera;
        this._handler && this._handler.setSizeArr(this._handlerIndex, this.scale);
    }

    /**
     * Removes geo object from handler.
     * @public
     */
    remove() {
        this._entity = null;
        this._handler && this._handler.remove(this);
    }

    /**
     * Sets billboard picking color.
     * @public
     * @param {og.Vec3} color - Picking color.
     */
    setPickingColor3v(color) {
        this._handler && this._handler.setPickingColorArr(this._handlerIndex, color);
    }

    updateDirection() {
        if (this._entity && this._entity.renderNode && this._entity.renderNode.ellipsoid) {
            this._entity.renderNode.ellipsoid.lonLatToCartesianRes(this._lonLatAlt, this._position);
        }
        this._qNorthFrame = Planet.getBearingNorthRotationQuat(this._position);

        let qq = Quat.yRotation(this._yaw * RADIANS)
            .mul(this._qNorthFrame)
            .conjugate();
        this._direction = qq.mulVec3(new Vec3(0.0, 0.0, -1.0)).normalize();
        this._handler && this._handler.setDirectionArr(this._handlerIndex, this._direction);
    }
}

export { GeoObject };
