goog.provide('og.LineStringHandler');

goog.require('og.shaderProgram.lineString');
goog.require('og.shaderProgram.lineStringPicking');

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

og.LineStringHandler.staticCounte = 0;

og.LineStringHandler.prototype._initShaderProgram = function () {
    if (this._renderer.handler) {
        if (!this._renderer.handler.shaderPrograms.lineString) {
            this._renderer.handler.addShaderProgram(og.shaderProgram.lineString());
        }
        //if (!this._renderer.handler.shaderPrograms.lineStringPicking) {
        //    this._renderer.handler.addShaderProgram(og.shaderProgram.lineStringPicking());
        //}
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

};

og.LineStringHandler.prototype.draw = function () {
    var i = this._lineStrings.length;
    while (i--) {
        this._lineStrings[i].draw();
    }
};

og.LineStringHandler.prototype.drawPicking = function () {
    if (this.pickingEnabled) {
    }
};

og.LineStringHandler.prototype.clear = function () {

};