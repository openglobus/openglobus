goog.provide('og.AlignedAxisBillboardsHandler');

goog.require('og.inheritance');
goog.require('og.SphericalBillboardsHandler');
goog.require('og.shaderProgram.alignedAxisBillboard');

/*
 * og.AlignedAxisBillboardsHandler
 *
 *
 */
og.AlignedAxisBillboardsHandler = function (billboardsCollection) {
    og.inheritance.base(this, billboardsCollection);

    this._alignedAxisBuffer = null;
    this._alignedAxisArr = [];
    this._buffersUpdateCallbacks[og.SphericalBillboardsHandler.ALIGNEDAXIS_BUFFER] = this.createAlignedAxisBuffer;
    this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);
};

og.inheritance.extend(og.AlignedAxisBillboardsHandler, og.SphericalBillboardsHandler);

og.AlignedAxisBillboardsHandler.prototype.createAlignedAxisBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._alignedAxisBuffer);
    this._alignedAxisBuffer = h.createArrayBuffer(new Float32Array(this._alignedAxisArr), 3, this._alignedAxisArr.length / 3);
};

og.AlignedAxisBillboardsHandler.prototype.initShaderProgram = function () {
    if (this._renderer.handler) {
        if (!this._renderer.handler.shaderPrograms.alignedAxisBillboard) {
            this._renderer.handler.addShaderProgram(og.shaderProgram.alignedAxisBillboard());
        }
    }
};

og.AlignedAxisBillboardsHandler.prototype._addBillboardToArrays = function (billboard) {
    this._makeCommonArrays(billboard);
    this._makeAlignedAxisArray(billboard);
};

og.AlignedAxisBillboardsHandler.prototype._makeAlignedAxisArray = function (billboard) {
    var x = billboard.alignedAxis.x, y = billboard.alignedAxis.y, z = billboard.alignedAxis.z;
    og.SphericalBillboardsHandler.concArr(this._alignedAxisArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);
};

og.AlignedAxisBillboardsHandler.prototype.setAlignedAxisArr = function (index, alignedAxis) {

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

    this._changedBuffers[og.SphericalBillboardsHandler.ALIGNEDAXIS_BUFFER] = true;
};

og.AlignedAxisBillboardsHandler.prototype._removeBillboard = function (billboard) {
    var bi = billboard._billboardsHandlerIndex;

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

    billboard._billboardsHandlerIndex = -1;
    billboard._billboardsHandler = null;
};

og.AlignedAxisBillboardsHandler.prototype.clear = function () {

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

og.AlignedAxisBillboardsHandler.prototype._displayPASS = function () {

    var r = this._renderer;
    var h = r.handler;
    h.shaderPrograms.alignedAxisBillboard.activate();
    var sh = h.shaderPrograms.alignedAxisBillboard._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    var gl = h.gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, this._alignedAxisBuffer);
    gl.vertexAttribPointer(sha.a_alignedAxis._pName, this._alignedAxisBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //same as the spherical code below
    gl.uniform1i(shu.u_texture._pName, 0);

    gl.uniformMatrix4fv(shu.uMVMatrix._pName, false, r.activeCamera.mvMatrix._m);
    gl.uniformMatrix4fv(shu.uPMatrix._pName, false, r.activeCamera.pMatrix._m);

    gl.uniform2fv(shu.uViewSize._pName, [gl.canvas.clientWidth, gl.canvas.clientHeight]);
    gl.uniform3fv(shu.uCamPos._pName, r.activeCamera.eye.toVec());

    gl.uniform1f(shu.uViewAngle._pName, r.activeCamera.viewAngle * og.math.RADIANS_HALF);
    gl.uniform1f(shu.uRatio._pName, r.handler.canvas.aspect);

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

    gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer.numItems);
};
