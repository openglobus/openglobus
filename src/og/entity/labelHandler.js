goog.provide('og.LabelHandler');

goog.require('og.shaderProgram.label');
goog.require('og.shaderProgram.labelPicking');
goog.require('og.BillboardHandler');
goog.require('og.inheritance');
goog.require('og.Label');

/*
 * og.LabelHandler
 *
 *
 */
og.LabelHandler = function (entityCollection) {

    og.inheritance.base(this, entityCollection);

    this._fontIndexBuffer = null;
    this._noOutlineBuffer = null;
    this._outlineBuffer = null;
    this._outlineColorBuffer = null;

    this._fontIndexArr = [];
    this._noOutlineArr = [];
    this._outlineArr = [];
    this._outlineColorArr = [];

    this._buffersUpdateCallbacks[og.LabelHandler.FONTINDEX_BUFFER] = this.createFontIndexBuffer;
    this._buffersUpdateCallbacks[og.LabelHandler.OUTLINE_BUFFER] = this.createOutlineBuffer;
    this._buffersUpdateCallbacks[og.LabelHandler.OUTLINECOLOR_BUFFER] = this.createOutlineColorBuffer;

    this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);

    this._maxLetters = 32;
};

og.inheritance.extend(og.LabelHandler, og.BillboardHandler);

og.LabelHandler.FONTINDEX_BUFFER = 9;
og.LabelHandler.OUTLINE_BUFFER = 10;
og.LabelHandler.OUTLINECOLOR_BUFFER = 11;

og.LabelHandler.prototype.initShaderProgram = function () {
    if (this._renderer.handler) {
        if (!this._renderer.handler.shaderPrograms.label) {
            this._renderer.handler.addShaderProgram(og.shaderProgram.label());
        }
        if (!this._renderer.handler.shaderPrograms.labelPicking) {
            this._renderer.handler.addShaderProgram(og.shaderProgram.labelPicking());
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

og.LabelHandler.prototype.assignFontAtlas = function (label) {
    if (this._entityCollection && this._entityCollection.renderNode) {
        label.assignFontAtlas(this._entityCollection.renderNode.fontAtlas);
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
    this._rgbaArr.length = 0;
    this._rotationArr.length = 0;
    this._alignedAxisArr.length = 0;
    this._fontIndexArr.length = 0;
    this._letterOffsetArr.length = 0;
    this._noOutlineArr.length = 0;
    this._outlineArr.length = 0;
    this._outlineColorArr.length = 0;

    this._texCoordArr = [];
    this._vertexArr = [];
    this._positionArr = [];
    this._sizeArr = [];
    this._offsetArr = [];
    this._rgbaArr = [];
    this._rotationArr = [];
    this._alignedAxisArr = [];
    this._fontIndexArr = [];
    this._letterOffsetArr = [];
    this._noOutlineArr = [];
    this._outlineArr = [];
    this._outlineColorArr = [];

    this.refresh();
};

og.LabelHandler.prototype._addBillboardToArrays = function (label) {
    for (var i = 0; i < this._maxLetters; i++) {
        if (label._visibility) {
            og.BillboardHandler.concArr(this._vertexArr, [-0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);
        } else {
            og.BillboardHandler.concArr(this._vertexArr, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        }

        og.BillboardHandler.concArr(this._texCoordArr, [0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0]);

        var x = label._position.x, y = label._position.y, z = label._position.z;
        og.BillboardHandler.concArr(this._positionArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        x = label._size;
        og.BillboardHandler.concArr(this._sizeArr, [x, x, x, x, x, x]);

        x = label._offset.x; y = label._offset.y; z = label._offset.z - 0.05;
        og.BillboardHandler.concArr(this._offsetArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        x = label._color.x; y = label._color.y; z = label._color.z; w = label._color.w;
        og.BillboardHandler.concArr(this._rgbaArr, [x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w]);

        x = label._rotation;
        og.BillboardHandler.concArr(this._rotationArr, [x, x, x, x, x, x]);

        x = label._alignedAxis.x, y = label._alignedAxis.y, z = label._alignedAxis.z;
        og.BillboardHandler.concArr(this._alignedAxisArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

        x = label._fontIndex;
        og.BillboardHandler.concArr(this._fontIndexArr, [0, 0, 0, 0, 0, 0]);

        x = 1.0 - label._outline, y = 0.0;
        og.BillboardHandler.concArr(this._outlineArr, [x, y, x, y, x, y, x, y, x, y, x, y]);

        x = 0.75, y = 0.7;
        og.BillboardHandler.concArr(this._noOutlineArr, [x, y, x, y, x, y, x, y, x, y, x, y]);

        x = label._outlineColor.x; y = label._outlineColor.y; z = label._outlineColor.z; w = label._outlineColor.w;
        og.BillboardHandler.concArr(this._outlineColorArr, [x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w]);

        x = label._entity._pickingColor.x / 255, y = label._entity._pickingColor.y / 255, z = label._entity._pickingColor.z / 255;
        og.BillboardHandler.concArr(this._pickingColorArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);
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

    gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer);
    gl.vertexAttribPointer(sha.a_size._pName, this._sizeBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._offsetBuffer);
    gl.vertexAttribPointer(sha.a_offset._pName, this._offsetBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._rotationBuffer);
    gl.vertexAttribPointer(sha.a_rotation._pName, this._rotationBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._alignedAxisBuffer);
    gl.vertexAttribPointer(sha.a_alignedAxis._pName, this._alignedAxisBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._fontIndexBuffer);
    gl.vertexAttribPointer(sha.a_fontIndex._pName, this._fontIndexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this._outlineColorBuffer);
    gl.vertexAttribPointer(sha.a_rgba._pName, this._outlineColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._outlineBuffer);
    gl.vertexAttribPointer(sha.a_bufferAA._pName, this._outlineBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.uniform1f(shu.uZ._pName, 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer.numItems);

    //nobuffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this._rgbaBuffer);
    gl.vertexAttribPointer(sha.a_rgba._pName, this._rgbaBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._noOutlineBuffer);
    gl.vertexAttribPointer(sha.a_bufferAA._pName, this._noOutlineBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.uniform1f(shu.uZ._pName, -0.05);
    gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer.numItems);

};

og.LabelHandler.prototype._pickingPASS = function () {
    var r = this._renderer;
    var h = r.handler;
    h.shaderPrograms.labelPicking.activate();
    var sh = h.shaderPrograms.labelPicking._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    var gl = h.gl;

    gl.uniformMatrix4fv(shu.uMVMatrix._pName, false, r.activeCamera.mvMatrix._m);
    gl.uniformMatrix4fv(shu.uPMatrix._pName, false, r.activeCamera.pMatrix._m);

    gl.uniform3fv(shu.uCamPos._pName, r.activeCamera.eye.toVec());

    gl.uniform1f(shu.uViewAngle._pName, r.activeCamera._tanViewAngle_hrad);
    gl.uniform1f(shu.uXRatio._pName, r.handler.canvas._oneByHeight);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.a_vertices._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordBuffer);
    gl.vertexAttribPointer(sha.a_texCoord._pName, this._texCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
    gl.vertexAttribPointer(sha.a_positions._pName, this._positionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer);
    gl.vertexAttribPointer(sha.a_size._pName, this._sizeBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._offsetBuffer);
    gl.vertexAttribPointer(sha.a_offset._pName, this._offsetBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._rotationBuffer);
    gl.vertexAttribPointer(sha.a_rotation._pName, this._rotationBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._alignedAxisBuffer);
    gl.vertexAttribPointer(sha.a_alignedAxis._pName, this._alignedAxisBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._pickingColorBuffer);
    gl.vertexAttribPointer(sha.a_pickingColor._pName, this._pickingColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer.numItems);
};

og.LabelHandler.prototype._removeBillboard = function (label) {
    var li = label._handlerIndex;

    this._billboards.splice(li, 1);

    var ml = 24 * this._maxLetters;
    var i = li * ml;
    this._rgbaArr.splice(i, ml);
    this._outlineColorArr.splice(i, ml);
    this._texCoordArr.splice(i, ml);

    ml = 18 * this._maxLetters;
    i = li * ml;
    this._offsetArr.splice(i, ml);
    this._positionArr.splice(i, ml);
    this._alignedAxisArr.splice(i, ml);
    this._pickingColorArr.splice(i, ml);

    ml = 12 * this._maxLetters;
    i = li * ml;
    this._vertexArr.splice(i, ml);
    this._outlineArr.splice(i, ml);
    this._noOutlineArr.splice(i, ml);

    ml = 6 * this._maxLetters;
    i = li * ml;
    this._sizeArr.splice(i, ml);
    this._rotationArr.splice(i, ml);
    this._fontIndexArr.splice(i, ml);

    this.reindexBillbordsArray(li);
    this.refresh();

    label._handlerIndex = -1;
    label._handler = null;
    label._fontIndex = 0;
    label._fontAtlas = null;
};

og.LabelHandler.prototype.setText = function (index, text, fontIndex, align) {

    var fa = this._entityCollection.renderNode.fontAtlas.atlasesArr[fontIndex];

    if (!fa) return;

    var i = index * 24 * this._maxLetters;
    var a = this._texCoordArr;

    var c = 0;

    var j = i + c * 24;
    var n = fa.nodes[text[c]];
    var f = n ? n.emptySize : 0.0;
    var offset = f;

    for (c = 0; c < text.length; c++) {
        var j = i + c * 24;
        var n = fa.nodes[text[c]];
        var tc = n.texCoords;

        a[j] = tc[0];
        a[j + 1] = tc[1];
        a[j + 2] = offset;
        a[j + 3] = 0.0;

        a[j + 4] = tc[2];
        a[j + 5] = tc[3];
        a[j + 6] = offset;
        a[j + 7] = 0.0;

        a[j + 8] = tc[4];
        a[j + 9] = tc[5];
        a[j + 10] = offset;
        a[j + 11] = 0.0;

        a[j + 12] = tc[6];
        a[j + 13] = tc[7];
        a[j + 14] = offset;
        a[j + 15] = 0.0;

        a[j + 16] = tc[8];
        a[j + 17] = tc[9];
        a[j + 18] = offset;
        a[j + 19] = 0.0;

        a[j + 20] = tc[10];
        a[j + 21] = tc[11];
        a[j + 22] = offset;
        a[j + 23] = 0.0;

        offset += n.emptySize;
    }

    //49/512 - font atlas left border letter offset
    if (align == og.Label.CENTER) {
        offset = (f + 49 / 512 - offset) * 0.5;
        for (c = 0; c < text.length; c++) {
            var j = i + c * 24;
            a[j + 3] = offset;
            a[j + 7] = offset;
            a[j + 11] = offset;
            a[j + 15] = offset;
            a[j + 19] = offset;
            a[j + 23] = offset;
        }
    } else if (align == og.Label.LEFT) {
        offset = (f + 49 / 512 - offset);
        for (c = 0; c < text.length; c++) {
            var j = i + c * 24;
            a[j + 3] = offset;
            a[j + 7] = offset;
            a[j + 11] = offset;
            a[j + 15] = offset;
            a[j + 19] = offset;
            a[j + 23] = offset;
        }
    }

    for (var c = c; c < this._maxLetters; c++) {
        var j = i + c * 24;
        a[j + 2] = -1.0;
        a[j + 6] = -1.0;
        a[j + 10] = -1.0;
        a[j + 14] = -1.0;
        a[j + 18] = -1.0;
        a[j + 17] = -1.0;
    }

    this._changedBuffers[og.BillboardHandler.TEXCOORD_BUFFER] = true;
};

og.LabelHandler.prototype.setPositionArr = function (index, position) {
    var i = index * 18 * this._maxLetters;
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

og.LabelHandler.prototype.setPickingColorArr = function (index, color) {
    var i = index * 18 * this._maxLetters;
    var a = this._pickingColorArr, x = color.x / 255, y = color.y / 255, z = color.z / 255;

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

    this._changedBuffers[og.BillboardHandler.PICKINGCOLOR_BUFFER] = true;
};

og.LabelHandler.prototype.setSizeArr = function (index, size) {

    var i = index * 6 * this._maxLetters;
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

    var i = index * 18 * this._maxLetters;
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

og.LabelHandler.prototype.setRgbaArr = function (index, rgba) {
    var i = index * 24 * this._maxLetters;
    var a = this._rgbaArr, x = rgba.x, y = rgba.y, z = rgba.z, w = rgba.w;

    for (var q = 0; q < this._maxLetters; q++) {
        var j = i + q * 24;

        a[j] = x;
        a[j + 1] = y;
        a[j + 2] = z;
        a[j + 3] = w;

        a[j + 4] = x;
        a[j + 5] = y;
        a[j + 6] = z;
        a[j + 7] = w;

        a[j + 8] = x;
        a[j + 9] = y;
        a[j + 10] = z;
        a[j + 11] = w;

        a[j + 12] = x;
        a[j + 13] = y;
        a[j + 14] = z;
        a[j + 15] = w;

        a[j + 16] = x;
        a[j + 17] = y;
        a[j + 18] = z;
        a[j + 19] = w;

        a[j + 20] = x;
        a[j + 21] = y;
        a[j + 22] = z;
        a[j + 23] = w;
    }

    this._changedBuffers[og.BillboardHandler.RGBA_BUFFER] = true;
};

og.LabelHandler.prototype.setOutlineColorArr = function (index, rgba) {
    var i = index * 24 * this._maxLetters;
    var a = this._outlineColorArr, x = rgba.x, y = rgba.y, z = rgba.z, w = rgba.w;

    for (var q = 0; q < this._maxLetters; q++) {
        var j = i + q * 24;

        a[j] = x;
        a[j + 1] = y;
        a[j + 2] = z;
        a[j + 3] = w;

        a[j + 4] = x;
        a[j + 5] = y;
        a[j + 6] = z;
        a[j + 7] = w;

        a[j + 8] = x;
        a[j + 9] = y;
        a[j + 10] = z;
        a[j + 11] = w;

        a[j + 12] = x;
        a[j + 13] = y;
        a[j + 14] = z;
        a[j + 15] = w;

        a[j + 16] = x;
        a[j + 17] = y;
        a[j + 18] = z;
        a[j + 19] = w;

        a[j + 20] = x;
        a[j + 21] = y;
        a[j + 22] = z;
        a[j + 23] = w;
    }

    this._changedBuffers[og.LabelHandler.OUTLINECOLOR_BUFFER] = true;
};

og.LabelHandler.prototype.setOutlineArr = function (index, outline) {
    var i = index * 12 * this._maxLetters;
    var a = this._outlineArr;

    for (var q = 0; q < this._maxLetters; q++) {
        var j = i + q * 12;
        a[j] = outline;
        a[j + 2] = outline;
        a[j + 4] = outline;
        a[j + 6] = outline;
        a[j + 8] = outline;
        a[j + 10] = outline;
    }

    this._changedBuffers[og.LabelHandler.OUTLINE_BUFFER] = true;
};

og.LabelHandler.prototype.setRotationArr = function (index, rotation) {

    var i = index * 6 * this._maxLetters;
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

og.LabelHandler.prototype.setVertexArr = function (index, vertexArr) {

    var i = index * 12 * this._maxLetters;
    var a = this._vertexArr;

    for (var q = 0; q < this._maxLetters; q++) {
        var j = i + q * 12;
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
    }

    this._changedBuffers[og.BillboardHandler.VERTEX_BUFFER] = true;
};

og.LabelHandler.prototype.setAlignedAxisArr = function (index, alignedAxis) {
    var i = index * 18 * this._maxLetters;
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

    var i = index * 6 * this._maxLetters;
    var a = this._fontIndexArr;

    for (var q = 0; q < this._maxLetters; q++) {
        var j = i + q * 6;
        a[j] = fontIndex;
        a[j + 1] = fontIndex;
        a[j + 2] = fontIndex;
        a[j + 3] = fontIndex;
        a[j + 4] = fontIndex;
        a[j + 5] = fontIndex;
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
    this._texCoordBuffer = h.createArrayBuffer(new Float32Array(this._texCoordArr), 4, this._texCoordArr.length / 4);
};

og.LabelHandler.prototype.createOutlineBuffer = function () {
    var h = this._renderer.handler;

    h.gl.deleteBuffer(this._outlineBuffer);
    this._outlineBuffer = h.createArrayBuffer(new Float32Array(this._outlineArr), 2, this._outlineArr.length / 2);

    h.gl.deleteBuffer(this._noOutlineBuffer);
    this._noOutlineBuffer = h.createArrayBuffer(new Float32Array(this._noOutlineArr), 2, this._noOutlineArr.length / 2);
};

og.BillboardHandler.prototype.createOutlineColorBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._outlineColorBuffer);
    this._outlineColorBuffer = h.createArrayBuffer(new Float32Array(this._outlineColorArr), 4, this._outlineColorArr.length / 4);
};

og.LabelHandler.prototype.setMaxLetters = function (c) {
    this._maxLetters = c;
    //...
};

og.LabelHandler.prototype.refreshTexCoordsArr = function () {
    //it is empty
    return null;
};