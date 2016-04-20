goog.provide('og.ShapeHandler');

goog.require('og.shape.BaseShape');
goog.require('og.shape.Sphere');
goog.require('og.shaderProgram.shape_wl');
goog.require('og.shaderProgram.shape_nl');
//goog.require('og.shaderProgram.shapePicking');

og.ShapeHandler = function (entityCollection) {

    /**
     * Picking rendering option.
     * @public
     * @type {boolean}
     */
    this.pickingEnabled = true;

    this._entityCollection = entityCollection;

    this._renderer = null;

    this._shapes = [];

    this.__staticId = og.ShapeHandler.staticCounter++;
};

og.ShapeHandler.staticCounter = 0;

og.ShapeHandler.prototype._initShaderProgram = function () {
    if (this._renderer.handler) {
        if (!this._renderer.handler.shaderPrograms.shape_nl) {
            this._renderer.handler.addShaderProgram(og.shaderProgram.shape_nl());
        }
        if (!this._renderer.handler.shaderPrograms.shape_wl) {
            this._renderer.handler.addShaderProgram(og.shaderProgram.shape_wl());
        }
        //if (!this._renderer.handler.shaderPrograms.shapePicking) {
        //    this._renderer.handler.addShaderProgram(og.shaderProgram.shapePicking());
        //}
    }
};

og.ShapeHandler.prototype.setRenderNode = function (renderNode) {
    this._renderer = renderNode.renderer;
    this._initShaderProgram()
    for (var i = 0; i < this._shapes.length; i++) {
        this._shapes[i].setRenderNode(renderNode);
    }
};

og.ShapeHandler.prototype.add = function (shape) {
    if (shape._handlerIndex == -1) {
        shape._handler = this;
        shape._handlerIndex = this._shapes.length;
        this._shapes.push(shape);
        this._entityCollection && this._entityCollection.renderNode && shape.setRenderNode(this._entityCollection.renderNode);
    }
};

og.ShapeHandler.prototype.remove = function (shape) {

};

og.ShapeHandler.prototype.draw = function () {
    var i = this._shapes.length;
    while (i--) {
        this._shapes[i].draw();
    }
};

og.ShapeHandler.prototype.drawPicking = function () {
    if (this.pickingEnabled) {
    }
};

og.ShapeHandler.prototype.clear = function () {

};