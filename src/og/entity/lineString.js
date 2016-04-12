goog.provide('og.LineString');

og.LineString = function (options) {

    options = options || {};

    this.id = og.LineString.__staticId++;

    this.thickness = options.thickness || 1.5;
    this.color = options.color || [1.0, 1.0, 1.0, 1.0];
    this.visibility = (options.visibility != undefined ? options.visibility : true);

    this._path = options.path || [];

    this._pickingColor = [0, 0, 0];

    this._renderNode = null;

    this.mainBuffer = null;
    this.orderBuffer = null;
    this.indexBuffer = null;

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
};

og.LineString.__staticId = 0;

og.LineString.prototype.clear = function () {
    this._path.length = 0;
    this._path = [];

    this._deleteBuffers();
};

og.LineString.prototype._deleteBuffers = function () {
    var r = this._renderNode.renderer,
        gl = r.handler.gl;

    gl.deleteBuffer(this.mainBuffer);
    gl.deleteBuffer(this.orderBuffer);
    gl.deleteBuffer(this.indexBuffer);

    this.mainBuffer = null;
    this.orderBuffer = null;
    this.indexBuffer = null;
};

og.LineString.prototype.setVisibility = function (visibility) {
    this.visibility = visibility;
};

og.LineString.prototype.getVisibility = function () {
    return this.visibility;
};

og.LineString.prototype.setRenderNode = function (renderNode) {
    this._renderNode = renderNode;
    this._createBuffers();
};

og.LineString.prototype.remove = function () {
    this._entity = null;
    this._handler && this._handler.remove(this);
};

og.LineString.prototype.setPickingColor3v = function (color) {
    if (this._handler && this._renderNode) {
        this._pickingColor = color.toArr();
    };
};

og.LineString.prototype._createBuffers = function () {
    this._deleteBuffers();
    var r = this._renderNode.renderer;
    var h = r.handler;

    var path = this._path;

    var len = path.length - 1;

    var buff = [],
        order = [],
        vertIndeces = [];

    var p0 = path[0],
        p1 = path[1];

    var prevX = p0[0] + p0[0] - p1[0],
        prevY = p0[1] + p0[1] - p1[1],
        prevZ = p0[2] + p0[2] - p1[2];

    for (var i = 0, j = 0; i < len; i++) {

        p0 = path[i];
        p1 = path[i + 1];

        buff.push(p0[0], p0[1], p0[2], prevX, prevY, prevZ, p1[0], p1[1], p1[2]);
        buff.push(p0[0], p0[1], p0[2], prevX, prevY, prevZ, p1[0], p1[1], p1[2]);

        prevX = p0[0];
        prevY = p0[1];
        prevZ = p0[2];

        var p2 = path[i + 2];
        var nextX, nextY, nextZ;

        if (p2) {
            nextX = p2[0];
            nextY = p2[1];
            nextZ = p2[2];
            vertIndeces.push(j, ++j, ++j, ++j, j, j, ++j);
        } else {
            nextX = p1[0] + p1[0] - p0[0];
            nextY = p1[1] + p1[1] - p0[1];
            nextZ = p1[2] + p1[2] - p0[2];
            vertIndeces.push(j, ++j, ++j, ++j);
        }

        buff.push(p1[0], p1[1], p1[2], p0[0], p0[1], p0[2], nextX, nextY, nextZ);
        buff.push(p1[0], p1[1], p1[2], p0[0], p0[1], p0[2], nextX, nextY, nextZ);

        order.push(-1, 1, -1, -1, 1, -1, 1, 1);
    }

    this.components = 9;
    var size = (buff.length / this.components);

    this._mainBuffer = h.createArrayBuffer(new Float32Array(buff), 3, size);
    this._orderBuffer = h.createArrayBuffer(new Float32Array(order), 2, order.length / 2);
    this._indexBuffer = h.createElementArrayBuffer(new Uint16Array(vertIndeces), 1, vertIndeces.length);
}

og.LineString.prototype.draw = function () {
    if (this.visibility) {
        var rn = this._renderNode;
        var r = rn.renderer;

        var sh, p, gl;

        sh = r.handler.shaderPrograms.LineString;
        p = sh._program;
        gl = r.handler.gl,
            sha = p.attributes,
            shu = p.uniforms;

        sh.activate();

        gl.uniformMatrix4fv(shu.proj._pName, false, r.activeCamera._pMatrix._m);
        gl.uniformMatrix4fv(shu.view._pName, false, r.activeCamera._mvMatrix._m);

        gl.uniform2fv(shu.viewport._pName, [r.handler.canvas.width, r.handler.canvas.height]);

        gl.uniform1f(shu.thickness._pName, this.thickness);

        var FLOATSIZE = 4;

        gl.bindBuffer(gl.ARRAY_BUFFER, this._mainBuffer);

        gl.vertexAttribPointer(sha.current._pName, this._mainBuffer.itemSize, gl.FLOAT, false,
            this.components * FLOATSIZE, 0 * FLOATSIZE);

        gl.vertexAttribPointer(sha.prev._pName, this._mainBuffer.itemSize, gl.FLOAT, false,
            this.components * FLOATSIZE, 3 * FLOATSIZE);

        gl.vertexAttribPointer(sha.next._pName, this._mainBuffer.itemSize, gl.FLOAT, false,
            this.components * FLOATSIZE, 6 * FLOATSIZE);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._orderBuffer);
        gl.vertexAttribPointer(sha.order._pName, this._orderBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.disable(gl.CULL_FACE);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
        gl.drawElements(r.handler.gl.TRIANGLE_STRIP, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
        gl.enable(gl.CULL_FACE);
    }
};