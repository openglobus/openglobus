goog.provide('og.BillboardsCollection');
goog.provide('og.SphericalBillboardsHandler');
goog.provide('og.AlignedAxisBillboardsHandler');

/*
 * og.BillboardsCollection
 *
 *
 */
og.BillboardsCollection = function () {
    this.sphericalBillboardsHandler = new og.SphericalBillboardsHandler(this);
    this.alignedAxisBillboardsHandler = new og.AlignedAxisBillboardsHandler(this);
};

og.BillboardsCollection.prototype.add = function (billboard) {
    if (billboard.alignedAxis) {
        this.alignedAxisBillboardsHandler.add(billboard);
    } else {
        this.sphericalBillboardsHandler.add(billboard);
    }
};

og.BillboardsCollection.prototype.assignHandler = function (handler) {
    this.sphericalBillboardsHandler.assignHandler(handler);
    this.alignedAxisBillboardsHandler.assignHandler(handler);
};

og.BillboardsCollection.prototype.draw = function () {
    this.sphericalBillboardsHandler.draw();
    this.alignedAxisBillboardsHandler.draw();
};


/*
 * og.SphericalBillboardsHandler
 *
 *
 */
og.SphericalBillboardsHandler = function (billboardsCollection) {

    this._billboardsCollection = billboardsCollection;

    this._handler = null;

    this._billboards = [];

    this._positionBuffer = null;
    this._sizeBuffer = null;
    this._offsetBuffer = null;
    this._opacityBuffer = null;
    this._rotationBuffer = null;
    this._texCoordBuffer = null;
    this._vertexBuffer = null;

    this._texCoordArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this._vertexArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this._positionArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this._sizeArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this._offsetArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this._opacityArr = [0, 0, 0, 0, 0, 0];
    this._rotationArr = [0, 0, 0, 0, 0, 0];

    this._buffersUpdateCallbacks = [];
    this._buffersUpdateCallbacks[og.SphericalBillboardsHandler.POSITION_BUFFER] = this.createPositionBuffer;
    this._buffersUpdateCallbacks[og.SphericalBillboardsHandler.SIZE_BUFFER] = this.createSizeBuffer;
    this._buffersUpdateCallbacks[og.SphericalBillboardsHandler.OFFSET_BUFFER] = this.createOffsetBuffer;
    this._buffersUpdateCallbacks[og.SphericalBillboardsHandler.OPACITY_BUFFER] = this.createOpacityBuffer;
    this._buffersUpdateCallbacks[og.SphericalBillboardsHandler.ROTATION_BUFFER] = this.createRotationBuffer;
    this._buffersUpdateCallbacks[og.SphericalBillboardsHandler.TEXCOORD_BUFFER] = this.createTexCoordBuffer;
    this._buffersUpdateCallbacks[og.SphericalBillboardsHandler.VERTEX_BUFFER] = this.createVertexBuffer;

    this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);
};

og.SphericalBillboardsHandler.POSITION_BUFFER = 0;
og.SphericalBillboardsHandler.SIZE_BUFFER = 1;
og.SphericalBillboardsHandler.OFFSET_BUFFER = 2;
og.SphericalBillboardsHandler.OPACITY_BUFFER = 3;
og.SphericalBillboardsHandler.ROTATION_BUFFER = 4;
og.SphericalBillboardsHandler.TEXCOORD_BUFFER = 5;
og.SphericalBillboardsHandler.VERTEX_BUFFER = 6;
og.SphericalBillboardsHandler.ALIGNEDAXIS_BUFFER = 7;

og.SphericalBillboardsHandler.prototype.assignHandler = function (handler) {
    this._handler = handler;
};

og.SphericalBillboardsHandler.prototype.refresh = function () {
    var i = this._changedBuffers.length;
    while (i--) {
        this._changedBuffers[i] = true;
    }
};

og.SphericalBillboardsHandler.prototype.update = function () {
    if (this._handler) {
        var i = this._changedBuffers.length;
        while (i--) {
            if (this._changedBuffers[i]) {
                this._buffersUpdateCallbacks[i].call(this);
                this._changedBuffers[i] = false;
            }
        }
    }
};

og.SphericalBillboardsHandler.prototype.add = function (billboard) {
    if (billboard._billboardsHandlerIndex == -1) {
        billboard._billboardsHandler = this;
        billboard._billboardsHandlerIndex = this._billboards.length;
        this._billboards.push(billboard);
        this._addBillboardToArrays(billboard);
        this.refresh();
    }
};

og.SphericalBillboardsHandler.prototype._makeCommonArrays = function (billboard) {

    og.SphericalBillboardsHandler.concArr(this._vertexArr, 3, [-0.5, 0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, -0.5, 0]);
    og.SphericalBillboardsHandler.concArr(this._texCoordArr, 2, [0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1]);

    var x = billboard.position.x, y = billboard.position.y, z = billboard.position.z;
    og.SphericalBillboardsHandler.concArr(this._positionArr, 3, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

    x = billboard.size.x; y = billboard.size.y;
    og.SphericalBillboardsHandler.concArr(this._sizeArr, 2, [x, y, x, y, x, y, x, y, x, y, x, y]);

    x = billboard.offset.x; y = billboard.offset.y; z = billboard.offset.z;
    og.SphericalBillboardsHandler.concArr(this._offsetArr, 3, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

    x = billboard.opacity;
    og.SphericalBillboardsHandler.concArr(this._opacityArr, 1, [x, x, x, x, x, x]);

    x = billboard.rotation;
    og.SphericalBillboardsHandler.concArr(this._rotationArr, 1, [x, x, x, x, x, x]);
};

og.SphericalBillboardsHandler.prototype._addBillboardToArrays = function (billboard) {
    this._makeCommonArrays(billboard);
};

og.SphericalBillboardsHandler.concArr = function (dest, elSize, curr) {

    for (var i = 0; i < elSize; i++) {
        dest.push(curr[i]);
    }

    for (var i = 0; i < curr.length; i++) {
        dest.push(curr[i]);
    }
};

og.SphericalBillboardsHandler.prototype.draw = function () {

    this.update();

    //...

};

og.SphericalBillboardsHandler.prototype.setPositionArr = function (index, position) {

    var i = 6 * 3 + index * 7 * 3;
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

    a[i + 18] = x;
    a[i + 19] = y;
    a[i + 20] = z;

    this._changedBuffers[og.SphericalBillboardsHandler.POSITION_BUFFER] = true;
};

og.SphericalBillboardsHandler.prototype.setSizeArr = function (index, size) {

    var i = 6 * 2 + index * 7 * 2;
    var a = this._sizeArr, x = size.x, y = size.y;

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

    a[i + 12] = x;
    a[i + 13] = y;

    this._changedBuffers[og.SphericalBillboardsHandler.SIZE_BUFFER] = true;
};

og.SphericalBillboardsHandler.prototype.setOffsetArr = function (index, offset) {

    var i = 6 * 3 + index * 7 * 3;
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

    a[i + 18] = x;
    a[i + 19] = y;
    a[i + 20] = z;

    this._changedBuffers[og.SphericalBillboardsHandler.OFFSET_BUFFER] = true;
};

og.SphericalBillboardsHandler.prototype.setOpacityArr = function (index, opacity) {

    var i = 6 * 1 + index * 7 * 1;
    var a = this._opacityArr;

    a[i] = opacity;
    a[i + 1] = opacity;
    a[i + 2] = opacity;
    a[i + 3] = opacity;
    a[i + 4] = opacity;
    a[i + 5] = opacity;
    a[i + 6] = opacity;

    this._changedBuffers[og.SphericalBillboardsHandler.OPACITY_BUFFER] = true;
};

og.SphericalBillboardsHandler.prototype.setRotationArr = function (index, rotation) {

    var i = 6 * 1 + index * 7 * 1;
    var a = this._rotationArr;

    a[i] = rotation;
    a[i + 1] = rotation;
    a[i + 2] = rotation;
    a[i + 3] = rotation;
    a[i + 4] = rotation;
    a[i + 5] = rotation;
    a[i + 6] = rotation;

    this._changedBuffers[og.SphericalBillboardsHandler.ROTATION_BUFFER] = true
};

og.SphericalBillboardsHandler.prototype.setTexCoordArr = function (index, tcoord) {

    var i = 6 * 2 + index * 7 * 2;
    var a = this._sizeArr, x = tcoord.x, y = tcoord.y;

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

    a[i + 12] = x;
    a[i + 13] = y;

    this._changedBuffers[og.SphericalBillboardsHandler.TEXCOORD_BUFFER] = true;
};

og.SphericalBillboardsHandler.prototype.createPositionBuffer = function () {
    this._handler.gl.deleteBuffer(this._positionBuffer);
    this._positionBuffer = this._handler.createArrayBuffer(new Float32Array(this._positionArr), 3, this._positionArr.length / 3);
};

og.SphericalBillboardsHandler.prototype.createSizeBuffer = function () {
    this._handler.gl.deleteBuffer(this._sizeBuffer);
    this._sizeBuffer = this._handler.createArrayBuffer(new Float32Array(this._sizeArr), 2, this._sizeArr.length / 2);
};

og.SphericalBillboardsHandler.prototype.createOffsetBuffer = function () {
    this._handler.gl.deleteBuffer(this._offsetBuffer);
    this._offsetBuffer = this._handler.createArrayBuffer(new Float32Array(this._offsetArr), 3, this._offsetArr.length / 3);
};

og.SphericalBillboardsHandler.prototype.createOpacityBuffer = function () {
    this._handler.gl.deleteBuffer(this._opacityBuffer);
    this._opacityBuffer = this._handler.createArrayBuffer(new Float32Array(this._opacityArr), 1, this._opacityArr.length);
};

og.SphericalBillboardsHandler.prototype.createRotationBuffer = function () {
    this._handler.gl.deleteBuffer(this._rotationBuffer);
    this._rotationBuffer = this._handler.createArrayBuffer(new Float32Array(this._rotationArr), 1, this._rotationArr.length);
};

og.SphericalBillboardsHandler.prototype.createVertexBuffer = function () {
    this._handler.gl.deleteBuffer(this._vertexBuffer);
    this._vertexBuffer = this._handler.createArrayBuffer(new Float32Array(this._vertexArr), 3, this._vertexArr.length / 3);
};

og.SphericalBillboardsHandler.prototype.createTexCoordBuffer = function () {
    this._handler.gl.deleteBuffer(this._texCoordBuffer);
    this._texCoordBuffer = this._handler.createArrayBuffer(new Float32Array(this._texCoordArr), 2, this._texCoordArr.length / 2);
};

/*
 * og.AlignedAxisBillboardsHandler
 *
 *
 */

og.AlignedAxisBillboardsHandler = function () {
    og.inheritance.base(this);

    this._alignedAxisBuffer = [];

    this._alignedAxisArr = [];

    this._buffersUpdateCallbacks[og.Billboard.ALIGNEDAXIS_BUFFER] = this.createAlignedAxisBuffer;

    this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);
};

og.inheritance.extend(og.AlignedAxisBillboardsHandler, og.SphericalBillboardsHandler);

og.AlignedAxisBillboardsHandler.prototype.createAlignedAxisBuffer = function () {
    this._handler.gl.deleteBuffer(this._alignedAxisArr);
    this._alignedAxisArr = this._handler.createArrayBuffer(new Float32Array(this._alignedAxisArr), 3, this._alignedAxisArr.length / 3);
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

    var i = 6 * 3 + index * 7 * 3;
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

    this._billboardsHandler._changedBuffers[og.SphericalBillboardsHandler.ALIGNEDAXIS_BUFFER] = true;
};