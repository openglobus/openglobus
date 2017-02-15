goog.provide('og.LineString');

goog.require('og.mercator');
goog.require('og.math.Vector3');

/**
 * LineString object.
 * @class
 * @param {Object} [options] - Linestring options:
 * @param {number} [options.thickness] - Thickness in screen pixels 1.5 is default.
 * @param {og.math.Vector4} [options.color] - RGBA color.
 * @param {boolean} [options.visibility] - LineString visibility. True default.
 * @param {Array.<og.LonLat>} [options.pathLonLat] - LineString geodetic coordinates array.
 * @param {Array.<Array.<number,number,number>>} [options.path] - LinesString cartesian coordinates array. Like path:[[0,0,0], [1,1,1],...]
 */
og.LineString = function (options) {

    options = options || {};

    /**
     * Object unic identifier.
     * @public
     * @readonly
     * @type {number}
     */
    this.id = og.LineString.__staticId++;

    /**
     * LineString thickness in screen pixels.
     * @public
     * @type {number}
     */
    this.thickness = options.thickness || 1.5;

    /**
     * LineString RGBA color.
     * @public
     * @type {og.math.Vector4}
     */
    this.color = og.utils.createColorRGBA(options.color, new og.math.Vector4(1.0, 1.0, 1.0, 1.0));

    /**
     * LineString visibility.
     * @public
     * @type {boolean}
     */
    this.visibility = (options.visibility != undefined ? options.visibility : true);

    /**
     * LineString cartesian coordinates.
     * @private
     * @type {Array.<Array.<number,number,number>>}
     */
    this._path = [];

    /**
     * LineString geodetic degrees coordiantes.
     * @private
     * @type {Array.<og.LonLat>}
     */
    this._pathLonLat = [];

    /**
     * LineString geodetic mercator coordinates.
     * @private
     * @type {Array.<og.LonLat>}
     */
    this._pathLonLatMerc = [];

    this._mainData = null;
    this._orderData = null;
    this._indexData = null;

    this._mainBuffer = null;
    this._orderBuffer = null;
    this._indexBuffer = null;

    this._pickingColor = [0, 0, 0];

    this._renderNode = null;

    /**
     * Entity instance that holds this linestring.
     * @private
     * @type {og.Entity}
     */
    this._entity = null;

    /**
     * Handler that stores and renders this linestring object.
     * @private
     * @type {og.LineStringHandler}
     */
    this._handler = null;
    this._handlerIndex = -1;

    this._buffersUpdateCallbacks = [];
    this._buffersUpdateCallbacks[og.LineString.MAIN_BUFFER] = this._createMainBuffer;
    this._buffersUpdateCallbacks[og.LineString.INDEX_BUFFER] = this._createIndexBuffer;

    this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);

    //create path
    if (options.pathLonLat) {
        this.setPathLonLat(options.pathLonLat);
    } else if (options.path) {
        this.setPath(options.path);
    }
};

og.LineString.MAIN_BUFFER = 0;
og.LineString.INDEX_BUFFER = 1;

og.LineString.__staticId = 0;

/**
 * Clear linestring object data.
 * @public
 */
og.LineString.prototype.clear = function () {
    this._path.length = 0;
    this._path = [];

    this._pathLonLat.length = 0;
    this._pathLonLat = [];

    this._pathLonLatMerc.length = 0;
    this._pathLonLatMerc = [];

    this._mainData.length = 0;
    this._orderData.length = 0;
    this._indexData.length = 0;

    this._mainData = null;
    this._orderData = null;
    this._indexData = null;

    this._deleteBuffers();
};

/**
 * Sets linestring RGBA color.
 * @public
 * @param {number} r - Red color.
 * @param {number} g - Green color.
 * @param {number} b - Blue color.
 * @param {number} [a] - Opacity.
 */
og.LineString.prototype.setColor = function (r, g, b, a) {
    this.color.x = r;
    this.color.y = g;
    this.color.z = b;
    a && (this.color.w = a);
};

/**
 * Sets linestring RGB color.
 * @public
 * @param {og.math.Vector3} color - RGB color.
 */
og.LineString.prototype.setColor3v = function (color) {
    this.color.x = color.x;
    this.color.y = color.y;
    this.color.z = color.z;
};

/**
 * Sets linestring RGBA color.
 * @public
 * @param {og.math.Vector4} color - RGBA color.
 */
og.LineString.prototype.setColor4v = function (color) {
    this.color.x = color.x;
    this.color.y = color.y;
    this.color.z = color.z;
    this.color.w = color.w;
};

/**
 * Sets linestring opacity.
 * @public
 * @param {number} opacity - Opacity.
 */
og.LineString.prototype.setOpacity = function (opacity) {
    this.color.w = opacity;
};

/**
 * Sets linestring thickness in screen pixels.
 * @public
 * @param {number} thickness - Thickness.
 */
og.LineString.prototype.setThickness = function (thickness) {
    this.thickness = thickness;
};

/**
 * Returns thickness.
 * @public
 * @return {number} Thickness in screen pixels.
 */
og.LineString.prototype.getThickness = function () {
    return this.thickness;
};

/**
 * Sets visibility.
 * @public
 * @param {boolean} visibility - Linestring visibility.
 */
og.LineString.prototype.setVisibility = function (visibility) {
    this.visibility = visibility;
};

/**
 * Gets linestring visibility.
 * @public
 * @return {boolean} Linestring visibility.
 */
og.LineString.prototype.getVisibility = function () {
    return this.visibility;
};

/**
 * Assign with render node.
 * @public
 */
og.LineString.prototype.setRenderNode = function (renderNode) {
    this._renderNode = renderNode;
    this._createData3v();
};

/**
 * Removes from entity.
 * @public
 */
og.LineString.prototype.remove = function () {
    this._entity = null;
    this._handler && this._handler.remove(this);
};

og.LineString.prototype.setPickingColor3v = function (color) {
    //...
    //TODO: check the renderer before
    //...
    this._pickingColor[0] = color.x / 255.0;
    this._pickingColor[1] = color.y / 255.0;
    this._pickingColor[2] = color.z / 255.0;
};

/**
 * Returns linestring path cartesian coordinates.
 * @return {Array.<og.math.Vector3>} Linestring path.
 */
og.LineString.prototype.getPath = function () {
    return this._path;
};

/**
 * Sets linestring cartesian coordinates.
 * @public
 * @param {Array.<Array.<number,number,number>>} path - Linestring path cartesian coordinates.
 */
og.LineString.prototype.setPath = function (path) {
    if (this._renderNode) {
        var thisPath = this._path;
        if (path.length === thisPath.length) {

            var p0 = path[0],
                p1 = path[1];

            var prevX = p0[0] + p0[0] - p1[0],
                prevY = p0[1] + p0[1] - p1[1],
                prevZ = p0[2] + p0[2] - p1[2];

            var len = path.length - 1;
            var md = this._mainData;

            for (var i = 0, j = 0; i < len; i++, j += 36) {

                p0 = path[i];
                p1 = path[i + 1];

                md[j] = p0[0];
                md[j + 1] = p0[1];
                md[j + 2] = p0[2];
                md[j + 3] = prevX;
                md[j + 4] = prevY;
                md[j + 5] = prevZ;
                md[j + 6] = p1[0];
                md[j + 7] = p1[1];
                md[j + 8] = p1[2];

                md[j + 9] = p0[0];
                md[j + 10] = p0[1];
                md[j + 11] = p0[2];
                md[j + 12] = prevX;
                md[j + 13] = prevY;
                md[j + 14] = prevZ;
                md[j + 15] = p1[0];
                md[j + 16] = p1[1];
                md[j + 17] = p1[2];

                prevX = p0[0];
                prevY = p0[1];
                prevZ = p0[2];

                thisPath[i].set(prevX, prevY, prevZ);

                var p2 = path[i + 2];
                var nextX, nextY, nextZ;

                if (p2) {
                    nextX = p2[0];
                    nextY = p2[1];
                    nextZ = p2[2];
                } else {
                    nextX = p1[0] + p1[0] - p0[0];
                    nextY = p1[1] + p1[1] - p0[1];
                    nextZ = p1[2] + p1[2] - p0[2];
                }

                md[j + 18] = p1[0];
                md[j + 19] = p1[1];
                md[j + 20] = p1[2];
                md[j + 21] = p0[0];
                md[j + 22] = p0[1];
                md[j + 23] = p0[2];
                md[j + 24] = nextX;
                md[j + 25] = nextY;
                md[j + 26] = nextZ;

                md[j + 27] = p1[0];
                md[j + 28] = p1[1];
                md[j + 29] = p1[2];
                md[j + 30] = p0[0];
                md[j + 31] = p0[1];
                md[j + 32] = p0[2];
                md[j + 33] = nextX;
                md[j + 34] = nextY;
                md[j + 35] = nextZ;
            }

            this._path[len].set(path[len][0], path[len][1], path[len][2]);

            this._changedBuffers[og.LineString.MAIN_BUFFER] = true;

        } else {
            this._createDataArr(path);
        }
    } else {
        for (var i = 0; i < path.length; i++) {
            var pi = path[i];
            this._path[i] = new og.math.Vector3(pi[0], pi[1], pi[2]);
        }
    }
};

/**
 * Sets linestring specific point cartesian coordinates.
 * @public
 * @param {number} index - Specific point index.
 * @param {og.math.Vector3} point - New cartesian coordintes.
 */
og.LineString.prototype.setPoint3v = function (index, point) {
    var len = this._path.length;
    if (index >= 0 && index < len &&
        this._renderNode) {

        var p0, p1,
            prevX, prevY, prevZ,
            nextX, nextY, nextZ;
        var x = point.x, y = point.y, z = point.z;
        var md = this._mainData;

        var p = this._path[index];
        p.x = x;
        p.y = y;
        p.z = z;

        var ell = this._renderNode.ellipsoid;
        if (ell) {
            var lonlat = ell.cartesianToLonLat(p);
            this._pathLonLat[i] = lonlat;
            if (Math.abs(lonlat.lat) < og.mercator.MAX_LAT) {
                this._pathLonLatMerc[i] = lonlat.forwardMercator();
            }
        }

        var s = index * 36;

        if (index === 0 || index === 1) {
            var p0 = this._path[0],
                p1 = this._path[1];
            prevX = p0.x + p0.x - p1.x;
            prevY = p0.y + p0.y - p1.y;
            prevZ = p0.z + p0.z - p1.z;
            md[3] = prevX;
            md[4] = prevY;
            md[5] = prevZ;
            md[12] = prevX;
            md[13] = prevY;
            md[14] = prevZ;
        }

        if (index == len - 2) {
            var p0 = this._path[len - 2],
                p1 = this._path[len - 1];
            nextX = p1.x + p1.x - p0.x;
            nextY = p1.y + p1.y - p0.y;
            nextZ = p1.z + p1.z - p0.z;
            md[s + 24] = nextX;
            md[s + 25] = nextY;
            md[s + 26] = nextZ;
            md[s + 33] = nextX;
            md[s + 34] = nextY;
            md[s + 35] = nextZ;
        } else if (index === len - 1) {
            var p0 = this._path[len - 2],
                p1 = this._path[len - 1];
            nextX = p1.x + p1.x - p0.x;
            nextY = p1.y + p1.y - p0.y;
            nextZ = p1.z + p1.z - p0.z;
            md[s - 12] = nextX;
            md[s - 11] = nextY;
            md[s - 10] = nextZ;
            md[s - 3] = nextX;
            md[s - 2] = nextY;
            md[s - 1] = nextZ;
        }

        //forward
        var f = [0, 21, 39];
        for (var i = 0; i < 3; i++) {
            var si = s + f[i];
            if (si < md.length) {
                md[si] = x;
                md[si + 1] = y;
                md[si + 2] = z;
                md[si + 9] = x;
                md[si + 10] = y;
                md[si + 11] = z;
            } else {
                break;
            }
        }

        //backward
        var b = [-18, -30, -48];
        for (var i = 0; i < 3; i++) {
            var si = s + b[i];
            if (si >= 0) {
                md[si] = x;
                md[si + 1] = y;
                md[si + 2] = z;
                md[si + 9] = x;
                md[si + 10] = y;
                md[si + 11] = z;
            } else {
                break;
            }
        }

        this._changedBuffers[og.LineString.MAIN_BUFFER] = true;
    }
};

/**
 * Returns specific linestring point cartesian coordinates by index.
 * @public
 * @param {number} index - Spectific point index.
 * @return {og.math.Vector3} Linrstring point coordinate.
 */
og.LineString.prototype.getPoint = function (index) {
    return this._path[index];
};

/**
 * @todo
 */
og.LineString.prototype.removePoint = function (index) {

};

/**
 * @todo
 */
og.LineString.prototype.insertPoint = function (index, point) {

};

/**
 * Creates linestring data.
 * @private
 * @param {Array.<Array<number,number,number>>} path - Linestring path cartesian coordinates.
 */
og.LineString.prototype._createDataArr = function (path) {

    var ell = this._renderNode.ellipsoid;
    var len = path.length - 1;

    this._path = null;
    this._path = [];

    this._mainData = [];
    this._orderData = [];
    this._indexData = [];

    var p0 = path[0],
        p1 = path[1];

    var prevX = p0[0] + p0[0] - p1[0],
        prevY = p0[1] + p0[1] - p1[1],
        prevZ = p0[2] + p0[2] - p1[2];

    for (var i = 0, j = 0; i < len; i++) {

        p0 = path[i];
        p1 = path[i + 1];

        this._mainData.push(p0[0], p0[1], p0[2], prevX, prevY, prevZ, p1[0], p1[1], p1[2]);
        this._mainData.push(p0[0], p0[1], p0[2], prevX, prevY, prevZ, p1[0], p1[1], p1[2]);

        prevX = p0[0];
        prevY = p0[1];
        prevZ = p0[2];

        this._path[i] = new og.math.Vector3(prevX, prevY, prevZ);

        if (ell) {
            var lonlat = ell.cartesianToLonLat(this._path[i]);
            this._pathLonLat[i] = lonlat;
            if (Math.abs(lonlat.lat) < og.mercator.MAX_LAT) {
                this._pathLonLatMerc[i] = lonlat.forwardMercator();
            }
        }

        var p2 = path[i + 2];
        var nextX, nextY, nextZ;

        if (p2) {
            nextX = p2[0];
            nextY = p2[1];
            nextZ = p2[2];
            this._indexData.push(j, ++j, ++j, ++j, j, j, ++j);
        } else {
            nextX = p1[0] + p1[0] - p0[0];
            nextY = p1[1] + p1[1] - p0[1];
            nextZ = p1[2] + p1[2] - p0[2];
            this._indexData.push(j, ++j, ++j, ++j);
        }

        this._mainData.push(p1[0], p1[1], p1[2], p0[0], p0[1], p0[2], nextX, nextY, nextZ);
        this._mainData.push(p1[0], p1[1], p1[2], p0[0], p0[1], p0[2], nextX, nextY, nextZ);

        this._orderData.push(-1, 1, -1, -1, 1, -1, 1, 1);
    }

    this._path[len] = og.math.Vector3.fromVec(path[len]);

    this._changedBuffers[og.LineString.MAIN_BUFFER] = true;
    this._changedBuffers[og.LineString.INDEX_BUFFER] = true;
};

/**
 * Creates line string data by the current cartesian coordinates.
 * @private
 */
og.LineString.prototype._createData3v = function () {

    var path = this._path;

    var ell = this._renderNode.ellipsoid;
    var len = path.length - 1;

    this._mainData = [];
    this._orderData = [];
    this._indexData = [];

    var p0 = path[0],
        p1 = path[1];

    var prevX = p0.x + p0.x - p1.x,
        prevY = p0.y + p0.y - p1.y,
        prevZ = p0.z + p0.z - p1.z;

    for (var i = 0, j = 0; i < len; i++) {

        p0 = path[i];
        p1 = path[i + 1];

        this._mainData.push(p0.x, p0.y, p0.z, prevX, prevY, prevZ, p1.x, p1.y, p1.z);
        this._mainData.push(p0.x, p0.y, p0.z, prevX, prevY, prevZ, p1.x, p1.y, p1.z);

        prevX = p0.x;
        prevY = p0.y;
        prevZ = p0.z;

        if (ell) {
            var lonlat = ell.cartesianToLonLat(this._path[i]);
            this._pathLonLat[i] = lonlat;
            if (Math.abs(lonlat.lat) < og.mercator.MAX_LAT) {
                this._pathLonLatMerc[i] = lonlat.forwardMercator();
            }
        }

        var p2 = path[i + 2];
        var nextX, nextY, nextZ;

        if (p2) {
            nextX = p2.x;
            nextY = p2.y;
            nextZ = p2.z;
            this._indexData.push(j, ++j, ++j, ++j, j, j, ++j);
        } else {
            nextX = p1.x + p1.x - p0.x;
            nextY = p1.y + p1.y - p0.y;
            nextZ = p1.z + p1.z - p0.z;
            this._indexData.push(j, ++j, ++j, ++j);
        }

        this._mainData.push(p1.x, p1.y, p1.z, p0.x, p0.y, p0.z, nextX, nextY, nextZ);
        this._mainData.push(p1.x, p1.y, p1.z, p0.x, p0.y, p0.z, nextX, nextY, nextZ);

        this._orderData.push(-1, 1, -1, -1, 1, -1, 1, 1);
    }

    this._changedBuffers[og.LineString.MAIN_BUFFER] = true;
    this._changedBuffers[og.LineString.INDEX_BUFFER] = true;
};

og.LineString.prototype.draw = function () {
    if (this.visibility && this._path.length) {

        this._update();

        var rn = this._renderNode;
        var r = rn.renderer;
        var sh = r.handler.shaderPrograms.lineString;
        var p = sh._program;
        var gl = r.handler.gl,
            sha = p.attributes,
            shu = p.uniforms;

        sh.activate();

        gl.uniformMatrix4fv(shu.proj._pName, false, r.activeCamera._projectionMatrix._m);
        gl.uniformMatrix4fv(shu.view._pName, false, r.activeCamera._viewMatrix._m);

        gl.uniform2fv(shu.viewport._pName, [r.handler.canvas.width, r.handler.canvas.height]);
        gl.uniform1f(shu.thickness._pName, this.thickness * 0.5);
        gl.uniform4fv(shu.color._pName, [this.color.x, this.color.y, this.color.z, this.color.w]);

        gl.uniform2fv(shu.uFloatParams._pName, [rn._planetRadius2 || 0, r.activeCamera._tanViewAngle_hradOneByHeight]);
        gl.uniform3fv(shu.uCamPos._pName, r.activeCamera.eye.toVec());

        r._drawBuffersExtension && gl.uniform3fv(shu.pickingColor._pName, this._pickingColor);

        var mb = this._mainBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, mb);
        gl.vertexAttribPointer(sha.current._pName, mb.itemSize, gl.FLOAT, false, 36, 0);
        gl.vertexAttribPointer(sha.prev._pName, mb.itemSize, gl.FLOAT, false, 36, 12);
        gl.vertexAttribPointer(sha.next._pName, mb.itemSize, gl.FLOAT, false, 36, 24);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._orderBuffer);
        gl.vertexAttribPointer(sha.order._pName, this._orderBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.disable(gl.CULL_FACE);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
        gl.drawElements(r.handler.gl.TRIANGLE_STRIP, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
        gl.enable(gl.CULL_FACE);
    }
};

og.LineString.prototype.drawPicking = function () {
    if (this.visibility && this._path.length) {

        var rn = this._renderNode;
        var r = rn.renderer;
        var sh = r.handler.shaderPrograms.lineString;
        var p = sh._program;
        var gl = r.handler.gl,
            sha = p.attributes,
            shu = p.uniforms;

        sh.activate();

        gl.uniformMatrix4fv(shu.proj._pName, false, r.activeCamera._projectionMatrix._m);
        gl.uniformMatrix4fv(shu.view._pName, false, r.activeCamera._viewMatrix._m);

        gl.uniform2fv(shu.viewport._pName, [r.handler.canvas.width, r.handler.canvas.height]);
        gl.uniform1f(shu.thickness._pName, this.thickness * 0.5);
        gl.uniform4fv(shu.color._pName, [this._pickingColor[0], this._pickingColor[1], this._pickingColor[2], 1.0]);

        gl.uniform2fv(shu.uFloatParams._pName, [rn._planetRadius2 || 0, r.activeCamera._tanViewAngle_hradOneByHeight]);
        gl.uniform3fv(shu.uCamPos._pName, r.activeCamera.eye.toVec());

        var mb = this._mainBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, mb);
        gl.vertexAttribPointer(sha.current._pName, mb.itemSize, gl.FLOAT, false, 36, 0);
        gl.vertexAttribPointer(sha.prev._pName, mb.itemSize, gl.FLOAT, false, 36, 12);
        gl.vertexAttribPointer(sha.next._pName, mb.itemSize, gl.FLOAT, false, 36, 24);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._orderBuffer);
        gl.vertexAttribPointer(sha.order._pName, this._orderBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.disable(gl.CULL_FACE);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
        gl.drawElements(r.handler.gl.TRIANGLE_STRIP, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
        gl.enable(gl.CULL_FACE);
    }
};

/**
 * Updates render buffers.
 * @private
 */
og.LineString.prototype._update = function () {
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
 * Clear gl buffers.
 * @private
 */
og.LineString.prototype._deleteBuffers = function () {
    var r = this._renderNode.renderer,
        gl = r.handler.gl;

    gl.deleteBuffer(this._mainBuffer);
    gl.deleteBuffer(this._orderBuffer);
    gl.deleteBuffer(this._indexBuffer);

    this._mainBuffer = null;
    this._orderBuffer = null;
    this._indexBuffer = null;
};

/**
 * Creates gl main data buffer.
 * @private
 */
og.LineString.prototype._createMainBuffer = function () {
    var h = this._renderNode.renderer.handler;
    h.gl.deleteBuffer(this._mainBuffer);
    this._mainBuffer = h.createArrayBuffer(new Float32Array(this._mainData), 3, (this._mainData.length) / 9);
};

/**
 * Creates gl main daya index buffer.
 * @private
 */
og.LineString.prototype._createIndexBuffer = function () {
    var h = this._renderNode.renderer.handler;
    h.gl.deleteBuffer(this._orderBuffer);
    h.gl.deleteBuffer(this._indexBuffer);
    this._orderBuffer = h.createArrayBuffer(new Float32Array(this._orderData), 2, (this._orderData.length) / 2);
    this._indexBuffer = h.createElementArrayBuffer(new Uint16Array(this._indexData), 1, this._indexData.length);
};