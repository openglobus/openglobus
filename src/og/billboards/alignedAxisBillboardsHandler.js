goog.provide('og.AlignedAxisBillboardsHandler');

goog.require('og.inheritance');
goog.require('og.SphericalBillboardsHandler');
goog.require('og.shaderProgram.alignedAxisBillboard');

/*
 * og.AlignedAxisBillboardsHandler
 *
 *
 */
og.AlignedAxisBillboardsHandler = function () {
    og.inheritance.base(this);

    this._alignedAxisBuffer = [];
    this._alignedAxisArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this._buffersUpdateCallbacks[og.SphericalBillboardsHandler.ALIGNEDAXIS_BUFFER] = this.createAlignedAxisBuffer;
    this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);
};

og.inheritance.extend(og.AlignedAxisBillboardsHandler, og.SphericalBillboardsHandler);

og.AlignedAxisBillboardsHandler.prototype.createAlignedAxisBuffer = function () {
    var h = this._renderer.handler;
    h.gl.deleteBuffer(this._alignedAxisArr);
    this._alignedAxisArr = h.createArrayBuffer(new Float32Array(this._alignedAxisArr), 3, this._alignedAxisArr.length / 3);
};

og.AlignedAxisBillboardsHandler.prototype.initShaderProgram = function () {
    this._renderer.handler.addShaderProgram(og.shaderProgram.alignedAxisBillboard());
};

og.AlignedAxisBillboardsHandler.prototype._addBillboardToArrays = function (billboard) {
    this._makeCommonArrays(billboard);
    this._makeAlignedAxisArray(billboard);
};

og.AlignedAxisBillboardsHandler.prototype._makeAlignedAxisArray = function (billboard) {
    var x = billboard.alignedAxis.x, y = billboard.alignedAxis.y, z = billboard.alignedAxis.z;
    og.SphericalBillboardsHandler.concArr(this._alignedAxisArr, [x, y, z, x, y, z, x, y, z, x, y, z]);
};

og.AlignedAxisBillboardsHandler.prototype.setAlignedAxisArr = function (index, alignedAxis) {

    var i = 18 + index * 21;
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

    a[i + 18] = x;
    a[i + 19] = y;
    a[i + 20] = z;

    this._changedBuffers[og.SphericalBillboardsHandler.ALIGNEDAXIS_BUFFER] = true;
};

og.AlignedAxisBillboardsHandler.prototype.remove = function (billboard) {
    if (this.__staticIndex == billboard._billboardsHandler.__staticIndex) {
        var bi = billboard._billboardsHandlerIndex;

        this._billboards.splice(bi, 1);

        var i = 18 + bi * 21;
        this._offsetArr.splice(i, 21);
        this._vertexArr.splice(i, 21);
        this._positionArr.splice(i, 21);
        this._alignedAxisArr.splice(i, 21);

        i = 12 + bi * 14;
        this._sizeArr.splice(i, 14);
        this._texCoordArr.splice(i, 14);

        i = 6 + bi * 7;
        this._opacityArr.splice(i, 7);
        this._rotationArr.splice(i, 7);

        this.reindexBillbordsArray(bi);
        this.refresh();

        billboard._billboardsHandlerIndex = -1;
        billboard._billboardsHandler = null;
    }
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

    this._texCoordArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this._vertexArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this._positionArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this._sizeArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this._offsetArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this._opacityArr = [0, 0, 0, 0, 0, 0];
    this._rotationArr = [0, 0, 0, 0, 0, 0];
    this._alignedAxisArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    this.refresh();
};

og.AlignedAxisBillboardsHandler.prototype.draw = function () {

    //...

};
