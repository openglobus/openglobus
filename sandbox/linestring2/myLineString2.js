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

    this.createBuffers();

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

my.LineString2.prototype.createBuffers = function () {
    var h = this.renderer.handler;

    var prev = [
              (0 - (-100)) * 5, (100 - (-100)) * 5, 0,
              (0 - (-100)) * 5, (100 - (-100)) * 5, 0,
           -100, -100, 0,
           -100, -100, 0,

           -100, -100, 0,
           -100, -100, 0,
              0, 100, 0,
              0, 100, 0,

             0, 100, 0,
             0, 100, 0,
           100, -100, 0,
           100, -100, 0
    ];

    var current = [
    -100, -100, 0,
    -100, -100, 0,
       0, 100, 0,
       0, 100, 0,

    0, 100, 0,
    0, 100, 0,
    100, -100, 0,
    100, -100, 0,

    100, -100, 0,
    100, -100, 0,
    200, -100, 0,
    200, -100, 0
    ];

    var next = [
                 0, 100, 0,
                 0, 100, 0,
               100, -100, 0,
               100, -100, 0,

                100, -100, 0,
                100, -100, 0,
                200, -100, 0,
                200, -100, 0,

                200, -100, 0,
                200, -100, 0,
                (200 - 100) * 5, (-100 - (-100)) * 5, 0,
                (200 - 100) * 5, (-100 - (-100)) * 5, 0
    ];

    var order = [
        -1, 1,
        -1, -1,
         1, -1,
         1, 1,

        -1, 1,
        -1, -1,
         1, -1,
         1, 1,

        -1, 1,
        -1, -1,
         1, -1,
         1, 1
    ];

    var vertIndeces = [
        0, 1, 2, 3,
        3, 3, 4,
        4, 5, 6, 7,
        7, 7, 8,
        8, 9, 10, 11];

    this.prevBuffer = h.createArrayBuffer(new Float32Array(prev), 3, prev.length / 3);
    this.currentBuffer = h.createArrayBuffer(new Float32Array(current), 3, current.length / 3);
    this.nextBuffer = h.createArrayBuffer(new Float32Array(next), 3, next.length / 3);
    this.orderBuffer = h.createArrayBuffer(new Float32Array(order), 2, order.length / 2);

    this.indexBuffer = h.createElementArrayBuffer(new Uint16Array(vertIndeces), 1, vertIndeces.length)
};

thickness = 10;

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

    gl.uniform1f(shu.thickness._pName, thickness);

    //vertices positions
    gl.bindBuffer(gl.ARRAY_BUFFER, this.prevBuffer);
    gl.vertexAttribPointer(sha.prev._pName, this.prevBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.currentBuffer);
    gl.vertexAttribPointer(sha.current._pName, this.currentBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.nextBuffer);
    gl.vertexAttribPointer(sha.next._pName, this.nextBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.orderBuffer);
    gl.vertexAttribPointer(sha.order._pName, this.orderBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.disable(gl.CULL_FACE);

    //draw indexes
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(this.drawMode, this.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    gl.enable(gl.CULL_FACE);
};