goog.provide('og.LabelHandler');

goog.require('og.shaderProgram.billboard');
goog.require('og.BillboardHandler');
goog.require('og.inheritance');

/*
 * og.LabelHandler
 *
 *
 */
og.LabelHandler = function (entityCollection) {

    og.inheritance.base(this, entityCollection);

    this._fontIndexBuffer = null;

    this._fontIndexArr = [];

    this._buffersUpdateCallbacks[og.LabelHandler.FONTINDEX_BUFFER] = this.createFontIndexBuffer;

    this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);

    this._maxLetters = 2;
};

og.inheritance.extend(og.LabelHandler, og.BillboardHandler);

og.LabelHandler.FONTINDEX_BUFFER = 8;

og.LabelHandler.prototype.initShaderProgram = function () {
    if (this._renderer.handler) {
        if (!this._renderer.handler.shaderPrograms.label) {
            this._renderer.handler.addShaderProgram(og.shaderProgram.label());
        }
    }
};

og.LabelHandler.prototype.add = function (label) {
    if (label._handlerIndex == -1) {
        label._handler = this;
        label._handlerIndex = this._billboards.length;
        this._billboards.push(label);
        this._addBillboardToArrays(label);
        this.refresh();
        this.assignFontAtlas(label);
    }
};

og.LabelHandler.prototypre.assignFontAtlas = function (label) {
    if (this._entityCollection && this._entityCollection.renderNode) {
        label._fontAtlas = this._entityCollection.renderNode.fontAtlas;
    }
};

og.LabelHandler.prototype.clear = function () {

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
    this._fontIndexArr.length = 0;
    this._letterOffsetArr.length = 0;

    this._texCoordArr = [];
    this._vertexArr = [];
    this._positionArr = [];
    this._sizeArr = [];
    this._offsetArr = [];
    this._opacityArr = [];
    this._rotationArr = [];
    this._alignedAxisArr = [];
    this._fontIndexArr = [];
    this._letterOffsetArr = [];

    this.refresh();
};

og.LabelHandler.prototype._addBillboardToArrays = function (label) {
    for (var i = 0; i < this._maxLetters; i++) {
        if (label.visibility) {
            og.BillboardHandler.concArr(this._vertexArr, [-0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]);
        } else {
            og.BillboardHandler.concArr(this._vertexArr, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        }

        og.BillboardHandler.concArr(this._texCoordArr, [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);

        var x = label.position.x, y = label.position.y, z = label.position.z;
        og.BillboardHandler.concArr(this._positionArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        x = label.size;
        og.BillboardHandler.concArr(this._sizeArr, [x, x, x, x, x, x]);

        x = label.offset.x; y = label.offset.y; z = label.offset.z;
        og.BillboardHandler.concArr(this._offsetArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        x = label.opacity;
        og.BillboardHandler.concArr(this._opacityArr, [x, x, x, x, x, x]);

        x = label.rotation;
        og.BillboardHandler.concArr(this._rotationArr, [x, x, x, x, x, x]);

        x = label.alignedAxis.x, y = label.alignedAxis.y, z = label.alignedAxis.z;
        og.BillboardHandler.concArr(this._alignedAxisArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        x = label._fontIndex;
        og.BillboardHandler.concArr(this._fontIndexArr, [0, 0, 0, 0, 0, 0]);
    }
};

og.LabelHandler.prototype._displayPASS = function () {
    var r = this._renderer;
    var h = r.handler;
    h.shaderPrograms.label.activate();
    var sh = h.shaderPrograms.label._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    var gl = h.gl;

    gl.uniform1iv(shu.u_fontTextureArr._pName, this._entityCollection.renderNode.fontAtlas.samplerArr);

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

    gl.bindBuffer(gl.ARRAY_BUFFER, this._fontIndexBuffer);
    gl.vertexAttribPointer(sha.a_alignedAxis._pName, this._fontIndexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer.numItems);
};

og.LabelHandler.prototype._removeBillboard = function (billboard) {
    var bi = billboard._handlerIndex;

    this._billboards.splice(bi, 1);

    var i = bi * 18;
    var ml = 18 * this._maxLetters;
    this._offsetArr.splice(i, ml);
    this._vertexArr.splice(i, ml);
    this._positionArr.splice(i, ml);
    this._alignedAxisArr.splice(i, ml);
    this._texCoordArr.splice(i, ml);

    i = bi * 6;
    ml = 6 * this._maxLetters;
    this._sizeArr.splice(i, ml);
    this._opacityArr.splice(i, ml);
    this._rotationArr.splice(i, ml);
    this._fontIndexArr.splice(i, ml);

    this.reindexBillbordsArray(bi);
    this.refresh();

    billboard._handlerIndex = -1;
    billboard._handler = null;
};

og.LabelHandler.prototype.setText = function (index, text, fontIndex) {

    var fa = this._entityCollection.renderNode.fontAtlas.atlasesArr[fontIndex];

    var i = index * 18;
    var a = this._texCoordArr;

    var c;
    var offset = -fa.nodes[text[0]].emptySize;
    for (c = 0; c < text.length; c++) {
        var j = i + c * 18;
        var n = fa.nodes[text[c]];
        var tc = n.texCoords;
        offset += n.emptySize;

        a[j] = tc[0];
        a[j + 1] = tc[1];
        a[j + 2] = offset;

        a[j + 3] = tc[2];
        a[j + 4] = tc[3];
        a[j + 5] = offset;

        a[j + 6] = tc[4];
        a[j + 7] = tc[5];
        a[j + 8] = offset;

        a[j + 9] = tc[6];
        a[j + 10] = tc[7];
        a[j + 11] = offset;

        a[j + 12] = tc[8];
        a[j + 13] = tc[9];
        a[j + 14] = offset;

        a[j + 15] = tc[10];
        a[j + 16] = tc[11];
        a[j + 17] = offset;
    }

    for (var c = c; c < this._maxLetters; c++) {
        var j = i + c * 18;

        a[j + 2] = -1;

        a[j + 5] = -1;

        a[j + 8] = -1;

        a[j + 11] = -1;

        a[j + 14] = -1;

        a[j + 17] = -1;
    }

    this._changedBuffers[og.BillboardHandler.TEXCOORD_BUFFER] = true;
};

og.LabelHandler.prototype.setPositionArr = function (index, position) {
    var i = index * 18;
    var a = this._positionArr, x = position.x, y = position.y, z = position.z;

    for (var q = 0; q < this._maxLetters; q++) {
        var j = i + q * 18;
        a[j] = x;
        a[j + 1] = y;
        a[j + 2] = z;

        a[j + 3] = x;
        a[j + 4] = y;
        a[j + 5] = z;

        a[j + 6] = x;
        a[j + 7] = y;
        a[j + 8] = z;

        a[j + 9] = x;
        a[j + 10] = y;
        a[j + 11] = z;

        a[j + 12] = x;
        a[j + 13] = y;
        a[j + 14] = z;

        a[j + 15] = x;
        a[j + 16] = y;
        a[j + 17] = z;
    }

    this._changedBuffers[og.BillboardHandler.POSITION_BUFFER] = true;
};

og.LabelHandler.prototype.setSizeArr = function (index, size) {

    var i = index * 6;
    var a = this._sizeArr;

    for (var q = 0; q < this._maxLetters; q++) {
        var j = i + q * 6;
        a[j] = size;
        a[j + 1] = size;
        a[j + 2] = size;
        a[j + 3] = size;
        a[j + 4] = size;
        a[j + 5] = size;
    }

    this._changedBuffers[og.BillboardHandler.SIZE_BUFFER] = true;
};

og.LabelHandler.prototype.setOffsetArr = function (index, offset) {

    var i = index * 18;
    var a = this._offsetArr, x = offset.x, y = offset.y, z = offset.z;

    for (var q = 0; q < this._maxLetters; q++) {
        var j = i + q * 18;
        a[j] = x;
        a[j + 1] = y;
        a[j + 2] = z;

        a[j + 3] = x;
        a[j + 4] = y;
        a[j + 5] = z;

        a[j + 6] = x;
        a[j + 7] = y;
        a[j + 8] = z;

        a[j + 9] = x;
        a[j + 10] = y;
        a[j + 11] = z;

        a[j + 12] = x;
        a[j + 13] = y;
        a[j + 14] = z;

        a[j + 15] = x;
        a[j + 16] = y;
        a[j + 17] = z;
    }

    this._changedBuffers[og.BillboardHandler.OFFSET_BUFFER] = true;
};

og.LabelHandler.prototype.setOpacityArr = function (index, opacity) {
    var i = index * 6;
    var a = this._opacityArr;

    for (var q = 0; q < this._maxLetters; q++) {
        var j = i + q * 6;
        a[j] = opacity;
        a[j + 1] = opacity;
        a[j + 2] = opacity;
        a[j + 3] = opacity;
        a[j + 4] = opacity;
        a[j + 5] = opacity;
    }

    this._changedBuffers[og.BillboardHandler.OPACITY_BUFFER] = true;
};

og.LabelHandler.prototype.setRotationArr = function (index, rotation) {

    var i = index * 6;
    var a = this._rotationArr;

    for (var q = 0; q < this._maxLetters; q++) {
        var j = i + q * 6;
        a[j] = rotation;
        a[j + 1] = rotation;
        a[j + 2] = rotation;
        a[j + 3] = rotation;
        a[j + 4] = rotation;
        a[j + 5] = rotation;
    }

    this._changedBuffers[og.BillboardHandler.ROTATION_BUFFER] = true
};

og.LabelHandler.prototype.setVisibility = function (index, visibility) {
    var vArr;
    if (visibility) {
        vArr = [-0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0];
    } else {
        vArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
    this.setVertexArr(index, vArr);
};

og.LabelHandler.prototype.setVertexArr = function (index, vertexArr) {

    var i = index * 18;
    var a = this._vertexArr;

    for (var q = 0; q < this._maxLetters; q++) {
        var j = i + q * 18;
        a[j] = vertexArr[0];
        a[j + 1] = vertexArr[1];
        a[j + 2] = vertexArr[2];

        a[j + 3] = vertexArr[3];
        a[j + 4] = vertexArr[4];
        a[j + 5] = vertexArr[5];

        a[j + 6] = vertexArr[6];
        a[j + 7] = vertexArr[7];
        a[j + 8] = vertexArr[8];

        a[j + 9] = vertexArr[9];
        a[j + 10] = vertexArr[10];
        a[j + 11] = vertexArr[11];

        a[j + 12] = vertexArr[12];
        a[j + 13] = vertexArr[13];
        a[j + 14] = vertexArr[14];

        a[j + 15] = vertexArr[15];
        a[j + 16] = vertexArr[16];
        a[j + 17] = vertexArr[17];
    }

    this._changedBuffers[og.BillboardHandler.VERTEX_BUFFER] = true;
};

og.LabelHandler.prototype.setAlignedAxisArr = function (index, alignedAxis) {
    var i = index * 18;
    var a = this._alignedAxisArr, x = alignedAxis.x, y = alignedAxis.y, z = alignedAxis.z;

    for (var q = 0; q < this._maxLetters; q++) {
        var j = i + q * 18;
        a[j] = x;
        a[j + 1] = y;
        a[j + 2] = z;

        a[j + 3] = x;
        a[j + 4] = y;
        a[j + 5] = z;

        a[j + 6] = x;
        a[j + 7] = y;
        a[j + 8] = z;

        a[j + 9] = x;
        a[j + 10] = y;
        a[j + 11] = z;

        a[j + 12] = x;
        a[j + 13] = y;
        a[j + 14] = z;

        a[j + 15] = x;
        a[j + 16] = y;
        a[j + 17] = z;
    }

    this._changedBuffers[og.BillboardHandler.ALIGNEDAXIS_BUFFER] = true;
};


og.LabelHandler.prototype.setFontIndexArr = function (index, fontIndex) {

    var i = index * 6;
    var a = this._fontIndexArr;

    for (var q = 0; q < this._maxLetters; q++) {
        var j = i + q * 6;
        a[j] = rotation;
        a[j + 1] = rotation;
        a[j + 2] = rotation;
        a[j + 3] = rotation;
        a[j + 4] = rotation;
        a[j + 5] = rotation;
    }

    this._changedBuffers[og.LabelHandler.FONTINDEX_BUFFER] = true;
};

og.LabelHandler.prototype.createSizeBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._sizeBuffer);
    this._sizeBuffer = h.createArrayBuffer(new Float32Array(this._sizeArr), 1, this._sizeArr.length);
};

og.LabelHandler.prototype.createFontIndexBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._fontIndexBuffer);
    this._fontIndexBuffer = h.createArrayBuffer(new Float32Array(this._fontIndexArr), 1, this._fontIndexArr.length);
};

og.LabelHandler.prototype.createTexCoordBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._texCoordBuffer);
    this._texCoordBuffer = h.createArrayBuffer(new Float32Array(this._texCoordArr), 3, this._texCoordArr.length / 3);
};

og.LabelHandler.prototype.setMaxLetters = function (c) {
    this._maxLetters = c;
    //...
};

og.LabelHandler.prototype.refreshTexCoordsArr = function () {
    return null;
};