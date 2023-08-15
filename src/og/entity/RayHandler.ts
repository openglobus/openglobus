"use strict";

import * as shaders from "../shaders/ray.js";
import {concatArrays, makeArrayTyped, spliceArray, TypedArray} from "../utils/shared";
import {EntityCollection} from "./EntityCollection";
import {Ray} from "./Ray";
import {Renderer} from "../renderer/Renderer";
import {Vec3} from "../math/Vec3";
import {Vec4} from "../math/Vec4";
import {WebGLBufferExt} from "../webgl/Handler";

const PICKINGCOLOR_BUFFER = 0;
const START_POSITION_BUFFER = 1;
const END_POSITION_BUFFER = 2;
const RGBA_BUFFER = 3;
const THICKNESS_BUFFER = 4;
const VERTEX_BUFFER = 5;

/*
 * og.RayHandler
 *
 *
 */
class RayHandler {

    static __counter__: number = 0;

    protected __id: number;

    /**
     * Picking rendering option.
     * @public
     * @type {boolean}
     */
    public pickingEnabled: boolean;

    protected _entityCollection: EntityCollection;

    protected _renderer: Renderer | null;

    protected _rays: Ray[];

    protected _vertexBuffer: WebGLBufferExt | null;
    protected _startPositionHighBuffer: WebGLBufferExt | null;
    protected _startPositionLowBuffer: WebGLBufferExt | null;
    protected _endPositionHighBuffer: WebGLBufferExt | null;
    protected _endPositionLowBuffer: WebGLBufferExt | null;
    protected _thicknessBuffer: WebGLBufferExt | null;
    protected _rgbaBuffer: WebGLBufferExt | null;
    protected _pickingColorBuffer: WebGLBufferExt | null;

    protected _vertexArr: TypedArray | number[];
    protected _startPositionHighArr: TypedArray | number[];
    protected _startPositionLowArr: TypedArray | number[];
    protected _endPositionHighArr: TypedArray | number[];
    protected _endPositionLowArr: TypedArray | number[];
    protected _thicknessArr: TypedArray | number[];
    protected _rgbaArr: TypedArray | number[];
    protected _pickingColorArr: TypedArray | number[];

    protected _buffersUpdateCallbacks: Function[];
    protected _changedBuffers: boolean[];

    constructor(entityCollection: EntityCollection) {

        this.__id = RayHandler.__counter__++;

        /**
         * Picking rendering option.
         * @public
         * @type {boolean}
         */
        this.pickingEnabled = true;

        this._entityCollection = entityCollection;

        this._renderer = null;

        this._rays = [];

        this._vertexBuffer = null;
        this._startPositionHighBuffer = null;
        this._startPositionLowBuffer = null;
        this._endPositionHighBuffer = null;
        this._endPositionLowBuffer = null;
        this._thicknessBuffer = null;
        this._rgbaBuffer = null;
        this._pickingColorBuffer = null;

        this._vertexArr = [];
        this._startPositionHighArr = [];
        this._startPositionLowArr = [];
        this._endPositionHighArr = [];
        this._endPositionLowArr = [];
        this._thicknessArr = [];
        this._rgbaArr = [];
        this._pickingColorArr = [];

        this._buffersUpdateCallbacks = [];
        this._buffersUpdateCallbacks[VERTEX_BUFFER] = this.createVertexBuffer;
        this._buffersUpdateCallbacks[START_POSITION_BUFFER] = this.createStartPositionBuffer;
        this._buffersUpdateCallbacks[END_POSITION_BUFFER] = this.createEndPositionBuffer;
        this._buffersUpdateCallbacks[THICKNESS_BUFFER] = this.createThicknessBuffer;
        this._buffersUpdateCallbacks[RGBA_BUFFER] = this.createRgbaBuffer;
        this._buffersUpdateCallbacks[PICKINGCOLOR_BUFFER] = this.createPickingColorBuffer;

        this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);
    }

    static concArr(dest: number[], curr: number[]) {
        for (let i = 0; i < curr.length; i++) {
            dest.push(curr[i]);
        }
    }

    public initProgram() {
        if (this._renderer && this._renderer.handler) {
            if (!this._renderer.handler.programs.rayScreen) {
                this._renderer.handler.addProgram(shaders.rayScreen());
            }

            // @todo: ray picking
            // if (!this._renderer.handler.programs.billboardPicking) {
            //     this._renderer.handler.addProgram(shaders.billboardPicking());
            // }
        }
    }

    public setRenderer(renderer: Renderer) {
        this._renderer = renderer;
        this.initProgram();
    }

    public refresh() {
        let i = this._changedBuffers.length;
        while (i--) {
            this._changedBuffers[i] = true;
        }
    }

    protected _removeRays() {
        let i = this._rays.length;
        while (i--) {
            let ri = this._rays[i];
            //@ts-ignore
            ri._handlerIndex = -1;
            //@ts-ignore
            ri._handler = null;
        }
        this._rays.length = 0;
        this._rays = [];
    }

    public clear() {
        //@ts-ignore
        this._vertexArr = null;
        //@ts-ignore
        this._startPositionHighArr = null;
        //@ts-ignore
        this._startPositionLowArr = null;
        //@ts-ignore
        this._endPositionHighArr = null;
        //@ts-ignore
        this._endPositionLowArr = null;
        //@ts-ignore
        this._thicknessArr = null;
        //@ts-ignore
        this._rgbaArr = null;

        this._vertexArr = new Float32Array([]);
        this._startPositionHighArr = new Float32Array([]);
        this._startPositionLowArr = new Float32Array([]);
        this._endPositionHighArr = new Float32Array([]);
        this._endPositionLowArr = new Float32Array([]);
        this._thicknessArr = new Float32Array([]);
        this._rgbaArr = new Float32Array([]);

        this._removeRays();
        this._deleteBuffers();
        this.refresh();
    }

    protected _deleteBuffers() {
        if (this._renderer) {
            let gl = this._renderer.handler.gl;

            if (gl) {
                gl.deleteBuffer(this._startPositionHighBuffer as WebGLBuffer);
                gl.deleteBuffer(this._startPositionLowBuffer as WebGLBuffer);
                gl.deleteBuffer(this._endPositionHighBuffer as WebGLBuffer);
                gl.deleteBuffer(this._endPositionLowBuffer as WebGLBuffer);
                gl.deleteBuffer(this._thicknessBuffer as WebGLBuffer);
                gl.deleteBuffer(this._rgbaBuffer as WebGLBuffer);
                gl.deleteBuffer(this._vertexBuffer as WebGLBuffer);
            }

            this._startPositionHighBuffer = null;
            this._startPositionLowBuffer = null;
            this._endPositionHighBuffer = null;
            this._endPositionLowBuffer = null;
            this._thicknessBuffer = null;
            this._rgbaBuffer = null;
            this._vertexBuffer = null;
        }
    }

    public update() {
        if (this._renderer) {
            let i = this._changedBuffers.length;
            while (i--) {
                if (this._changedBuffers[i]) {
                    this._buffersUpdateCallbacks[i].call(this);
                    this._changedBuffers[i] = false;
                }
            }
        }
    }

    public add(ray: Ray) {
        //@ts-ignore
        if (ray._handlerIndex == -1) {
            //@ts-ignore
            ray._handler = this;
            //@ts-ignore
            ray._handlerIndex = this._rays.length;
            this._rays.push(ray);
            this._addRayToArrays(ray);
            this.refresh();
        }
    }

    protected _addRayToArrays(ray: Ray) {
        //@ts-ignore
        if (ray._visibility) {
            this._vertexArr = concatArrays(
                this._vertexArr,
                [-0.5, 1.0, -0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 1.0, -0.5, 1.0]
            );
        } else {
            this._vertexArr = concatArrays(
                this._vertexArr,
                [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
            );
        }

        // @ts-ignore
        let x = ray._startPositionHigh.x, y = ray._startPositionHigh.y, z = ray._startPositionHigh.z;
        this._startPositionHighArr = concatArrays(this._startPositionHighArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        // @ts-ignore
        x = ray._startPositionLow.x;
        // @ts-ignore
        y = ray._startPositionLow.y;
        // @ts-ignore
        z = ray._startPositionLow.z;
        this._startPositionLowArr = concatArrays(this._startPositionLowArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        // @ts-ignore
        x = ray._endPositionHigh.x;
        // @ts-ignore
        y = ray._endPositionHigh.y;
        // @ts-ignore
        z = ray._endPositionHigh.z;
        this._endPositionHighArr = concatArrays(this._endPositionHighArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        // @ts-ignore
        x = ray._endPositionLow.x;
        // @ts-ignore
        y = ray._endPositionLow.y;
        // @ts-ignore
        z = ray._endPositionLow.z;
        this._endPositionLowArr = concatArrays(this._endPositionLowArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        //@ts-ignore
        x = ray._thickness;
        this._thicknessArr = concatArrays(this._thicknessArr, [x, x, x, x, x, x]);

        //@ts-ignore
        let r0 = ray._startColor.x,
            //@ts-ignore
            g0 = ray._startColor.y,
            //@ts-ignore
            b0 = ray._startColor.z,
            //@ts-ignore
            a0 = ray._startColor.w,
            //@ts-ignore
            r1 = ray._endColor.x,
            //@ts-ignore
            g1 = ray._endColor.y,
            //@ts-ignore
            b1 = ray._endColor.z,
            //@ts-ignore
            a1 = ray._endColor.w;
        this._rgbaArr = concatArrays(this._rgbaArr, [
            r1, g1, b1, a1,
            r0, g0, b0, a0,
            r0, g0, b0, a0,
            r0, g0, b0, a0,
            r1, g1, b1, a1,
            r1, g1, b1, a1
        ]);

        //@ts-ignore
        x = ray._entity._pickingColor.x / 255;
        //@ts-ignore
        y = ray._entity._pickingColor.y / 255;
        //@ts-ignore
        z = ray._entity._pickingColor.z / 255;
        this._pickingColorArr = concatArrays(this._pickingColorArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);
    }

    protected _displayPASS() {
        let r = this._renderer!;
        let h = r.handler;
        h.programs.rayScreen.activate();
        let sh = h.programs.rayScreen._program;
        let sha = sh.attributes,
            shu = sh.uniforms;

        let gl = h.gl!,
            ec = this._entityCollection;

        //gl.polygonOffset(ec.polygonOffsetFactor, ec.polygonOffsetUnits);

        gl.disable(gl.CULL_FACE);

        gl.uniform1f(shu.uOpacity, ec._fadingOpacity);

        gl.uniformMatrix4fv(shu.viewMatrix, false, r.activeCamera!.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, r.activeCamera!.getProjectionMatrix());

        gl.uniform3fv(shu.eyePositionHigh, r.activeCamera!.eyeHigh);
        gl.uniform3fv(shu.eyePositionLow, r.activeCamera!.eyeLow);

        //@ts-ignore
        gl.uniform1f(shu.resolution, r.activeCamera._tanViewAngle_hradOneByHeight);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._startPositionHighBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_startPosHigh, this._startPositionHighBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._startPositionLowBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_startPosLow, this._startPositionLowBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._endPositionHighBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_endPosHigh, this._endPositionHighBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._endPositionLowBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_endPosLow, this._endPositionLowBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rgbaBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_rgba, this._rgbaBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._thicknessBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_thickness, this._thicknessBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_vertices, this._vertexBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer!.numItems);

        gl.enable(gl.CULL_FACE);
    }

    protected _pickingPASS() {
        // ...
    }

    public draw() {
        if (this._rays.length) {
            this.update();
            this._displayPASS();
        }
    }

    public drawPicking() {
        if (this._rays.length && this.pickingEnabled) {
            this._pickingPASS();
        }
    }

    public reindexRaysArray(startIndex: number) {
        let r = this._rays;
        for (let i = startIndex; i < r.length; i++) {
            // @ts-ignore
            r[i]._handlerIndex = i;
        }
    }

    protected _removeRay(ray: Ray) {
        //@ts-ignore
        let ri = ray._handlerIndex;

        this._rays.splice(ri, 1);

        let i = ri * 24;
        this._rgbaArr = spliceArray(this._rgbaArr, i, 24);

        i = ri * 18;
        this._startPositionHighArr = spliceArray(this._startPositionHighArr, i, 18);
        this._startPositionLowArr = spliceArray(this._startPositionLowArr, i, 18);
        this._endPositionHighArr = spliceArray(this._endPositionHighArr, i, 18);
        this._endPositionLowArr = spliceArray(this._endPositionLowArr, i, 18);
        this._pickingColorArr = spliceArray(this._pickingColorArr, i, 18);

        i = ri * 12;
        this._vertexArr = spliceArray(this._vertexArr, i, 12);

        i = ri * 6;
        this._thicknessArr = spliceArray(this._thicknessArr, i, 6);

        this.reindexRaysArray(ri);
        this.refresh();

        //@ts-ignore
        ray._handlerIndex = -1;
        //@ts-ignore
        ray._handler = null;
    }

    public remove(ray: Ray) {
        //@ts-ignore
        if (ray._handler && this.__id == ray._handler.__id) {
            this._removeRay(ray);
        }
    }

    public setStartPositionArr(index: number, positionHigh: Vec3, positionLow: Vec3) {
        let i = index * 18;

        // High
        let a = this._startPositionHighArr,
            x = positionHigh.x,
            y = positionHigh.y,
            z = positionHigh.z;

        a[i] = x;
        a[i + 1] = y;
        a[i + 2] = z;

        a[i + 3] = x;
        a[i + 4] = y;
        a[i + 5] = z;

        a[i + 6] = x;
        a[i + 7] = y;
        a[i + 8] = z;

        a[i + 9] = x;
        a[i + 10] = y;
        a[i + 11] = z;

        a[i + 12] = x;
        a[i + 13] = y;
        a[i + 14] = z;

        a[i + 15] = x;
        a[i + 16] = y;
        a[i + 17] = z;

        // Low
        a = this._startPositionLowArr;
        x = positionLow.x;
        y = positionLow.y;
        z = positionLow.z;

        a[i] = x;
        a[i + 1] = y;
        a[i + 2] = z;

        a[i + 3] = x;
        a[i + 4] = y;
        a[i + 5] = z;

        a[i + 6] = x;
        a[i + 7] = y;
        a[i + 8] = z;

        a[i + 9] = x;
        a[i + 10] = y;
        a[i + 11] = z;

        a[i + 12] = x;
        a[i + 13] = y;
        a[i + 14] = z;

        a[i + 15] = x;
        a[i + 16] = y;
        a[i + 17] = z;

        this._changedBuffers[START_POSITION_BUFFER] = true;
    }

    public setEndPositionArr(index: number, positionHigh: Vec3, positionLow: Vec3) {
        let i = index * 18;

        // High
        let a = this._endPositionHighArr,
            x = positionHigh.x,
            y = positionHigh.y,
            z = positionHigh.z;

        a[i] = x;
        a[i + 1] = y;
        a[i + 2] = z;

        a[i + 3] = x;
        a[i + 4] = y;
        a[i + 5] = z;

        a[i + 6] = x;
        a[i + 7] = y;
        a[i + 8] = z;

        a[i + 9] = x;
        a[i + 10] = y;
        a[i + 11] = z;

        a[i + 12] = x;
        a[i + 13] = y;
        a[i + 14] = z;

        a[i + 15] = x;
        a[i + 16] = y;
        a[i + 17] = z;

        // Low
        a = this._endPositionLowArr;
        x = positionLow.x;
        y = positionLow.y;
        z = positionLow.z;

        a[i] = x;
        a[i + 1] = y;
        a[i + 2] = z;

        a[i + 3] = x;
        a[i + 4] = y;
        a[i + 5] = z;

        a[i + 6] = x;
        a[i + 7] = y;
        a[i + 8] = z;

        a[i + 9] = x;
        a[i + 10] = y;
        a[i + 11] = z;

        a[i + 12] = x;
        a[i + 13] = y;
        a[i + 14] = z;

        a[i + 15] = x;
        a[i + 16] = y;
        a[i + 17] = z;

        this._changedBuffers[END_POSITION_BUFFER] = true;
    }

    public setPickingColorArr(index: number, color: Vec3) {
        let i = index * 18;
        let a = this._pickingColorArr,
            x = color.x / 255,
            y = color.y / 255,
            z = color.z / 255;

        a[i] = x;
        a[i + 1] = y;
        a[i + 2] = z;

        a[i + 3] = x;
        a[i + 4] = y;
        a[i + 5] = z;

        a[i + 6] = x;
        a[i + 7] = y;
        a[i + 8] = z;

        a[i + 9] = x;
        a[i + 10] = y;
        a[i + 11] = z;

        a[i + 12] = x;
        a[i + 13] = y;
        a[i + 14] = z;

        a[i + 15] = x;
        a[i + 16] = y;
        a[i + 17] = z;

        this._changedBuffers[PICKINGCOLOR_BUFFER] = true;
    }

    public setRgbaArr(index: number, startColor: Vec4, endColor: Vec4) {
        let i = index * 24;
        let a = this._rgbaArr,
            r0 = startColor.x,
            g0 = startColor.y,
            b0 = startColor.z,
            a0 = startColor.w,
            r1 = endColor.x,
            g1 = endColor.y,
            b1 = endColor.z,
            a1 = endColor.w;

        a[i] = r1;
        a[i + 1] = g1;
        a[i + 2] = b1;
        a[i + 3] = a1;

        a[i + 4] = r0;
        a[i + 5] = g0;
        a[i + 6] = b0;
        a[i + 7] = a0;

        a[i + 8] = r0;
        a[i + 9] = g0;
        a[i + 10] = b0;
        a[i + 11] = a0;

        a[i + 12] = r0;
        a[i + 13] = g0;
        a[i + 14] = b0;
        a[i + 15] = a0;

        a[i + 16] = r1;
        a[i + 17] = g1;
        a[i + 18] = b1;
        a[i + 19] = a1;

        a[i + 20] = r1;
        a[i + 21] = g1;
        a[i + 22] = b1;
        a[i + 23] = a1;

        this._changedBuffers[RGBA_BUFFER] = true;
    }

    public setThicknessArr(index: number, thickness: number) {
        let i = index * 6;
        let a = this._thicknessArr;

        a[i] = thickness;
        a[i + 1] = thickness;
        a[i + 2] = thickness;
        a[i + 3] = thickness;
        a[i + 4] = thickness;
        a[i + 5] = thickness;

        this._changedBuffers[THICKNESS_BUFFER] = true;
    }

    public setVisibility(index: number, visibility: boolean) {
        let vArr: number[];
        if (visibility) {
            vArr = [-0.5, 1.0, -0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 1.0, -0.5, 1.0];
        } else {
            vArr = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
        }
        this.setVertexArr(index, vArr);
    }

    public setVertexArr(index: number, vertexArr: number[]) {
        let i = index * 12;
        let a = this._vertexArr;

        a[i] = vertexArr[0];
        a[i + 1] = vertexArr[1];
        a[i + 2] = vertexArr[2];

        a[i + 3] = vertexArr[3];
        a[i + 4] = vertexArr[4];
        a[i + 5] = vertexArr[5];

        a[i + 6] = vertexArr[6];
        a[i + 7] = vertexArr[7];
        a[i + 8] = vertexArr[8];

        a[i + 9] = vertexArr[9];
        a[i + 10] = vertexArr[10];
        a[i + 11] = vertexArr[11];

        this._changedBuffers[VERTEX_BUFFER] = true;
    }

    public createStartPositionBuffer() {
        let h = this._renderer!.handler;
        h.gl!.deleteBuffer(this._startPositionHighBuffer as WebGLBuffer);
        this._startPositionHighArr = makeArrayTyped(this._startPositionHighArr);
        this._startPositionHighBuffer = h.createArrayBuffer(
            this._startPositionHighArr as Float32Array,
            3,
            this._startPositionHighArr.length / 3,
            h.gl!.DYNAMIC_DRAW
        );
        h.gl!.deleteBuffer(this._startPositionLowBuffer as WebGLBuffer);
        this._startPositionLowArr = makeArrayTyped(this._startPositionLowArr);

        this._startPositionLowBuffer = h.createArrayBuffer(
            this._startPositionLowArr as Float32Array,
            3,
            this._startPositionLowArr.length / 3,
            h.gl!.DYNAMIC_DRAW
        );
    }

    public createEndPositionBuffer() {
        let h = this._renderer!.handler;
        h.gl!.deleteBuffer(this._endPositionHighBuffer as WebGLBuffer);
        this._endPositionHighArr = makeArrayTyped(this._endPositionHighArr);
        this._endPositionHighBuffer = h.createArrayBuffer(
            this._endPositionHighArr as Float32Array,
            3,
            this._endPositionHighArr.length / 3,
            h.gl!.DYNAMIC_DRAW
        );
        h.gl!.deleteBuffer(this._endPositionLowBuffer as WebGLBuffer);
        this._endPositionLowArr = makeArrayTyped(this._endPositionLowArr);
        this._endPositionLowBuffer = h.createArrayBuffer(
            this._endPositionLowArr as Float32Array,
            3,
            this._endPositionLowArr.length / 3,
            h.gl!.DYNAMIC_DRAW
        );
    }

    public createRgbaBuffer() {
        let h = this._renderer!.handler;
        h.gl!.deleteBuffer(this._rgbaBuffer as WebGLBuffer);
        this._rgbaArr = makeArrayTyped(this._rgbaArr);
        this._rgbaBuffer = h.createArrayBuffer(this._rgbaArr as Float32Array, 4, this._rgbaArr.length / 4);
    }

    public createThicknessBuffer() {
        let h = this._renderer!.handler;
        h.gl!.deleteBuffer(this._thicknessBuffer as WebGLBuffer);
        this._thicknessArr = makeArrayTyped(this._thicknessArr);
        this._thicknessBuffer = h.createArrayBuffer(
            this._thicknessArr as Float32Array,
            1,
            this._thicknessArr.length,
            h.gl!.DYNAMIC_DRAW
        );
    }

    public createVertexBuffer() {
        let h = this._renderer!.handler;
        h.gl!.deleteBuffer(this._vertexBuffer as WebGLBuffer);
        this._vertexArr = makeArrayTyped(this._vertexArr);
        this._vertexBuffer = h.createArrayBuffer(
            this._vertexArr as Float32Array,
            2,
            this._vertexArr.length / 2,
            h.gl!.DYNAMIC_DRAW
        );
    }

    public createPickingColorBuffer() {
        let h = this._renderer!.handler;
        h.gl!.deleteBuffer(this._pickingColorBuffer as WebGLBuffer);
        this._pickingColorArr = makeArrayTyped(this._pickingColorArr);
        this._pickingColorBuffer = h.createArrayBuffer(
            this._pickingColorArr as Float32Array,
            3,
            this._pickingColorArr.length / 3
        );
    }
}

export {RayHandler};
