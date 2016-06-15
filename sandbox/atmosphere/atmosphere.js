goog.provide('Atmosphere');

goog.require('og.node.RenderNode');
goog.require('og.shape.Sphere');
goog.require('og.math');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');
goog.require('og.light.PointLight');
goog.require('og.shaderProgram.sphere');
goog.require('og.shaderProgram.atmosphereSpace');
goog.require('og.shape.Icosphere');

Atmosphere = function () {
    og.inheritance.base(this);

    this.atmosphere = {
        Kr: 0.001,
        Km: 0.0015,
        ESun: 15.0,
        g: -0.6,
        innerRadius: 100.0,
        outerRadius: 105.0,
        wavelength: [0.650, 0.570, 0.475],
        scaleDepth: 0.25
    };

    this._latBands = 100;
    this._lonBands = 100;

    this._innerIndexData = [];
    this._outerIndexData = [];
    this._textureCoordData = [];
    this._normalData = [];
    this._outerPositionData = [];
    this._innerPositionData = [];

    this.texture = null;

    this._createData();
};

og.inheritance.extend(Atmosphere, og.node.RenderNode);


Atmosphere.prototype._createData = function () {

    //Earth
    for (var latNumber = 0; latNumber <= this._latBands; latNumber++) {
        var theta = latNumber * Math.PI / this._latBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber = 0; longNumber <= this._lonBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / this._lonBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);
            var x = cosPhi * sinTheta;
            var y = cosTheta * 0.996647189328169;
            var z = sinPhi * sinTheta;
            var u = 1 - (longNumber / this._lonBands);
            var v = latNumber / this._latBands;
            this._normalData.push(x);
            this._normalData.push(y);
            this._normalData.push(z);
            this._textureCoordData.push(u);
            this._textureCoordData.push(v);
            this._innerPositionData.push(this.atmosphere.innerRadius * x);
            this._innerPositionData.push(this.atmosphere.innerRadius * y);
            this._innerPositionData.push(this.atmosphere.innerRadius * z);
        }
    }

    for (var latNumber = 0; latNumber < this._latBands; latNumber++) {
        for (var longNumber = 0; longNumber < this._lonBands; longNumber++) {
            var first = (latNumber * (this._lonBands + 1)) + longNumber;
            var second = first + this._lonBands + 1;

            this._innerIndexData.push(first);
            this._innerIndexData.push(first + 1);
            this._innerIndexData.push(second);

            this._innerIndexData.push(second);
            this._innerIndexData.push(first + 1);
            this._innerIndexData.push(second + 1);
        }
    }


    //Atmosphere
    for (var latNumber = 0; latNumber <= this._latBands; latNumber++) {
        var theta = latNumber * Math.PI / this._latBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber = 0; longNumber <= this._lonBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / this._lonBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);
            var x = cosPhi * sinTheta;
            var y = cosTheta * 0.996647189328169;
            var z = sinPhi * sinTheta;
            this._outerPositionData.push(this.atmosphere.outerRadius * x);
            this._outerPositionData.push(this.atmosphere.outerRadius * y);
            this._outerPositionData.push(this.atmosphere.outerRadius * z);
        }
    }

    for (var latNumber = 0; latNumber < this._latBands; latNumber++) {
        for (var longNumber = 0; longNumber < this._lonBands; longNumber++) {
            var first = (latNumber * (this._lonBands + 1)) + longNumber;
            var second = first + this._lonBands + 1;

            this._outerIndexData.push(first);
            this._outerIndexData.push(first + 1);
            this._outerIndexData.push(second);

            this._outerIndexData.push(second);
            this._outerIndexData.push(first + 1);
            this._outerIndexData.push(second + 1);
        }
    }

    var is = new og.shape.Icosphere({ level: 5, size: 105 });
    this._outerPositionData = is._positionData;
    this._outerIndexData = is._indexData;
};

Atmosphere.prototype._createBuffers = function () {
    var r = this.renderer;
    this._innerPositionBuffer = r.handler.createArrayBuffer(new Float32Array(this._innerPositionData), 3, this._innerPositionData.length / 3);
    this._outerPositionBuffer = r.handler.createArrayBuffer(new Float32Array(this._outerPositionData), 3, this._outerPositionData.length / 3);
    this._normalBuffer = r.handler.createArrayBuffer(new Float32Array(this._normalData), 3, this._normalData.length / 3);
    this._innerIndexBuffer = r.handler.createElementArrayBuffer(new Uint16Array(this._innerIndexData), 1, this._innerIndexData.length);
    this._outerIndexBuffer = r.handler.createElementArrayBuffer(new Uint16Array(this._outerIndexData), 1, this._outerIndexData.length);
    this._textureCoordBuffer = r.handler.createArrayBuffer(new Float32Array(this._textureCoordData), 2, this._textureCoordData.length / 2);
}

Atmosphere.prototype.initialization = function () {
    this.renderer.handler.addShaderProgram(og.shaderProgram.sphere());
    this.renderer.handler.addShaderProgram(og.shaderProgram.atmosphereSpace());

    l1 = new og.light.PointLight();
    l1._diffuse.set(1.0, 1.0, 1.0);
    l1._ambient.set(0.5, 0.5, 0.5);
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
};
Atmosphere.prototype.frame = function () {
    this.drawSky();
    this.drawGround();
};

Atmosphere.prototype.drawSky = function () {
    var rn = this;
    var r = rn.renderer;

    var eye = r.activeCamera.eye;

    var sh, p,
        gl = r.handler.gl;

    sh = r.handler.shaderPrograms.atmosphereSpace;
    p = sh._program;
    sha = p.attributes,
    shu = p.uniforms;

    sh.activate();

    gl.cullFace(gl.FRONT);

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.uniformMatrix4fv(shu.projectionMatrix._pName, false, r.activeCamera._projectionMatrix._m);
    gl.uniformMatrix4fv(shu.modelViewMatrix._pName, false, r.activeCamera._modelViewMatrix._m);

    var eye = r.activeCamera.eye;
    gl.uniform3fv(shu.cameraPosition._pName, eye.toVec());
    gl.uniform3fv(shu.v3LightPosition._pName, l1._position.normal().toVec());
    gl.uniform3fv(shu.v3LightPos._pName, l1._position.normal().toVec());
    gl.uniform3fv(shu.v3InvWavelength._pName, og.math.vector3(1 / Math.pow(this.atmosphere.wavelength[0], 4), 1 / Math.pow(this.atmosphere.wavelength[1], 4), 1 / Math.pow(this.atmosphere.wavelength[2], 4)).toVec());
    gl.uniform1f(shu.g._pName, this.atmosphere.g);
    gl.uniform1f(shu.g2._pName, this.atmosphere.g * this.atmosphere.g);
    gl.uniform1f(shu.fCameraHeight2._pName, eye.length2());
    gl.uniform1f(shu.fInnerRadius._pName, this.atmosphere.innerRadius);
    gl.uniform1f(shu.fOuterRadius._pName, this.atmosphere.outerRadius);
    gl.uniform1f(shu.fOuterRadius2._pName, this.atmosphere.outerRadius * this.atmosphere.outerRadius);
    gl.uniform1f(shu.fKrESun._pName, this.atmosphere.Kr * this.atmosphere.ESun);
    gl.uniform1f(shu.fKmESun._pName, this.atmosphere.Km * this.atmosphere.ESun);
    gl.uniform1f(shu.fKr4PI._pName, this.atmosphere.Kr * 4.0 * Math.PI);
    gl.uniform1f(shu.fKm4PI._pName, this.atmosphere.Km * 4.0 * Math.PI);
    gl.uniform1f(shu.fScale._pName, 1 / (this.atmosphere.outerRadius - this.atmosphere.innerRadius));
    gl.uniform1f(shu.fScaleDepth._pName, this.atmosphere.scaleDepth);
    gl.uniform1f(shu.fScaleOverScaleDepth._pName, 1 / (this.atmosphere.outerRadius - this.atmosphere.innerRadius) / this.atmosphere.scaleDepth);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._outerPositionBuffer);
    gl.vertexAttribPointer(sha.position._pName, this._outerPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._outerIndexBuffer);
    gl.drawElements(r.handler.gl.TRIANGLES, this._outerIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    gl.cullFace(gl.BACK);
    gl.disable(gl.BLEND);
};


Atmosphere.prototype.drawGround = function () {
    var rn = this;
    var r = rn.renderer;

    var sh, p,
        gl = r.handler.gl;

    sh = r.handler.shaderPrograms.sphere;
    p = sh._program;
    sha = p.attributes,
    shu = p.uniforms;

    sh.activate();

    this.transformLights();


    gl.uniformMatrix4fv(shu.projectionMatrix._pName, false, r.activeCamera._projectionMatrix._m);
    gl.uniformMatrix4fv(shu.modelViewMatrix._pName, false, r.activeCamera._modelViewMatrix._m);
    gl.uniformMatrix3fv(shu.normalMatrix._pName, false, r.activeCamera._normalMatrix._m);

    var eye = r.activeCamera.eye;
    gl.uniform3fv(shu.cameraPosition._pName, eye.toVec());
    gl.uniform3fv(shu.v3LightPosition._pName, l1._position.normal().toVec());
    gl.uniform3fv(shu.v3InvWavelength._pName, og.math.vector3(1 / Math.pow(this.atmosphere.wavelength[0], 4), 1 / Math.pow(this.atmosphere.wavelength[1], 4), 1 / Math.pow(this.atmosphere.wavelength[2], 4)).toVec());
    gl.uniform1f(shu.fCameraHeight2._pName, eye.length2());
    gl.uniform1f(shu.fInnerRadius._pName, this.atmosphere.innerRadius);
    gl.uniform1f(shu.fOuterRadius._pName, this.atmosphere.outerRadius);
    gl.uniform1f(shu.fOuterRadius2._pName, this.atmosphere.outerRadius * this.atmosphere.outerRadius);
    gl.uniform1f(shu.fKrESun._pName, this.atmosphere.Kr * this.atmosphere.ESun);
    gl.uniform1f(shu.fKmESun._pName, this.atmosphere.Km * this.atmosphere.ESun);
    gl.uniform1f(shu.fKr4PI._pName, this.atmosphere.Kr * 4.0 * Math.PI);
    gl.uniform1f(shu.fKm4PI._pName, this.atmosphere.Km * 4.0 * Math.PI);
    gl.uniform1f(shu.fScale._pName, 1 / (this.atmosphere.outerRadius - this.atmosphere.innerRadius));
    gl.uniform1f(shu.fScaleDepth._pName, this.atmosphere.scaleDepth);
    gl.uniform1f(shu.fScaleOverScaleDepth._pName, 1 / (this.atmosphere.outerRadius - this.atmosphere.innerRadius) / this.atmosphere.scaleDepth);

    gl.uniform3fv(shu.pointLightsPositions._pName, rn._pointLightsTransformedPositions);
    gl.uniform3fv(shu.pointLightsParamsv._pName, rn._pointLightsParamsv);
    gl.uniform1fv(shu.pointLightsParamsf._pName, rn._pointLightsParamsf);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._normalBuffer);
    gl.vertexAttribPointer(sha.normal._pName, this._normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._innerPositionBuffer);
    gl.vertexAttribPointer(sha.position._pName, this._innerPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(shu.uSampler._pName, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._textureCoordBuffer);
    gl.vertexAttribPointer(sha.uv._pName, this._textureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._innerIndexBuffer);
    gl.drawElements(r.handler.gl.TRIANGLES, this._innerIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
};