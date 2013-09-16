var AxisNode = function (size) {
    AxisNode.superclass.constructor.call(this, "AXIS");
    this.size = size;
    this.axisBuffer;
    this.axisColorBuffer;
}

extend(AxisNode, Node3D);

AxisNode.prototype.initialization = function () {
    this.createAxisBuffer(this.size);
}

AxisNode.prototype.frame = function () {
    this.ctx.drawLinesBuffer(this.axisBuffer, this.axisColorBuffer);
    //this.ctx.gl.enable(this.ctx.gl.DEPTH_TEST);
}

AxisNode.prototype.createAxisBuffer = function (gridSize) {

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

    this.axisBuffer = this.ctx.createArrayBuffer(new Float32Array(vertices), 3, 6);
    this.axisColorBuffer = this.ctx.createArrayBuffer(new Float32Array(colors), 4, 6);
}