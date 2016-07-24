goog.provide('og.PointCloudHandler');

goog.require('og.shaderProgram.pointCloud');
goog.require('og.shaderProgram.pointCloudPicking');

og.PointCloudHandler = function (entityCollection) {

    /**
     * Picking rendering option.
     * @public
     * @type {boolean}
     */
    this.pickingEnabled = true;

    /**
     * Parent collection
     * @private
     * @type {og.EntityCollection}
     */
    this._entityCollection = entityCollection;

    /**
     * Renderer
     * @private
     * @type {og.Renderer}
     */
    this._renderer = null;

    /**
     * Point cloud array
     * @private
     * @type {Array.<og.PointCloud>}
     */
    this._pointClouds = [];

    this.__staticId = og.PointCloudHandler.staticCounter++;
};

og.PointCloudHandler.staticCounter = 0;

og.PointCloudHandler.prototype._initShaderProgram = function () {
    if (this._renderer.handler) {
        if (!this._renderer.handler.shaderPrograms.pointCloud) {
            this._renderer.handler.addShaderProgram(og.shaderProgram.pointCloud());
        }
    }
};

og.PointCloudHandler.prototype.setRenderNode = function (renderNode) {
    this._renderer = renderNode.renderer;
    this._initShaderProgram()
    for (var i = 0; i < this._pointClouds.length; i++) {
        this._pointClouds[i].setRenderNode(renderNode);
    }
};

og.PointCloudHandler.prototype.add = function (pointCloud) {
    if (pointCloud._handlerIndex == -1) {
        pointCloud._handler = this;
        pointCloud._handlerIndex = this._pointClouds.length;
        this._pointClouds.push(pointCloud);
        this._entityCollection && this._entityCollection.renderNode &&
            pointCloud.setRenderNode(this._entityCollection.renderNode);
    }
};

og.PointCloudHandler.prototype.remove = function (pointCloud) {
    var index = pointCloud._handlerIndex;
    if (index !== -1) {
        pointCloud._deleteBuffers();
        pointCloud._handlerIndex = -1;
        pointCloud._handler = null;
        this._pointClouds.splice(index, 1);
        this.reindexPointCloudArray(index);
    }
};

og.PointCloudHandler.prototype.reindexPointCloudArray = function (startIndex) {
    var pc = this._pointClouds;
    for (var i = startIndex; i < pc.length; i++) {
        pc[i]._handlerIndex = i;
    }
};

og.PointCloudHandler.prototype.draw = function () {
    var i = this._pointClouds.length;
    while (i--) {
        this._pointClouds[i].draw();
    }
};

og.PointCloudHandler.prototype.drawPicking = function () {
    if (this.pickingEnabled) {
        var i = this._pointClouds.length;
        while (i--) {
            this._pointClouds[i].drawPicking();
        }
    }
};

og.PointCloudHandler.prototype.clear = function () {
    var i = this._pointClouds.length;
    while (i--) {
        this._pointClouds[i]._deleteBuffers();
        this._pointClouds[i]._handler = null;
        this._pointClouds[i]._handlerIndex = -1;
    }
    this._pointClouds.length = 0;
    this._pointClouds = [];
};