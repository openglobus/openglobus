"use strict";

import * as utils from "../utils/shared";
import {NumberArray3, Vec3} from "../math/Vec3";
import {NumberArray4, Vec4} from "../math/Vec4";
import {Entity} from "./Entity.js";
import {RayHandler} from "./RayHandler";

export interface IRayParams {
    thickness?: number;
    startPosition?: Vec3 | NumberArray3;
    endPosition?: Vec3 | NumberArray3;
    startColor?: string | NumberArray4;
    endColor?: string | NumberArray4;
    visibility?: boolean;

}

/**
 * Ray class.
 * @class
 * @param {Object} [options] - Options:
 * @param {Vec3|Array.<number>} [options.startPosition] - Ray start point position.
 * @param {Vec3|Array.<number>} [options.endPosition] - Ray end point position.
 * @param {Vec3|Array.<number>} [options.startColor] - Ray start point color.
 * @param {Vec3|Array.<number>} [options.endColor] - Ray end point color.
 * @param {boolean} [options.visibility] - Visibility.
 */
class Ray {

    static __counter__: number = 0;
    /**
     * Object uniq identifier.
     * @protected
     * @type {number}
     */
    protected __id: number;

    protected _thickness: number;

    protected _startPosition: Vec3;
    protected _startPositionHigh: Vec3;
    protected _startPositionLow: Vec3;

    // RTE end position
    protected _endPosition: Vec3;
    protected _endPositionHigh: Vec3;
    protected _endPositionLow: Vec3;

    // start end point colors
    protected _startColor: Vec4;
    protected _endColor: Vec4;

    /**
     * Ray visibility.
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
     * @type {BillboardHandler}
     */
    protected _handler: RayHandler | null;

    /**
     * Billboard handler array index.
     * @protected
     * @type {number}
     */
    protected _handlerIndex: number;

    constructor(options: IRayParams = {}) {

        this.__id = Ray.__counter__++;

        this._thickness = options.thickness || 2.0;

        this._startPosition = utils.createVector3(options.startPosition);
        this._startPositionHigh = new Vec3();
        this._startPositionLow = new Vec3();
        Vec3.doubleToTwoFloats(
            this._startPosition,
            this._startPositionHigh,
            this._startPositionLow
        );

        this._endPosition = utils.createVector3(options.endPosition);
        this._endPositionHigh = new Vec3();
        this._endPositionLow = new Vec3();
        Vec3.doubleToTwoFloats(this._endPosition, this._endPositionHigh, this._endPositionLow);

        this._startColor = utils.createColorRGBA(options.startColor);
        this._endColor = utils.createColorRGBA(options.endColor);

        this._visibility = options.visibility != undefined ? options.visibility : true;

        this._entity = null;

        this._handler = null;

        this._handlerIndex = -1;
    }

    /**
     * Sets ray start position.
     * @public
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     * @param {number} z - Z coordinate.
     */
    public setStartPosition(x: number, y: number, z: number) {
        this._startPosition.x = x;
        this._startPosition.y = y;
        this._startPosition.z = z;
        Vec3.doubleToTwoFloats(
            this._startPosition,
            this._startPositionHigh,
            this._startPositionLow
        );
        this._handler &&
        this._handler.setStartPositionArr(
            this._handlerIndex,
            this._startPositionHigh,
            this._startPositionLow
        );
    }

    public getLength(): number {
        return this._startPosition.distance(this._endPosition);
    }

    /**
     * Sets ray start position.
     * @public
     * @param {Vec3} position - Cartesian coordinates.
     */
    public setStartPosition3v(position: Vec3) {
        this._startPosition.x = position.x;
        this._startPosition.y = position.y;
        this._startPosition.z = position.z;
        Vec3.doubleToTwoFloats(
            this._startPosition,
            this._startPositionHigh,
            this._startPositionLow
        );
        this._handler &&
        this._handler.setStartPositionArr(
            this._handlerIndex,
            this._startPositionHigh,
            this._startPositionLow
        );
    }

    /**
     * Sets ray end position.
     * @public
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     * @param {number} z - Z coordinate.
     */
    public setEndPosition(x: number, y: number, z: number) {
        this._endPosition.x = x;
        this._endPosition.y = y;
        this._endPosition.z = z;
        Vec3.doubleToTwoFloats(this._endPosition, this._endPositionHigh, this._endPositionLow);
        this._handler &&
        this._handler.setEndPositionArr(
            this._handlerIndex,
            this._endPositionHigh,
            this._endPositionLow
        );
    }

    /**
     * Sets ray end position.
     * @public
     * @param {Vec3} position - Cartesian coordinates.
     */
    public setEndPosition3v(position: Vec3) {
        this._endPosition.x = position.x;
        this._endPosition.y = position.y;
        this._endPosition.z = position.z;
        Vec3.doubleToTwoFloats(this._endPosition, this._endPositionHigh, this._endPositionLow);
        this._handler &&
        this._handler.setEndPositionArr(
            this._handlerIndex,
            this._endPositionHigh,
            this._endPositionLow
        );
    }

    public setThickness(thickness: number) {
        this._thickness = thickness;
        this._handler && this._handler.setThicknessArr(this._handlerIndex, thickness);
    }

    public setColors4v(startColor?: Vec4, endColor?: Vec4) {
        if (startColor) {
            this._startColor.x = startColor.x;
            this._startColor.y = startColor.y;
            this._startColor.z = startColor.z;
            this._startColor.w = startColor.w;
        }

        if (endColor) {
            this._endColor.x = endColor.x;
            this._endColor.y = endColor.y;
            this._endColor.z = endColor.z;
            this._endColor.w = endColor.w;
        }

        this._handler &&
        this._handler.setRgbaArr(this._handlerIndex, this._startColor, this._endColor);
    }

    public setColorsHTML(startColor?: string, endColor?: string) {
        if (startColor) {
            this._startColor = utils.htmlColorToRgba(startColor);
        }

        if (endColor) {
            this._endColor = utils.htmlColorToRgba(endColor);
        }

        this._handler && this._handler.setRgbaArr(this._handlerIndex, this._startColor, this._endColor);
    }

    /**
     * Returns ray start position.
     * @public
     * @returns {Vec3}
     */
    public getStartPosition(): Vec3 {
        return this._startPosition;
    }

    /**
     * Returns ray end position.
     * @public
     * @returns {Vec3}
     */
    public getEndPosition(): Vec3 {
        return this._endPosition;
    }

    /**
     * Sets visibility.
     * @public
     * @param {boolean} visibility - Visibility flag.
     */
    public setVisibility(visibility: boolean) {
        this._visibility = visibility;
        this._handler && this._handler.setVisibility(this._handlerIndex, visibility);
    }

    /**
     * Returns visibility.
     * @public
     * @returns {boolean}
     */
    public getVisibility(): boolean {
        return this._visibility;
    }

    /**
     * Remove from handler.
     * @public
     */
    public remove() {
        this._entity = null;
        this._handler && this._handler.remove(this);
    }

    /**
     * Set picking color.
     * @public
     * @param {Vec3} color - Picking color.
     */
    public setPickingColor3v(color: Vec3) {
        this._handler && this._handler.setPickingColorArr(this._handlerIndex, color);
    }
}

export {Ray};
