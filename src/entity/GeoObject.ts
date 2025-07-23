import * as utils from "../utils/shared";
import {Entity} from "./Entity";
import {Quat, Vec3, Vec4} from "../math/index";
import {GeoObjectHandler} from "./GeoObjectHandler";
import {InstanceData} from "./InstanceData";
import type {NumberArray3} from "../math/Vec3";
import type {NumberArray4} from "../math/Vec4";
import {Object3d} from "../Object3d";

export const LOCAL_FORWARD = new Vec3(0.0, 0.0, -1.0);

/**
 * Interface for GeoObject parameters.
 * @typedef {Object} IGeoObjectParams
 * @property {Object3d} [object3d] - 3D object associated with the geo object.
 * @property {string} [objSrc] - Source url of the 3D object.
 * @property {string} [tag] - Unique instancing drawing identifier tag.
 * @property {Vec3 | NumberArray3} [position] - Position in Cartesian coordinates.
 * @property {number | Vec3 | NumberArray3} [scale] - Scale of the object.
 * @property {Vec3 | NumberArray3} [translate] - Translation offset.
 * @property {Vec4 | NumberArray4 | string} [color] - RGBA color or HTML color string.
 * @property {boolean} [visibility] - Visibility flag.
 */
export interface IGeoObjectParams {
    object3d?: Object3d;
    objSrc?: string;
    tag?: string;
    position?: Vec3 | NumberArray3;
    scale?: number | Vec3 | NumberArray3;
    translate?: Vec3 | NumberArray3;
    color?: Vec4 | NumberArray4 | string;
    visibility?: boolean;
}

/**
 * Represents 3D object on the the globe or 3d space
 * @class
 * @param {IGeoObjectParams} options -  Geo object parameters:
 * @param {Object3d} [options.object3d] - 3D object associated with the geo object.
 * @param {string} [options.objSrc] - Source url of the 3D object.
 * @param {string} [options.tag] - Unique instancing drawing identifier tag.
 * @param {Vec3 | NumberArray3} [options.position] - Position in Cartesian coordinates.
 * @param {number | Vec3 | NumberArray3} [options.scale=1] - Scale of the object.
 * @param {Vec3 | NumberArray3} [options.translate] - Translation offset.
 * @param {Vec4 | NumberArray4 | string} [options.color] - RGBA color or HTML color string.
 * @param {boolean} [options.visibility=true] - Visibility flag.
 *
 * @todo: GeoObject and GeoObjectHandler provides instanced objects only.
 * It would be nice if it could provide not instanced rendering loop too.
 */
class GeoObject {
    protected _tag: string;

    static __counter__: number = 0;

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
    public _rtcPositionHigh: Vec3;
    public _rtcPositionLow: Vec3;

    protected _scale: Vec3;
    protected _translate: Vec3;
    protected _localPosition: Vec3;

    /**
     * RGBA color.
     * @public
     * @type {Vec4}
     */
    public _color: Vec4;

    protected _qFrame: Quat;
    public _qRot: Quat;
    protected _direction: Vec3;

    public _handler: GeoObjectHandler | null;
    public _handlerIndex = -1;

    public _tagData: InstanceData | null;
    public _tagDataIndex: number;

    protected _object3d: Object3d;
    public _objectSrc?: string;

    protected _visibility: boolean;

    protected _children: GeoObject[];

    constructor(options: IGeoObjectParams) {

        this._tag = options.tag || `tag_${GeoObject.__counter__++}`;

        this._entity = null;

        this._position = utils.createVector3(options.position);

        this._rtcPositionHigh = new Vec3();``
        this._rtcPositionLow = new Vec3();

        this._scale = utils.createVector3(options.scale, new Vec3(1, 1, 1));
        this._translate = utils.createVector3(options.translate, new Vec3());

        this._localPosition = new Vec3();

        const [r = 0.15, g = 0.15, b = 0.15, a = 1.0] = options.object3d?.color 
            ? Array.from(options.object3d.color) 
            : [];
        
        this._color = utils.createColorRGBA(options.color, new Vec4(r, g, b, a));

        this._handler = null;
        this._handlerIndex = -1;

        this._tagData = null;
        this._tagDataIndex = -1;
        let object3d = options.object3d;
        if ((!options.object3d || options.object3d?.vertices.length === 0)) {
            object3d = new Object3d();
        }
        if (options.objSrc) {
            this.setObjectSrc(options.objSrc)
            this._objectSrc = options.objSrc;
        }

        this._object3d = object3d as Object3d;

        // if (options.colorTexture) {
        //     this.setColorTexture(options.colorTexture)
        // }

        this._visibility = (options.visibility != undefined ? options.visibility : true);

        this._children = [];

        this._direction = new Vec3();

        this._qFrame = new Quat();

        this._qRot = Quat.IDENTITY;
    }

    /**
     * Gets the unique tag of the geo object.
     * @returns {string}
     */
    public get tag() {
        return this._tag;
    }

    /**
     * Gets the position of the geo object.
     * @public
     * @returns {Vec3}
     */
    public getPosition(): Vec3 {
        return this._position;
    }

    /**
     * Gets the 3D object associated with this geo object.
     * @public
     * @returns {Object3d}
     */
    public get object3d(): Object3d {
        return this._object3d;
    }

    /**
     * Gets geometry mesh vertices.
     * @public
     * @returns {number[]}
     */
    public get vertices(): number[] {
        return this._object3d.vertices;
    }

    /**
     * Gets geometry mesh normals.
     * @public
     * @returns {number[]}
     */
    public get normals(): number[] {
        return this._object3d.normals;
    }

    /**
     * Gets geometry mesh texture coordinates.
     * @public
     * @returns {number[]}
     */
    public get texCoords(): number[] {
        return this._object3d.texCoords;
    }

    /**
     * Gets geometry mesh indices.
     * @public
     * @returns {number[]}
     */
    public get indices(): number[] {
        return this._object3d.indices;
    }

    /**
     * Sets the opacity of the geo object.
     * @param {number} a - Opacity value (0 to 1).
     */
    public setOpacity(a: number) {
        this._color.w = a;
        this.setColor(this._color.x, this._color.y, this._color.z, a);
    }

    /**
     * Gets the opacity of the geo object.
     * @returns {number}
     */
    public getOpacity(): number {
        return this._color.w;
    }

    /**
     * Sets the color of the geo object.
     * @param {number} r - Red component.
     * @param {number} g - Green component.
     * @param {number} b - Blue component.
     * @param {number} [a] - Alpha component.
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
        this.updateRTCPosition();
        this.updateRotation();
    }

    public updateRTCPosition() {
        //Vec3.doubleToTwoFloats(this._position, this._rtcPositionHigh, this._rtcPositionLow);
        if (this._handler) {
            this._handler.getRTCPosition(this._position, this._rtcPositionHigh, this._rtcPositionLow);
            this._handler.setRTCPositionArr(this._tagData!, this._tagDataIndex, this._rtcPositionHigh, this._rtcPositionLow);
        }
    }

    /**
     * Sets geo object position.
     * @public
     * @param {Vec3} position - Cartesian coordinates.
     */
    public setPosition3v(position: Vec3) {
        this.setPosition(position.x, position.y, position.z);
    }

    /**
     * Sets Object3d for the object
     * @param {Object3d} object
     */
    public setObject(object: Object3d) {
        this._object3d = object;
    }

    /**
     * Sets the object url source.
     * @param {string} src
     */
    public setObjectSrc(src: string) {
        this._objectSrc = src;
        this._handler && this._handler.setObjectSrc(src, this.tag);
    }

    /**
     * Sets object HTML color.
     * @param {string} color
     */
    public setColorHTML(color: string) {
        this.setColor4v(utils.htmlColorToRgba(color));
    }

    /**
     * Sets scales.
     * @public
     * @param {number} scale
     */
    public setScale(scale: number) {
        this._scale.x = this._scale.y = this._scale.z = scale;
        this._handler && this._handler.setScaleArr(this._tagData!, this._tagDataIndex, this._scale);
    }

    /**
     * Sets X, Y, Z axis scales
     * @public
     * @param {Vec3} scale
     */
    public setScale3v(scale: Vec3) {
        this._scale.copy(scale);
        this._handler && this._handler.setScaleArr(this._tagData!, this._tagDataIndex, scale);
    }

    /**
     * Gets scale.
     * @publci
     * @returns {Vec3}
     */
    public getScale(): Vec3 {
        return this._scale;
    }

    public setTranslate3v(translate: Vec3) {
        this._translate.copy(translate);
        this._handler && this._handler.setTranslateArr(this._tagData!, this._tagDataIndex, translate);
    }

    public getTranslate(): Vec3 {
        return this._translate.clone();
    }

    /**
     * Sets local offset position.
     * @param {Vec3} localPosition
     */
    public setLocalPosition3v(localPosition: Vec3) {
        this._localPosition.copy(localPosition);
        this._handler && this._handler.setLocalPositionArr(this._tagData!, this._tagDataIndex, localPosition);
    }

    /**
     * Gets local offset position.
     * @public
     * @returns {Vec3}
     */
    public getLocalPosition(): Vec3 {
        return this._localPosition.clone();
    }

    /**
     * Removes the geo object from the handler.
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

    /**
     * Sets the rotation quaternion.
     * @public
     * @param {Quat} qRot - Rotation quaternion.
     */
    public setRotation(qRot: Quat) {
        this._qRot.copy(qRot);
        this._qRot.mulVec3Res(LOCAL_FORWARD, this._direction).normalize();
        this.updateRotation();
    }

    /**
     * Returns orientation quaternion.
     * @public
     * @returns {Quat}
     */
    public getRotation(): Quat {
        return this._qRot;
    }

    /**
     * Update object rotation
     */
    public updateRotation() {
        this._handler && this._handler.setQRotArr(this._tagData!, this._tagDataIndex, this._qRot);
    }

    /**
     * Returns object direction
     * @publcu
     * @returns {Vec3}
     */
    public getDirection(): Vec3 {
        return this._direction.clone();
    }
}

export {GeoObject};
