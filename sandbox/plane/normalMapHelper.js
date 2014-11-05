goog.provide('NormalMapHelper');

NormalMapHelper = function (handler) {

    this.handler = handler;
    this._verticesBuffer;
};

NormalMapHelper.prototype.initialize = function () {

    var vertices = [];

    for (var i = 0; i < 33; i++) {
        for (var j = 0; j < 33; j++) {
            vertices.push(-1 + j / (32 / 2), -1 + i / (32 / 2));
        }
    }

    this._verticesBuffer = this.handler.createArrayBuffer(new Float32Array(vertices), 2, vertices.length / 2);
    var indexes = og.planetSegment.PlanetSegmentHelper.createSegmentIndexes(32, [32, 32, 32, 32]);
    this._indexBuffer = this.handler.createElementArrayBuffer(indexes, 1, indexes.length);

    var positions = [
     -1.0, -1.0,
      1.0, -1.0,
     -1.0, 1.0,
     1.0, 1.0];

    this._positionBuffer = this.handler.createArrayBuffer(new Float32Array(positions), 2, positions.length / 2);

    this.framebuffer = new og.webgl.Framebuffer(this.handler.gl, 128, 128);
    this.framebuffer.initialize();
};

NormalMapHelper.prototype.drawNormalMap = function (normals) {

    this._normalsBuffer = this.handler.createArrayBuffer(new Float32Array(normals), 3, normals.length / 3);

    this.handler.deactivateFaceCulling();

    this.framebuffer.activate();
    this.framebuffer.clear();

    this.handler.shaderPrograms.normalMap.activate();

    this.handler.shaderPrograms.normalMap.set({
        a_position: this._verticesBuffer,
        a_normal: this._normalsBuffer
    });

    //draw indexes
    this.handler.gl.bindBuffer(this.handler.gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    this.handler.gl.drawElements(this.handler.gl.TRIANGLE_STRIP, this._indexBuffer.numItems, this.handler.gl.UNSIGNED_SHORT, 0);

    this.framebuffer.deactivate();
};

NormalMapHelper.prototype.drawBlur = function (texture, dir, size, radius) {

    this.handler.clearFrame();

    this.handler.shaderPrograms.blur.activate();

    this.handler.shaderPrograms.blur.set({
        a_position: this._positionBuffer,
        u_texture: texture,
        resolution: size,
        radius: radius,
        dir: dir
    });

    this.handler.shaderPrograms.blur.drawArray(this.handler.gl.TRIANGLE_STRIP, this._positionBuffer.numItems);
};

NormalMapHelper.prototype.createNormalMap = function (normals, success) {
    this.drawNormalMap(normals);
    this.drawBlur(this.framebuffer.texture, [1.0, 0.0], 128, 1);
    this.drawBlur(this.handler.createTexture(this.handler.canvas), [0.0, 1.0], 128, 1);
    success(this.handler.canvas);
};
