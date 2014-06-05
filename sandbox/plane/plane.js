goog.provide('my.Plane');

goog.require('og.node.RenderNode');
goog.require('og.inheritance');
goog.require('og.planetSegment.PlanetSegmentHelper');

my.Plane = function (name) {
    og.inheritance.base(this, name);
    this.vertexPositionBuffer = null;
    this.indexBuffer = null;
    this.size = 100;
};

og.inheritance.extend(my.Plane, og.node.RenderNode);

my.Plane.prototype.initialization = function () {
    this.createBuffers();
    this.drawMode = this.renderer.handler.gl.LINES;
};

my.Plane.prototype.createBuffers = function () {
    og.planetSegment.PlanetSegmentHelper.initIndexesTables(6);

    var vertices = [];

    var step = 1;
    var size = 64;

    for (var i = 0; i <= size; i++) {
        for (var j = 0; j <= size; j++) {
            var x = j * step,
                y = (size - 1) * step - i * step,
                z = 0;

            vertices.push(x * this.size, y * this.size, z);
        }
    }

    //var textureCoords = og.planetSegment.PlanetSegmentHelper.textureCoordsTable[size];
    var vertexIndices = og.planetSegment.PlanetSegmentHelper.createSegmentIndexes(size, [32, 16, 64, 1]);

    this.positionBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(vertices), 3, vertices.length / 3);
    //this.textureCoordBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(textureCoords), 2, textureCoords.length / 2);
    this.indexBuffer = this.renderer.handler.createElementArrayBuffer(vertexIndices, 1, vertexIndices.length);
};

my.Plane.prototype.frame = function () {
    this.renderer.handler.shaderPrograms.colorShader.activate();

    this.renderer.handler.shaderPrograms.colorShader.set({
        uPMVMatrix: this.renderer.activeCamera.pmvMatrix._m,
        vertices: this.positionBuffer,
        uColor: [1, 1, 1, 1]
    });

    this.renderer.handler.shaderPrograms.colorShader.drawIndexBuffer(this.drawMode, this.indexBuffer);

};