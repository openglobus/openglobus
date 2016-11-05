goog.provide('og.scene.Axes');

goog.require('og.inheritance');
goog.require('og.scene.RenderNode');
goog.require('og.shaderProgram.simple');

og.scene.Axes = function (size) {
    og.inheritance.base(this, "Axes");
    this.size = size;
    this.axesBuffer = null;
    this.axesColorBuffer = null;
};

og.inheritance.extend(og.scene.Axes, og.scene.RenderNode);

og.scene.Axes.prototype.initialization = function () {
    this.createAxisBuffer(this.size);
    this.drawMode = this.renderer.handler.gl.LINES;
    this.renderer.handler.addShaderProgram(og.shaderProgram.simple());
};

og.scene.Axes.prototype.frame = function () {

    this.renderer.handler.shaderPrograms.simple.activate();

    this.renderer.handler.shaderPrograms.simple.set({
        projectionViewMatrix: this.renderer.activeCamera._projectionViewMatrix._m,
        aVertexPosition: this.axisBuffer,
        aVertexColor: this.axisColorBuffer
    });

    this.renderer.handler.shaderPrograms.simple.drawArray(this.drawMode, this.axisBuffer.numItems);
};

og.scene.Axes.prototype.createAxisBuffer = function (gridSize) {

    var vertices = [
         0.0, 0.0, 0.0, gridSize - 1, 0.0, 0.0, // x - R
         0.0, 0.0, 0.0, 0.0, gridSize - 1, 0.0, // y - B  
         0.0, 0.0, 0.0, 0.0, 0.0, gridSize - 1  // z - G
    ];

    var colors = [
        1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0,   // x - R
        0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0,   // y - B
        0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0    // z - G
    ];

    this.axisBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(vertices), 3, 6);
    this.axisColorBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(colors), 4, 6);
};