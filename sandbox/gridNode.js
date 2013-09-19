var GridNode = function (gridSize, squareSize) {
    GridNode.superclass.constructor.call(this, "GRID");
    this.gridSize = gridSize;
    this.squareSize = squareSize;
    this.gridBuffer;
    this.gridColorBuffer;
}

extend(GridNode, Node3D);

GridNode.prototype.initialization = function () {
    this.createGridBuffer(this.gridSize);
}

GridNode.prototype.frame = function () {
    this.ctx.drawLinesBuffer(this.gridBuffer, this.gridColorBuffer);
    //this.ctx.gl.disable(this.ctx.gl.DEPTH_TEST);
}

GridNode.prototype.createGridBuffer = function (gridSize) {

    var vertices = [];
    var colors = [];
    for (var i = -gridSize; i < gridSize; i++) {
        vertices.push(-gridSize * this.squareSize, 0.0, i * this.squareSize, (gridSize - 1)*this.squareSize, 0.0, i * this.squareSize);
        vertices.push(i * this.squareSize, 0.0, -gridSize * this.squareSize, i * this.squareSize, 0.0, (gridSize - 1) * this.squareSize);
        colors.push(0.78, 0.78, 0.78, 1.0, 0.78, 0.78, 0.78, 1.0);
        colors.push(0.78, 0.78, 0.78, 1.0, 0.78, 0.78, 0.78, 1.0);
    }

    this.gridBuffer = this.ctx.createArrayBuffer(new Float32Array(vertices), 3, 24/*gridSize * 4 * 2*/);
    this.gridColorBuffer = this.ctx.createArrayBuffer(new Float32Array(colors), 4, 24/*gridSize * 4 * 2*/);
}