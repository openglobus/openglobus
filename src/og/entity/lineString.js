goog.provide('og.LineString');

og.LineString = function (options) {

    options = options || {};

    this.id = og.LineString.__staticId++;

    this.thickness = options.thickness || 1.5;
    this.color = options.color || [1.0, 1.0, 1.0, 1.0];
    this.visibility = (options.visibility != undefined ? options.visibility : true);
    this.pickingDistance = options.pickingDistance || 2.0;

    this._path = options.path ? [].concat(options.path) : [];

    this._mainData = null;
    this._orderData = null;
    this._indexData = null;

    this._mainBuffer = null;
    this._orderBuffer = null;
    this._indexBuffer = null;

    this._pickingColor = [0, 0, 0, 0];

    this._renderNode = null;

    /**
     * Entity instance that holds this shape.
     * @private
     * @type {og.Entity}
     */
    this._entity = null;

    /**
     * Handler that stores and renders this shape object.
     * @private
     * @type {og.BillboardHandler}
     */
    this._handler = null;
    this._handlerIndex = -1;

    this._buffersUpdateCallbacks = [];
    this._buffersUpdateCallbacks[og.LineString.MAIN_BUFFER] = this._createMainBuffer;
    this._buffersUpdateCallbacks[og.LineString.INDEX_BUFFER] = this._createIndexBuffer;

    this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);
};

og.LineString.MAIN_BUFFER = 0;
og.LineString.INDEX_BUFFER = 1;

og.LineString.__staticId = 0;

og.LineString.prototype.clear = function () {
    this._path.length = 0;
    this._path = [];

    this._mainData.length = 0;
    this._orderData.length = 0;
    this._indexData.length = 0;

    this._mainData = null;
    this._orderData = null;
    this._indexData = null;

    this._deleteBuffers();
};

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

og.LineString.prototype.setColor = function (r, g, b, a) {
    this.color[0] = r;
    this.color[1] = g;
    this.color[2] = b;
    a && (this.color[3] = a);
};

og.LineString.prototype.setColor3v = function (color) {
    this.color[0] = color.x;
    this.color[1] = color.y;
    this.color[2] = color.z;
};

og.LineString.prototype.setColor4v = function (color) {
    this.color[0] = color.x;
    this.color[1] = color.y;
    this.color[2] = color.z;
    this.color[3] = color.w;
};

og.LineString.prototype.setOpacity = function (opacity) {
    this.color[3] = opacity;
};

og.LineString.prototype.setThickness = function (thickness) {
    this.thickness = thickness;
};

og.LineString.prototype.getThickness = function () {
    return this.thickness;
};

og.LineString.prototype.setVisibility = function (visibility) {
    this.visibility = visibility;
};

og.LineString.prototype.getVisibility = function () {
    return this.visibility;
};

og.LineString.prototype.setPickingDistance = function (pickingDistance) {
    this.pickingDistance = pickingDistance;
};

og.LineString.prototype.getPickingDistance = function () {
    return this.pickingDistance;
};

og.LineString.prototype.setRenderNode = function (renderNode) {
    this._renderNode = renderNode;
    this._createData();
};

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
    this._pickingColor[3] = 1.0;
};

og.LineString.prototype._createMainBuffer = function () {
    var h = this._renderNode.renderer.handler;
    h.gl.deleteBuffer(this._mainBuffer);
    this._mainBuffer = h.createArrayBuffer(new Float32Array(this._mainData), 3, (this._mainData.length - 54) / 9);
};

og.LineString.prototype._createIndexBuffer = function () {
    var h = this._renderNode.renderer.handler;
    h.gl.deleteBuffer(this._orderBuffer);
    h.gl.deleteBuffer(this._indexBuffer);
    this._orderBuffer = h.createArrayBuffer(new Float32Array(this._orderData), 2, (this._orderData.length - 12) / 2);
    this._indexBuffer = h.createElementArrayBuffer(new Uint16Array(this._indexData), 1, this._indexData.length);
};

og.LineString.prototype.getPath = function () {
    return [].concat(this._path);
};

og.LineString.prototype.setPath = function (path) {
    if (this._renderNode) {
        if (path.length === this._path.length) {
            this._path = [].concat(path);

            var p0 = path[0],
                p1 = path[1];

            var prevX = p0[0] + p0[0] - p1[0],
                prevY = p0[1] + p0[1] - p1[1],
                prevZ = p0[2] + p0[2] - p1[2];

            var len = path.length - 1;
            var md = this._mainData;

            for (var i = 0, j = 54; i < len; i++, j += 36) {

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

            this._changedBuffers[og.LineString.MAIN_BUFFER] = true;

        } else {
            this._path = [].concat(path);
            this._createData();
        }
    } else {
        this._path = [].concat(path);
    }
};

og.LineString.prototype.setPoint3v = function (index, point) {
    if (index >= 0 && index < this._path.length) {
        var p = this._path[index];
        p[0] = point[0];
        p[1] = point[1];
        p[2] = point[2];

        if (this._renderNode) {

            var x = point.x, y = point.y, z = point.z;
            var md = this._mainData;

            var prev = index - 1,
                next = index + 1;

            var s = 36 * index;

            md[s + 6] = x;
            md[s + 7] = y;
            md[s + 8] = z;

            md[s + 15] = x;
            md[s + 16] = y;
            md[s + 17] = z;

            md[s + 24] = x;
            md[s + 15] = y;
            md[s + 26] = z;

            md[s + 33] = x;
            md[s + 34] = y;
            md[s + 35] = z;

            md[s + 36] = x;
            md[s + 37] = y;
            md[s + 38] = z;

            md[s + 45] = x;
            md[s + 46] = y;
            md[s + 47] = z;

            md[s + 54] = x;
            md[s + 55] = y;
            md[s + 56] = z;

            md[s + 63] = x;
            md[s + 64] = y;
            md[s + 65] = z;

            md[s + 75] = x;
            md[s + 76] = y;
            md[s + 77] = z;

            md[s + 84] = x;
            md[s + 85] = y;
            md[s + 86] = z;

            md[s + 93] = x;
            md[s + 94] = y;
            md[s + 95] = z;

            md[s + 102] = x;
            md[s + 103] = y;
            md[s + 104] = z;

            this._changedBuffers[og.LineString.MAIN_BUFFER] = true;
        }
    }
};

og.LineString.prototype.getPoint = function (index) {
    return this._path[index];
};

og.LineString.prototype.removePoint = function (index) {

};

og.LineString.prototype.insertPoint = function (index, point) {

};

og.LineString.prototype._createData = function () {

    var path = this._path;
    var len = path.length - 1;

    this._mainData = [];
    this._orderData = [];
    this._indexData = [];

    var p0 = path[0],
        p1 = path[1];

    var prevX = p0[0] + p0[0] - p1[0],
        prevY = p0[1] + p0[1] - p1[1],
        prevZ = p0[2] + p0[2] - p1[2];

    //fake data
    this._mainData.push(
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0);

    this._orderData.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

    for (var i = 0, j = 6; i < len; i++) {

        p0 = path[i];
        p1 = path[i + 1];

        this._mainData.push(p0[0], p0[1], p0[2], prevX, prevY, prevZ, p1[0], p1[1], p1[2]);
        this._mainData.push(p0[0], p0[1], p0[2], prevX, prevY, prevZ, p1[0], p1[1], p1[2]);

        prevX = p0[0];
        prevY = p0[1];
        prevZ = p0[2];

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

    //fake data
    this._mainData.push(
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0);

    this._orderData.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);


    this._changedBuffers[og.LineString.MAIN_BUFFER] = true;
    this._changedBuffers[og.LineString.INDEX_BUFFER] = true;
}

//FLOATSIZE = 4;
//components = 9;
og.LineString.prototype.draw = function () {
    if (this.visibility && this._path.length) {

        this._update();

        var rn = this._renderNode;
        var r = rn.renderer;
        var sh = r.handler.shaderPrograms.LineString;
        var p = sh._program;
        var gl = r.handler.gl,
            sha = p.attributes,
            shu = p.uniforms;

        sh.activate();

        gl.uniformMatrix4fv(shu.proj._pName, false, r.activeCamera._pMatrix._m);
        gl.uniformMatrix4fv(shu.view._pName, false, r.activeCamera._mvMatrix._m);
        gl.uniform2fv(shu.viewport._pName, [r.handler.canvas.width, r.handler.canvas.height]);
        gl.uniform1f(shu.thickness._pName, this.thickness);
        gl.uniform4fv(shu.color._pName, this.color);

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
        var sh = r.handler.shaderPrograms.LineString;
        var p = sh._program;
        var gl = r.handler.gl,
            sha = p.attributes,
            shu = p.uniforms;

        sh.activate();

        gl.uniformMatrix4fv(shu.proj._pName, false, r.activeCamera._pMatrix._m);
        gl.uniformMatrix4fv(shu.view._pName, false, r.activeCamera._mvMatrix._m);
        gl.uniform2fv(shu.viewport._pName, [r.handler.canvas.width, r.handler.canvas.height]);
        gl.uniform1f(shu.thickness._pName, this.thickness + this.pickingDistance);
        gl.uniform4fv(shu.color._pName, this._pickingColor);

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