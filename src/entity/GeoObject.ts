import * as utils from "../utils/shared";
import {Entity} from "./Entity";
import {Quat, Vec3, Vec4} from "../math/index";
import {GeoObjectHandler, InstanceData} from "./GeoObjectHandler";
import {NumberArray3} from "../math/Vec3";
import {NumberArray4} from "../math/Vec4";
import {Object3d} from "../Object3d";

export interface IGeoObjectParams {
    object3d?: Object3d;
    objSrc?: string;
    tag?: string;
    position?: Vec3 | NumberArray3;
    opacity?: number;
    pitch?: number;
    yaw?: number;
    roll?: number;
    scale?: number | Vec3;
    color?: Vec4 | NumberArray4 | string;
    visibility?: boolean;
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
    protected _tag: string;

    public instanced: boolean;

    /**
     * Entity instance that holds this geo object.
     * @public
     * @type {Entity}
     */
    public _entity: Entity | null;

    /**
     * Geo object center cartesian position.
     * @protected
     * @type {Vec3}
     */
    protected _position: Vec3;
    public _positionHigh: Vec3;
    public _positionLow: Vec3;

    protected _pitch: number;
    protected _yaw: number;
    protected _roll: number;

    protected _scale: Vec3;

    /**
     * RGBA color.
     * @public
     * @type {Vec4}
     */
    public _color: Vec4;

    public _direction: Vec3;

    public _handler: GeoObjectHandler | null;
    public _handlerIndex = -1;

    public _tagData: InstanceData | null;
    public _tagDataIndex: number;

    protected _object3d: Object3d;

    protected _visibility: boolean;

    protected _qNorthFrame: Quat;

    constructor(options: IGeoObjectParams) {

        this._tag = options.tag || "none";

        this.instanced = true;

        this._entity = null;

        this._position = utils.createVector3(options.position);

        this._positionHigh = new Vec3();
        this._positionLow = new Vec3();
        Vec3.doubleToTwoFloats(this._position, this._positionHigh, this._positionLow);

        this._pitch = options.pitch || 0.0;
        this._yaw = options.yaw || 0.0;
        this._roll = options.roll || 0.0;

        this._scale = utils.createVector3(options.scale, new Vec3(1, 1, 1));

        this._color = utils.createColorRGBA(options.color);

        this._direction = new Vec3(0, 1, 0);

        this._handler = null;
        this._handlerIndex = -1;

        this._tagData = null;
        this._tagDataIndex = -1;
        if((!options.object3d ||  options.object3d?.vertices.length === 0)) {
            options.object3d = new Object3d();
        }
        if (options.objSrc) {
           this.setObjectSrc(options.objSrc)
        }
        this._object3d = options.object3d as Object3d;
        this._visibility = (options.visibility != undefined ? options.visibility : true);

        this._qNorthFrame = new Quat();
    }

    public get tag() {
        return this._tag;
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
        this._handler && this._handler.setRgbaArr(this._tagData!, this._tagDataIndex, this._color);
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
        this._handler && this._handler.setRgbaArr(this._tagData!, this._tagDataIndex, this._color);
    }

    /**
     * Sets geo object visibility.
     * @public
     * @param {boolean} visibility - Visibility flag.
     */
    public setVisibility(visibility: boolean) {
        this._visibility = visibility;
        this._handler && this._handler.setVisibility(this._tagData!, this._tagDataIndex, visibility);
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
        this._handler.setPositionArr(this._tagData!, this._tagDataIndex, this._positionHigh, this._positionLow);
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
        this._handler && this._handler.setPositionArr(this._tagData!, this._tagDataIndex, this._positionHigh, this._positionLow);
        this.updateDirection();
    }

    public setYaw(yaw: number) {
        this._yaw = yaw;
        this.updateDirection();
    }

    public setObject(object: Object3d ) {
        this._object3d = object;
        this._handler && this._handler.updateInstanceData(this);
    }

    public setObjectSrc(src: string) {
        Object3d.loadObj(src).then((object3d) => {
            this.setObject(object3d[0]);
            this.updateDirection()
        })
    }

    /**
     *
     * @param {number} pitch - Pitch in radians
     */
    public setPitch(pitch: number) {
        this._pitch = pitch;
        this._handler && this._handler.setPitchRollArr(this._tagData!, this._tagDataIndex, pitch, this._roll);
    }

    public setRoll(roll: number) {
        this._roll = roll;
        this._handler && this._handler.setPitchRollArr(this._tagData!, this._tagDataIndex, this._pitch, roll);
    }

    public setScale(scale: number) {
        this._scale.x = this._scale.y = this._scale.z = scale;
        this._handler && this._handler.setScaleArr(this._tagData!, this._tagDataIndex, this._scale);
    }

    public setScale3v(scale: Vec3) {
        this._scale.copy(scale);
        this._handler && this._handler.setScaleArr(this._tagData!, this._tagDataIndex, scale);
    }

    public getScale(): Vec3 {
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
        this._handler && this._handler.setPickingColorArr(this._tagData!, this._tagDataIndex, color);
    }

    public updateDirection() {
        if (this._handler && this._handler._planet) {
            this._qNorthFrame = this._handler._planet.getNorthFrameRotation(this._position);
            let qq = Quat.yRotation(this._yaw).mul(this._qNorthFrame).conjugate();
            this._direction = qq.mulVec3(new Vec3(0.0, 0.0, -1.0)).normalize();
            this._handler.setDirectionArr(this._tagData!, this._tagDataIndex, this._direction);
        }
    }
}

export {GeoObject};
