og.node.SkyBox = function () {
    og.node.SkyBox.superclass.constructor.call(this, og.node.SkyBox);
    this.size = 100000;

    this.vertexPositionBuffers = new Array(6);
    this.vertexIndexBuffers = new Array(6);
    this.vertexTextureCoordBuffers = new Array(6);

    this.textures = new Array(6);
    this.texturesFileName = new Array(6);
    this.spath = "Resources\\Images\\Skyboxes\\Tycho\\";

    this.orientation = new Orientation3();
};

og._class_.extend(og.node.SkyBox, og.node.Node3D);

og.node.SkyBox.FRONT_PLANE = 0;
og.node.SkyBox.BACK_PLANE = 1;
og.node.SkyBox.TOP_PLANE = 2;
og.node.SkyBox.BOTTOM_PLANE = 3;
og.node.SkyBox.RIGHT_PLANE = 4;
og.node.SkyBox.LEFT_PLANE = 5;

og.node.SkyBox.prototype.initialization = function () {

    this.initTexture(this.spath + "pz.jpg", og.node.SkyBox.FRONT_PLANE);
    this.initTexture(this.spath + "nz.jpg", og.node.SkyBox.BACK_PLANE);
    this.initTexture(this.spath + "py.jpg", og.node.SkyBox.TOP_PLANE);
    this.initTexture(this.spath + "ny.jpg", og.node.SkyBox.BOTTOM_PLANE);
    this.initTexture(this.spath + "px.jpg", og.node.SkyBox.RIGHT_PLANE);
    this.initTexture(this.spath + "nx.jpg", og.node.SkyBox.LEFT_PLANE);

    this.orientation.setAngles(0, -10, -40);

    this.createBuffers();
    this.drawMode = WebGLContext.GL_TRIANGLES;
}

og.node.SkyBox.prototype.initTexture = function (fileName, plane) {
    var image = new Image();
    var that = this;
    image.onload = function () {
        that.textures[plane] = that.renderer.ctx.createTextureFromImage(image);
    }
    image.src = this.texturesFileName[plane] = fileName;
};

og.node.SkyBox.prototype.frame = function () {
    this.renderer.ctx.setTextureBias([0,0,1]);
    this.renderer.ctx.mvPushMatrix();
    mat4.translate(this.renderer.ctx.mvMatrix, this.renderer.activeCamera.eye.toVec());
    mat4.rotate(this.renderer.ctx.mvMatrix, DEG2RAD(this.orientation.roll), [0.0, 0.0, 1.0]);
    mat4.rotate(this.renderer.ctx.mvMatrix, DEG2RAD(this.orientation.pitch), [1.0, 0.0, 0.0]);
    mat4.rotate(this.renderer.ctx.mvMatrix, DEG2RAD(this.orientation.yaw), [0.0, 1.0, 0.0]);

    for (var i = 0; i < 6; i++) {
        this.renderer.ctx.bindTexture(this.textures[i]);
        this.renderer.ctx.drawBuffer(this.vertexPositionBuffers[i], this.vertexTextureCoordBuffers[i], this.vertexIndexBuffers[i]);
    }

    this.renderer.ctx.mvPopMatrix();
};

og.node.SkyBox.prototype.createBuffers = function () {
    var vertices = [
      // Front face
      [-1.0 * this.size, -1.0 * this.size, 1.0 * this.size,
       1.0 * this.size, -1.0 * this.size, 1.0 * this.size,
       1.0 * this.size, 1.0 * this.size, 1.0 * this.size,
      -1.0 * this.size, 1.0 * this.size, 1.0 * this.size],

      // Back face
      [-1.0 * this.size, -1.0 * this.size, -1.0 * this.size,
      -1.0 * this.size, 1.0 * this.size, -1.0 * this.size,
       1.0 * this.size, 1.0 * this.size, -1.0 * this.size,
       1.0 * this.size, -1.0 * this.size, -1.0 * this.size],

      // Top face
      [-1.0 * this.size, 1.0 * this.size, -1.0 * this.size,
      -1.0 * this.size, 1.0 * this.size, 1.0 * this.size,
       1.0 * this.size, 1.0 * this.size, 1.0 * this.size,
       1.0 * this.size, 1.0 * this.size, -1.0 * this.size],

      // Bottom face
      [-1.0 * this.size, -1.0 * this.size, -1.0 * this.size,
       1.0 * this.size, -1.0 * this.size, -1.0 * this.size,
       1.0 * this.size, -1.0 * this.size, 1.0 * this.size,
      -1.0 * this.size, -1.0 * this.size, 1.0 * this.size],

      // Right face
      [1.0 * this.size, -1.0 * this.size, -1.0 * this.size,
       1.0 * this.size, 1.0 * this.size, -1.0 * this.size,
       1.0 * this.size, 1.0 * this.size, 1.0 * this.size,
       1.0 * this.size, -1.0 * this.size, 1.0 * this.size],

      // Left face
      [-1.0 * this.size, -1.0 * this.size, -1.0 * this.size,
      -1.0 * this.size, -1.0 * this.size, 1.0 * this.size,
      -1.0 * this.size, 1.0 * this.size, 1.0 * this.size,
      -1.0 * this.size, 1.0 * this.size, -1.0 * this.size]];

    var vertexIndices = [
      [0, 3, 2, 0, 2, 1],    // Front face
      [0, 3, 2, 0, 2, 1],    // Back face
      [0, 3, 2, 0, 2, 1],  // Top face
      [0, 3, 2, 0, 2, 1], // Bottom face
      [0, 3, 2, 0, 2, 1], // Right face
      [0, 3, 2, 0, 2, 1]  // Left face
    ]

    var textureCoords = [
      // Front face
      [0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0],

      // Back face
      [1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,
      0.0, 0.0],

      // Top face
      [0.0, 1.0,
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0],

      // Bottom face
      [0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0],

      // Right face
      [1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,
      0.0, 0.0],

      // Left face
      [0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0]
    ];

    for (var i = 0; i < 6; i++) {
        this.vertexPositionBuffers[i] = this.renderer.ctx.createArrayBuffer(new Float32Array(vertices[i]), 3, 4);
        this.vertexTextureCoordBuffers[i] = this.renderer.ctx.createArrayBuffer(new Float32Array(textureCoords[i]), 2, 4);
        this.vertexIndexBuffers[i] = this.renderer.ctx.createElementArrayBuffer(new Uint16Array(vertexIndices[i]), 1, 6);
    }
};
