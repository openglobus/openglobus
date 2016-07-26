goog.provide('og.PointCloud');

goog.require('og.mercator');
goog.require('og.math.Vector3');
goog.require('og.math.Vector4');

/**
 * PointCloud object.
 * @class
 * @param {*} [options] - Point cloud options:
 * @param {Array.<Array.<number,number,number,number,number,number,number,*>>} [options.points] - Points cartesian coordinates array, 
 * where first three is cartesian coordinates, next fourth is a RGBA color, and last is an point properties.
 * @param {number} [options.pointSize] - Point screen size in pixels.
 * @param {number} [options.pickingDistance] - Point border picking size in screen pixels.
 * @parar {boolean} [options.visibility] - Point cloud visibility.
 * @example <caption>Creates point cloud with two ten pixel size points</caption>
 * new og.Entity({
 *     pointCloud: {
 *         pointSize: 10,
 *         points: [
 *             [0, 0, 0, 255, 255, 255, 255, { 'name': 'White point' }],
 *             [100, 100, 0, 255, 0, 0, 255, { 'name': 'Red point' }]
 *         ]
 *     }
 * });
 */
og.PointCloud = function (options) {

    options = options || {};

    /**
     * Object unic identifier.
     * @public
     * @readonly
     * @type {number}
     */
    this.id = og.PointCloud.__staticId++;

    /**
     * Cloud visibility.
     * @public
     * @type {boolean}
     */
    this.visibility = (options.visibility != undefined ? options.visibility : true);

    /**
     * Point screen size in pixels.
     * @public
     * @type {number}
     */
    this.pointSize = options.pointSize || 3;

    /**
     * Point picking border size in pixels.
     * @public
     * @type {number}
     */
    this.pickingDistance = options.pickingDistance || 0;

    /**
     * Parent collection render node.
     * @private
     * @type {og.scene.RenderNode}
     */
    this._renderNode = null;

    /**
     * Entity instance that holds this point cloud.
     * @private
     * @type {og.Entity}
     */
    this._entity = null;

    /**
     * Points properties.
     * @private
     * @type {Array.<*>}
     */
    this._points = [];

    /**
     * Coordinates array.
     * @private
     * @type {Array.<number>}
     */
    this._coordinatesData = [];

    /**
     * Color array.
     * @private
     * @type {Array.<number>}
     */
    this._colorData = [];

    /**
     * Picking color array.
     * @private
     * @type {Array.<number>}
     */
    this._pickingColorData = [];

    this._coordinatesBuffer = null;
    this._colorBuffer = null;
    this._pickingColorBuffer = null;

    /**
     * Handler that stores and renders this linestring object.
     * @private
     * @type {og.PointCloudHandler}
     */
    this._handler = null;
    this._handlerIndex = -1;

    this._buffersUpdateCallbacks = [];
    this._buffersUpdateCallbacks[og.PointCloud.COORDINATES_BUFFER] = this._createCoordinatesBuffer;
    this._buffersUpdateCallbacks[og.PointCloud.COLOR_BUFFER] = this._createColorBuffer;
    this._buffersUpdateCallbacks[og.PointCloud.PICKING_COLOR_BUFFER] = this._createPickingColorBuffer;

    this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);

    this.setPoints(options.points);
};

og.PointCloud.COORDINATES_BUFFER = 0;
og.PointCloud.COLOR_BUFFER = 1;
og.PointCloud.PICKING_COLOR_BUFFER = 2;

og.PointCloud.__staticId = 0;

/**
 * Clears point cloud data
 * @public
 */
og.PointCloud.prototype.clear = function () {

    this._points.length = 0;
    this._points = [];

    this._coordinatesData.length = 0;
    this._coordinatesData = [];

    this._colorData.length = 0;
    this._colorData = [];

    this._pickingColorData.length = 0;
    this._pickingColorData = [];

    this._deleteBuffers();
};

/**
 * Set point cloud opacity.
 * @public
 * @param {number} opacity - Cloud opacity.
 */
og.PointCloud.prototype.setOpacity = function (opacity) {
    this.opacity = opacity;
};

/**
 * Sets cloud visibility.
 * @public
 * @param {number} visibility - Visibility flag.
 */
og.PointCloud.prototype.setVisibility = function (visibility) {
    this.visibility = visibility;
};

/**
 * @return {boolean} Point cloud visibily.
 */
og.PointCloud.prototype.getVisibility = function () {
    return this.visibility;
};

/**
 * Assign rendering scene node.
 * @public
 * @param {og.scene.RenderNode}  renderNode - Assigned render node.
 */
og.PointCloud.prototype.setRenderNode = function (renderNode) {
    this._renderNode = renderNode;
    this._setPickingColors();
};

/**
 * Removes from entity.
 * @public
 */
og.PointCloud.prototype.remove = function () {
    this._entity = null;
    this._handler && this._handler.remove(this);
};

/**
 * Adds points to render.
 * @public
 * @param {Array.<Array<number,number,number,number,number,number,number,*>>} points - Point cloud array.
 * @example
 * var points = [[0, 0, 0, 255, 255, 255, 255, { 'name': 'White point' }], [100, 100, 0, 255, 0, 0, 255, { 'name': 'Red point' }]];
 */
og.PointCloud.prototype.setPoints = function (points) {
    for (var i = 0; i < points.length; i++) {
        var pi = points[i];
        var pos = new og.math.Vector3(pi[0], pi[1], pi[2]),
            col = new og.math.Vector4(pi[3], pi[4], pi[5], pi[6]);
        this._coordinatesData.push(pos.x, pos.y, pos.z);
        this._colorData.push(col.x / 255.0, col.y / 255.0, col.z / 255.0, col.w / 255.0);
        var p = {
            '_pickingColor': new og.math.Vector3(),
            '_entityCollection': this._entity && this._entity._entityCollection,
            'index': i,
            'position': pos,
            'color': col,
            'pointCloud': this,
            'properties': pi[7] || {}
        };
        this._points.push(p);

        if (this._renderNode) {
            this._renderNode.renderer.assignPickingColor(p);
            this._pickingColorData.push(p._pickingColor.x / 255.0, p._pickingColor.y / 255.0, p._pickingColor.z / 255.0, 1.0);
        }
    }

    this._changedBuffers[og.PointCloud.COORDINATES_BUFFER] = true;
    this._changedBuffers[og.PointCloud.COLOR_BUFFER] = true;
    this._changedBuffers[og.PointCloud.PICKING_COLOR_BUFFER] = true;
};

/**
 * @todo
 */
og.PointCloud.prototype.setPointPosition = function (index, x, y, z) {

    //...

    this._changedBuffers[og.PointCloud.COORDINATES_BUFFER] = true;
};

/**
 * @todo
 */
og.PointCloud.prototype.setPointColor = function (index, r, g, b, a) {

    //...

    this._changedBuffers[og.PointCloud.COLOR_BUFFER] = true;
};

/**
 * @todo
 */
og.PointCloud.prototype.addPoints = function (points) {

    //...

    this._changedBuffers[og.PointCloud.COORDINATES_BUFFER] = true;
    this._changedBuffers[og.PointCloud.COLOR_BUFFER] = true;
    this._changedBuffers[og.PointCloud.PICKING_COLOR_BUFFER] = true;
};

/**
 * @todo
 */
og.PointCloud.prototype.addPoint = function (index, point) {

    //...

    this._changedBuffers[og.PointCloud.COORDINATES_BUFFER] = true;
    this._changedBuffers[og.PointCloud.COLOR_BUFFER] = true;
    this._changedBuffers[og.PointCloud.PICKING_COLOR_BUFFER] = true;
};

/**
 * Returns specific point by index.
 * @public
 * @param {number} index - Point index.
 * @return {*} Specific point
 */
og.PointCloud.prototype.getPoint = function (index) {
    return this._points[index];
};

/**
 * @todo
 */
og.PointCloud.prototype.removePoint = function (index) {

    //...

    this._changedBuffers[og.PointCloud.COORDINATES_BUFFER] = true;
    this._changedBuffers[og.PointCloud.COLOR_BUFFER] = true;
    this._changedBuffers[og.PointCloud.PICKING_COLOR_BUFFER] = true;
};

/**
 * @todo
 */
og.PointCloud.prototype.insertPoint = function (index, point) {

    //...

    this._changedBuffers[og.PointCloud.COORDINATES_BUFFER] = true;
    this._changedBuffers[og.PointCloud.COLOR_BUFFER] = true;
    this._changedBuffers[og.PointCloud.PICKING_COLOR_BUFFER] = true;
};

/**
 * Each point iterator.
 * @public
 * @param {callback} callback
 */
og.PointCloud.prototype.each = function (callback) {
    var i = this._points.length;
    while (i--) {
        callback && callback(this._points[i]);
    }
};

og.PointCloud.prototype.draw = function () {
    if (this.visibility && this._coordinatesData.length) {

        this._update();

        var rn = this._renderNode;
        var r = rn.renderer;
        var sh = r.handler.shaderPrograms.pointCloud;
        var p = sh._program;
        var gl = r.handler.gl,
            sha = p.attributes,
            shu = p.uniforms;

        sh.activate();

        gl.uniformMatrix4fv(shu.projectionViewMatrix._pName, false, r.activeCamera._projectionViewMatrix._m);

        gl.uniform1f(shu.opacity._pName, this._handler._entityCollection._animatedOpacity);

        gl.uniform1f(shu.size._pName, this.pointSize);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._coordinatesBuffer);
        gl.vertexAttribPointer(sha.coordinates._pName, this._coordinatesBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._colorBuffer);
        gl.vertexAttribPointer(sha.colors._pName, this._colorBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.POINTS, 0, this._coordinatesBuffer.numItems);
    }
};

og.PointCloud.prototype.drawPicking = function () {
    if (this.visibility && this._coordinatesData.length) {
        var rn = this._renderNode;
        var r = rn.renderer;
        var sh = r.handler.shaderPrograms.pointCloud;
        var p = sh._program;
        var gl = r.handler.gl,
            sha = p.attributes,
            shu = p.uniforms;

        sh.activate();

        gl.uniformMatrix4fv(shu.projectionViewMatrix._pName, false, r.activeCamera._projectionViewMatrix._m);

        gl.uniform1f(shu.opacity._pName, this._handler._entityCollection._animatedOpacity);

        gl.uniform1f(shu.size._pName, this.pointSize + this.pickingDistance);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._coordinatesBuffer);
        gl.vertexAttribPointer(sha.coordinates._pName, this._coordinatesBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._pickingColorBuffer);
        gl.vertexAttribPointer(sha.colors._pName, this._pickingColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.POINTS, 0, this._coordinatesBuffer.numItems);
    }
};

/**
 * Update gl buffers.
 * @private
 */
og.PointCloud.prototype._update = function () {
    if (this._renderNode) {
        var i = this._changedBuffers.length;
        while (i--) {
            if (this._changedBuffers[i]) {
                this._buffersUpdateCallbacks[i].call(this);
                this._changedBuffers[i] = false;
            }
        }
    }
};

/**
 * Delete buffers
 * @private
 */
og.PointCloud.prototype._deleteBuffers = function () {
    var r = this._renderNode.renderer,
        gl = r.handler.gl;

    gl.deleteBuffer(this._coordinatesBuffer);
    gl.deleteBuffer(this._colorBuffer);
    gl.deleteBuffer(this._pickingColorBuffer);

    this._coordinatesBuffer = null;
    this._colorBuffer = null;
    this._pickingColorBuffer = null;
};

og.PointCloud.prototype._createCoordinatesBuffer = function () {
    var h = this._renderNode.renderer.handler;
    h.gl.deleteBuffer(this._coordinatesBuffer);
    this._coordinatesBuffer = h.createArrayBuffer(new Float32Array(this._coordinatesData), 3, (this._coordinatesData.length) / 3);
};

og.PointCloud.prototype._createColorBuffer = function () {
    var h = this._renderNode.renderer.handler;
    h.gl.deleteBuffer(this._colorBuffer);
    this._colorBuffer = h.createArrayBuffer(new Float32Array(this._colorData), 4, (this._colorData.length) / 4);
};

og.PointCloud.prototype._createPickingColorBuffer = function () {
    var h = this._renderNode.renderer.handler;
    h.gl.deleteBuffer(this._pickingColorBuffer);
    this._pickingColorBuffer = h.createArrayBuffer(new Float32Array(this._pickingColorData), 4, (this._pickingColorData.length) / 4);
};

og.PointCloud.prototype._setPickingColors = function () {
    if (this._renderNode) {
        for (var i = 0; i < this._points.length; i++) {
            var p = this._points[i];
            p._entity = this._entity;
            p._entityCollection = this._entity._entityCollection;
            this._renderNode.renderer.assignPickingColor(p);
            this._pickingColorData.push(p._pickingColor.x / 255.0, p._pickingColor.y / 255.0, p._pickingColor.z / 255.0, 1.0);
        }
        this._changedBuffers[og.PointCloud.PICKING_COLOR_BUFFER] = true;
    }
};