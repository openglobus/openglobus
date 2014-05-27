goog.provide('my.Sphere');

goog.require('og.node.RenderNode');
goog.require('og.math');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');

my.Sphere = function (name, radius, latBands, lonBands) {
    og.inheritance.base(this, name);
    this._radius = radius;
    this._latBands = latBands;
    this._lonBands = lonBands;

    this.vertexPositionBuffer;
    this.vertexNormalBuffer;
    this.vertexTextureCoordBuffer;
    this.vertexIndexBuffer;

    this.texture = null;
};

og.inheritance.extend(my.Sphere, og.node.RenderNode);

my.Sphere.prototype.initialization = function () {
    this.createBuffers();
    this.drawMode = this.renderer.handler.gl.LINES;
};

my.Sphere.prototype.createBuffers = function () {

    var vertexPositionData = [];
    var normalData = [];
    var textureCoordData = [];

    for (var latNumber = 0; latNumber <= this._latBands; latNumber++) {
        var theta = latNumber * Math.PI / this._latBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber = 0; longNumber <= this._lonBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / this._lonBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);
            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            var u = 1 - (longNumber / this._lonBands);
            var v = latNumber / this._latBands;
            normalData.push(x);
            normalData.push(y);
            normalData.push(z);
            textureCoordData.push(u);
            textureCoordData.push(v);
            vertexPositionData.push(this._radius * x);
            vertexPositionData.push(this._radius * y);
            vertexPositionData.push(this._radius * z);
        }
    }

    var indexData = [];
    for (var latNumber = 0; latNumber < this._latBands; latNumber++) {
        for (var longNumber = 0; longNumber < this._lonBands; longNumber++) {
            var first = (latNumber * (this._lonBands + 1)) + longNumber;
            var second = first + this._lonBands + 1;
            indexData.push(first);
            indexData.push(second);
            indexData.push(first + 1);
            indexData.push(second);
            indexData.push(second + 1);
            indexData.push(first + 1);
        }
    }

    this.vertexNormalBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(normalData), 3, normalData.length / 3);
    //this.vertexTextureCoordBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(textureCoordData), 2, textureCoordData.length / 2);
    this.vertexPositionBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(vertexPositionData), 3, vertexPositionData.length / 3);
    this.vertexIndexBuffer = this.renderer.handler.createElementArrayBuffer(new Uint16Array(indexData), 1, indexData.length);
};

my.Sphere.prototype.frame = function () {

    var sh = this.renderer.handler.shaderPrograms.sphere;

    sh.activate();

    var p = sh._program;
    var gl = this.renderer.handler.gl;

    var sha = p.attributes,
        shu = p.uniforms;

    gl.uniformMatrix4fv(shu.uPMVMatrix._pName, false, this.renderer.activeCamera.pmvMatrix._m)

    //gl.activeTexture(gl.TEXTURE0);
    //gl.bindTexture(gl.TEXTURE_2D, this.texture);
    //gl.uniform1i(shu.uSampler._pName, 0);

    gl.uniform4fv(shu.uColor._pName, [0.5, 1.0, 1.0, 1.0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
    gl.vertexAttribPointer(sha.aVertexNormal._pName, this.vertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
    gl.vertexAttribPointer(sha.aVertexPosition._pName, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
    //gl.vertexAttribPointer(sha.aTextureCoord._pName, this.vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
    gl.drawElements(this.drawMode, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
};