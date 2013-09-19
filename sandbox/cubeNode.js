var CubeNode = function (size) {
    CubeNode.superclass.constructor.call(this, "CUBE");
    this.size = size * 0.5;
    //this.cubeVertexColorBuffer = null;
    this.cubeVertexPositionBuffer = null;
    this.cubeVertexIndexBuffer = null;

    this.texture;
    this.textureImageFileName;
    this.cubeVertexTextureCoordBuffer = null;
}

extend(CubeNode, Node3D);

CubeNode.prototype.initialization = function () {

    this.initTexture("nehe.gif");
    this.createBuffers();
    this.drawMode = WebGLContext.GL_TRIANGLES;
}

CubeNode.prototype.initTexture = function(fileName) {
    var image = new Image();
    var handle = this;
    image.onload = function () {
        handle.texture = handle.renderer.ctx.createTextureFromImage(image);
    }
    image.src = this.textureImageFileName = fileName;
}

CubeNode.prototype.frame = function () {
    this.renderer.ctx.bindTexture(this.texture);
    this.renderer.ctx.drawBuffer(this.cubeVertexPositionBuffer, this.cubeVertexTextureCoordBuffer, this.cubeVertexIndexBuffer);
}

CubeNode.prototype.createBuffers = function () {
    vertices = [
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

    //var colors = [
    //    [1.0, 0.0, 0.0, 1.0],     // Front face
    //    [1.0, 1.0, 0.0, 1.0],     // Back face
    //    [0.0, 1.0, 0.0, 1.0],     // Top face
    //    [1.0, 0.5, 0.5, 1.0],     // Bottom face
    //    [1.0, 0.0, 1.0, 1.0],     // Right face
    //    [0.0, 0.0, 1.0, 1.0],     // Left face
    //];

    //var unpackedColors = [];
    //for (var i in colors) {
    //    var color = colors[i];
    //    for (var j=0; j < 4; j++) {
    //    unpackedColors = unpackedColors.concat(color);
    //    }
    //}


    var textureCoords = [
      // Front face
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,

      // Back face
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,
      0.0, 0.0,

      // Top face
      0.0, 1.0,
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,

      // Bottom face
      1.0, 1.0,
      0.0, 1.0,
      0.0, 0.0,
      1.0, 0.0,

      // Right face
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,
      0.0, 0.0,

      // Left face
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0
    ];

    //this.cubeVertexColorBuffer = this.ctx.createArrayBuffer( new Float32Array(unpackedColors), 4, 24 );
    this.cubeVertexPositionBuffer = this.renderer.ctx.createArrayBuffer( new Float32Array(vertices), 3, 24 );
    this.cubeVertexTextureCoordBuffer = this.renderer.ctx.createArrayBuffer(new Float32Array(textureCoords), 2, 24);
    this.cubeVertexIndexBuffer = this.renderer.ctx.createElementArrayBuffer(new Uint16Array(cubeVertexIndices), 1, 36);
}