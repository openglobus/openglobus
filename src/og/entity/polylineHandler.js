goog.provide('og.PolylineHandler');

goog.require('og.shaderProgram.polyline');

og.PolylineHandler = function (entityCollection) {

    this._entityCollection = entityCollection;

    this._renderer = null;

    this._polylines = [];

    this.__staticId = og.PolylineHandler.staticCounter++;
};

og.PolylineHandler.staticCounter = 0;

og.PolylineHandler.prototype._initShaderProgram = function () {
    if (this._renderer.handler) {
        if (!this._renderer.handler.shaderPrograms.polyline) {
            this._renderer.handler.addShaderProgram(og.shaderProgram.polyline(this._renderer.isMultiFramebufferCompatible()));
        }
    }
};

og.PolylineHandler.prototype.setRenderNode = function (renderNode) {
    this._renderer = renderNode.renderer;
    this._initShaderProgram()
    for (var i = 0; i < this._polylines.length; i++) {
        this._polylines[i].setRenderNode(renderNode);
    }
};

og.PolylineHandler.prototype.add = function (polyline) {
    if (polyline._handlerIndex == -1) {
        polyline._handler = this;
        polyline._handlerIndex = this._polylines.length;
        this._polylines.push(polyline);
        this._entityCollection && this._entityCollection.renderNode &&
            polyline.setRenderNode(this._entityCollection.renderNode);
    }
};

og.PolylineHandler.prototype.remove = function (polyline) {
    var index = polyline._handlerIndex;
    if (index !== -1) {
        polyline._deleteBuffers();
        polyline._handlerIndex = -1;
        polyline._handler = null;
        this._polylines.splice(index, 1);
        this.reindexPolylineArray(index);
    }
};

og.PolylineHandler.prototype.reindexPolylineArray = function (startIndex) {
    var ls = this._polylines;
    for (var i = startIndex; i < ls.length; i++) {
        ls[i]._handlerIndex = i;
    }
};

og.PolylineHandler.prototype.draw = function () {
    var i = this._polylines.length;
    while (i--) {
        this._polylines[i].draw();
    }
};

og.PolylineHandler.prototype.clear = function () {
    var i = this._polylines.length;
    while (i--) {
        this._polylines[i]._deleteBuffers();
        this._polylines[i]._handler = null;
        this._polylines[i]._handlerIndex = -1;
    }
    this._polylines.length = 0;
    this._polylines = [];
};