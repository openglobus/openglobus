goog.provide('og.node.PlanetAtmosphere');

goog.require('og.shape.Icosphere');
goog.require('og.shaderProgram.atmosphereSpace');
goog.require('og.shaderProgram.overlaysAtmosphere_wl');
goog.require('og.shaderProgram.overlaysAtmosphere_nl');
goog.require('og.shaderProgram.singleAtmosphere_nl');
goog.require('og.shaderProgram.singleAtmosphere_wl');
goog.require('og.inheritance');

og.node.PlanetAtmosphere = function(name, ellipsoid){
    og.inheritance.base(this, name, ellipsoid);

    this.atmosphereSpaceParams = {
        Kr: 0.0025,
        Km: 0.00025,
        ESun: 4.0,
        g: -0.75,
        innerRadius: this.ellipsoid._a - 30000,
        outerRadius: this.ellipsoid._a + 118000,
        wavelength: [0.65, 0.57, 0.475],
        scaleDepth: 0.29,
        v3InvWavelength: 0,
        g2: 0,
        fOuterRadius2: 0,
        fKrESun: 0,
        fKmESun: 0,
        fKr4PI: 0,
        fKm4PI: 0,
        fScale: 0,
        fScaleDepth: 0,
        fScaleOverScaleDepth: 0
    };

    this.atmosphereGroundParams = {
        Kr: 0.0025,
        Km: 0.00025,
        ESun: 17.0,
        g: -0.75,
        innerRadius: this.ellipsoid._a,
        outerRadius: this.ellipsoid._a + 118000,
        wavelength: [0.65, 0.57, 0.475],
        scaleDepth: 0.29,
        v3InvWavelength: 0,
        g2: 0,
        fOuterRadius2: 0,
        fKrESun: 0,
        fKmESun: 0,
        fKr4PI: 0,
        fKm4PI: 0,
        fScale: 0,
        fScaleDepth: 0,
        fScaleOverScaleDepth: 0
    };

    var that = this;
    this.updateAtmosphereParams = function () {
        var a = that.atmosphereSpaceParams;
        a.v3InvWavelength = [1 / Math.pow(a.wavelength[0], 4), 1 / Math.pow(a.wavelength[1], 4), 1 / Math.pow(a.wavelength[2], 4)];
        a.fOuterRadius2 = a.outerRadius * a.outerRadius;
        a.fKrESun = a.Kr * a.ESun;
        a.fKmESun = a.Km * a.ESun;
        a.fKr4PI = a.Kr * 4.0 * Math.PI;
        a.fKm4PI = a.Km * 4.0 * Math.PI;
        a.fScale = 1 / (a.outerRadius - a.innerRadius);
        a.fScaleDepth = a.scaleDepth;
        a.fScaleOverScaleDepth = 1 / (a.outerRadius - a.innerRadius) / a.scaleDepth;
        a.g2 = a.g * a.g;

        a = that.atmosphereGroundParams;
        a.v3InvWavelength = [1 / Math.pow(a.wavelength[0], 4), 1 / Math.pow(a.wavelength[1], 4), 1 / Math.pow(a.wavelength[2], 4)];
        a.fOuterRadius2 = a.outerRadius * a.outerRadius;
        a.fKrESun = a.Kr * a.ESun;
        a.fKmESun = a.Km * a.ESun;
        a.fKr4PI = a.Kr * 4.0 * Math.PI;
        a.fKm4PI = a.Km * 4.0 * Math.PI;
        a.fScale = 1 / (a.outerRadius - a.innerRadius);
        a.fScaleDepth = a.scaleDepth;
        a.fScaleOverScaleDepth = 1 / (a.outerRadius - a.innerRadius) / a.scaleDepth;
        a.g2 = a.g * a.g;
    };

    this.updateAtmosphereParams();

    this._atmospherePositionBuffer = null;
    this._atmosphereIndexBuffer = null;

    //creates atmosphere around the earth geometry
    var icosphere = new og.shape.Icosphere({ level: 5, size: this.atmosphereSpaceParams.outerRadius });
    this._atmospherePositionBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(icosphere._positionData), 3, icosphere._positionData.length / 3);
    this._atmosphereIndexBuffer = this.renderer.handler.createElementArrayBuffer(new Uint16Array(icosphere._indexData), 1, icosphere._indexData.length);

};

og.inheritance.extend(og.node.PlanetAtmosphere, og.node.Planet);


og.node.PlanetAtmosphere.prototype._initializeShaders = function () {
    this.renderer.handler.addShaderProgram(og.shaderProgram.single_nl(), true);
    this.renderer.handler.addShaderProgram(og.shaderProgram.singleAtmosphere_wl(), true);
    this.renderer.handler.addShaderProgram(og.shaderProgram.overlays_nl(), true);
    this.renderer.handler.addShaderProgram(og.shaderProgram.overlaysAtmosphere_wl(), true);
    this.renderer.handler.addShaderProgram(og.shaderProgram.heightPicking(), true);
    this.renderer.handler.addShaderProgram(og.shaderProgram.atmosphereSpace(), true);
};


/**
 * @protected
 * @virtual
 */
og.node.PlanetAtmosphere.prototype._rendering = function () {
    this._renderNodesPASS();
    this._renderHeightBackbufferPASS();
    this._renderVectorLayersPASS();
    this._renderAtmosphere();
};


////bind ground atmosphere
//var a = this.atmosphereGroundParams;
//var eye = renderer.activeCamera.eye;
//gl.uniform3fv(shu.cameraPosition._pName, [eye.x, eye.y, eye.z]);
//gl.uniform1f(shu.fCameraHeight2._pName, eye.length2());
//gl.uniform3fv(shu.v3LightPosition._pName, this._sunControl.sunlight._position.normal().toVec());
//gl.uniform3fv(shu.v3InvWavelength._pName, a.v3InvWavelength);
//gl.uniform1f(shu.fInnerRadius._pName, a.innerRadius);
//gl.uniform1f(shu.fOuterRadius._pName, a.outerRadius);
//gl.uniform1f(shu.fOuterRadius2._pName, a.fOuterRadius2);
//gl.uniform1f(shu.fKrESun._pName, a.fKrESun);
//gl.uniform1f(shu.fKmESun._pName, a.fKmESun);
//gl.uniform1f(shu.fKr4PI._pName, a.fKr4PI);
//gl.uniform1f(shu.fKm4PI._pName, a.fKm4PI);
//gl.uniform1f(shu.fScale._pName, a.fScale);
//gl.uniform1f(shu.fScaleDepth._pName, a.fScaleDepth);
//gl.uniform1f(shu.fScaleOverScaleDepth._pName, a.fScaleOverScaleDepth);

og.node.PlanetAtmosphere.prototype._renderAtmosphere = function () {
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
    gl.uniformMatrix4fv(shu.viewMatrix._pName, false, r.activeCamera._viewMatrix._m);

    var eye = r.activeCamera.eye;
    var a = this.atmosphereSpaceParams;
    var n = this._sunControl.sunlight._position.normal().toVec();
    gl.uniform3fv(shu.cameraPosition._pName, [eye.x, eye.y, eye.z]);
    gl.uniform1f(shu.fCameraHeight2._pName, eye.length2());
    gl.uniform3fv(shu.v3LightPosition._pName, n);
    gl.uniform3fv(shu.v3LightPos._pName, n);
    gl.uniform3fv(shu.v3InvWavelength._pName, a.v3InvWavelength);
    gl.uniform1f(shu.g._pName, a.g);
    gl.uniform1f(shu.g2._pName, a.g2);
    gl.uniform1f(shu.fInnerRadius._pName, a.innerRadius);
    gl.uniform1f(shu.fOuterRadius._pName, a.outerRadius);
    gl.uniform1f(shu.fOuterRadius2._pName, a.fOuterRadius2);
    gl.uniform1f(shu.fKrESun._pName, a.fKrESun);
    gl.uniform1f(shu.fKmESun._pName, a.fKmESun);
    gl.uniform1f(shu.fKr4PI._pName, a.fKr4PI);
    gl.uniform1f(shu.fKm4PI._pName, a.fKm4PI);
    gl.uniform1f(shu.fScale._pName, a.fScale);
    gl.uniform1f(shu.fScaleDepth._pName, a.scaleDepth);
    gl.uniform1f(shu.fScaleOverScaleDepth._pName, a.fScaleOverScaleDepth);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._atmospherePositionBuffer);
    gl.vertexAttribPointer(sha.position._pName, this._atmospherePositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._atmosphereIndexBuffer);
    gl.drawElements(r.handler.gl.TRIANGLES, this._atmosphereIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    gl.cullFace(gl.BACK);
    gl.disable(gl.BLEND);
};