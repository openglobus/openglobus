import * as utils from "../utils/shared";
import {Entity} from "./Entity";
import {LOCK_FREE, LOCK_UPDATE} from "./LabelWorker.js";
import {NumberArray3, Vec3} from "../math/Vec3";
import {NumberArray4, Vec4} from "../math/Vec4";
import {BaseBillboardHandler} from "./BaseBillboardHandler";

export interface IBaseBillboardParams {
    position?: NumberArray3 | Vec3;
    rotation?: number;
    color?: string | NumberArray4 | Vec4;
    alignedAxis?: NumberArray3 | Vec3;
    offset?: NumberArray3 | Vec3;
    visibility?: boolean;
}

/**
 * Base prototype for billboard and label classes.
 * @class
 * @param {Object} [options] - Options:
 * @param {Vec3|Array.<number>} [options.position] - Billboard position.
 * @param {number} [options.rotation] - Screen angle rotation.
 * @param {Vec4|string|Array.<number>} [options.color] - Billboard color.
 * @param {Vec3|Array.<number>} [options.alignedAxis] - Billboard aligned vector.
 * @param {Vec3|Array.<number>} [options.offset] - Billboard center screen offset.
 * @param {boolean} [options.visibility] - Visibility.
 */
class BaseBillboard {
    static __counter__: number = 0;
    protected __id: number;

    /**
     * Billboard center cartesian position.
     * @protected
     * @type {Vec3}
     */
    protected _position: Vec3;

    protected _positionHigh: Vec3;

    protected _positionLow: Vec3;

    /**
     * Screen space rotation angle.
     * @protected
     * @type {number}
     */
    protected _rotation: number;

    /**
     * RGBA color.
     * @protected
     * @type {Vec4}
     */
    protected _color: Vec4;

    /**
     * Cartesian aligned axis vector.
     * @protected
     * @type {Vec3}
     */
    protected _alignedAxis: Vec3;

    /**
     * Billboard center screen space offset. Where x,y - screen space offset and z - depth offset.
     * @protected
     * @type {Vec3}
     */
    protected _offset: Vec3;

    /**
     * Billboard visibility.
     * @protected
     * @type {boolean}
     */
    protected _visibility: boolean;

    /**
     * Entity instance that holds this billboard.
     * @protected
     * @type {Entity}
     */
    protected _entity: Entity | null;

    /**
     * Handler that stores and renders this billboard object.
     * @protected
     * @type {BillboardHandler | null}
     */
    protected _handler: BaseBillboardHandler | null;

    /**
     * Billboard handler array index.
     * @protected
     * @type {number}
     */
    protected _handlerIndex: number;

    /**
     * An indication that the object is ready to draw
     * @protected
     * @type {number}
     */
    protected _isReady: boolean;

    public _lockId: number;

    constructor(options: IBaseBillboardParams = {}) {

        this.__id = BaseBillboard.__counter__++;

        this._position = utils.createVector3(options.position);

        this._positionHigh = new Vec3();

        this._positionLow = new Vec3();

        Vec3.doubleToTwoFloats(this._position, this._positionHigh, this._positionLow);

        this._rotation = options.rotation || 0;

        this._color = utils.createColorRGBA(options.color);

        this._alignedAxis = utils.createVector3(options.alignedAxis);

        this._offset = utils.createVector3(options.offset);

        this._visibility = options.visibility != undefined ? options.visibility : true;

        this._entity = null;

        this._handler = null;

        this._handlerIndex = -1;

        this._isReady = false;

        this._lockId = LOCK_FREE;
    }

    /**
     * Sets billboard position.
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
        if (this._isReady && this._handler) {
            this._handler.setPositionArr(this._handlerIndex, this._positionHigh, this._positionLow);
        } else if (this._lockId !== LOCK_FREE) {
            this._lockId = LOCK_UPDATE;
        }
    }

    /**
     * Sets billboard position.
     * @public
     * @param {Vec3} position - Cartesian coordinates.
     */
    public setPosition3v(position: Vec3) {
        this._position.x = position.x;
        this._position.y = position.y;
        this._position.z = position.z;
        Vec3.doubleToTwoFloats(position, this._positionHigh, this._positionLow);
        if (this._isReady && this._handler) {
            this._handler.setPositionArr(this._handlerIndex, this._positionHigh, this._positionLow);
        } else if (this._lockId !== LOCK_FREE) {
            this._lockId = LOCK_UPDATE;
        }
    }

    /**
     * Returns billboard position.
     * @public
     * @returns {Vec3}
     */
    public getPosition(): Vec3 {
        return this._position;
    }

    /**
     * Sets screen space offset.
     * @public
     * @param {number} x - X offset.
     * @param {number} y - Y offset.
     * @param {number} [z] - Z offset.
     */
    public setOffset(x: number, y: number, z?: number) {
        this._offset.x = x;
        this._offset.y = y;
        z != undefined && (this._offset.z = z);
        if (this._isReady && this._handler) {
            this._handler.setOffsetArr(this._handlerIndex, this._offset);
        } else if (this._lockId !== LOCK_FREE) {
            this._lockId = LOCK_UPDATE;
        }
    }

    /**
     * Sets screen space offset.
     * @public
     * @param {Vec2} offset - Offset size.
     */
    public setOffset3v(offset: Vec3) {
        this.setOffset(offset.x, offset.y, offset.z);
    }

    /**
     * Returns billboard screen space offset size.
     * @public
     * @returns {Vec3}
     */
    public getOffset(): Vec3 {
        return this._offset;
    }

    /**
     * Sets billboard screen space rotation in radians.
     * @public
     * @param {number} rotation - Screen space rotation in radians.
     */
    public setRotation(rotation: number) {
        if (rotation !== this._rotation) {
            this._rotation = rotation;
            if (this._isReady && this._handler) {
                this._handler.setRotationArr(this._handlerIndex, rotation);
            } else if (this._lockId !== LOCK_FREE) {
                this._lockId = LOCK_UPDATE;
            }
        }
    }

    /**
     * Gets screen space rotation.
     * @public
     * @returns {number}
     */
    public getRotation(): number {
        return this._rotation;
    }

    /**
     * Sets billboard opacity.
     * @public
     * @param {number} a - Billboard opacity.
     */
    public setOpacity(a: number) {
        if (a !== this._color.w) {
            a != undefined && (this._color.w = a);
            if (this._isReady && this._handler) {
                this._handler.setRgbaArr(this._handlerIndex, this._color);
            } else if (this._lockId !== LOCK_FREE) {
                this._lockId = LOCK_UPDATE;
            }
        }
    }

    /**
     * Sets RGBA color. Each channel from 0.0 to 1.0.
     * @public
     * @param {number} r - Red.
     * @param {number} g - Green.
     * @param {number} b - Blue.
     * @param {number} a - Alpha.
     */
    public setColor(r: number, g: number, b: number, a?: number) {
        if (a !== this._color.w || r !== this._color.x || g !== this._color.y || this._color.z !== b) {
            this._color.x = r;
            this._color.y = g;
            this._color.z = b;
            a != undefined && (this._color.w = a);
            if (this._isReady && this._handler) {
                this._handler.setRgbaArr(this._handlerIndex, this._color);
            } else if (this._lockId !== LOCK_FREE) {
                this._lockId = LOCK_UPDATE;
            }
        }
    }

    /**
     * Sets RGBA color. Each channel from 0.0 to 1.0.
     * @public
     * @param {Vec4} color - RGBA vector.
     */
    public setColor4v(color: Vec4) {
        this.setColor(color.x, color.y, color.z, color.w);
    }

    /**
     * Sets billboard color.
     * @public
     * @param {string} color - HTML style color.
     */
    public setColorHTML(color: string) {
        this.setColor4v(utils.htmlColorToRgba(color));
    }

    /**
     * Returns RGBA color.
     * @public
     * @returns {Vec4}
     */
    public getColor(): Vec4 {
        return this._color;
    }

    /**
     * Sets billboard visibility.
     * @public
     * @param {boolean} visibility - Visibility flag.
     */
    public setVisibility(visibility: boolean) {
        if (visibility !== this._visibility) {
            this._visibility = visibility;
            if (this._isReady && this._handler) {
                this._handler.setVisibility(this._handlerIndex, visibility);
            } else if (this._lockId !== LOCK_FREE) {
                this._lockId = LOCK_UPDATE;
            }
        }
    }

    /**
     * Returns billboard visibility.
     * @public
     * @returns {boolean}
     */
    public getVisibility(): boolean {
        return this._visibility;
    }

    /**
     * Sets billboard cartesian aligned vector.
     * @public
     * @param {number} x - Aligned vector X coordinate.
     * @param {number} y - Aligned vector Y coordinate.
     * @param {number} z - Aligned vector Z coordinate.
     */
    public setAlignedAxis(x: number, y: number, z: number) {
        this._alignedAxis.x = x;
        this._alignedAxis.y = y;
        this._alignedAxis.z = z;
        if (this._isReady && this._handler) {
            this._handler.setAlignedAxisArr(this._handlerIndex, this._alignedAxis);
        } else if (this._lockId !== LOCK_FREE) {
            this._lockId = LOCK_UPDATE;
        }
    }

    /**
     * Sets billboard aligned vector.
     * @public
     * @param {Vec3} alignedAxis - Align direction.
     */
    public setAlignedAxis3v(alignedAxis: Vec3) {
        this.setAlignedAxis(alignedAxis.x, alignedAxis.y, alignedAxis.z);
    }

    /**
     * Returns aligned vector.
     * @public
     * @returns {Vec3}
     */
    public getAlignedAxis(): Vec3 {
        return this._alignedAxis;
    }

    /**
     * Removes billboard from handler.
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
        if (this._isReady && this._handler) {
            this._handler.setPickingColorArr(this._handlerIndex, color);
        } else if (this._lockId !== LOCK_FREE) {
            this._lockId = LOCK_UPDATE;
        }
    }

    public serializeWorkerData(workerId: number): Float32Array{
        return new Float32Array([]);
    }
}

export {BaseBillboard};
