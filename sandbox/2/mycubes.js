goog.provide('my.Cubes');

goog.require('og.node.RenderNode');
goog.require('og.math');
goog.require('og.math.Quaternion');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');
goog.require('og.webgl.Framebuffer');


my.Cubes = function (name, size) {
    og.inheritance.base(this, name);
    this.size = size * 0.5;
    this.cubeVertexPositionBuffer1 = null;
    this.cubeVertexIndexBuffer1 = null;
    this.cubeVertexPositionBuffer2 = null;
    this.cubeVertexIndexBuffer2 = null;
    this.cubeVertexPositionBuffer3 = null;
    this.cubeVertexIndexBuffer3 = null;
    this.mxRotation = new og.math.Matrix4().setIdentity();
    this.mxTranslation1 = new og.math.Matrix4().setIdentity();
    this.mxTranslation2 = new og.math.Matrix4().setIdentity();
    this.mxTranslation3 = new og.math.Matrix4().setIdentity();
    this.mxScale = new og.math.Matrix4().setIdentity();
    this.mxTRS = new og.math.Matrix4();
    this.orientation = new og.math.Quaternion(0, 0, 0, 0);
    this.rot = 0;
    this.framebuffer;
};

og.inheritance.extend(my.Cubes, og.node.RenderNode);

my.Cubes.prototype.initialization = function () {
    this.createBuffers();
    this.drawMode = this.renderer.handler.gl.TRIANGLES;
    this.mxTranslation1.translate(new og.math.Vector3(0, 0, 0));
    this.mxTranslation2.translate(new og.math.Vector3(1000, 1000, 1000));
    this.mxTranslation3.translate(new og.math.Vector3(2000, 2000, 2000));
    this.renderer.events.on("resize", this, this.onResize);
    this.framebuffer = new og.webgl.Framebuffer(this.renderer.handler.gl);
    this.framebuffer.initialize();

    this.ff = new og.webgl.Framebuffer(this.renderer.handler.gl);
    this.ff.initialize();

    this.renderer.events.on("mouselbuttonclick", this, function (e) {
        var x = e.x,
            y = e.y;
        var pixelValues = this.framebuffer.readPixels(x, this.renderer.handler.gl.canvas.height - y);
        if (pixelValues[0] == 255 && pixelValues[1] == 0 && pixelValues[2] == 0) {
            console.log("Location: (" + x + ", " + y +
            ") is in the RED!");
        } else if (pixelValues[0] == 0 && pixelValues[1] == 255 && pixelValues[2] == 0) {
            console.log("Location: (" + x + ", " + y +
            ") is in the GREEN!");
        } else if (pixelValues[0] == 0 && pixelValues[1] == 0 && pixelValues[2] == 255) {
            console.log("Location: (" + x + ", " + y +
            ") is in the BLUE!");
        }
    });
};

my.Cubes.prototype.onResize = function (obj) {
    this.framebuffer.setSize(obj.clientWidth, obj.clientHeight);
};

my.Cubes.prototype.createBuffers = function () {
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

    this.cubeVertexPositionBuffer1 = this.renderer.handler.createArrayBuffer(new Float32Array(vertices), 3, 24);
    this.cubeVertexIndexBuffer1 = this.renderer.handler.createElementArrayBuffer(new Uint16Array(cubeVertexIndices), 1, 36);

    this.cubeVertexPositionBuffer2 = this.renderer.handler.createArrayBuffer(new Float32Array(vertices), 3, 24);
    this.cubeVertexIndexBuffer2 = this.renderer.handler.createElementArrayBuffer(new Uint16Array(cubeVertexIndices), 1, 36);

    this.cubeVertexPositionBuffer3 = this.renderer.handler.createArrayBuffer(new Float32Array(vertices), 3, 24);
    this.cubeVertexIndexBuffer3 = this.renderer.handler.createElementArrayBuffer(new Uint16Array(cubeVertexIndices), 1, 36);

};

my.Cubes.prototype.draw = function () {

    this.mxTRS = this.mxTranslation1.mul(this.orientation.setFromAxisAngle(new og.math.Vector3(1, 1, 1), this.rot * og.math.RADIANS).getMatrix4());
    this.renderer.handler.shaderPrograms.colorShader.set({
        uPMVMatrix: this.renderer.activeCamera.pmvMatrix.mul(this.mxTRS)._m,
        aVertexPosition: this.cubeVertexPositionBuffer1,
        uColor: [1, 0, 0, 1]
    });
    this.renderer.handler.shaderPrograms.colorShader.drawIndexBuffer(this.drawMode, this.cubeVertexIndexBuffer1);


    this.mxTRS = this.mxTranslation2.mul(this.orientation.setFromAxisAngle(new og.math.Vector3(1, 1, 1), this.rot * og.math.RADIANS).getMatrix4());
    this.renderer.handler.shaderPrograms.colorShader.set({
        uPMVMatrix: this.renderer.activeCamera.pmvMatrix.mul(this.mxTRS)._m,
        aVertexPosition: this.cubeVertexPositionBuffer2,
        uColor: [0, 1, 0, 1]
    });
    this.renderer.handler.shaderPrograms.colorShader.drawIndexBuffer(this.drawMode, this.cubeVertexIndexBuffer2);


    this.mxTRS = this.mxTranslation3.mul(this.orientation.setFromAxisAngle(new og.math.Vector3(1, 1, 1), this.rot * og.math.RADIANS).getMatrix4());
    this.renderer.handler.shaderPrograms.colorShader.set({
        uPMVMatrix: this.renderer.activeCamera.pmvMatrix.mul(this.mxTRS)._m,
        aVertexPosition: this.cubeVertexPositionBuffer3,
        uColor: [0, 0, 1, 1]
    });
    this.renderer.handler.shaderPrograms.colorShader.drawIndexBuffer(this.drawMode, this.cubeVertexIndexBuffer3);
};

my.Cubes.prototype.draw2 = function () {

    this.mxTRS = this.mxTranslation1.mul(this.orientation.setFromAxisAngle(new og.math.Vector3(1, 1, 1), 2 * this.rot * og.math.RADIANS).getMatrix4());
    this.renderer.handler.shaderPrograms.colorShader.set({
        uPMVMatrix: this.renderer.activeCamera.pmvMatrix.mul(this.mxTRS)._m,
        aVertexPosition: this.cubeVertexPositionBuffer1,
        uColor: [1, 0, 0, 1]
    });
    this.renderer.handler.shaderPrograms.colorShader.drawIndexBuffer(this.drawMode, this.cubeVertexIndexBuffer1);


    this.mxTRS = this.mxTranslation2.mul(this.orientation.setFromAxisAngle(new og.math.Vector3(1, 1, 1), 3 * this.rot * og.math.RADIANS).getMatrix4());
    this.renderer.handler.shaderPrograms.colorShader.set({
        uPMVMatrix: this.renderer.activeCamera.pmvMatrix.mul(this.mxTRS)._m,
        aVertexPosition: this.cubeVertexPositionBuffer2,
        uColor: [0, 1, 0, 1]
    });
    this.renderer.handler.shaderPrograms.colorShader.drawIndexBuffer(this.drawMode, this.cubeVertexIndexBuffer2);


    this.mxTRS = this.mxTranslation3.mul(this.orientation.setFromAxisAngle(new og.math.Vector3(1, 1, 1), 5 * this.rot * og.math.RADIANS).getMatrix4());
    this.renderer.handler.shaderPrograms.colorShader.set({
        uPMVMatrix: this.renderer.activeCamera.pmvMatrix.mul(this.mxTRS)._m,
        aVertexPosition: this.cubeVertexPositionBuffer3,
        uColor: [0, 0, 1, 1]
    });
    this.renderer.handler.shaderPrograms.colorShader.drawIndexBuffer(this.drawMode, this.cubeVertexIndexBuffer3);
};



my.Cubes.prototype.frame = function () {

    this.renderer.handler.shaderPrograms.colorShader.activate();

    this.framebuffer.activate();
    this.framebuffer.clear();
    this.draw();
    this.framebuffer.deactivate();

    this.ff.activate();
    this.ff.clear();
    this.draw2();
    this.ff.deactivate();

    this.draw();
    this.rot++;
};