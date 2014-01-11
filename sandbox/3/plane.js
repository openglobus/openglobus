goog.provide('my.Plane');

goog.require('og.node.RenderNode');
goog.require('og.class');
goog.require('og.math');
goog.require('og.math.Quaternion');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');
goog.require('og.webgl.Framebuffer');


my.Plane = function (name) {
    og.class.base(this, name);
    this.cubeVertexPositionBuffer = null;
    this.cubeVertexIndexBuffer = null;

    this.mxRotation = new og.math.Matrix4().setIdentity();
    this.mxTranslation = new og.math.Matrix4().setIdentity();
    this.mxScale = new og.math.Matrix4().setIdentity();
    this.mxTRS = new og.math.Matrix4();
    this.orientation = new og.math.Quaternion(0, 0, 0, 0);
    this.rot = 0;
    this.framebuffer;
    this.size = 1000;
};

og.class.extend(my.Plane, og.node.RenderNode);

my.Plane.prototype.initialization = function () {
    this.createBuffers();
    this.drawMode = this.renderer.handler.gl.TRIANGLES;
    this.mxTranslation.translate(new og.math.Vector3(0, 0, 0));
    this.renderer.addEvent("onresize", this, this.onResize);
    this.framebuffer = new og.webgl.Framebuffer(this.renderer.handler.gl);
    this.framebuffer.initialize();

    this.ff = new og.webgl.Framebuffer(this.renderer.handler.gl);
    this.ff.initialize();

    this.renderer.addEvent("onmouselbuttonclick", this, function (e) {
    });
};

my.Plane.prototype.onResize = function (obj) {
    this.framebuffer.setSize(obj.clientWidth, obj.clientHeight);
};

my.Plane.prototype.createBuffers = function () {
    var vertices = [
      // Front face
      -1.0 * this.size, -1.0 * this.size, 1.0 * this.size,
       1.0 * this.size, -1.0 * this.size, 1.0 * this.size,
       1.0 * this.size, 1.0 * this.size, 1.0 * this.size,
      -1.0 * this.size, 1.0 * this.size, 1.0 * this.size,

      // Back face
      -1.0 * this.size, -1.0 * this.size, -1.0 * this.size,
      -1.0 * this.size, 1.0 * this.size, -1.0 * this.size,
       1.0 * this.size, 1.0 * this.size, -1.0 * this.size,
       1.0 * this.size, -1.0 * this.size, -1.0 * this.size,

      // Top face
      -1.0 * this.size, 1.0 * this.size, -1.0 * this.size,
      -1.0 * this.size, 1.0 * this.size, 1.0 * this.size,
       1.0 * this.size, 1.0 * this.size, 1.0 * this.size,
       1.0 * this.size, 1.0 * this.size, -1.0 * this.size,

      // Bottom face
      -1.0 * this.size, -1.0 * this.size, -1.0 * this.size,
       1.0 * this.size, -1.0 * this.size, -1.0 * this.size,
       1.0 * this.size, -1.0 * this.size, 1.0 * this.size,
      -1.0 * this.size, -1.0 * this.size, 1.0 * this.size,

      // Right face
       1.0 * this.size, -1.0 * this.size, -1.0 * this.size,
       1.0 * this.size, 1.0 * this.size, -1.0 * this.size,
       1.0 * this.size, 1.0 * this.size, 1.0 * this.size,
       1.0 * this.size, -1.0 * this.size, 1.0 * this.size,

      // Left face
      -1.0 * this.size, -1.0 * this.size, -1.0 * this.size,
      -1.0 * this.size, -1.0 * this.size, 1.0 * this.size,
      -1.0 * this.size, 1.0 * this.size, 1.0 * this.size,
      -1.0 * this.size, 1.0 * this.size, -1.0 * this.size,
    ];

    var cubeVertexIndices = [
      0, 1, 2, 0, 2, 3,    // Front face
      4, 5, 6, 4, 6, 7,    // Back face
      8, 9, 10, 8, 10, 11,  // Top face
      12, 13, 14, 12, 14, 15, // Bottom face
      16, 17, 18, 16, 18, 19, // Right face
      20, 21, 22, 20, 22, 23  // Left face
    ]

    this.cubeVertexPositionBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(vertices), 3, 24);
    this.cubeVertexIndexBuffer = this.renderer.handler.createElementArrayBuffer(new Uint16Array(cubeVertexIndices), 1, cubeVertexIndices.length);
};

my.Plane.prototype.draw = function () {
    this.mxTRS = this.mxTranslation.mul(this.orientation.setFromAxisAngle(new og.math.Vector3(1, 1, 1), this.rot * og.math.RADIANS).getMatrix4());
    this.renderer.handler.shaderPrograms.picking.set({
        uPMVMatrix: this.renderer.activeCamera.pmvMatrix.mul(this.mxTRS)._m,
        aVertexPosition: this.cubeVertexPositionBuffer,
        uColor: [0, 0, 1]
    });
    this.renderer.handler.shaderPrograms.picking.drawIndexBuffer(this.drawMode, this.cubeVertexIndexBuffer);
};


my.Plane.prototype.frame = function () {
    this.renderer.handler.shaderPrograms.picking.activate();
    this.draw();
    this.rot = 0;
};