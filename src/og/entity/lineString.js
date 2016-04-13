goog.provide('og.LineString');

og.LineString = function (options) {

    options = options || {};

    this.id = og.LineString.__staticId++;

    this.thickness = options.thickness || 1.5;
    this.color = options.color || [1.0, 1.0, 1.0, 1.0];
    this.visibility = (options.visibility != undefined ? options.visibility : true);
    this.pickingDistance = options.pickingDistance || 0.0;

    this._path = options.path ? [].concat(options.path) : [];

    this._mainData = null;
    this._orderData = null;
    this._indexData = null;

    this._mainBuffer = null;
    this._orderBuffer = null;
    this._indexBuffer = null;

    this._pickingColor = [0, 0, 0];

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
};

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

og.LineString.prototype.setPath = function (path) {
    this._path = [].concat(path);


};

og.LineString.prototype.setPoint = function (index, point) {

};

og.LineString.prototype.getPoint = function (index) {

};

og.LineString.prototype.removePoint = function (index) {

};

og.LineString.prototype.insertPoint = function (index, point) {

};

og.LineString.prototype._createBuffers = function () {

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

    for (var i = 0, j = 0; i < len; i++) {

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

    this._deleteBuffers();
    var r = this._renderNode.renderer;
    var h = r.handler;

    this._mainBuffer = h.createArrayBuffer(new Float32Array(this._mainData), 3, this._mainData.length / 9);
    this._orderBuffer = h.createArrayBuffer(new Float32Array(this._orderData), 2, this._orderData.length / 2);
    this._indexBuffer = h.createElementArrayBuffer(new Uint16Array(this._indexData), 1, this._indexData.length);
}

//FLOATSIZE = 4;
//components = 9;
og.LineString.prototype.draw = function () {
    if (this.visibility && this._path.length) {
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