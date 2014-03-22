goog.provide('og.node.SkyBox');

goog.require('og.inheritance');
goog.require('og.node.RenderNode');
goog.require('og.shaderProgram.skybox');

og.node.SkyBox = function (params) {
    og.inheritance.base(this, "skybox");
    this.params = params;

    this.vertexPositionBuffer = null;
    this.texture = null;
};

og.inheritance.extend(og.node.SkyBox, og.node.RenderNode);

og.node.SkyBox.prototype.initialization = function () {
    this.renderer.handler.addShaderProgram(og.shaderProgram.skybox, true);
    this.texture = this.renderer.handler.loadCubeMapTexture(this.params);
    this.createBuffers();
    this.drawMode = this.renderer.handler.gl.TRIANGLES;
};

og.node.SkyBox.prototype.frame = function () {
    var h = this.renderer.handler;
    h.gl.disable(h.gl.DEPTH_TEST);

    h.shaderPrograms.skybox.activate();
    h.shaderPrograms.skybox.set({
        uPMVMatrix: this.renderer.activeCamera.pmvMatrix._m,
        pos: this.renderer.activeCamera.eye.toVec(),
        uSampler: this.texture,
        aVertexPosition: this.vertexPositionBuffer
    });
    h.shaderPrograms.skybox.drawArray(this.drawMode, this.vertexPositionBuffer.numItems);

    h.gl.enable(h.gl.DEPTH_TEST);
};

og.node.SkyBox.prototype.createBuffers = function () {
    var points = [
        -100.0, 100.0, -100.0,
        -100.0, -100.0, -100.0,
         100.0, -100.0, -100.0,
         100.0, -100.0, -100.0,
         100.0, 100.0, -100.0,
        -100.0, 100.0, -100.0,

        -100.0, -100.0, 100.0,
        -100.0, -100.0, -100.0,
        -100.0, 100.0, -100.0,
        -100.0, 100.0, -100.0,
        -100.0, 100.0, 100.0,
        -100.0, -100.0, 100.0,

         100.0, -100.0, -100.0,
         100.0, -100.0, 100.0,
         100.0, 100.0, 100.0,
         100.0, 100.0, 100.0,
         100.0, 100.0, -100.0,
         100.0, -100.0, -100.0,

        -100.0, -100.0, 100.0,
        -100.0, 100.0, 100.0,
         100.0, 100.0, 100.0,
         100.0, 100.0, 100.0,
         100.0, -100.0, 100.0,
        -100.0, -100.0, 100.0,

        -100.0, 100.0, -100.0,
         100.0, 100.0, -100.0,
         100.0, 100.0, 100.0,
         100.0, 100.0, 100.0,
        -100.0, 100.0, 100.0,
        -100.0, 100.0, -100.0,

        -100.0, -100.0, -100.0,
        -100.0, -100.0, 100.0,
         100.0, -100.0, -100.0,
         100.0, -100.0, -100.0,
        -100.0, -100.0, 100.0,
         100.0, -100.0, 100.0
    ];

    this.vertexPositionBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(points), 3, 36);
};
