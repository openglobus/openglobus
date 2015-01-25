goog.provide('og.node.SkySphere');

goog.require('og.inheritance');
goog.require('og.node.RenderNode');
goog.require('og.shaderProgram.skysphere');

og.node.SkySphere = function (textureFilename, lonBands, latBands) {
    og.inheritance.base(this, "skysphere");

    this._lonBands = lonBands || 8;
    this._latBands = latBands || 8;
    this._textureFilename = textureFilename;
    this._radius = 10000000;

    this._positionBuffer = null;
    this._textureCoordBuffer = null;
    this._indexBuffer = null;
    this._texture = null;
    this._textureCoordData = [];
    this._positionData = [];
    this._indexData = [];
};

og.inheritance.extend(og.node.SkySphere, og.node.RenderNode);

og.node.SkySphere.prototype.initialization = function () {
    this.renderer.handler.addShaderProgram(og.shaderProgram.skysphere());
    this.drawMode = this.renderer.handler.gl.TRIANGLES;
    this._loadTexture();
    this._createCoordinates();
    this._createBuffers();
};

og.node.SkySphere.prototype._createBuffers = function () {
    var h = this.renderer.handler;
    this._positionBuffer = h.createArrayBuffer(new Float32Array(this._positionData), 3, this._positionData.length / 3);
    this._indexBuffer = h.createElementArrayBuffer(new Uint16Array(this._indexData), 1, this._indexData.length);
    this._textureCoordBuffer = h.createArrayBuffer(new Float32Array(this._textureCoordData), 2, this._textureCoordData.length / 2);
};

og.node.SkySphere.prototype._loadTexture = function () {
    var that = this;
    var img = new Image();
    img.onload = function () {
        that._texture = that.renderer.handler.createTexture_n(this);
    };
    img.src = this._textureFilename;
};

og.node.SkySphere.prototype._createCoordinates = function () {

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
            this._textureCoordData.push(u);
            this._textureCoordData.push(v);
            this._positionData.push(this._radius * x);
            this._positionData.push(this._radius * y);
            this._positionData.push(this._radius * z);
        }
    }

    for (var latNumber = 0; latNumber < this._latBands; latNumber++) {
        for (var longNumber = 0; longNumber < this._lonBands; longNumber++) {
            var first = (latNumber * (this._lonBands + 1)) + longNumber;
            var second = first + this._lonBands + 1;

            this._indexData.push(first);
            this._indexData.push(first + 1);
            this._indexData.push(second);

            this._indexData.push(second);
            this._indexData.push(first + 1);
            this._indexData.push(second + 1);
        }
    }
};

og.node.SkySphere.prototype.frame = function () {

    var r = this.renderer;

    var sh = r.handler.shaderPrograms.skysphere;
    var p = sh._program;
    var gl = r.handler.gl,
        sha = p.attributes,
        shu = p.uniforms;

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    sh.activate();

    gl.uniformMatrix4fv(shu.uPMVMatrix._pName, false, r.activeCamera.pmvMatrix._m);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
    gl.vertexAttribPointer(sha.aVertexPosition._pName, this._positionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.uniform3fv(shu.eye._pName, r.activeCamera.eye.toVec());

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.uniform1i(shu.uSampler._pName, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._textureCoordBuffer);
    gl.vertexAttribPointer(sha.aTextureCoord._pName, this._textureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    gl.drawElements(this.drawMode, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
};
