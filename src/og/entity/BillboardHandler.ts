"use strict";

import * as shaders from "../shaders/billboard";
import {Billboard} from "./Billboard";
import {concatTypedArrays, spliceTypedArray, TypedArray} from "../utils/shared";
import {EntityCollection} from "./EntityCollection";
import {Planet} from "../scene/Planet";
import {Renderer} from "../renderer/Renderer";
import {LOCK_FREE} from "./LabelWorker.js";
import {Vec3} from "../math/Vec3";
import {Vec4} from "../math/Vec4";
import {WebGLBufferExt} from "../webgl/Handler";

const PICKINGCOLOR_BUFFER = 0;
const POSITION_BUFFER = 1;
const SIZE_BUFFER = 2;
const OFFSET_BUFFER = 3;
const RGBA_BUFFER = 4;
const ROTATION_BUFFER = 5;
const TEXCOORD_BUFFER = 6;
const VERTEX_BUFFER = 7;

/*
 * og.BillboardHandler
 *
 *
 */
class BillboardHandler {

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

    protected _billboards: Billboard[];

    protected _positionHighBuffer: WebGLBufferExt | null;
    protected _positionLowBuffer: WebGLBufferExt | null;
    protected _sizeBuffer: WebGLBufferExt | null;
    protected _offsetBuffer: WebGLBufferExt | null;
    protected _rgbaBuffer: WebGLBufferExt | null;
    protected _rotationBuffer: WebGLBufferExt | null;
    protected _texCoordBuffer: WebGLBufferExt | null;
    protected _vertexBuffer: WebGLBufferExt | null;

    protected _texCoordArr: Float32Array;
    protected _vertexArr: Float32Array;
    protected _positionHighArr: Float32Array;
    protected _positionLowArr: Float32Array;
    protected _sizeArr: Float32Array;
    protected _offsetArr: Float32Array;
    protected _rgbaArr: Float32Array;
    protected _rotationArr: Float32Array;

    protected _pickingColorBuffer: WebGLBufferExt | null;
    protected _pickingColorArr: Float32Array;

    protected _buffersUpdateCallbacks: Function[];

    protected _changedBuffers: boolean[];

    constructor(entityCollection: EntityCollection) {

        this.__id = BillboardHandler.__counter__++;

        this.pickingEnabled = true;

        this._entityCollection = entityCollection;

        this._renderer = null;

        this._billboards = [];

        this._positionHighBuffer = null;
        this._positionLowBuffer = null;
        this._sizeBuffer = null;
        this._offsetBuffer = null;
        this._rgbaBuffer = null;
        this._rotationBuffer = null;
        this._texCoordBuffer = null;
        this._vertexBuffer = null;
        this._pickingColorBuffer = null;

        this._texCoordArr = new Float32Array([]);
        this._vertexArr = new Float32Array([]);
        this._positionHighArr = new Float32Array([]);
        this._positionLowArr = new Float32Array([]);
        this._sizeArr = new Float32Array([]);
        this._offsetArr = new Float32Array([]);
        this._rgbaArr = new Float32Array([]);
        this._rotationArr = new Float32Array([]);
        this._pickingColorArr = new Float32Array([]);

        this._buffersUpdateCallbacks = [];
        this._buffersUpdateCallbacks[PICKINGCOLOR_BUFFER] = this.createPickingColorBuffer;
        this._buffersUpdateCallbacks[POSITION_BUFFER] = this.createPositionBuffer;
        this._buffersUpdateCallbacks[SIZE_BUFFER] = this.createSizeBuffer;
        this._buffersUpdateCallbacks[OFFSET_BUFFER] = this.createOffsetBuffer;
        this._buffersUpdateCallbacks[RGBA_BUFFER] = this.createRgbaBuffer;
        this._buffersUpdateCallbacks[ROTATION_BUFFER] = this.createRotationBuffer;
        this._buffersUpdateCallbacks[TEXCOORD_BUFFER] = this.createTexCoordBuffer;
        this._buffersUpdateCallbacks[VERTEX_BUFFER] = this.createVertexBuffer;

        this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);
    }

    public isEqual(handler: BillboardHandler) {
        return handler && (handler.__id === this.__id);
    }

    static concArr(dest: number[], curr: number[]) {
        for (let i = 0; i < curr.length; i++) {
            dest.push(curr[i]);
        }
    }

    public initProgram() {
        if (this._renderer && this._renderer.handler) {
            if (!this._renderer.handler.programs.billboard) {
                this._renderer.handler.addProgram(shaders.billboard_screen());
            }

            if (!this._renderer.handler.programs.billboardPicking) {
                this._renderer.handler.addProgram(shaders.billboardPicking());
            }
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

    protected _removeBillboards() {
        let i = this._billboards.length;
        while (i--) {
            let bi = this._billboards[i];
            // @ts-ignore
            bi._handlerIndex = -1;
            // @ts-ignore
            bi._handler = null;
            // @ts-ignore
            bi._isReady = false;
            // @ts-ignore
            bi._lockId = LOCK_FREE;
        }
        this._billboards.length = 0;
        this._billboards = [];
    }

    protected clear() {
        // @ts-ignore
        this._texCoordArr = null;
        // @ts-ignore
        this._vertexArr = null;
        // @ts-ignore
        this._positionHighArr = null;
        // @ts-ignore
        this._positionLowArr = null;
        // @ts-ignore
        this._sizeArr = null;
        // @ts-ignore
        this._offsetArr = null;
        // @ts-ignore
        this._rgbaArr = null;
        // @ts-ignore
        this._rotationArr = null;
        // @ts-ignore
        this._pickingColorArr = null;

        this._texCoordArr = new Float32Array([]);
        this._vertexArr = new Float32Array([]);
        this._positionHighArr = new Float32Array([]);
        this._positionLowArr = new Float32Array([]);
        this._sizeArr = new Float32Array([]);
        this._offsetArr = new Float32Array([]);
        this._rgbaArr = new Float32Array([]);
        this._rotationArr = new Float32Array([]);
        this._pickingColorArr = new Float32Array([]);

        this._removeBillboards();
        this._deleteBuffers();
        this.refresh();
    }

    protected _deleteBuffers() {
        if (this._renderer) {
            let gl = this._renderer.handler.gl!;
            gl.deleteBuffer(this._positionHighBuffer as WebGLBuffer);
            gl.deleteBuffer(this._positionLowBuffer as WebGLBuffer);
            gl.deleteBuffer(this._sizeBuffer as WebGLBuffer);
            gl.deleteBuffer(this._offsetBuffer as WebGLBuffer);
            gl.deleteBuffer(this._rgbaBuffer as WebGLBuffer);
            gl.deleteBuffer(this._rotationBuffer as WebGLBuffer);
            gl.deleteBuffer(this._vertexBuffer as WebGLBuffer);
            gl.deleteBuffer(this._texCoordBuffer as WebGLBuffer);
            gl.deleteBuffer(this._pickingColorBuffer as WebGLBuffer);
        }

        this._positionHighBuffer = null;
        this._positionLowBuffer = null;
        this._sizeBuffer = null;
        this._offsetBuffer = null;
        this._rgbaBuffer = null;
        this._rotationBuffer = null;
        this._vertexBuffer = null;
        this._texCoordBuffer = null;
        this._pickingColorBuffer = null;
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

    public add(billboard: Billboard) {
        // @ts-ignore
        if (billboard._handlerIndex == -1) {
            // @ts-ignore
            billboard._isReady = true;
            // @ts-ignore
            billboard._handler = this;
            // @ts-ignore
            billboard._handlerIndex = this._billboards.length;
            this._billboards.push(billboard);
            this._addBillboardToArrays(billboard);
            this.refresh();
            let src = billboard.getSrc() || (billboard.getImage() && billboard.getImage()!.src);
            if (src) {
                billboard.setSrc(src);
            }
        }
    }

    protected _addBillboardToArrays(billboard: Billboard) {
        if (billboard.getVisibility()) {
            this._vertexArr = concatTypedArrays(
                this._vertexArr,
                [-0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]
            ) as Float32Array;
        } else {
            this._vertexArr = concatTypedArrays(
                this._vertexArr,
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            ) as Float32Array;
        }

        this._texCoordArr = concatTypedArrays(
            this._texCoordArr,
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ) as Float32Array;

        // @ts-ignore
        let x = billboard._positionHigh.x,
            // @ts-ignore
            y = billboard._positionHigh.y,
            // @ts-ignore
            z = billboard._positionHigh.z,
            w;
        this._positionHighArr = concatTypedArrays(this._positionHighArr, [
            x, y, z,
            x, y, z,
            x, y, z,
            x, y, z,
            x, y, z,
            x, y, z
        ]) as Float32Array;

        // @ts-ignore
        x = billboard._positionLow.x;
        // @ts-ignore
        y = billboard._positionLow.y;
        // @ts-ignore
        z = billboard._positionLow.z;
        this._positionLowArr = concatTypedArrays(this._positionLowArr, [
            x, y, z,
            x, y, z,
            x, y, z,
            x, y, z,
            x, y, z,
            x, y, z
        ]) as Float32Array;

        // @ts-ignore
        x = billboard._width;
        // @ts-ignore
        y = billboard._height;
        this._sizeArr = concatTypedArrays(this._sizeArr, [x, y, x, y, x, y, x, y, x, y, x, y]) as Float32Array;

        // @ts-ignore
        x = billboard._offset.x;
        // @ts-ignore
        y = billboard._offset.y;
        // @ts-ignore
        z = billboard._offset.z;
        this._offsetArr = concatTypedArrays(this._offsetArr, [
            x, y, z,
            x, y, z,
            x, y, z,
            x, y, z,
            x, y, z,
            x, y, z
        ]) as Float32Array;

        // @ts-ignore
        x = billboard._color.x;
        // @ts-ignore
        y = billboard._color.y;
        // @ts-ignore
        z = billboard._color.z;
        // @ts-ignore
        w = billboard._color.w;
        this._rgbaArr = concatTypedArrays(this._rgbaArr, [
            x, y, z, w,
            x, y, z, w,
            x, y, z, w,
            x, y, z, w,
            x, y, z, w,
            x, y, z, w
        ]) as Float32Array;

        // @ts-ignore
        x = billboard._rotation;
        this._rotationArr = concatTypedArrays(this._rotationArr, [x, x, x, x, x, x]) as Float32Array;

        // @ts-ignore
        x = billboard._entity._pickingColor.x / 255;
        // @ts-ignore
        y = billboard._entity._pickingColor.y / 255;
        // @ts-ignore
        z = billboard._entity._pickingColor.z / 255;
        this._pickingColorArr = concatTypedArrays(this._pickingColorArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]) as Float32Array;
    }

    protected _displayPASS() {
        let r = this._renderer!;
        let h = r.handler;
        h.programs.billboard.activate();
        let sh = h.programs.billboard._program;
        let sha = sh.attributes,
            shu = sh.uniforms;

        let gl = h.gl!,
            ec = this._entityCollection;

        gl.disable(gl.CULL_FACE);

        gl.uniform1f(shu.depthOffset, ec.polygonOffsetUnits);

        gl.uniform1i(shu.u_texture, 0);

        gl.uniformMatrix4fv(shu.viewMatrix, false, r.activeCamera!.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, r.activeCamera!.getProjectionMatrix());

        gl.uniform3fv(shu.eyePositionHigh, r.activeCamera!.eyeHigh);
        gl.uniform3fv(shu.eyePositionLow, r.activeCamera!.eyeLow);

        gl.uniform3fv(shu.uScaleByDistance, ec.scaleByDistance);

        gl.uniform1f(shu.opacity, ec._fadingOpacity);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_texCoord, this._texCoordBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_vertices, this._vertexBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._positionHighBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_positionsHigh, this._positionHighBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._positionLowBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_positionsLow, this._positionLowBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rgbaBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_rgba, this._rgbaBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_size, this._sizeBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._offsetBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_offset, this._offsetBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.uniform1f(shu.planetRadius, (ec.renderNode as Planet)._planetRadius2 || 0);

        gl.uniform2fv(shu.viewport, [h.canvas!.clientWidth, h.canvas!.clientHeight]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rotationBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_rotation, this._rotationBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer!.numItems);

        gl.enable(gl.CULL_FACE);
    }

    protected _pickingPASS() {
        let r = this._renderer!;
        let h = r.handler;
        h.programs.billboardPicking.activate();
        let sh = h.programs.billboardPicking._program;
        let sha = sh.attributes,
            shu = sh.uniforms;

        let gl = h.gl!,
            ec = this._entityCollection;

        gl.disable(gl.CULL_FACE);

        gl.uniform1f(shu.depthOffset, ec.polygonOffsetUnits);

        gl.uniformMatrix4fv(shu.viewMatrix, false, r.activeCamera!.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, r.activeCamera!.getProjectionMatrix());

        gl.uniform3fv(shu.eyePositionHigh, r.activeCamera!.eyeHigh);
        gl.uniform3fv(shu.eyePositionLow, r.activeCamera!.eyeLow);

        gl.uniform3fv(shu.uScaleByDistance, ec.scaleByDistance);

        gl.uniform1f(shu.opacity, ec._fadingOpacity);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_vertices, this._vertexBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._positionHighBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_positionsHigh, this._positionHighBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._positionLowBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_positionsLow, this._positionLowBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._pickingColorBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_rgba, this._pickingColorBuffer!.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_size, this._sizeBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._offsetBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_offset, this._offsetBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.uniform1f(shu.planetRadius, (ec.renderNode as Planet)._planetRadius2 || 0);

        gl.uniform2fv(shu.viewport, [h.canvas!.clientWidth, h.canvas!.clientHeight]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rotationBuffer as WebGLBuffer);
        gl.vertexAttribPointer(sha.a_rotation, this._rotationBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer!.numItems);

        gl.enable(gl.CULL_FACE);
    }

    public draw() {
        if (this._billboards.length) {
            this.update();
            this._displayPASS();
        }
    }

    public drawPicking() {
        if (this._billboards.length && this.pickingEnabled) {
            this._pickingPASS();
        }
    }

    public reindexBillboardsArray(startIndex: number) {
        let b = this._billboards;
        for (let i = startIndex; i < b.length; i++) {
            // @ts-ignore
            b[i]._handlerIndex = i;
        }
    }

    protected _removeBillboard(billboard: Billboard) {
        // @ts-ignore
        let bi = billboard._handlerIndex;

        this._billboards.splice(bi, 1);

        let i = bi * 24;
        this._rgbaArr = spliceTypedArray(this._rgbaArr, i, 24) as Float32Array;

        i = bi * 18;
        this._positionHighArr = spliceTypedArray(this._positionHighArr, i, 18) as Float32Array;
        this._positionLowArr = spliceTypedArray(this._positionLowArr, i, 18) as Float32Array;
        this._offsetArr = spliceTypedArray(this._offsetArr, i, 18) as Float32Array;
        //this._alignedAxisArr = spliceTypedArray(this._alignedAxisArr, i, 18) as Float32Array;
        this._pickingColorArr = spliceTypedArray(this._pickingColorArr, i, 18) as Float32Array;

        i = bi * 12;
        this._vertexArr = spliceTypedArray(this._vertexArr, i, 12) as Float32Array;
        this._sizeArr = spliceTypedArray(this._sizeArr, i, 12) as Float32Array;
        this._texCoordArr = spliceTypedArray(this._texCoordArr, i, 12) as Float32Array;

        i = bi * 6;
        this._rotationArr = spliceTypedArray(this._rotationArr, i, 6) as Float32Array;

        this.reindexBillboardsArray(bi);
        this.refresh();

        //@ts-ignore
        billboard._handlerIndex = -1;
        //@ts-ignore
        billboard._handler = null;
        //@ts-ignore
        billboard._isReady = false;
        //@ts-ignore
        billboard._lockId = LOCK_FREE;
    }

    public remove(billboard: Billboard) {
        // @ts-ignore
        if (billboard._isReady && this.__id === billboard._handler.__id) {
            this._removeBillboard(billboard);
        } else {
            // @ts-ignore
            billboard._handler = null;
        }
    }

    public setPositionArr(index: number, positionHigh: Vec3, positionLow: Vec3) {
        let i = index * 18;

        // High
        let a = this._positionHighArr,
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
        a = this._positionLowArr;
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

        this._changedBuffers[POSITION_BUFFER] = true;
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

    public setSizeArr(index: number, width: number, height: number) {
        let i = index * 12;
        let a = this._sizeArr,
            x = width,
            y = height;

        a[i] = x;
        a[i + 1] = y;

        a[i + 2] = x;
        a[i + 3] = y;

        a[i + 4] = x;
        a[i + 5] = y;

        a[i + 6] = x;
        a[i + 7] = y;

        a[i + 8] = x;
        a[i + 9] = y;

        a[i + 10] = x;
        a[i + 11] = y;

        this._changedBuffers[SIZE_BUFFER] = true;
    }

    public setOffsetArr(index: number, offset: Vec3) {
        let i = index * 18;
        let a = this._offsetArr,
            x = offset.x,
            y = offset.y,
            z = offset.z;

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

        this._changedBuffers[OFFSET_BUFFER] = true;
    }

    public setRgbaArr(index: number, rgba: Vec4) {
        let i = index * 24;
        let a = this._rgbaArr,
            x = rgba.x,
            y = rgba.y,
            z = rgba.z,
            w = rgba.w;

        a[i] = x;
        a[i + 1] = y;
        a[i + 2] = z;
        a[i + 3] = w;

        a[i + 4] = x;
        a[i + 5] = y;
        a[i + 6] = z;
        a[i + 7] = w;

        a[i + 8] = x;
        a[i + 9] = y;
        a[i + 10] = z;
        a[i + 11] = w;

        a[i + 12] = x;
        a[i + 13] = y;
        a[i + 14] = z;
        a[i + 15] = w;

        a[i + 16] = x;
        a[i + 17] = y;
        a[i + 18] = z;
        a[i + 19] = w;

        a[i + 20] = x;
        a[i + 21] = y;
        a[i + 22] = z;
        a[i + 23] = w;

        this._changedBuffers[RGBA_BUFFER] = true;
    }

    public setRotationArr(index: number, rotation: number) {
        let i = index * 6;
        let a = this._rotationArr;

        a[i] = rotation;
        a[i + 1] = rotation;
        a[i + 2] = rotation;
        a[i + 3] = rotation;
        a[i + 4] = rotation;
        a[i + 5] = rotation;

        this._changedBuffers[ROTATION_BUFFER] = true;
    }

    public setTexCoordArr(index: number, tcoordArr: number[] | TypedArray) {
        let i = index * 12;
        let a = this._texCoordArr;

        a[i] = tcoordArr[0];
        a[i + 1] = tcoordArr[1];

        a[i + 2] = tcoordArr[2];
        a[i + 3] = tcoordArr[3];

        a[i + 4] = tcoordArr[4];
        a[i + 5] = tcoordArr[5];

        a[i + 6] = tcoordArr[6];
        a[i + 7] = tcoordArr[7];

        a[i + 8] = tcoordArr[8];
        a[i + 9] = tcoordArr[9];

        a[i + 10] = tcoordArr[10];
        a[i + 11] = tcoordArr[11];

        this._changedBuffers[TEXCOORD_BUFFER] = true;
    }

    public setVisibility(index: number, visibility: boolean) {
        let vArr: number[];
        if (visibility) {
            vArr = [-0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5];
        } else {
            vArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        }
        this.setVertexArr(index, vArr);
    }

    public setVertexArr(index: number, vertexArr: number[] | Float32Array) {
        var i = index * 12;
        var a = this._vertexArr;

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

    public createPositionBuffer() {
        let h = this._renderer!.handler,
            numItems = this._positionHighArr.length / 3;

        if (!this._positionHighBuffer || this._positionHighBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._positionHighBuffer as WebGLBuffer);
            h.gl!.deleteBuffer(this._positionLowBuffer as WebGLBuffer);
            this._positionHighBuffer = h.createStreamArrayBuffer(3, numItems);
            this._positionLowBuffer = h.createStreamArrayBuffer(3, numItems);
        }

        h.setStreamArrayBuffer(this._positionHighBuffer!, this._positionHighArr);
        h.setStreamArrayBuffer(this._positionLowBuffer!, this._positionLowArr);
    }

    public createSizeBuffer() {
        let h = this._renderer!.handler;
        h.gl!.deleteBuffer(this._sizeBuffer as WebGLBuffer);
        this._sizeBuffer = h.createArrayBuffer(this._sizeArr, 2, this._sizeArr.length / 2);
    }

    public createOffsetBuffer() {
        let h = this._renderer!.handler;
        h.gl!.deleteBuffer(this._offsetBuffer as WebGLBuffer);
        this._offsetBuffer = h.createArrayBuffer(this._offsetArr, 3, this._offsetArr.length / 3);
    }

    createRgbaBuffer() {
        let h = this._renderer!.handler;
        h.gl!.deleteBuffer(this._rgbaBuffer as WebGLBuffer);
        this._rgbaBuffer = h.createArrayBuffer(this._rgbaArr, 4, this._rgbaArr.length / 4);
    }

    public createRotationBuffer() {
        let h = this._renderer!.handler;

        if (!this._rotationBuffer || this._rotationBuffer.numItems !== this._rotationArr.length) {
            h.gl!.deleteBuffer(this._rotationBuffer as WebGLBuffer);
            this._rotationBuffer = h.createStreamArrayBuffer(1, this._rotationArr.length);
        }

        h.setStreamArrayBuffer(this._rotationBuffer, this._rotationArr);
    }

    public createVertexBuffer() {
        let h = this._renderer!.handler;
        h.gl!.deleteBuffer(this._vertexBuffer as WebGLBuffer);
        this._vertexBuffer = h.createArrayBuffer(this._vertexArr, 2, this._vertexArr.length / 2);
    }

    public createTexCoordBuffer() {
        let h = this._renderer!.handler;
        h.gl!.deleteBuffer(this._texCoordBuffer as WebGLBuffer);
        this._texCoordBuffer = h.createArrayBuffer(this._texCoordArr, 2, this._texCoordArr.length / 2);
    }

    //createAlignedAxisBuffer() {
    //    var h = this._renderer.handler;
    //    h.gl.deleteBuffer(this._alignedAxisBuffer);
    //    this._alignedAxisBuffer = h.createArrayBuffer(
    //        this._alignedAxisArr,
    //        3,
    //        this._alignedAxisArr.length / 3
    //    );
    //}

    public createPickingColorBuffer() {
        let h = this._renderer!.handler;
        h.gl!.deleteBuffer(this._pickingColorBuffer as WebGLBuffer);
        this._pickingColorBuffer = h.createArrayBuffer(this._pickingColorArr, 3, this._pickingColorArr.length / 3);
    }

    public refreshTexCoordsArr() {
        let bc = this._entityCollection;
        if (bc && this._renderer) {
            let ta = this._renderer.billboardsTextureAtlas;
            for (let i = 0; i < this._billboards.length; i++) {
                let bi = this._billboards[i];
                let img = bi.getImage();
                if (img) {
                    //@ts-ignore
                    let imageNode = ta.get(img.__nodeIndex);
                    if (imageNode) {
                        // @ts-ignore
                        this.setTexCoordArr(bi._handlerIndex, imageNode.texCoords);
                    }
                }
            }
        }
    }
}

export {BillboardHandler};
