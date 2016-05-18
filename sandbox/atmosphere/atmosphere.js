goog.provide('Atmosphere');

goog.require('og.node.RenderNode');
goog.require('og.shape.Sphere');
goog.require('og.math');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');
goog.require('og.light.PointLight');
goog.require('og.shaderProgram.sphere');
goog.require('og.shaderProgram.atmosphereSpace');

Atmosphere = function () {
    og.inheritance.base(this);

    this._radius = 100;
    this._latBands = 64;
    this._lonBands = 64;

    this._indexData = [];
    this._textureCoordData = [];
    this._normalData = [];
    this._positionData = [];

    this.texture = null;

    this._createData();
};

og.inheritance.extend(Atmosphere, og.node.RenderNode);

Atmosphere.prototype._createData = function () {

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
            this._normalData.push(x);
            this._normalData.push(y);
            this._normalData.push(z);
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

Atmosphere.prototype._createBuffers = function () {
    var r = this.renderer;
    this._positionBuffer = r.handler.createArrayBuffer(new Float32Array(this._positionData), 3, this._positionData.length / 3);
    this._normalBuffer = r.handler.createArrayBuffer(new Float32Array(this._normalData), 3, this._normalData.length / 3);
    this._indexBuffer = r.handler.createElementArrayBuffer(new Uint16Array(this._indexData), 1, this._indexData.length);
    this._textureCoordBuffer = r.handler.createArrayBuffer(new Float32Array(this._textureCoordData), 2, this._textureCoordData.length / 2);
}

Atmosphere.prototype.initialization = function () {
    this.renderer.handler.addShaderProgram(og.shaderProgram.sphere());
    this.renderer.handler.addShaderProgram(og.shaderProgram.atmosphereSpace());

    l1 = new og.light.PointLight();
    l1._diffuse.set(1.0, 1.0, 1.0);
    l1._ambient.set(0.3, 0.3, 0.4);
    l1._position.z = 5000;
    l1.addTo(this);

    this.color = [1, 1, 1, 1];
    this.lightEnabled = true;

    var that = this;
    var img = new Image();
    img.onload = function () {
        that.texture = that.renderer.handler.createTexture_mm(this);
    };
    img.src = "bm.png";

    this._createBuffers();

    //================================================
    var vertices = [
      -1.0, -1.0,
       1.0, -1.0,
      -1.0, 1.0,
      -1.0, 1.0,
       1.0, -1.0,
       1.0, 1.0];

    this._verticesBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(vertices), 2, vertices.length / 2);
};

Atmosphere.prototype.frame = function () {
    //var rn = this;
    //var r = rn.renderer;

    //var sh, p,
    //    gl = r.handler.gl;

    //sh = r.handler.shaderPrograms.sphere;
    //p = sh._program;
    //sha = p.attributes,
    //shu = p.uniforms;

    //sh.activate();

    //this.transformLights();

    //gl.uniform3fv(shu.pointLightsPositions._pName, rn._pointLightsTransformedPositions);
    //gl.uniform3fv(shu.pointLightsParamsv._pName, rn._pointLightsParamsv);
    //gl.uniform1fv(shu.pointLightsParamsf._pName, rn._pointLightsParamsf);
    //gl.uniformMatrix4fv(shu.uPMatrix._pName, false, r.activeCamera._pMatrix._m);
    //gl.uniformMatrix4fv(shu.uMVMatrix._pName, false, r.activeCamera._mvMatrix._m);
    //gl.uniformMatrix3fv(shu.uNMatrix._pName, false, r.activeCamera._nMatrix._m);

    //gl.bindBuffer(gl.ARRAY_BUFFER, this._normalBuffer);
    //gl.vertexAttribPointer(sha.aVertexNormal._pName, this._normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //gl.uniform4fv(shu.uColor._pName, this.color);

    //gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
    //gl.vertexAttribPointer(sha.aVertexPosition._pName, this._positionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //gl.activeTexture(gl.TEXTURE0);
    //gl.bindTexture(gl.TEXTURE_2D, this.texture);
    //gl.uniform1i(shu.uSampler._pName, 0);

    //gl.bindBuffer(gl.ARRAY_BUFFER, this._textureCoordBuffer);
    //gl.vertexAttribPointer(sha.aTextureCoord._pName, this._textureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    //gl.drawElements(r.handler.gl.TRIANGLES, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    var rn = this;
    var r = rn.renderer;

    var sh, p,
        gl = r.handler.gl;

    sh = r.handler.shaderPrograms.atmosphereSpace;
    p = sh._program;
    sha = p.attributes,
    shu = p.uniforms;

    sh.activate();

    gl.uniform3fv(shu.iResolution._pName, [r.handler.canvas.width, r.handler.canvas.height, 0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._verticesBuffer);
    gl.vertexAttribPointer(sha.a_position._pName, this._verticesBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, this._verticesBuffer.numItems);
};