goog.provide('og.LineStringHandler');

goog.require('og.shaderProgram.lineString');

og.LineStringHandler = function (entityCollection) {

    /**
     * Picking rendering option.
     * @public
     * @type {boolean}
     */
    this.pickingEnabled = true;

    this._entityCollection = entityCollection;

    this._renderer = null;

    this._lineStrings = [];

    this.__staticId = og.LineStringHandler.staticCounter++;
};

og.LineStringHandler.staticCounter = 0;

og.LineStringHandler.prototype._initShaderProgram = function () {
    if (this._renderer.handler) {
        if (!this._renderer.handler.shaderPrograms.lineString) {
            this._renderer.handler.addShaderProgram(og.shaderProgram.lineString());
        }
    }
};

og.LineStringHandler.prototype.setRenderNode = function (renderNode) {
    this._renderer = renderNode.renderer;
    this._initShaderProgram()
    for (var i = 0; i < this._lineStrings.length; i++) {
        this._lineStrings[i].setRenderNode(renderNode);
    }
};

og.LineStringHandler.prototype.add = function (lineString) {
    if (lineString._handlerIndex == -1) {
        lineString._handler = this;
        lineString._handlerIndex = this._lineStrings.length;
        this._lineStrings.push(lineString);
        this._entityCollection && this._entityCollection.renderNode &&
            lineString.setRenderNode(this._entityCollection.renderNode);
    }
};

og.LineStringHandler.prototype.remove = function (lineString) {
    var index = lineString._handlerIndex;
    if (index !== -1) {
        lineString._deleteBuffers();
        lineString._handlerIndex = -1;
        lineString._handler = null;
        this._lineStrings.splice(index, 1);
        this.reindexLineStringArray(index);
    }
};

og.LineStringHandler.prototype.reindexLineStringArray = function (startIndex) {
    var ls = this._lineStrings;
    for (var i = startIndex; i < ls.length; i++) {
        ls[i]._handlerIndex = i;
    }
};

og.LineStringHandler.prototype.draw = function () {
    var i = this._lineStrings.length;
    while (i--) {
        this._lineStrings[i].draw();
    }
};

og.LineStringHandler.prototype.drawPicking = function () {
    if (this.pickingEnabled) {
        var i = this._lineStrings.length;
        while (i--) {
            this._lineStrings[i].drawPicking();
        }
    }
};

og.LineStringHandler.prototype.clear = function () {
    var i = this._lineStrings.length;
    while (i--) {
        this._lineStrings[i]._deleteBuffers();
        this._lineStrings[i]._handler = null;
        this._lineStrings[i]._handlerIndex = -1;
    }
    this._lineStrings.length = 0;
    this._lineStrings = [];
};