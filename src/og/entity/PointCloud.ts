"use strict";

import {Entity} from "./Entity";
import {PointCloudHandler} from "./PointCloudHandler";
import {RenderNode} from "../scene/RenderNode";
import {Vec3} from "../math/Vec3";
import {Vec4} from "../math/Vec4";
import {WebGLBufferExt} from "../webgl/Handler";
import {EntityCollection} from "./EntityCollection";

export interface IPointCloudParams {
    visibility?: boolean;
    pointSize?: number;
    pickingScale?: number;
    points?: Poi[];
}

type Poi = [number, number, number, number, number, number, number, any | undefined];

interface IPoint {
    _entity: Entity | null;
    _pickingColor: Vec3;
    _entityCollection: EntityCollection | null;
    index: number;
    position: Vec3;
    color: Vec4;
    pointCloud: PointCloud;
    properties: any
}

const COORDINATES_BUFFER = 0;
const COLOR_BUFFER = 1;
const PICKING_COLOR_BUFFER = 2;

/**
 * PointCloud object.
 * @class
 * @param {*} [options] - Point cloud options:
 * @param {Array.<Array.<number>>} [options.points] - Points cartesian coordinates array,
 * where first three is cartesian coordinates, next fourth is an RGBA color, and last is a point properties.
 * @param {number} [options.pointSize] - Point screen size in pixels.
 * @param {number} [options.pickingScale] - Point border picking size in screen pixels.
 * @param {boolean} [options.visibility] - Point cloud visibility.
 * @example <caption>Creates point cloud with two ten pixel size points</caption>
 * new og.Entity({
 *     pointCloud: {
 *         pointSize: 10,
 *         points: [
 *             [0, 0, 0, 255, 255, 255, 255, { 'name': 'White point' }],
 *             [100, 100, 0, 255, 0, 0, 255, { 'name': 'Red point' }]
 *         ]
 *     }
 * });
 */
class PointCloud {
    static __counter__: number = 0;
    protected __id: number;

    /**
     * Cloud visibility.
     * @public
     * @type {boolean}
     */
    public visibility: boolean;

    /**
     * Point screen size in pixels.
     * @public
     * @type {number}
     */
    public pointSize: number;

    /**
     * Point picking border size in pixels.
     * @public
     * @type {number}
     */
    public pickingScale: number;

    /**
     * Parent collection render node.
     * @protected
     * @type {RenderNode | null}
     */
    protected _renderNode: RenderNode | null;

    /**
     * Entity instance that holds this point cloud.
     * @protected
     * @type {Entity | null}
     */
    protected _entity: Entity | null;

    /**
     * Points properties.
     * @protected
     * @type {IPoint[]}
     */
    protected _points: IPoint[];

    /**
     * Coordinates array.
     * @protected
     * @type {number[]}
     */
    protected _coordinatesData: number[];

    /**
     * Color array.
     * @protected
     * @type {number[]}
     */
    protected _colorData: number[];

    /**
     * Picking color array.
     * @protected
     * @type {number[]}
     */
    protected _pickingColorData: number[];

    protected _coordinatesBuffer: WebGLBufferExt | null;
    protected _colorBuffer: WebGLBufferExt | null;
    protected _pickingColorBuffer: WebGLBufferExt | null;

    /**
     * Handler that stores and renders this object.
     * @protected
     * @type {PointCloudHandler}
     */
    protected _handler: PointCloudHandler | null;
    protected _handlerIndex: number;

    protected _buffersUpdateCallbacks: Function[];
    protected _changedBuffers: boolean[];

    constructor(options: IPointCloudParams = {}) {

        this.__id = PointCloud.__counter__++;

        /**
         * Cloud visibility.
         * @public
         * @type {boolean}
         */
        this.visibility = options.visibility != undefined ? options.visibility : true;

        /**
         * Point screen size in pixels.
         * @public
         * @type {number}
         */
        this.pointSize = options.pointSize || 3;

        /**
         * Point picking border size in pixels.
         * @public
         * @type {number}
         */
        this.pickingScale = options.pickingScale || 0;

        /**
         * Parent collection render node.
         * @private
         * @type {RenderNode}
         */
        this._renderNode = null;

        /**
         * Entity instance that holds this point cloud.
         * @private
         * @type {Entity}
         */
        this._entity = null;

        /**
         * Points properties.
         * @private
         * @type {IPoint[]}
         */
        this._points = [];

        /**
         * Coordinates array.
         * @private
         * @type {Array.<number>}
         */
        this._coordinatesData = [];

        /**
         * Color array.
         * @private
         * @type {Array.<number>}
         */
        this._colorData = [];

        /**
         * Picking color array.
         * @private
         * @type {Array.<number>}
         */
        this._pickingColorData = [];

        this._coordinatesBuffer = null;
        this._colorBuffer = null;
        this._pickingColorBuffer = null;

        /**
         * Handler that stores and renders this object.
         * @private
         * @type {PointCloudHandler}
         */
        this._handler = null;
        this._handlerIndex = -1;

        this._buffersUpdateCallbacks = [];
        this._buffersUpdateCallbacks[COORDINATES_BUFFER] = this._createCoordinatesBuffer;
        this._buffersUpdateCallbacks[COLOR_BUFFER] = this._createColorBuffer;
        this._buffersUpdateCallbacks[PICKING_COLOR_BUFFER] = this._createPickingColorBuffer;

        this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);

        if (options.points) {
            this.setPoints(options.points);
        }
    }

    /**
     * Clears point cloud data
     * @public
     */
    public clear() {
        this._points.length = 0;
        this._points = [];

        this._coordinatesData.length = 0;
        this._coordinatesData = [];

        this._colorData.length = 0;
        this._colorData = [];

        this._pickingColorData.length = 0;
        this._pickingColorData = [];

        this._deleteBuffers();
    }

    /**
     * Sets cloud visibility.
     * @public
     * @param {boolean} visibility - Visibility flag.
     */
    public setVisibility(visibility: boolean) {
        this.visibility = visibility;
    }

    /**
     * @return {boolean} Point cloud visibility.
     */
    public getVisibility(): boolean {
        return this.visibility;
    }

    /**
     * Assign rendering scene node.
     * @public
     * @param {RenderNode}  renderNode - Assigned render node.
     */
    public setRenderNode(renderNode: RenderNode) {
        this._renderNode = renderNode;
        this._setPickingColors();
    }

    /**
     * Removes from entity.
     * @public
     */
    public remove() {
        this._entity = null;
        this._handler && this._handler.remove(this);
    }

    /**
     * Adds points to render.
     * @public
     * @param { Poi[]} points - Point cloud array.
     * @example
     * var points = [[0, 0, 0, 255, 255, 255, 255, { 'name': 'White point' }], [100, 100, 0, 255, 0, 0, 255, { 'name': 'Red point' }]];
     */
    public setPoints(points: Poi[]) {
        this.clear();
        for (let i = 0; i < points.length; i++) {
            let pi = points[i];

            let pos = new Vec3(pi[0], pi[1], pi[2]),
                col = new Vec4(pi[3], pi[4], pi[5], pi[6] == undefined ? 255.0 : pi[6]);

            this._coordinatesData.push(pos.x, pos.y, pos.z);

            this._colorData.push(col.x / 255.0, col.y / 255.0, col.z / 255.0, col.w / 255.0);

            // @ts-ignore
            let p = {
                _entity: this._entity,
                _pickingColor: new Vec3(),
                // @ts-ignore
                _entityCollection: this._entity ? this._entity._entityCollection : null,
                index: i,
                position: pos,
                color: col,
                pointCloud: this,
                properties: pi[7] || {}
            };

            this._points.push(p);

            if (this._renderNode && this._renderNode.renderer) {
                this._renderNode.renderer.assignPickingColor(p);
                this._pickingColorData.push(
                    p._pickingColor.x / 255.0,
                    p._pickingColor.y / 255.0,
                    p._pickingColor.z / 255.0,
                    1.0
                );
            }
        }

        this._changedBuffers[COORDINATES_BUFFER] = true;
        this._changedBuffers[COLOR_BUFFER] = true;
        this._changedBuffers[PICKING_COLOR_BUFFER] = true;
    }

    public setPointPosition(index: number, x: number, y: number, z: number) {
        // TODO: ...
        this._changedBuffers[COORDINATES_BUFFER] = true;
    }

    public setPointColor(index: number, r: number, g: number, b: number, a: number) {
        // TODO: ...
        this._changedBuffers[COLOR_BUFFER] = true;
    }

    public addPoints(points: Poi[]) {
        // TODO: ...
        this._changedBuffers[COORDINATES_BUFFER] = true;
        this._changedBuffers[COLOR_BUFFER] = true;
        this._changedBuffers[PICKING_COLOR_BUFFER] = true;
    }

    public addPoint(index: number, point: Poi) {
        // TODO: ...
        this._changedBuffers[COORDINATES_BUFFER] = true;
        this._changedBuffers[COLOR_BUFFER] = true;
        this._changedBuffers[PICKING_COLOR_BUFFER] = true;
    }

    /**
     * Returns specific point by index.
     * @public
     * @param {number} index - Point index.
     * @return {Poi} Specific point
     */
    public getPoint(index: number): IPoint {
        return this._points[index];
    }

    public removePoint(index: number) {
        // TODO: ...
        this._changedBuffers[COORDINATES_BUFFER] = true;
        this._changedBuffers[COLOR_BUFFER] = true;
        this._changedBuffers[PICKING_COLOR_BUFFER] = true;
    }

    public insertPoint(index: number, point: Poi) {
        // TODO: ...
        this._changedBuffers[COORDINATES_BUFFER] = true;
        this._changedBuffers[COLOR_BUFFER] = true;
        this._changedBuffers[PICKING_COLOR_BUFFER] = true;
    }

    public draw() {
        if (this.visibility && this._coordinatesData.length) {
            this._update();

            let rn = this._renderNode!;
            let r = rn.renderer!;
            let sh = r.handler.programs.pointCloud;
            let p = sh._program;
            let gl = r.handler.gl!,
                sha = p.attributes,
                shu = p.uniforms;

            // gl.polygonOffset(
            //     this._handler._entityCollection.polygonOffsetFactor,
            //     this._handler._entityCollection.polygonOffsetUnits
            // );

            sh.activate();

            gl.uniformMatrix4fv(shu.projectionViewMatrix, false, r.activeCamera!.getProjectionViewMatrix());

            //@ts-ignore
            gl.uniform1f(shu.opacity, this._handler._entityCollection._fadingOpacity);
            gl.uniform1f(shu.pointSize, this.pointSize);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._coordinatesBuffer as WebGLBuffer);
            gl.vertexAttribPointer(sha.coordinates, this._coordinatesBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._colorBuffer as WebGLBuffer);
            gl.vertexAttribPointer(sha.colors, this._colorBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.drawArrays(gl.POINTS, 0, this._coordinatesBuffer!.numItems);
        }
    }

    public drawPicking() {
        if (this.visibility && this._coordinatesData.length) {
            let rn = this._renderNode!;
            let r = rn.renderer!;
            let sh = r.handler.programs.pointCloud;
            let p = sh._program;
            let gl = r.handler.gl!,
                sha = p.attributes,
                shu = p.uniforms;

            sh.activate();

            // gl.polygonOffset(
            //     this._handler._entityCollection.polygonOffsetFactor,
            //     this._handler._entityCollection.polygonOffsetUnits
            // );

            gl.uniformMatrix4fv(shu.projectionViewMatrix, false, r.activeCamera!.getProjectionViewMatrix());

            //@ts-ignore
            gl.uniform1f(shu.opacity, this._handler._entityCollection._fadingOpacity);
            gl.uniform1f(shu.pointSize, this.pointSize + this.pickingScale);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._coordinatesBuffer as WebGLBuffer);
            gl.vertexAttribPointer(sha.coordinates, this._coordinatesBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._pickingColorBuffer as WebGLBuffer);
            gl.vertexAttribPointer(sha.colors, this._pickingColorBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.drawArrays(gl.POINTS, 0, this._coordinatesBuffer!.numItems);
        }
    }

    /**
     * Update gl buffers.
     * @protected
     */
    protected _update() {
        if (this._renderNode) {
            let i = this._changedBuffers.length;
            while (i--) {
                if (this._changedBuffers[i]) {
                    this._buffersUpdateCallbacks[i].call(this);
                    this._changedBuffers[i] = false;
                }
            }
        }
    }

    /**
     * Delete buffers
     * @protected
     */
    protected _deleteBuffers() {
        if (this._renderNode) {
            let r = this._renderNode.renderer!,
                gl = r.handler.gl!;

            gl.deleteBuffer(this._coordinatesBuffer as WebGLBuffer);
            gl.deleteBuffer(this._colorBuffer as WebGLBuffer);
            gl.deleteBuffer(this._pickingColorBuffer as WebGLBuffer);
        }

        this._coordinatesBuffer = null;
        this._colorBuffer = null;
        this._pickingColorBuffer = null;
    }

    protected _createCoordinatesBuffer() {
        let h = this._renderNode!.renderer!.handler;
        h.gl!.deleteBuffer(this._coordinatesBuffer as WebGLBuffer);
        this._coordinatesBuffer = h.createArrayBuffer(
            new Float32Array(this._coordinatesData),
            3,
            this._coordinatesData.length / 3
        );
    }

    protected _createColorBuffer() {
        let h = this._renderNode!.renderer!.handler;
        h.gl!.deleteBuffer(this._colorBuffer as WebGLBuffer);
        this._colorBuffer = h.createArrayBuffer(
            new Float32Array(this._colorData),
            4,
            this._colorData.length / 4
        );
    }

    protected _createPickingColorBuffer() {
        let h = this._renderNode!.renderer!.handler;
        h.gl!.deleteBuffer(this._pickingColorBuffer as WebGLBuffer);
        this._pickingColorBuffer = h.createArrayBuffer(
            new Float32Array(this._pickingColorData),
            4,
            this._pickingColorData.length / 4
        );
    }

    protected _setPickingColors() {
        if (this._renderNode && this._renderNode.renderer) {
            for (let i = 0; i < this._points.length; i++) {
                let p = this._points[i];
                p._entity = this._entity;
                // @ts-ignore
                p._entityCollection = this._entity!._entityCollection;
                this._renderNode.renderer.assignPickingColor(p);
                this._pickingColorData.push(
                    p._pickingColor.x / 255.0,
                    p._pickingColor.y / 255.0,
                    p._pickingColor.z / 255.0,
                    1.0
                );
            }
            this._changedBuffers[PICKING_COLOR_BUFFER] = true;
        }
    }
}

export {PointCloud};
