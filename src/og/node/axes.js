goog.provide('og.node.Axes');

goog.require('og.node.Node3D');

og.node.Axes = function (size) {
    og.node.Axes.superclass.constructor.call(this, "Axes");
    this.size = size;
    this.axesBuffer;
    this.axesColorBuffer;
};

og._class_.extend(og.node.Axes, og.node.Node3D);

og.node.Axes.prototype.initialization = function () {
    this.createAxisBuffer(this.size);
    this.drawMode = this.renderer.ctx.gl.LINES;
};

og.node.Axes.prototype.frame = function () {

    this.renderer.ctx.shaderPrograms.flat.activate();

    this.renderer.ctx.shaderPrograms.flat.set({
        uPMVMatrix: this.renderer.activeCamera.pmvMatrix._m,
        aVertexPosition: this.axisBuffer,
        aVertexColor: this.axisColorBuffer
    });

    this.renderer.ctx.shaderPrograms.flat.drawArray(this.drawMode, this.axisBuffer.numItems);
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

    this.axisBuffer = this.renderer.ctx.createArrayBuffer(new Float32Array(vertices), 3, 6);
    this.axisColorBuffer = this.renderer.ctx.createArrayBuffer(new Float32Array(colors), 4, 6);
};