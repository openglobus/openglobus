goog.provide('og.BillboardHandler');

goog.require('og.shaderProgram.billboard');

/*
 * og.BillboardHandler
 *
 *
 */
og.BillboardHandler = function (entityCollection) {

    this._entityCollection = entityCollection;

    this._renderer = null;

    this._billboards = [];

    this._positionBuffer = null;
    this._sizeBuffer = null;
    this._offsetBuffer = null;
    this._opacityBuffer = null;
    this._rotationBuffer = null;
    this._texCoordBuffer = null;
    this._vertexBuffer = null;
    this._alignedAxisBuffer = null;

    this._texCoordArr = [];
    this._vertexArr = [];
    this._positionArr = [];
    this._sizeArr = [];
    this._offsetArr = [];
    this._opacityArr = [];
    this._rotationArr = [];
    this._alignedAxisArr = [];

    this._buffersUpdateCallbacks = [];
    this._buffersUpdateCallbacks[og.BillboardHandler.POSITION_BUFFER] = this.createPositionBuffer;
    this._buffersUpdateCallbacks[og.BillboardHandler.SIZE_BUFFER] = this.createSizeBuffer;
    this._buffersUpdateCallbacks[og.BillboardHandler.OFFSET_BUFFER] = this.createOffsetBuffer;
    this._buffersUpdateCallbacks[og.BillboardHandler.OPACITY_BUFFER] = this.createOpacityBuffer;
    this._buffersUpdateCallbacks[og.BillboardHandler.ROTATION_BUFFER] = this.createRotationBuffer;
    this._buffersUpdateCallbacks[og.BillboardHandler.TEXCOORD_BUFFER] = this.createTexCoordBuffer;
    this._buffersUpdateCallbacks[og.BillboardHandler.VERTEX_BUFFER] = this.createVertexBuffer;
    this._buffersUpdateCallbacks[og.BillboardHandler.ALIGNEDAXIS_BUFFER] = this.createAlignedAxisBuffer;

    this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);

    this.__staticId = og.BillboardHandler.staticCounter++;
};

og.BillboardHandler.staticCounter = 0;

og.BillboardHandler.POSITION_BUFFER = 0;
og.BillboardHandler.SIZE_BUFFER = 1;
og.BillboardHandler.OFFSET_BUFFER = 2;
og.BillboardHandler.OPACITY_BUFFER = 3;
og.BillboardHandler.ROTATION_BUFFER = 4;
og.BillboardHandler.TEXCOORD_BUFFER = 5;
og.BillboardHandler.VERTEX_BUFFER = 6;
og.BillboardHandler.ALIGNEDAXIS_BUFFER = 7;

og.BillboardHandler.prototype.initShaderProgram = function () {
    if (this._renderer.handler) {
        if (!this._renderer.handler.shaderPrograms.billboard) {
            this._renderer.handler.addShaderProgram(og.shaderProgram.billboard());
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
    this._opacityArr.length = 0;
    this._rotationArr.length = 0;
    this._alignedAxisArr.length = 0;

    this._texCoordArr = [];
    this._vertexArr = [];
    this._positionArr = [];
    this._sizeArr = [];
    this._offsetArr = [];
    this._opacityArr = [];
    this._rotationArr = [];
    this._alignedAxisArr = [];

    this.refresh();
};

//og.BillboardHandler.prototype.forEach = function (callback) {
//    var b = this._billboards;
//    var i = b.length;
//    while (i--) {
//        callback.call(this, b[i]);
//    }
//};


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
        billboard.setSrc(billboard.src);
    }
};

og.BillboardHandler.prototype._addBillboardToArrays = function (billboard) {
    if (billboard.visibility) {
        og.BillboardHandler.concArr(this._vertexArr, [-0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]);
    } else {
        og.BillboardHandler.concArr(this._vertexArr, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    }

    og.BillboardHandler.concArr(this._texCoordArr, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    var x = billboard.position.x, y = billboard.position.y, z = billboard.position.z;
    og.BillboardHandler.concArr(this._positionArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

    x = billboard.width; y = billboard.height;
    og.BillboardHandler.concArr(this._sizeArr, [x, y, x, y, x, y, x, y, x, y, x, y]);

    x = billboard.offset.x; y = billboard.offset.y; z = billboard.offset.z;
    og.BillboardHandler.concArr(this._offsetArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

    x = billboard.opacity;
    og.BillboardHandler.concArr(this._opacityArr, [x, x, x, x, x, x]);

    x = billboard.rotation;
    og.BillboardHandler.concArr(this._rotationArr, [x, x, x, x, x, x]);

    x = billboard.alignedAxis.x, y = billboard.alignedAxis.y, z = billboard.alignedAxis.z;
    og.BillboardHandler.concArr(this._alignedAxisArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);
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

    gl.uniformMatrix4fv(shu.uMVMatrix._pName, false, r.activeCamera.mvMatrix._m);
    gl.uniformMatrix4fv(shu.uPMatrix._pName, false, r.activeCamera.pMatrix._m);

    gl.uniform3fv(shu.uCamPos._pName, r.activeCamera.eye.toVec());

    gl.uniform1f(shu.uViewAngle._pName, r.activeCamera._tanViewAngle_hrad);
    gl.uniform1f(shu.uXRatio._pName, r.handler.canvas._oneByHeight);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordBuffer);
    gl.vertexAttribPointer(sha.a_texCoord._pName, this._texCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.a_vertices._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
    gl.vertexAttribPointer(sha.a_positions._pName, this._positionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._opacityBuffer);
    gl.vertexAttribPointer(sha.a_opacity._pName, this._opacityBuffer.itemSize, gl.FLOAT, false, 0, 0);

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
    if (this._entityCollection.visibility && this._billboards.length) {
        this.update();
        this._displayPASS();
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

    var i = bi * 18;
    this._offsetArr.splice(i, 18);
    this._vertexArr.splice(i, 18);
    this._positionArr.splice(i, 18);
    this._alignedAxisArr.splice(i, 18);

    i = bi * 12;
    this._sizeArr.splice(i, 12);
    this._texCoordArr.splice(i, 12);

    i = bi * 6;
    this._opacityArr.splice(i, 6);
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

og.BillboardHandler.prototype.setOpacityArr = function (index, opacity) {

    var i = index * 6;
    var a = this._opacityArr;

    a[i] = opacity;
    a[i + 1] = opacity;
    a[i + 2] = opacity;
    a[i + 3] = opacity;
    a[i + 4] = opacity;
    a[i + 5] = opacity;

    this._changedBuffers[og.BillboardHandler.OPACITY_BUFFER] = true;
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
        vArr = [-0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0];
    } else {
        vArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
    this.setVertexArr(index, vArr);
};

og.BillboardHandler.prototype.setVertexArr = function (index, vertexArr) {

    var i = index * 18;
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

    a[i + 12] = vertexArr[12];
    a[i + 13] = vertexArr[13];
    a[i + 14] = vertexArr[14];

    a[i + 15] = vertexArr[15];
    a[i + 16] = vertexArr[16];
    a[i + 17] = vertexArr[17];

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

og.BillboardHandler.prototype.createOpacityBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._opacityBuffer);
    this._opacityBuffer = h.createArrayBuffer(new Float32Array(this._opacityArr), 1, this._opacityArr.length);
};

og.BillboardHandler.prototype.createRotationBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._rotationBuffer);
    this._rotationBuffer = h.createArrayBuffer(new Float32Array(this._rotationArr), 1, this._rotationArr.length);
};

og.BillboardHandler.prototype.createVertexBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._vertexBuffer);
    this._vertexBuffer = h.createArrayBuffer(new Float32Array(this._vertexArr), 3, this._vertexArr.length / 3);
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

og.BillboardHandler.prototype.refreshTexCoordsArr = function () {
    var bc = this._entityCollection;
    if (bc && bc.renderNode) {
        var ta = bc.renderNode.billboardsTextureAtlas;
        for (var i = 0; i < this._billboards.length; i++) {
            var bi = this._billboards[i];
            var img = bi.image;
            if (img) {
                var imageNode = ta.nodes[bi.image.__nodeIndex];
                if (imageNode) {
                    this.setTexCoordArr(bi._handlerIndex, imageNode.texCoords);
                }
            }
        }
    }
};
