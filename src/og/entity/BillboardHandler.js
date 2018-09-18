/**
 * @module og/entity/BillboardHandler
 */

'use strict';

import * as shaders from '../shaders/billboard.js';

const PICKINGCOLOR_BUFFER = 0;
const POSITION_BUFFER = 1;
const SIZE_BUFFER = 2;
const OFFSET_BUFFER = 3;
const RGBA_BUFFER = 4;
const ROTATION_BUFFER = 5;
const TEXCOORD_BUFFER = 6;
const VERTEX_BUFFER = 7;
const ALIGNEDAXIS_BUFFER = 8;

/*
 * og.BillboardHandler
 *
 *
 */
class BillboardHandler {
    constructor(entityCollection) {

        /**
         * Picking rendering option.
         * @public
         * @type {boolean}
         */
        this.pickingEnabled = true;

        this._entityCollection = entityCollection;

        this._renderer = null;

        this._billboards = [];

        this._positionBuffer = null;
        this._sizeBuffer = null;
        this._offsetBuffer = null;
        this._rgbaBuffer = null;
        this._rotationBuffer = null;
        this._texCoordBuffer = null;
        this._vertexBuffer = null;
        this._alignedAxisBuffer = null;

        this._texCoordArr = [];
        this._vertexArr = [];
        this._positionArr = [];
        this._sizeArr = [];
        this._offsetArr = [];
        this._rgbaArr = [];
        this._rotationArr = [];
        this._alignedAxisArr = [];

        this._pickingColorBuffer = null;
        this._pickingColorArr = [];

        this._buffersUpdateCallbacks = [];
        this._buffersUpdateCallbacks[PICKINGCOLOR_BUFFER] = this.createPickingColorBuffer;
        this._buffersUpdateCallbacks[POSITION_BUFFER] = this.createPositionBuffer;
        this._buffersUpdateCallbacks[SIZE_BUFFER] = this.createSizeBuffer;
        this._buffersUpdateCallbacks[OFFSET_BUFFER] = this.createOffsetBuffer;
        this._buffersUpdateCallbacks[RGBA_BUFFER] = this.createRgbaBuffer;
        this._buffersUpdateCallbacks[ROTATION_BUFFER] = this.createRotationBuffer;
        this._buffersUpdateCallbacks[TEXCOORD_BUFFER] = this.createTexCoordBuffer;
        this._buffersUpdateCallbacks[VERTEX_BUFFER] = this.createVertexBuffer;
        this._buffersUpdateCallbacks[ALIGNEDAXIS_BUFFER] = this.createAlignedAxisBuffer;

        this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);

        this.__staticId = BillboardHandler._staticCounter++;
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
            if (!this._renderer.handler.Programs.billboard) {
                var isSingleBuffer = !this._renderer.isMultiFramebufferCompatible();
                this._renderer.handler.addProgram(shaders.billboard(isSingleBuffer));
            }
            if (!this._renderer.handler.Programs.billboardPicking) {
                this._renderer.handler.addProgram(shaders.billboardPicking());
            }
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

    _removeBillboards() {
        var i = this._billboards.length;
        while (i--) {
            var bi = this._billboards[i];
            bi._handlerIndex = -1;
            bi._handler = null;
        }
        this._billboards.length = 0;
        this._billboards = [];
    }

    clear() {
        this._texCoordArr.length = 0;
        this._vertexArr.length = 0;
        this._positionArr.length = 0;
        this._sizeArr.length = 0;
        this._offsetArr.length = 0;
        this._rgbaArr.length = 0;
        this._rotationArr.length = 0;
        this._alignedAxisArr.length = 0;
        this._pickingColorArr.length = 0;

        this._texCoordArr = [];
        this._vertexArr = [];
        this._positionArr = [];
        this._sizeArr = [];
        this._offsetArr = [];
        this._rgbaArr = [];
        this._rotationArr = [];
        this._alignedAxisArr = [];
        this._pickingColorArr = [];

        this._removeBillboards();
        this._deleteBuffers();
        this.refresh();
    }

    _deleteBuffers() {
        var gl = this._renderer.handler.gl;
        gl.deleteBuffer(this._positionBuffer);
        gl.deleteBuffer(this._sizeBuffer);
        gl.deleteBuffer(this._offsetBuffer);
        gl.deleteBuffer(this._rgbaBuffer);
        gl.deleteBuffer(this._rotationBuffer);
        gl.deleteBuffer(this._vertexBuffer);
        gl.deleteBuffer(this._texCoordBuffer);
        gl.deleteBuffer(this._alignedAxisBuffer);
        gl.deleteBuffer(this._pickingColorBuffer);

        this._positionBuffer = null;
        this._sizeBuffer = null;
        this._offsetBuffer = null;
        this._rgbaBuffer = null;
        this._rotationBuffer = null;
        this._vertexBuffer = null;
        this._texCoordBuffer = null;
        this._alignedAxisBuffer = null;
        this._pickingColorBuffer = null;
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

    add(billboard) {
        if (billboard._handlerIndex == -1) {
            billboard._handler = this;
            billboard._handlerIndex = this._billboards.length;
            this._billboards.push(billboard);
            this._addBillboardToArrays(billboard);
            this.refresh();
            billboard.setSrc(billboard._src || billboard._image && billboard._image.src);
        }
    }

    _addBillboardToArrays(billboard) {
        if (billboard._visibility) {
            BillboardHandler.concArr(this._vertexArr, [-0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);
        } else {
            BillboardHandler.concArr(this._vertexArr, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        }

        BillboardHandler.concArr(this._texCoordArr, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

        var x = billboard._position.x, y = billboard._position.y, z = billboard._position.z, w = billboard._scale;
        BillboardHandler.concArr(this._positionArr, [x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w]);

        x = billboard._width; y = billboard._height;
        BillboardHandler.concArr(this._sizeArr, [x, y, x, y, x, y, x, y, x, y, x, y]);

        x = billboard._offset.x; y = billboard._offset.y; z = billboard._offset.z;
        BillboardHandler.concArr(this._offsetArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        x = billboard._color.x; y = billboard._color.y; z = billboard._color.z; w = billboard._color.w;
        BillboardHandler.concArr(this._rgbaArr, [x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w]);

        x = billboard._rotation;
        BillboardHandler.concArr(this._rotationArr, [x, x, x, x, x, x]);

        x = billboard._alignedAxis.x, y = billboard._alignedAxis.y, z = billboard._alignedAxis.z;
        BillboardHandler.concArr(this._alignedAxisArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        x = billboard._entity._pickingColor.x / 255, y = billboard._entity._pickingColor.y / 255, z = billboard._entity._pickingColor.z / 255;
        BillboardHandler.concArr(this._pickingColorArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);
    }

    _displayPASS() {
        var r = this._renderer;
        var h = r.handler;
        h.Programs.billboard.activate();
        var sh = h.Programs.billboard._program;
        var sha = sh.attributes,
            shu = sh.uniforms;

        var gl = h.gl;

        gl.uniform1i(shu.u_texture, 0);

        gl.uniformMatrix4fv(shu.viewMatrix, false, r.activeCamera._viewMatrix._m);
        gl.uniformMatrix4fv(shu.projectionMatrix, false, r.activeCamera._projectionMatrix._m);

        gl.uniform3fv(shu.uCamPos, r.activeCamera.eye.toVec());

        gl.uniform3fv(shu.uScaleByDistance, this._entityCollection.scaleByDistance);

        gl.uniform1f(shu.uOpacity, this._entityCollection._fadingOpacity);

        gl.uniform2fv(shu.uFloatParams, [this._entityCollection.renderNode._planetRadius2 || 0, r.activeCamera._tanViewAngle_hradOneByHeight]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordBuffer);
        gl.vertexAttribPointer(sha.a_texCoord, this._texCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.vertexAttribPointer(sha.a_vertices, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
        gl.vertexAttribPointer(sha.a_positions, this._positionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rgbaBuffer);
        gl.vertexAttribPointer(sha.a_rgba, this._rgbaBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer);
        gl.vertexAttribPointer(sha.a_size, this._sizeBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._offsetBuffer);
        gl.vertexAttribPointer(sha.a_offset, this._offsetBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rotationBuffer);
        gl.vertexAttribPointer(sha.a_rotation, this._rotationBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._alignedAxisBuffer);
        gl.vertexAttribPointer(sha.a_alignedAxis, this._alignedAxisBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer.numItems);
    }

    _pickingPASS() {
        var r = this._renderer;
        var h = r.handler;
        h.Programs.billboardPicking.activate();
        var sh = h.Programs.billboardPicking._program;
        var sha = sh.attributes,
            shu = sh.uniforms;

        var gl = h.gl;

        gl.uniformMatrix4fv(shu.viewMatrix, false, r.activeCamera._viewMatrix._m);
        gl.uniformMatrix4fv(shu.projectionMatrix, false, r.activeCamera._projectionMatrix._m);

        gl.uniform3fv(shu.uCamPos, r.activeCamera.eye.toVec());

        gl.uniform3fv(shu.uScaleByDistance, this._entityCollection.scaleByDistance);

        gl.uniform1f(shu.uOpacity, this._entityCollection._fadingOpacity);

        gl.uniform2fv(shu.uFloatParams, [this._entityCollection.renderNode._planetRadius2 || 0, r.activeCamera._tanViewAngle_hradOneByHeight]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.vertexAttribPointer(sha.a_vertices, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
        gl.vertexAttribPointer(sha.a_positions, this._positionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._pickingColorBuffer);
        gl.vertexAttribPointer(sha.a_pickingColor, this._pickingColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer);
        gl.vertexAttribPointer(sha.a_size, this._sizeBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._offsetBuffer);
        gl.vertexAttribPointer(sha.a_offset, this._offsetBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rotationBuffer);
        gl.vertexAttribPointer(sha.a_rotation, this._rotationBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._alignedAxisBuffer);
        gl.vertexAttribPointer(sha.a_alignedAxis, this._alignedAxisBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer.numItems);
    };

    draw() {
        if (this._billboards.length) {
            this.update();
            this._displayPASS();
        }
    }

    drawPicking() {
        if (this._billboards.length && this.pickingEnabled) {
            this._pickingPASS();
        }
    }

    reindexBillbordsArray(startIndex) {
        var b = this._billboards;
        for (var i = startIndex; i < b.length; i++) {
            b[i]._handlerIndex = i;
        }
    }

    _removeBillboard(billboard) {
        var bi = billboard._handlerIndex;

        this._billboards.splice(bi, 1);

        var i = bi * 24;
        this._rgbaArr.splice(i, 24);
        this._positionArr.splice(i, 24);

        i = bi * 18;
        this._offsetArr.splice(i, 18);
        this._alignedAxisArr.splice(i, 18);
        this._pickingColorArr.splice(i, 18);

        i = bi * 12;
        this._vertexArr.splice(i, 12);
        this._sizeArr.splice(i, 12);
        this._texCoordArr.splice(i, 12);

        i = bi * 6;
        this._rotationArr.splice(i, 6);

        this.reindexBillbordsArray(bi);
        this.refresh();

        billboard._handlerIndex = -1;
        billboard._handler = null;
    }

    remove(billboard) {
        if (billboard._handler && this.__staticId == billboard._handler.__staticId) {
            this._removeBillboard(billboard);
        }
    }

    setPositionArr(index, position) {

        var i = index * 24;
        var a = this._positionArr, x = position.x, y = position.y, z = position.z;

        a[i] = x;
        a[i + 1] = y;
        a[i + 2] = z;

        a[i + 4] = x;
        a[i + 5] = y;
        a[i + 6] = z;

        a[i + 8] = x;
        a[i + 9] = y;
        a[i + 10] = z;

        a[i + 12] = x;
        a[i + 13] = y;
        a[i + 14] = z;

        a[i + 16] = x;
        a[i + 17] = y;
        a[i + 18] = z;

        a[i + 20] = x;
        a[i + 21] = y;
        a[i + 22] = z;

        this._changedBuffers[POSITION_BUFFER] = true;
    }

    setScaleArr(index, scale) {

        var i = index * 24;
        var a = this._positionArr;

        a[i + 3] = scale;
        a[i + 7] = scale;
        a[i + 11] = scale;
        a[i + 15] = scale;
        a[i + 19] = scale;
        a[i + 23] = scale;

        this._changedBuffers[POSITION_BUFFER] = true;
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

    setSizeArr(index, width, height) {

        var i = index * 12;
        var a = this._sizeArr, x = width, y = height;

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

    setOffsetArr(index, offset) {

        var i = index * 18;
        var a = this._offsetArr, x = offset.x, y = offset.y, z = offset.z;

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

    setRgbaArr(index, rgba) {

        var i = index * 24;
        var a = this._rgbaArr, x = rgba.x, y = rgba.y, z = rgba.z, w = rgba.w;

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

    setRotationArr(index, rotation) {

        var i = index * 6;
        var a = this._rotationArr;

        a[i] = rotation;
        a[i + 1] = rotation;
        a[i + 2] = rotation;
        a[i + 3] = rotation;
        a[i + 4] = rotation;
        a[i + 5] = rotation;

        this._changedBuffers[ROTATION_BUFFER] = true
    }

    setTexCoordArr(index, tcoordArr) {

        var i = index * 12;
        var a = this._texCoordArr;

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

    setVisibility(index, visibility) {
        var vArr;
        if (visibility) {
            vArr = [-0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5];
        } else {
            vArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
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

    setAlignedAxisArr(index, alignedAxis) {

        var i = index * 18;
        var a = this._alignedAxisArr, x = alignedAxis.x, y = alignedAxis.y, z = alignedAxis.z;

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

        this._changedBuffers[ALIGNEDAXIS_BUFFER] = true;
    }

    createPositionBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._positionBuffer);
        this._positionBuffer = h.createArrayBuffer(new Float32Array(this._positionArr), 4, this._positionArr.length / 4, h.gl.DYNAMIC_DRAW);
    }

    createSizeBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._sizeBuffer);
        this._sizeBuffer = h.createArrayBuffer(new Float32Array(this._sizeArr), 2, this._sizeArr.length / 2);
    }

    createOffsetBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._offsetBuffer);
        this._offsetBuffer = h.createArrayBuffer(new Float32Array(this._offsetArr), 3, this._offsetArr.length / 3);
    }

    createRgbaBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._rgbaBuffer);
        this._rgbaBuffer = h.createArrayBuffer(new Float32Array(this._rgbaArr), 4, this._rgbaArr.length / 4);
    }

    createRotationBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._rotationBuffer);
        this._rotationBuffer = h.createArrayBuffer(new Float32Array(this._rotationArr), 1, this._rotationArr.length, h.gl.DYNAMIC_DRAW);
    }

    createVertexBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._vertexBuffer);
        this._vertexBuffer = h.createArrayBuffer(new Float32Array(this._vertexArr), 2, this._vertexArr.length / 2, h.gl.DYNAMIC_DRAW);
    }

    createTexCoordBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._texCoordBuffer);
        this._texCoordBuffer = h.createArrayBuffer(new Float32Array(this._texCoordArr), 2, this._texCoordArr.length / 2, h.gl.DYNAMIC_DRAW);
    }

    createAlignedAxisBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._alignedAxisBuffer);
        this._alignedAxisBuffer = h.createArrayBuffer(new Float32Array(this._alignedAxisArr), 3, this._alignedAxisArr.length / 3);
    }

    createPickingColorBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._pickingColorBuffer);
        this._pickingColorBuffer = h.createArrayBuffer(new Float32Array(this._pickingColorArr), 3, this._pickingColorArr.length / 3);
    }

    refreshTexCoordsArr() {
        var bc = this._entityCollection;
        if (bc && bc.renderNode) {
            var ta = bc.renderNode.billboardsTextureAtlas;
            for (var i = 0; i < this._billboards.length; i++) {
                var bi = this._billboards[i];
                var img = bi._image;
                if (img) {
                    var imageNode = ta.nodes[bi._image.__nodeIndex];
                    if (imageNode) {
                        this.setTexCoordArr(bi._handlerIndex, imageNode.texCoords);
                    }
                }
            }
        }
    }
};

export { BillboardHandler };
