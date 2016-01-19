goog.provide('og.BillboardHandler');

goog.require('og.shaderProgram.billboard');
goog.require('og.shaderProgram.billboardPicking');

/*
 * og.BillboardHandler
 *
 *
 */
og.BillboardHandler = function (entityCollection) {

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
    this._buffersUpdateCallbacks[og.BillboardHandler.PICKINGCOLOR_BUFFER] = this.createPickingColorBuffer;
    this._buffersUpdateCallbacks[og.BillboardHandler.POSITION_BUFFER] = this.createPositionBuffer;
    this._buffersUpdateCallbacks[og.BillboardHandler.SIZE_BUFFER] = this.createSizeBuffer;
    this._buffersUpdateCallbacks[og.BillboardHandler.OFFSET_BUFFER] = this.createOffsetBuffer;
    this._buffersUpdateCallbacks[og.BillboardHandler.RGBA_BUFFER] = this.createRgbaBuffer;
    this._buffersUpdateCallbacks[og.BillboardHandler.ROTATION_BUFFER] = this.createRotationBuffer;
    this._buffersUpdateCallbacks[og.BillboardHandler.TEXCOORD_BUFFER] = this.createTexCoordBuffer;
    this._buffersUpdateCallbacks[og.BillboardHandler.VERTEX_BUFFER] = this.createVertexBuffer;
    this._buffersUpdateCallbacks[og.BillboardHandler.ALIGNEDAXIS_BUFFER] = this.createAlignedAxisBuffer;

    this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);

    this.__staticId = og.BillboardHandler.staticCounter++;
};

og.BillboardHandler.staticCounter = 0;

og.BillboardHandler.PICKINGCOLOR_BUFFER = 0;
og.BillboardHandler.POSITION_BUFFER = 1;
og.BillboardHandler.SIZE_BUFFER = 2;
og.BillboardHandler.OFFSET_BUFFER = 3;
og.BillboardHandler.RGBA_BUFFER = 4;
og.BillboardHandler.ROTATION_BUFFER = 5;
og.BillboardHandler.TEXCOORD_BUFFER = 6;
og.BillboardHandler.VERTEX_BUFFER = 7;
og.BillboardHandler.ALIGNEDAXIS_BUFFER = 8;

og.BillboardHandler.prototype.initShaderProgram = function () {
    if (this._renderer.handler) {
        if (!this._renderer.handler.shaderPrograms.billboard) {
            this._renderer.handler.addShaderProgram(og.shaderProgram.billboard());
        }
        if (!this._renderer.handler.shaderPrograms.billboardPicking) {
            this._renderer.handler.addShaderProgram(og.shaderProgram.billboardPicking());
        }
    }
};

og.BillboardHandler.prototype.setRenderer = function (renderer) {
    this._renderer = renderer;
    this.initShaderProgram();
};

og.BillboardHandler.prototype.refresh = function () {
    var i = this._changedBuffers.length;
    while (i--) {
        this._changedBuffers[i] = true;
    }
};

og.BillboardHandler.prototype.clear = function () {

    this._billboards.length = 0;
    this._billboards = [];

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

    this.refresh();
};

og.BillboardHandler.prototype.update = function () {
    if (this._renderer) {
        var i = this._changedBuffers.length;
        while (i--) {
            if (this._changedBuffers[i]) {
                this._buffersUpdateCallbacks[i].call(this);
                this._changedBuffers[i] = false;
            }
        }
    }
};

og.BillboardHandler.prototype.add = function (billboard) {
    if (billboard._handlerIndex == -1) {
        billboard._handler = this;
        billboard._handlerIndex = this._billboards.length;
        this._billboards.push(billboard);
        this._addBillboardToArrays(billboard);
        this.refresh();
        billboard.setSrc(billboard._src);
    }
};

og.BillboardHandler.prototype._addBillboardToArrays = function (billboard) {
    if (billboard._visibility) {
        og.BillboardHandler.concArr(this._vertexArr, [-0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);
    } else {
        og.BillboardHandler.concArr(this._vertexArr, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    }

    og.BillboardHandler.concArr(this._texCoordArr, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    var x = billboard._position.x, y = billboard._position.y, z = billboard._position.z;
    og.BillboardHandler.concArr(this._positionArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

    x = billboard._width; y = billboard._height;
    og.BillboardHandler.concArr(this._sizeArr, [x, y, x, y, x, y, x, y, x, y, x, y]);

    x = billboard._offset.x; y = billboard._offset.y; z = billboard._offset.z;
    og.BillboardHandler.concArr(this._offsetArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

    x = billboard._color.x; y = billboard._color.y; z = billboard._color.z; w = billboard._color.w;
    og.BillboardHandler.concArr(this._rgbaArr, [x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w]);

    x = billboard._rotation;
    og.BillboardHandler.concArr(this._rotationArr, [x, x, x, x, x, x]);

    x = billboard._alignedAxis.x, y = billboard._alignedAxis.y, z = billboard._alignedAxis.z;
    og.BillboardHandler.concArr(this._alignedAxisArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

    x = billboard._entity._pickingColor.x / 255, y = billboard._entity._pickingColor.y / 255, z = billboard._entity._pickingColor.z / 255;
    og.BillboardHandler.concArr(this._pickingColorArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);
};

og.BillboardHandler.concArr = function (dest, curr) {
    for (var i = 0; i < curr.length; i++) {
        dest.push(curr[i]);
    }
};

og.BillboardHandler.prototype._displayPASS = function () {
    var r = this._renderer;
    var h = r.handler;
    h.shaderPrograms.billboard.activate();
    var sh = h.shaderPrograms.billboard._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    var gl = h.gl;

    gl.uniform1i(shu.u_texture._pName, 0);

    gl.uniformMatrix4fv(shu.uMVMatrix._pName, false, r.activeCamera._mvMatrix._m);
    gl.uniformMatrix4fv(shu.uPMatrix._pName, false, r.activeCamera._pMatrix._m);

    gl.uniform3fv(shu.uCamPos._pName, r.activeCamera.eye.toVec());

    gl.uniform3fv(shu.uScaleByDistance._pName, this._entityCollection.scaleByDistance);

    gl.uniform1f(shu.uOpacity._pName, this._entityCollection._opacity);

    gl.uniform3fv(shu.uFloatParams._pName, [this._entityCollection.renderNode._planetRadius2 || 0, r.activeCamera._tanViewAngle_hrad, r.handler._oneByHeight]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordBuffer);
    gl.vertexAttribPointer(sha.a_texCoord._pName, this._texCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.a_vertices._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
    gl.vertexAttribPointer(sha.a_positions._pName, this._positionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._rgbaBuffer);
    gl.vertexAttribPointer(sha.a_rgba._pName, this._rgbaBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer);
    gl.vertexAttribPointer(sha.a_size._pName, this._sizeBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._offsetBuffer);
    gl.vertexAttribPointer(sha.a_offset._pName, this._offsetBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._rotationBuffer);
    gl.vertexAttribPointer(sha.a_rotation._pName, this._rotationBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._alignedAxisBuffer);
    gl.vertexAttribPointer(sha.a_alignedAxis._pName, this._alignedAxisBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer.numItems);
};

og.BillboardHandler.prototype._pickingPASS = function () {
    var r = this._renderer;
    var h = r.handler;
    h.shaderPrograms.billboardPicking.activate();
    var sh = h.shaderPrograms.billboardPicking._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    var gl = h.gl;

    gl.uniformMatrix4fv(shu.uMVMatrix._pName, false, r.activeCamera._mvMatrix._m);
    gl.uniformMatrix4fv(shu.uPMatrix._pName, false, r.activeCamera._pMatrix._m);

    gl.uniform3fv(shu.uCamPos._pName, r.activeCamera.eye.toVec());

    gl.uniform3fv(shu.uScaleByDistance._pName, this._entityCollection.scaleByDistance);

    gl.uniform1f(shu.uOpacity._pName, this._entityCollection._opacity);

    gl.uniform3fv(shu.uFloatParams._pName, [this._entityCollection.renderNode._planetRadius2 || 0, r.activeCamera._tanViewAngle_hrad, r.handler._oneByHeight]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.a_vertices._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
    gl.vertexAttribPointer(sha.a_positions._pName, this._positionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._pickingColorBuffer);
    gl.vertexAttribPointer(sha.a_pickingColor._pName, this._pickingColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer);
    gl.vertexAttribPointer(sha.a_size._pName, this._sizeBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._offsetBuffer);
    gl.vertexAttribPointer(sha.a_offset._pName, this._offsetBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._rotationBuffer);
    gl.vertexAttribPointer(sha.a_rotation._pName, this._rotationBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._alignedAxisBuffer);
    gl.vertexAttribPointer(sha.a_alignedAxis._pName, this._alignedAxisBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer.numItems);
};

og.BillboardHandler.prototype.draw = function () {
    if (this._billboards.length) {
        this.update();
        this._displayPASS();
    }
};

og.BillboardHandler.prototype.drawPicking = function () {
    if (this._billboards.length && this.pickingEnabled) {
        this._pickingPASS();
    }
};

og.BillboardHandler.prototype.reindexBillbordsArray = function (startIndex) {
    var b = this._billboards;
    for (var i = startIndex; i < b.length; i++) {
        b[i]._handlerIndex = i;
    }
};

og.BillboardHandler.prototype._removeBillboard = function (billboard) {
    var bi = billboard._handlerIndex;

    this._billboards.splice(bi, 1);

    var i = bi * 24;
    this._rgbaArr.splice(i, 24);

    i = bi * 18;
    this._offsetArr.splice(i, 18);
    this._positionArr.splice(i, 18);
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
};

og.BillboardHandler.prototype.remove = function (billboard) {
    if (billboard._handler && this.__staticId == billboard._handler.__staticId) {
        this._removeBillboard(billboard);
    }
};

og.BillboardHandler.prototype.setPositionArr = function (index, position) {

    var i = index * 18;
    var a = this._positionArr, x = position.x, y = position.y, z = position.z;

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

    this._changedBuffers[og.BillboardHandler.POSITION_BUFFER] = true;
};

og.BillboardHandler.prototype.setPickingColorArr = function (index, color) {

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

    this._changedBuffers[og.BillboardHandler.PICKINGCOLOR_BUFFER] = true;
};

og.BillboardHandler.prototype.setSizeArr = function (index, width, height) {

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

    this._changedBuffers[og.BillboardHandler.SIZE_BUFFER] = true;
};

og.BillboardHandler.prototype.setOffsetArr = function (index, offset) {

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

    this._changedBuffers[og.BillboardHandler.OFFSET_BUFFER] = true;
};

og.BillboardHandler.prototype.setRgbaArr = function (index, rgba) {

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

    this._changedBuffers[og.BillboardHandler.RGBA_BUFFER] = true;
};

og.BillboardHandler.prototype.setRotationArr = function (index, rotation) {

    var i = index * 6;
    var a = this._rotationArr;

    a[i] = rotation;
    a[i + 1] = rotation;
    a[i + 2] = rotation;
    a[i + 3] = rotation;
    a[i + 4] = rotation;
    a[i + 5] = rotation;

    this._changedBuffers[og.BillboardHandler.ROTATION_BUFFER] = true
};

og.BillboardHandler.prototype.setTexCoordArr = function (index, tcoordArr) {

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

    this._changedBuffers[og.BillboardHandler.TEXCOORD_BUFFER] = true;
};

og.BillboardHandler.prototype.setVisibility = function (index, visibility) {
    var vArr;
    if (visibility) {
        vArr = [-0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5];
    } else {
        vArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
    this.setVertexArr(index, vArr);
};

og.BillboardHandler.prototype.setVertexArr = function (index, vertexArr) {

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

    this._changedBuffers[og.BillboardHandler.VERTEX_BUFFER] = true;
};

og.BillboardHandler.prototype.setAlignedAxisArr = function (index, alignedAxis) {

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

    this._changedBuffers[og.BillboardHandler.ALIGNEDAXIS_BUFFER] = true;
};

og.BillboardHandler.prototype.createPositionBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._positionBuffer);
    this._positionBuffer = h.createArrayBuffer(new Float32Array(this._positionArr), 3, this._positionArr.length / 3);
};

og.BillboardHandler.prototype.createSizeBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._sizeBuffer);
    this._sizeBuffer = h.createArrayBuffer(new Float32Array(this._sizeArr), 2, this._sizeArr.length / 2);
};

og.BillboardHandler.prototype.createOffsetBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._offsetBuffer);
    this._offsetBuffer = h.createArrayBuffer(new Float32Array(this._offsetArr), 3, this._offsetArr.length / 3);
};

og.BillboardHandler.prototype.createRgbaBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._rgbaBuffer);
    this._rgbaBuffer = h.createArrayBuffer(new Float32Array(this._rgbaArr), 4, this._rgbaArr.length / 4);
};

og.BillboardHandler.prototype.createRotationBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._rotationBuffer);
    this._rotationBuffer = h.createArrayBuffer(new Float32Array(this._rotationArr), 1, this._rotationArr.length);
};

og.BillboardHandler.prototype.createVertexBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._vertexBuffer);
    this._vertexBuffer = h.createArrayBuffer(new Float32Array(this._vertexArr), 2, this._vertexArr.length / 2);
};

og.BillboardHandler.prototype.createTexCoordBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._texCoordBuffer);
    this._texCoordBuffer = h.createArrayBuffer(new Float32Array(this._texCoordArr), 2, this._texCoordArr.length / 2);
};

og.BillboardHandler.prototype.createAlignedAxisBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._alignedAxisBuffer);
    this._alignedAxisBuffer = h.createArrayBuffer(new Float32Array(this._alignedAxisArr), 3, this._alignedAxisArr.length / 3);
};

og.BillboardHandler.prototype.createPickingColorBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._pickingColorBuffer);
    this._pickingColorBuffer = h.createArrayBuffer(new Float32Array(this._pickingColorArr), 3, this._pickingColorArr.length / 3);
};

og.BillboardHandler.prototype.refreshTexCoordsArr = function () {
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
};
