goog.provide('og.node.Axes');


goog.require('og.inheritance');
goog.require('og.node.RenderNode');

og.node.Axes = function (size) {
    og.inheritance.base(this, "Axes");
    this.size = size;
    this.axesBuffer;
    this.axesColorBuffer;
};

og.inheritance.extend(og.node.Axes, og.node.RenderNode);

og.node.Axes.prototype.initialization = function () {
    this.createAxisBuffer(this.size);
    this.drawMode = this.renderer.handler.gl.LINES;
};

og.node.Axes.prototype.frame = function () {

    this.renderer.handler.shaderPrograms.flat.activate();

    this.renderer.handler.shaderPrograms.flat.set({
        uPMVMatrix: this.renderer.activeCamera.pmvMatrix._m,
        aVertexPosition: this.axisBuffer,
        aVertexColor: this.axisColorBuffer
    });

    this.renderer.handler.shaderPrograms.flat.drawArray(this.drawMode, this.axisBuffer.numItems);
};

og.node.Axes.prototype.createAxisBuffer = function (gridSize) {

    var vertices = [
         0.0, 0.0, 0.0, gridSize - 1, 0.0, 0.0, // x - R
         0.0, 0.0, 0.0, 0.0, gridSize - 1, 0.0, // y - B  
         0.0, 0.0, 0.0, 0.0, 0.0, gridSize - 1  // z - G
    ];

    var colors = [
        1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0,   // x - R
        0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0,   // y - B
        0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0,   // z - G
    ];

    this.axisBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(vertices), 3, 6);
    this.axisColorBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(colors), 4, 6);
};