goog.provide('my.LineString2');

goog.require('og.node.RenderNode');
goog.require('og.inheritance');

goog.require('og.math.Vector2');
goog.require('og.math.Vector3');

my.LineString2 = function (name) {
    og.inheritance.base(this, name);

    this.positionBuffer = null;
    this.nextVertsBuffer = null;
    this.indexBuffer = null;
    this.thicknessBuffer = null;
    this.drawMode = null;
    this.thickness = 10;
};

og.inheritance.extend(my.LineString2, og.node.RenderNode);


my.LineString2.prototype.initialization = function () {

    this.drawMode = this.renderer.handler.gl.TRIANGLE_STRIP;

    var lineStringShader = new og.shaderProgram.ShaderProgram("LineString", {
        uniforms: {
            view: { type: og.shaderProgram.types.MAT4 },
            proj: { type: og.shaderProgram.types.MAT4 },
            viewport: { type: og.shaderProgram.types.VEC2 },
            thickness: { type: og.shaderProgram.types.FLOAT }
        },
        attributes: {
            prev: { type: og.shaderProgram.types.VEC3, enableArray: true },
            current: { type: og.shaderProgram.types.VEC3, enableArray: true },
            next: { type: og.shaderProgram.types.VEC3, enableArray: true },
            order: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: og.utils.readTextFile("lineString2_vs.txt"),
        fragmentShader: og.utils.readTextFile("lineString2_fs.txt")
    });

    this.renderer.handler.addShaderProgram(lineStringShader);

    var path = [[-100, -100, 100], [0, 100, 0], [100, -100, 0], [200, -100, 0], [100, 100, -500], [0, 0, 10000000000]];

    this.createBuffers(path);

    var that = this;
    this.renderer.events.on("charkeypress", this, function () {
        that.toogleWireframe();
    }, og.input.KEY_X);
};

my.LineString2.prototype.toogleWireframe = function (e) {
    if (this.drawMode === this.renderer.handler.gl.LINE_STRIP) {
        this.drawMode = this.renderer.handler.gl.TRIANGLE_STRIP;
    } else {
        this.drawMode = this.renderer.handler.gl.LINE_STRIP;
    }
};

my.LineString2.prototype.createBuffers = function (path) {
    var h = this.renderer.handler;

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

    this.mainBuffer = h.createArrayBuffer(new Float32Array(buff), 3, size);
    this.orderBuffer = h.createArrayBuffer(new Float32Array(order), 2, order.length / 2);
    this.indexBuffer = h.createElementArrayBuffer(new Uint16Array(vertIndeces), 1, vertIndeces.length);
};

my.LineString2.prototype.frame = function () {
    var r = this.renderer;

    var sh, p, gl;

    sh = r.handler.shaderPrograms.LineString;
    p = sh._program;
    gl = r.handler.gl,
        sha = p.attributes,
        shu = p.uniforms;

    sh.activate();

    //matrices
    gl.uniformMatrix4fv(shu.proj._pName, false, r.activeCamera._pMatrix._m);
    gl.uniformMatrix4fv(shu.view._pName, false, r.activeCamera._mvMatrix._m);

    gl.uniform2fv(shu.viewport._pName, [r.handler.canvas.width, r.handler.canvas.height]);

    gl.uniform1f(shu.thickness._pName, this.thickness);

    var FLOATSIZE = 4;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.mainBuffer);

    gl.vertexAttribPointer(sha.current._pName, this.mainBuffer.itemSize, gl.FLOAT, false,
    this.components * FLOATSIZE, 0 * FLOATSIZE);

    gl.vertexAttribPointer(sha.prev._pName, this.mainBuffer.itemSize, gl.FLOAT, false,
        this.components * FLOATSIZE, 3 * FLOATSIZE);

    gl.vertexAttribPointer(sha.next._pName, this.mainBuffer.itemSize, gl.FLOAT, false,
        this.components * FLOATSIZE, 6 * FLOATSIZE);


    gl.bindBuffer(gl.ARRAY_BUFFER, this.orderBuffer);
    gl.vertexAttribPointer(sha.order._pName, this.orderBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.disable(gl.CULL_FACE);

    //draw indexes
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(this.drawMode, this.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    gl.enable(gl.CULL_FACE);
};