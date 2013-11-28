goog.provide('my.Cube');

goog.require('og.node.Node3D');
goog.require('og._class_');
goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.math');
goog.require('og.math.Quaternion');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');
goog.require('og.math.Vector3');

my.Cube = function (size) {
    my.Cube.superclass.constructor.call(this, "Cube");
    this.size = size * 0.5;
    this.cubeVertexColorBuffer = null;
    this.cubeVertexPositionBuffer = null;
    this.cubeVertexIndexBuffer = null;

    this.mxRotation = new og.math.Matrix4().setIdentity();
    this.mxTranslation = new og.math.Matrix4().setIdentity();
    this.mxScale = new og.math.Matrix4().setIdentity();
    this.mxTRS = new og.math.Matrix4();

    this.orientation = new og.math.Quaternion(0, 0, 0, 0);

    this.rot = 0;
};

og._class_.extend(my.Cube, og.node.Node3D);

my.Cube.prototype.initShaderProgram = function () {
    this.renderer.ctx.addShaderProgram(new og.shaderProgram.ShaderProgram("myCube", {
        uniforms: {
            uPMVMatrix: { type: og.shaderProgram.types.MAT4 },
            uSampler: { type: og.shaderProgram.types.SAMPLER2D }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aVertexColor: { type: og.shaderProgram.types.VEC4, enableArray: true }
        },
        vertexShader: "attribute vec3 aVertexPosition; \
                    attribute vec4 aVertexColor; \
                    uniform mat4 uPMVMatrix; \
                    varying vec4 vColor; \
                    void main(void) { \
                        gl_Position = uPMVMatrix * vec4(aVertexPosition, 1.0); \
                        vColor = aVertexColor; \
                    }",
        fragmentShader: "precision mediump float; \
                    varying vec4 vColor; \
                    void main(void) { \
                        gl_FragColor = vColor; \
                    }"
    }));
};

my.Cube.prototype.initialization = function () {
    this.initShaderProgram();
    this.createBuffers();
    this.drawMode = this.renderer.ctx.gl.TRIANGLES;

    this.mxTranslation.translate(new og.math.Vector3(1000, 1000, 1000));

};

my.Cube.prototype.createBuffers = function () {
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

    var colors = [
        [1.0, 0.0, 0.0, 1.0],     // Front face
        [1.0, 1.0, 0.0, 1.0],     // Back face
        [0.0, 1.0, 0.0, 1.0],     // Top face
        [1.0, 0.5, 0.5, 1.0],     // Bottom face
        [1.0, 0.0, 1.0, 1.0],     // Right face
        [0.0, 0.0, 1.0, 1.0],     // Left face
    ];

    var unpackedColors = [];
    for (var i in colors) {
        var color = colors[i];
        for (var j = 0; j < 4; j++) {
            unpackedColors = unpackedColors.concat(color);
        }
    }

    this.cubeVertexColorBuffer = this.renderer.ctx.createArrayBuffer(new Float32Array(unpackedColors), 4, 24);
    this.cubeVertexPositionBuffer = this.renderer.ctx.createArrayBuffer(new Float32Array(vertices), 3, 24);
    this.cubeVertexIndexBuffer = this.renderer.ctx.createElementArrayBuffer(new Uint16Array(cubeVertexIndices), 1, 36);
};

my.Cube.prototype.frame = function () {   
    this.renderer.ctx.shaderPrograms.myCube.activate();

    this.mxTRS = this.mxTranslation.mul(this.orientation.setFromAxisAngle(new og.math.Vector3(1, 1, 1), this.rot++ * og.math.RADIANS).getMatrix4());

    this.renderer.ctx.shaderPrograms.myCube.set({
        uPMVMatrix: this.renderer.activeCamera.pmvMatrix.mul(this.mxTRS)._m,
        aVertexPosition: this.cubeVertexPositionBuffer,
        aVertexColor: this.cubeVertexColorBuffer
    });

    this.renderer.ctx.shaderPrograms.myCube.drawIndexBuffer(this.drawMode, this.cubeVertexIndexBuffer);
};