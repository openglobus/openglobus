"use strict";

import * as utils from "../utils/shared";
import {Entity} from "./Entity";
import {Quat, Vec3, Vec4} from "../math/index";
import {InstanceData} from "./GeoObjectHandler";
import {NumberArray3} from "../math/Vec3";
import {NumberArray4} from "../math/Vec4";
import {Object3d} from "../Object3d";
import {GeoObjectHandler} from "./GeoObjectHandler";

interface IGeoObjectParams {
    object3d: Object3d;
    tag?: string;
    position?: Vec3 | NumberArray3;
    pitch?: number;
    yaw?: number;
    roll?: number;
    scale?: number;
    color?: Vec4 | NumberArray4;
}

/**
 * @class
 * @param {Object} options -  Geo object parameters:
 * @param {Vec3} [options.position] - Geo object position.
 *
 * @todo: GeoObject and GeoObjectHandler provides instanced objects only.
 * It would be nice if it could provide not instanced rendering loop too.
 */
class GeoObject {
    public tag: string;

    public instanced: boolean;

    /**
     * Entity instance that holds this geo object.
     * @protected
     * @type {Entity}
     */
    protected _entity: Entity | null;

    /**
     * Geo object center cartesian position.
     * @protected
     * @type {Vec3}
     */
    protected _position: Vec3;
    protected _positionHigh: Vec3;
    protected _positionLow: Vec3;

    protected _pitch: number;
    protected _yaw: number;
    protected _roll: number;

    protected _scale: number;

    /**
     * RGBA color.
     * @protected
     * @type {Vec4}
     */
    protected _color: Vec4;

    protected _direction: Vec3;

    protected _handler: GeoObjectHandler | null;
    protected _handlerIndex = -1;

    protected _tagData: InstanceData | null;
    protected _tagDataIndex: number;

    protected _object3d: Object3d;

    protected _visibility: boolean;

    protected _qNorthFrame: Quat;

    constructor(options: IGeoObjectParams = {}) {

        this.tag = options.tag || "none";

        this.instanced = true;

        this._entity = null;

        this._position = utils.createVector3(options.position);

        this._positionHigh = new Vec3();
        this._positionLow = new Vec3();
        Vec3.doubleToTwoFloats(this._position, this._positionHigh, this._positionLow);

        this._pitch = options.pitch || 0.0;
        this._yaw = options.yaw || 0.0;
        this._roll = options.roll || 0.0;

        this._scale = options.scale || 1.0;

        this._color = utils.createColorRGBA(options.color);

        this._direction = new Vec3(0, 0, 0);

        this._handler = null;
        this._handlerIndex = -1;

        this._tagData = null;
        this._tagDataIndex = -1;

        this._object3d = options.object3d;

        this._visibility = true;

        this._qNorthFrame = new Quat();
    }

    public getPosition(): Vec3 {
        return this._position;
    }

    public getPitch(): number {
        return this._pitch;
    }

    public getYaw(): number {
        return this._yaw;
    }

    public getRoll(): number {
        return this._roll;
    }

    public getDirection(): Vec3 {
        return this._direction;
    }

    public get object3d(): Object3d {
        return this._object3d;
    }

    public get vertices(): number[] {
        return this._object3d.vertices;
    }

    public get normals(): number[] {
        return this._object3d.normals;
    }

    public get texCoords(): number[] {
        return this._object3d.texCoords;
    }

    public get indices(): number[] {
        return this._object3d.indices;
    }

    /**
     * Sets geo object opacity.
     * @public
     * @param {number} a - Billboard opacity.
     */
    public setOpacity(a: number) {
        this._color.w = a;
        this.setColor(this._color.x, this._color.y, this._color.z, a);
    }

    /**
     * Sets color.
     * @public
     * @param {number} r - Red.
     * @param {number} g - Green.
     * @param {number} b - Blue.
     * @param {number} [a] - Alpha.
     */
    public setColor(r: number, g: number, b: number, a?: number) {
        this._color.x = r;
        this._color.y = g;
        this._color.z = b;
        a != undefined && (this._color.w = a);
        this._handler && this._handler.setRgbaArr(this._tagData, this._tagDataIndex, this._color);
    }

    /**
     * Sets color.
     * @public
     * @param {Vec3 | Vec4} color - RGBA vector.
     */
    public setColor4v(color: Vec3 | Vec4) {
        this._color.x = color.x;
        this._color.y = color.y;
        this._color.z = color.z;
        (color as Vec4).w != undefined && (this._color.w = (color as Vec4).w);
        this._handler && this._handler.setRgbaArr(this._tagData, this._tagDataIndex, color);
    }

    /**
     * Sets geo object visibility.
     * @public
     * @param {boolean} visibility - Visibility flag.
     */
    public setVisibility(visibility: boolean) {
        this._visibility = visibility;
        this._handler && this._handler.setVisibility(this._tagData, this._tagDataIndex, visibility);
    }

    /**
     * Returns geo object visibility.
     * @public
     * @returns {boolean}
     */
    public getVisibility(): boolean {
        return this._visibility;
    }

    /**
     * Sets geo object position.
     * @public
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     * @param {number} z - Z coordinate.
     */
    public setPosition(x: number, y: number, z: number) {
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
     * @param {Vec3} position - Cartesian coordinates.
     */
    public setPosition3v(position: Vec3) {
        this._position.x = position.x;
        this._position.y = position.y;
        this._position.z = position.z;
        Vec3.doubleToTwoFloats(position, this._positionHigh, this._positionLow);
        this._handler && this._handler.setPositionArr(this._tagData, this._tagDataIndex, this._positionHigh, this._positionLow);
        this.updateDirection();
    }

    public setYaw(yaw: number) {
        this._yaw = yaw;
        this.updateDirection();
    }

    public setPitch(pitch: number) {
        this._pitch = pitch;
        this._handler && this._handler.setPitchRollArr(this._tagData, this._tagDataIndex, pitch, this._roll);
    }

    public setRoll(roll: number) {
        this._roll = roll;
        this._handler && this._handler.setPitchRollArr(this._tagData, this._tagDataIndex, this._pitch, roll);
    }

    public setScale(scale: number) {
        this._scale = scale;
        this._handler && this._handler.setScaleArr(this._tagData, this._tagDataIndex, scale);
    }

    public getScale(): number {
        return this._scale;
    }

    /**
     * Removes geo object from handler.
     * @public
     */
    public remove() {
        this._entity = null;
        this._handler && this._handler.remove(this);
    }

    /**
     * Sets billboard picking color.
     * @public
     * @param {Vec3} color - Picking color.
     */
    public setPickingColor3v(color: Vec3) {
        this._handler && this._handler.setPickingColorArr(this._tagData, this._tagDataIndex, color);
    }

    public updateDirection() {
        if (this._handler && this._handler._planet) {
            this._qNorthFrame = this._handler._planet.getNorthFrameRotation(this._position);
            let qq = Quat.yRotation(this._yaw).mul(this._qNorthFrame).conjugate();
            this._direction = qq.mulVec3(new Vec3(0.0, 0.0, -1.0)).normalize();
            this._handler.setDirectionArr(this._tagData, this._tagDataIndex, this._direction);
        }
    }
}

export {GeoObject};
