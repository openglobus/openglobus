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
 * @param {Object} options -  Geo object parameters:
 * @param {og.Vec3} [options.position] - Geo object position.
 */

class GeoObject {
    constructor(options = {}) {

        this.tag = options.tag || "none";

        // TODO: not instanced
        this.instanced = true;

        /**
         * Entity instance that holds this geo object.
         * @protected
         * @type {Entity}
         */
        this._entity = null;

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

        this._scale = options.scale || 1.0;

        /**
         * RGBA color.
         * @protected
         * @type {og.Vec4}
         */
        this._color = utils.createColorRGBA(options.color);

        this._direction = new Vec3(0, 0, 0);

        this._handler = null;
        this._handlerIndex = -1;

        this._tagData = null;
        this._tagDataIndex = -1;

        this._object3d = options.object3d;
    }

    getPosition() {
        return this._position;
    }

    getPitch() {
        return this._pitch;
    }

    getYaw() {
        return this._yaw;
    }

    getRoll() {
        return this._roll;
    }

    getDirection() {
        return this._direction;
    }

    get object3d() {
        return this._object3d;
    }

    get vertices() {
        return this._object3d.vertices;
    }

    get normals() {
        return this._object3d.normals;
    }

    get texCoords() {
        return this._object3d.texCoords;
    }

    get indexes() {
        return this._object3d.indexes;
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
     * Sets color.
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
        this._handler && this._handler.setRgbaArr(this._tagData, this._tagDataIndex, this._color);
    }

    /**
     * Sets color.
     * @public
     * @param {og.Vec4} color - RGBA vector.
     */
    setColor4v(color) {
        this._color.x = color.x;
        this._color.y = color.y;
        this._color.z = color.z;
        color.w != undefined && (this._color.w = color.w);
        this._handler && this._handler.setRgbaArr(this._tagData, this._tagDataIndex, color);
    }

    /**
     * Sets geo object visibility.
     * @public
     * @param {boolean} visibility - Visibility flag.
     */
    setVisibility(visibility) {
        this._visibility = visibility;
        this._handler && this._handler.setVisibility(this._tagData, this._tagDataIndex, visibility);
    }

    /**
     * Returns geo object visibility.
     * @public
     * @returns {boolean}
     */
    getVisibility() {
        return this._visibility;
    }

    /**
     * Sets geo object position.
     * @public
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     * @param {number} z - Z coordinate.
     */
    setPosition(x, y, z) {
        this._position.x = x;
        this._position.y = y;
        this._position.z = z;
        Vec3.doubleToTwoFloats(this._position, this._positionHigh, this._positionLow);
        this._handler &&
        this._handler.setPositionArr(this._tagData, this._tagDataIndex, this._positionHigh, this._positionLow);
        this.updateDirection();
    }

    /**
     * Sets geo object position.
     * @public
     * @param {og.Vec3} position - Cartesian coordinates.
     */
    setPosition3v(position) {
        this._position.x = position.x;
        this._position.y = position.y;
        this._position.z = position.z;
        Vec3.doubleToTwoFloats(position, this._positionHigh, this._positionLow);
        this._handler && this._handler.setPositionArr(this._tagData, this._tagDataIndex, this._positionHigh, this._positionLow);
        this.updateDirection();
    }

    setYaw(yaw) {
        this._yaw = yaw;
        this.updateDirection();
    }

    setPitch(pitch) {
        this._pitch = pitch;
        this._handler && this._handler.setPitchRollArr(this._tagData, this._tagDataIndex, pitch, this._roll);
    }

    setRoll(roll) {
        this._roll = roll;
        this._handler && this._handler.setPitchRollArr(this._tagData, this._tagDataIndex, this._pitch, roll);
    }

    setScale(scale) {
        this._scale = scale;
        this._handler && this._handler.setScaleArr(this._tagData, this._tagDataIndex, scale);
    }

    getScale() {
        return this._scale;
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
        this._handler && this._handler.setPickingColorArr(this._tagData, this._tagDataIndex, color);
    }

    updateDirection() {
        this._qNorthFrame = Planet.getBearingNorthRotationQuat(this._position);
        let qq = Quat.yRotation(this._yaw).mul(this._qNorthFrame).conjugate();
        this._direction = qq.mulVec3(new Vec3(0.0, 0.0, -1.0)).normalize();
        this._handler && this._handler.setDirectionArr(this._tagData, this._tagDataIndex, this._direction);
    }
}

export { GeoObject };
