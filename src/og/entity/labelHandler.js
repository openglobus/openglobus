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
    this._letterOffsetBuffer = null;

    this._fontIndexArr = [];
    this._letterOffsetArr = [];

    this._buffersUpdateCallbacks[og.LabelHandler.FONTINDEX_BUFFER] = this.createFontIndexBuffer;
    this._buffersUpdateCallbacks[og.LabelHandler.LETTEROFFSET_BUFFER] = this.createLetterOffsetBuffer;

    this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);
};

og.inheritance.extend(og.LabelHandler, og.BillboardHandler);

og.LabelHandler.FONTINDEX_BUFFER = 8;
og.LabelHandler.LETTEROFFSET_BUFFER = 9;


og.LabelHandler.prototype.initShaderProgram = function () {
    if (this._renderer.handler) {
        if (!this._renderer.handler.shaderPrograms.label) {
            this._renderer.handler.addShaderProgram(og.shaderProgram.label());
        }
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

og.LabelHandler.prototype._addBillboardToArrays = function (billboard) {
    //if (billboard.visibility) {
    //    og.BillboardHandler.concArr(this._vertexArr, [-0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]);
    //} else {
    //    og.BillboardHandler.concArr(this._vertexArr, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    //}

    //og.BillboardHandler.concArr(this._texCoordArr, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    //var x = billboard.position.x, y = billboard.position.y, z = billboard.position.z;
    //og.BillboardHandler.concArr(this._positionArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

    //x = billboard.width; y = billboard.height;
    //og.BillboardHandler.concArr(this._sizeArr, [x, y, x, y, x, y, x, y, x, y, x, y]);

    //x = billboard.offset.x; y = billboard.offset.y; z = billboard.offset.z;
    //og.BillboardHandler.concArr(this._offsetArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

    //x = billboard.opacity;
    //og.BillboardHandler.concArr(this._opacityArr, [x, x, x, x, x, x]);

    //x = billboard.rotation;
    //og.BillboardHandler.concArr(this._rotationArr, [x, x, x, x, x, x]);

    //x = billboard.alignedAxis.x, y = billboard.alignedAxis.y, z = billboard.alignedAxis.z;
    //og.BillboardHandler.concArr(this._alignedAxisArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);
};

og.LabelHandler.prototype._displayPASS = function () {
    //var r = this._renderer;
    //var h = r.handler;
    //h.shaderPrograms.billboard.activate();
    //var sh = h.shaderPrograms.billboard._program;
    //var sha = sh.attributes,
    //    shu = sh.uniforms;

    //var gl = h.gl;

    //gl.uniform1i(shu.u_texture._pName, 0);

    //gl.uniformMatrix4fv(shu.uMVMatrix._pName, false, r.activeCamera.mvMatrix._m);
    //gl.uniformMatrix4fv(shu.uPMatrix._pName, false, r.activeCamera.pMatrix._m);

    //gl.uniform3fv(shu.uCamPos._pName, r.activeCamera.eye.toVec());

    //gl.uniform1f(shu.uViewAngle._pName, r.activeCamera._tanViewAngle_hrad);
    //gl.uniform1f(shu.uXRatio._pName, r.handler.canvas._oneByHeight);

    //gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordBuffer);
    //gl.vertexAttribPointer(sha.a_texCoord._pName, this._texCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    //gl.vertexAttribPointer(sha.a_vertices._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
    //gl.vertexAttribPointer(sha.a_positions._pName, this._positionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //gl.bindBuffer(gl.ARRAY_BUFFER, this._opacityBuffer);
    //gl.vertexAttribPointer(sha.a_opacity._pName, this._opacityBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer);
    //gl.vertexAttribPointer(sha.a_size._pName, this._sizeBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //gl.bindBuffer(gl.ARRAY_BUFFER, this._offsetBuffer);
    //gl.vertexAttribPointer(sha.a_offset._pName, this._offsetBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //gl.bindBuffer(gl.ARRAY_BUFFER, this._rotationBuffer);
    //gl.vertexAttribPointer(sha.a_rotation._pName, this._rotationBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //gl.bindBuffer(gl.ARRAY_BUFFER, this._alignedAxisBuffer);
    //gl.vertexAttribPointer(sha.a_alignedAxis._pName, this._alignedAxisBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer.numItems);
};

og.LabelHandler.prototype._removeBillboard = function (billboard) {
    //var bi = billboard._handlerIndex;

    //this._billboards.splice(bi, 1);

    //var i = bi * 18;
    //this._offsetArr.splice(i, 18);
    //this._vertexArr.splice(i, 18);
    //this._positionArr.splice(i, 18);
    //this._alignedAxisArr.splice(i, 18);

    //i = bi * 12;
    //this._sizeArr.splice(i, 12);
    //this._texCoordArr.splice(i, 12);

    //i = bi * 6;
    //this._opacityArr.splice(i, 6);
    //this._rotationArr.splice(i, 6);

    //this.reindexBillbordsArray(bi);
    //this.refresh();

    //billboard._handlerIndex = -1;
    //billboard._handler = null;
};

og.LabelHandler.prototype.setPositionArr = function (index, position) {

    //var i = index * 18;
    //var a = this._positionArr, x = position.x, y = position.y, z = position.z;

    //a[i] = x;
    //a[i + 1] = y;
    //a[i + 2] = z;

    //a[i + 3] = x;
    //a[i + 4] = y;
    //a[i + 5] = z;

    //a[i + 6] = x;
    //a[i + 7] = y;
    //a[i + 8] = z;

    //a[i + 9] = x;
    //a[i + 10] = y;
    //a[i + 11] = z;

    //a[i + 12] = x;
    //a[i + 13] = y;
    //a[i + 14] = z;

    //a[i + 15] = x;
    //a[i + 16] = y;
    //a[i + 17] = z;

    this._changedBuffers[og.BillboardHandler.POSITION_BUFFER] = true;
};

og.LabelHandler.prototype.setSizeArr = function (index, width, height) {

    //var i = index * 12;
    //var a = this._sizeArr, x = width, y = height;

    //a[i] = x;
    //a[i + 1] = y;

    //a[i + 2] = x;
    //a[i + 3] = y;

    //a[i + 4] = x;
    //a[i + 5] = y;

    //a[i + 6] = x;
    //a[i + 7] = y;

    //a[i + 8] = x;
    //a[i + 9] = y;

    //a[i + 10] = x;
    //a[i + 11] = y;

    this._changedBuffers[og.BillboardHandler.SIZE_BUFFER] = true;
};

og.LabelHandler.prototype.setOffsetArr = function (index, offset) {

    //var i = index * 18;
    //var a = this._offsetArr, x = offset.x, y = offset.y, z = offset.z;

    //a[i] = x;
    //a[i + 1] = y;
    //a[i + 2] = z;

    //a[i + 3] = x;
    //a[i + 4] = y;
    //a[i + 5] = z;

    //a[i + 6] = x;
    //a[i + 7] = y;
    //a[i + 8] = z;

    //a[i + 9] = x;
    //a[i + 10] = y;
    //a[i + 11] = z;

    //a[i + 12] = x;
    //a[i + 13] = y;
    //a[i + 14] = z;

    //a[i + 15] = x;
    //a[i + 16] = y;
    //a[i + 17] = z;

    this._changedBuffers[og.BillboardHandler.OFFSET_BUFFER] = true;
};

og.LabelHandler.prototype.setOpacityArr = function (index, opacity) {

    //var i = index * 6;
    //var a = this._opacityArr;

    //a[i] = opacity;
    //a[i + 1] = opacity;
    //a[i + 2] = opacity;
    //a[i + 3] = opacity;
    //a[i + 4] = opacity;
    //a[i + 5] = opacity;

    this._changedBuffers[og.BillboardHandler.OPACITY_BUFFER] = true;
};

og.LabelHandler.prototype.setRotationArr = function (index, rotation) {

    //var i = index * 6;
    //var a = this._rotationArr;

    //a[i] = rotation;
    //a[i + 1] = rotation;
    //a[i + 2] = rotation;
    //a[i + 3] = rotation;
    //a[i + 4] = rotation;
    //a[i + 5] = rotation;

    this._changedBuffers[og.BillboardHandler.ROTATION_BUFFER] = true
};

og.LabelHandler.prototype.setTexCoordArr = function (index, tcoordArr) {

    //var i = index * 12;
    //var a = this._texCoordArr;

    //a[i] = tcoordArr[0];
    //a[i + 1] = tcoordArr[1];

    //a[i + 2] = tcoordArr[2];
    //a[i + 3] = tcoordArr[3];

    //a[i + 4] = tcoordArr[4];
    //a[i + 5] = tcoordArr[5];

    //a[i + 6] = tcoordArr[6];
    //a[i + 7] = tcoordArr[7];

    //a[i + 8] = tcoordArr[8];
    //a[i + 9] = tcoordArr[9];

    //a[i + 10] = tcoordArr[10];
    //a[i + 11] = tcoordArr[11];

    this._changedBuffers[og.BillboardHandler.TEXCOORD_BUFFER] = true;
};

og.LabelHandler.prototype.setVisibility = function (index, visibility) {
    //var vArr;
    //if (visibility) {
    //    vArr = [-0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0];
    //} else {
    //    vArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    //}
    //this.setVertexArr(index, vArr);
};

og.LabelHandler.prototype.setVertexArr = function (index, vertexArr) {

    //var i = index * 18;
    //var a = this._vertexArr;

    //a[i] = vertexArr[0];
    //a[i + 1] = vertexArr[1];
    //a[i + 2] = vertexArr[2];

    //a[i + 3] = vertexArr[3];
    //a[i + 4] = vertexArr[4];
    //a[i + 5] = vertexArr[5];

    //a[i + 6] = vertexArr[6];
    //a[i + 7] = vertexArr[7];
    //a[i + 8] = vertexArr[8];

    //a[i + 9] = vertexArr[9];
    //a[i + 10] = vertexArr[10];
    //a[i + 11] = vertexArr[11];

    //a[i + 12] = vertexArr[12];
    //a[i + 13] = vertexArr[13];
    //a[i + 14] = vertexArr[14];

    //a[i + 15] = vertexArr[15];
    //a[i + 16] = vertexArr[16];
    //a[i + 17] = vertexArr[17];

    this._changedBuffers[og.BillboardHandler.VERTEX_BUFFER] = true;
};

og.LabelHandler.prototype.setAlignedAxisArr = function (index, alignedAxis) {

    //var i = index * 18;
    //var a = this._alignedAxisArr, x = alignedAxis.x, y = alignedAxis.y, z = alignedAxis.z;

    //a[i] = x;
    //a[i + 1] = y;
    //a[i + 2] = z;

    //a[i + 3] = x;
    //a[i + 4] = y;
    //a[i + 5] = z;

    //a[i + 6] = x;
    //a[i + 7] = y;
    //a[i + 8] = z;

    //a[i + 9] = x;
    //a[i + 10] = y;
    //a[i + 11] = z;

    //a[i + 12] = x;
    //a[i + 13] = y;
    //a[i + 14] = z;

    //a[i + 15] = x;
    //a[i + 16] = y;
    //a[i + 17] = z;

    this._changedBuffers[og.BillboardHandler.ALIGNEDAXIS_BUFFER] = true;
};


og.LabelHandler.prototype.setFontIndexArr = function (index, fontIndex) {

    //...
    this._changedBuffers[og.LabelHandler.FONTINDEX_BUFFER] = true;
};

og.LabelHandler.prototype.setLetterOffsetArr = function (index, letterOffset) {

    //...
    this._changedBuffers[og.LabelHandler.LETTEROFFSET_BUFFER] = true;
};

og.LabelHandler.prototype.createSizeBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._sizeBuffer);
    this._sizeBuffer = h.createArrayBuffer(new Float32Array(this._sizeArr), 1, this._sizeArr.length);
};

og.LabelHandler.prototype.setText = function (index, font) {

};

og.LabelHandler.prototype.createFontIndexBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._fontIndexBuffer);
    this._fontIndexBuffer = h.createArrayBuffer(new Float32Array(this._fontIndexArr), 1, this._fontIndexArr.length);
};

og.LabelHandler.prototype.createLetterOffsetBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._letterOffsetBuffer);
    this._letterOffsetBuffer = h.createArrayBuffer(new Float32Array(this._letterOffsetArr), 1, this._letterOffsetArr.length);
};

og.LabelHandler.prototype.refreshTexCoordsArr = function () {
    //var bc = this._entityCollection;
    //if (bc && bc.renderNode) {
    //    var ta = bc.renderNode.billboardsTextureAtlas;
    //    for (var i = 0; i < this._billboards.length; i++) {
    //        var bi = this._billboards[i];
    //        var img = bi.image;
    //        if (img) {
    //            var imageNode = ta.nodes[bi.image.__nodeIndex];
    //            if (imageNode) {
    //                this.setTexCoordArr(bi._handlerIndex, imageNode.texCoords);
    //            }
    //        }
    //    }
    //}
};