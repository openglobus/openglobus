'use strict';

import * as shaders from '../shaders/ray.js';
import { concatArrays, spliceArray } from "../utils/shared";

const PICKINGCOLOR_BUFFER = 0;
const START_POSITION_BUFFER = 1;
const END_POSITION_BUFFER = 2;
const LENGTH_BUFFER = 3;
const RGBA_BUFFER = 4;
const THICKNESS_BUFFER = 5;
const VERTEX_BUFFER = 6;

/*
 * og.RayHandler
 *
 *
 */
class RayHandler {
    constructor(entityCollection) {

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
        this._lengthBuffer = null;
        this._thicknessBuffer = null;
        this._rgbaBuffer = null;

        this._vertexArr = [];
        this._startPositionHighArr = [];
        this._startPositionLowArr = [];
        this._endPositionHighArr = [];
        this._endPositionLowArr = [];
        this._lengthArr = [];
        this._thicknessArr = [];
        this._rgbaArr = [];

        this._pickingColorBuffer = null;
        this._pickingColorArr = [];

        this._buffersUpdateCallbacks = [];
        this._buffersUpdateCallbacks[VERTEX_BUFFER] = this.createVertexBuffer;
        this._buffersUpdateCallbacks[START_POSITION_BUFFER] = this.createStartPositionBuffer;
        this._buffersUpdateCallbacks[END_POSITION_BUFFER] = this.createEndPositionBuffer;
        this._buffersUpdateCallbacks[LENGTH_BUFFER] = this.createLengthBuffer;
        this._buffersUpdateCallbacks[THICKNESS_BUFFER] = this.createThicknessBuffer;
        this._buffersUpdateCallbacks[RGBA_BUFFER] = this.createRgbaBuffer;
        this._buffersUpdateCallbacks[PICKINGCOLOR_BUFFER] = this.createPickingColorBuffer;

        this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);

        this.__staticId = RayHandler._staticCounter++;
    }

    static get _staticCounter() {
        if (!this._counter && this._counter !== 0) {
            this._counter = 0;
        }
        return this._counter;
    }

    static set _staticCounter(n) {
        this._counter = n;
    }

    static concArr(dest, curr) {
        for (var i = 0; i < curr.length; i++) {
            dest.push(curr[i]);
        }
    }

    initProgram() {
        if (this._renderer.handler) {

            if (!this._renderer.handler.programs.rayScreen) {
                this._renderer.handler.addProgram(shaders.rayScreen());
            }

            // if (!this._renderer.handler.programs.billboardPicking) {
            //     this._renderer.handler.addProgram(shaders.billboardPicking());
            // }
        }
    }

    setRenderer(renderer) {
        this._renderer = renderer;
        this.initProgram();
    }

    refresh() {
        var i = this._changedBuffers.length;
        while (i--) {
            this._changedBuffers[i] = true;
        }
    }

    _removeRays() {
        var i = this._rays.length;
        while (i--) {
            var ri = this._rays[i];
            ri._handlerIndex = -1;
            ri._handler = null;
        }
        this._rays.length = 0;
        this._rays = [];
    }

    clear() {
        this._vertexArr = null;
        this._startPositionHighArr = null;
        this._startPositionLowArr = null;
        this._endPositionHighArr = null;
        this._endPositionLowArr = null;
        this._lengthArr = null;
        this._thicknessArr = null;
        this._rgbaArr = null;

        this._vertexArr = new Float32Array();
        this._startPositionHighArr = new Float32Array();
        this._startPositionLowArr = new Float32Array();
        this._endPositionHighArr = new Float32Array();
        this._endPositionLowArr = new Float32Array();
        this._lengthArr = new Float32Array();
        this._thicknessArr = new Float32Array();
        this._rgbaArr = new Float32Array();

        this._removeRays();
        this._deleteBuffers();
        this.refresh();
    }

    _deleteBuffers() {

        if (this._renderer) {
            var gl = this._renderer.handler.gl;

            gl.deleteBuffer(this._startPositionHighBuffer);
            gl.deleteBuffer(this._startPositionLowBuffer);
            gl.deleteBuffer(this._endPositionHighBuffer);
            gl.deleteBuffer(this._endPositionLowBuffer);
            gl.deleteBuffer(this._lengthBuffer);
            gl.deleteBuffer(this._thicknessBuffer);
            gl.deleteBuffer(this._rgbaBuffer);
            gl.deleteBuffer(this._vertexBuffer);

            this._startPositionHighBuffer = null;
            this._startPositionLowBuffer = null;
            this._endPositionHighBuffer = null;
            this._endPositionLowBuffer = null;
            this._lengthBuffer = null;
            this._thicknessBuffer = null;
            this._rgbaBuffer = null;
            this._vertexBuffer = null;
        }
    }

    update() {
        if (this._renderer) {
            var i = this._changedBuffers.length;
            while (i--) {
                if (this._changedBuffers[i]) {
                    this._buffersUpdateCallbacks[i].call(this);
                    this._changedBuffers[i] = false;
                }
            }
        }
    }

    add(ray) {
        if (ray._handlerIndex == -1) {
            ray._handler = this;
            ray._handlerIndex = this._rays.length;
            this._rays.push(ray);
            this._addRayToArrays(ray);
            this.refresh();
        }
    }

    _addRayToArrays(ray) {
        if (ray._visibility) {
            this._vertexArr = concatArrays(this._vertexArr, [-0.5, 1.0, -0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 1.0, -0.5, 1.0]);
        } else {
            this._vertexArr = concatArrays(this._vertexArr, [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
        }

        let x = ray._startPositionHigh.x, y = ray._startPositionHigh.y, z = ray._startPositionHigh.z;
        this._startPositionHighArr = concatArrays(this._startPositionHighArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        x = ray._startPositionLow.x;
        y = ray._startPositionLow.y;
        z = ray._startPositionLow.z;
        this._startPositionLowArr = concatArrays(this._startPositionLowArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        x = ray._endPositionHigh.x;
        y = ray._endPositionHigh.y;
        z = ray._endPositionHigh.z;
        this._endPositionHighArr = concatArrays(this._endPositionHighArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        x = ray._endPositionLow.x;
        y = ray._endPositionLow.y;
        z = ray._endPositionLow.z;
        this._endPositionLowArr = concatArrays(this._endPositionLowArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        x = ray._thickness;
        this._thicknessArr = concatArrays(this._thicknessArr, [x, x, x, x, x, x]);

        x = ray._length;
        this._lengthArr = concatArrays(this._lengthArr, [x, x, x, x, x, x]);

        let r0 = ray._startColor.x, g0 = ray._startColor.y, b0 = ray._startColor.z, a0 = ray._startColor.w,
            r1 = ray._endColor.x, g1 = ray._endColor.y, b1 = ray._endColor.z, a1 = ray._endColor.w;
        this._rgbaArr = concatArrays(this._rgbaArr, [r1, g1, b1, a1, r0, g0, b0, a0, r0, g0, b0, a0, r0, g0, b0, a0, r1, g1, b1, a1, r1, g1, b1, a1]);

        x = ray._entity._pickingColor.x / 255;
        y = ray._entity._pickingColor.y / 255;
        z = ray._entity._pickingColor.z / 255;
        this._pickingColorArr = concatArrays(this._pickingColorArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);
    }

    _displayPASS() {
        var r = this._renderer;
        var h = r.handler;
        h.programs.rayScreen.activate();
        var sh = h.programs.rayScreen._program;
        var sha = sh.attributes,
            shu = sh.uniforms;

        var gl = h.gl,
            ec = this._entityCollection;

        gl.polygonOffset(ec.polygonOffsetFactor, ec.polygonOffsetUnits);

        gl.uniform1f(shu.uOpacity, ec._fadingOpacity);

        gl.uniformMatrix4fv(shu.viewMatrix, false, r.activeCamera.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, r.activeCamera.getProjectionMatrix());

        gl.uniform3fv(shu.eyePositionHigh, r.activeCamera.eyeHigh);
        gl.uniform3fv(shu.eyePositionLow, r.activeCamera.eyeLow);

        gl.uniform1f(shu.resolution, r.activeCamera._tanViewAngle_hradOneByHeight);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._startPositionHighBuffer);
        gl.vertexAttribPointer(sha.a_startPosHigh, this._startPositionHighBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._startPositionLowBuffer);
        gl.vertexAttribPointer(sha.a_startPosLow, this._startPositionLowBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._endPositionHighBuffer);
        gl.vertexAttribPointer(sha.a_endPosHigh, this._endPositionHighBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._endPositionLowBuffer);
        gl.vertexAttribPointer(sha.a_endPosLow, this._endPositionLowBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rgbaBuffer);
        gl.vertexAttribPointer(sha.a_rgba, this._rgbaBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._thicknessBuffer);
        gl.vertexAttribPointer(sha.a_thickness, this._thicknessBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._lengthBuffer);
        gl.vertexAttribPointer(sha.a_length, this._lengthBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.vertexAttribPointer(sha.a_vertices, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer.numItems);

    }

    _pickingPASS() {
        // ...
    };

    draw() {
        if (this._rays.length) {
            this.update();
            this._displayPASS();
        }
    }

    drawPicking() {
        if (this._rays.length && this.pickingEnabled) {
            this._pickingPASS();
        }
    }

    reindexRaysArray(startIndex) {
        var r = this._rays;
        for (var i = startIndex; i < r.length; i++) {
            r[i]._handlerIndex = i;
        }
    }

    _removeRay(ray) {
        var ri = ray._handlerIndex;

        this._rays.splice(ri, 1);

        var i = ri * 24;
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
        this._lengthArr = spliceArray(this._lengthArr, i, 6);

        this.reindexRaysArray(ri);
        this.refresh();

        ray._handlerIndex = -1;
        ray._handler = null;
    }

    remove(ray) {
        if (ray._handler && this.__staticId == ray._handler.__staticId) {
            this._removeRay(ray);
        }
    }

    setStartPositionArr(index, positionHigh, positionLow) {

        var i = index * 18;

        // High
        var a = this._startPositionHighArr, x = positionHigh.x, y = positionHigh.y, z = positionHigh.z;

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

    setEndPositionArr(index, positionHigh, positionLow) {
        var i = index * 18;

        // High
        var a = this._endPositionHighArr, x = positionHigh.x, y = positionHigh.y, z = positionHigh.z;

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

    setPickingColorArr(index, color) {

        var i = index * 18;
        var a = this._pickingColorArr, x = color.x / 255, y = color.y / 255, z = color.z / 255;

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

    setRgbaArr(index, startColor, endColor) {

        var i = index * 24;
        var a = this._rgbaArr,
            r0 = startColor.x, g0 = startColor.y, b0 = startColor.z, a0 = startColor.w,
            r1 = endColor.x, g1 = endColor.y, b1 = endColor.z, a1 = endColor.w;

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

    setThicknessArr(index, thickness) {

        var i = index * 6;
        var a = this._thicknessArr;

        a[i] = thickness;
        a[i + 1] = thickness;
        a[i + 2] = thickness;
        a[i + 3] = thickness;
        a[i + 4] = thickness;
        a[i + 5] = thickness;

        this._changedBuffers[THICKNESS_BUFFER] = true;
    }

    setLengthArr(index, length) {

        var i = index * 6;
        var a = this._lengthArr;

        a[i] = length;
        a[i + 1] = length;
        a[i + 2] = length;
        a[i + 3] = length;
        a[i + 4] = length;
        a[i + 5] = length;

        this._changedBuffers[LENGTH_BUFFER] = true;
    }

    setVisibility(index, visibility) {
        var vArr;
        if (visibility) {
            vArr = [-0.5, 1.0, -0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 1.0, -0.5, 1.0];
        } else {
            vArr = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
        }
        this.setVertexArr(index, vArr);
    }

    setVertexArr(index, vertexArr) {

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

    createStartPositionBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._startPositionHighBuffer);
        this._startPositionHighArr = makeArrayTyped(this._startPositionHighArr);
        this._startPositionHighBuffer = h.createArrayBuffer(this._startPositionHighArr, 3, this._startPositionHighArr.length / 3, h.gl.DYNAMIC_DRAW);
        h.gl.deleteBuffer(this._startPositionLowBuffer);
        this._startPositionLowArr = makeArrayTyped(this._startPositionLowArr);

        this._startPositionLowBuffer = h.createArrayBuffer(this._startPositionLowArr, 3, this._startPositionLowArr.length / 3, h.gl.DYNAMIC_DRAW);
    }

    createEndPositionBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._endPositionHighBuffer);
        this._endPositionHighArr = makeArrayTyped(this._endPositionHighArr);
        this._endPositionHighBuffer = h.createArrayBuffer(this._endPositionHighArr, 3, this._endPositionHighArr.length / 3, h.gl.DYNAMIC_DRAW);
        h.gl.deleteBuffer(this._endPositionLowBuffer);
        this._endPositionLowArr = makeArrayTyped(this._endPositionLowArr);
        this._endPositionLowBuffer = h.createArrayBuffer(this._endPositionLowArr, 3, this._endPositionLowArr.length / 3, h.gl.DYNAMIC_DRAW);
    }

    createRgbaBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._rgbaBuffer);
        this._rgbaArr = makeArrayTyped(this._rgbaArr);
        this._rgbaBuffer = h.createArrayBuffer(this._rgbaArr, 4, this._rgbaArr.length / 4);
    }

    createThicknessBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._thicknessBuffer);
        this._thicknessArr = makeArrayTyped(this._thicknessArr);
        this._thicknessBuffer = h.createArrayBuffer(this._thicknessArr, 1, this._thicknessArr.length, h.gl.DYNAMIC_DRAW);
    }

    createLengthBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._lengthBuffer);
        this._lengthArr = makeArrayTyped(this._lengthArr);
        this._lengthBuffer = h.createArrayBuffer(this._lengthArr, 1, this._lengthArr.length, h.gl.DYNAMIC_DRAW);
    }

    createVertexBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._vertexBuffer);
        this._vertexArr = makeArrayTyped(this._vertexArr);
        this._vertexBuffer = h.createArrayBuffer(this._vertexArr, 2, this._vertexArr.length / 2, h.gl.DYNAMIC_DRAW);
    }

    createPickingColorBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._pickingColorBuffer);
        this._pickingColorArr = makeArrayTyped(this._pickingColorArr);
        this._pickingColorBuffer = h.createArrayBuffer(this._pickingColorArr, 3, this._pickingColorArr.length / 3);
    }
};

export { RayHandler };
