goog.provide('og.scene.PlanetAtmosphere');

goog.require('og.shape.Icosphere');
goog.require('og.shaderProgram.atmosphereSpace');
//goog.require('og.shaderProgram.overlays_nl');
//goog.require('og.shaderProgram.overlaysAtmosphere_wl');
//goog.require('og.shaderProgram.single_nl');
//goog.require('og.shaderProgram.singleAtmosphere_wl');
goog.require('og.inheritance');

og.scene.PlanetAtmosphere = function(name, ellipsoid){
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
};

og.inheritance.extend(og.scene.PlanetAtmosphere, og.scene.Planet);

og.scene.PlanetAtmosphere.prototype._initializeShaders = function () {
    this.renderer.handler.addShaderProgram(og.shaderProgram.single_nl(), true);
    this.renderer.handler.addShaderProgram(og.shaderProgram.singleAtmosphere_wl(), true);
    this.renderer.handler.addShaderProgram(og.shaderProgram.overlays_nl(), true);
    //this.renderer.handler.addShaderProgram(og.shaderProgram.overlaysAtmosphere_wl(), true);
    this.renderer.handler.addShaderProgram(og.shaderProgram.heightPicking(), true);
    this.renderer.handler.addShaderProgram(og.shaderProgram.atmosphereSpace(), true);
};

og.scene.PlanetAtmosphere.prototype.initialization = function () {

    this.constructor.superclass.initialization.call(this);

    //creates atmosphere around the earth geometry
    var icosphere = new og.shape.Icosphere({ level: 5, size: this.atmosphereSpaceParams.outerRadius });
    this._atmospherePositionBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(icosphere._positionData), 3, icosphere._positionData.length / 3);
    this._atmosphereIndexBuffer = this.renderer.handler.createElementArrayBuffer(new Uint16Array(icosphere._indexData), 1, icosphere._indexData.length);
};


/**
 * @virtual
 */
og.scene.PlanetAtmosphere.prototype._rendering = function () {
    this._renderNodesPASS();
    this._renderHeightBackbufferPASS();
    this._renderVectorLayersPASS();
    this._renderAtmosphere();
};

/**
 * @virtual
 */
og.scene.PlanetAtmosphere.prototype._drawOverlays = function () {
    var sh;
    var renderer = this.renderer;
    var h = renderer.handler;
    var gl = h.gl;

    var layers = this.visibleTileLayers;

    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    if (this.lightEnabled) {
        h.shaderPrograms.overlaysAtmosphere_wl.activate();
        sh = h.shaderPrograms.overlaysAtmosphere_wl._program,
        shu = sh.uniforms;

        gl.uniform4fv(shu.lightsPositions._pName, this._lightsTransformedPositions);
        gl.uniform3fv(shu.lightsParamsv._pName, this._lightsParamsv);
        gl.uniform1fv(shu.lightsParamsf._pName, this._lightsParamsf);

        gl.uniformMatrix3fv(shu.normalMatrix._pName, false, renderer.activeCamera._normalMatrix._m);
        gl.uniformMatrix4fv(shu.viewMatrix._pName, false, renderer.activeCamera._viewMatrix._m);
        gl.uniformMatrix4fv(shu.projectionMatrix._pName, false, renderer.activeCamera._projectionMatrix._m);

        //bind ground atmosphere
        var a = this.atmosphereGroundParams;
        var eye = renderer.activeCamera.eye;
        gl.uniform3fv(shu.cameraPosition._pName, [eye.x, eye.y, eye.z]);
        gl.uniform1f(shu.fCameraHeight2._pName, eye.length2());
        gl.uniform3fv(shu.v3LightPosition._pName, this._sunControl.sunlight._position.normal().toVec());
        gl.uniform3fv(shu.v3InvWavelength._pName, a.v3InvWavelength);
        gl.uniform1f(shu.fInnerRadius._pName, a.innerRadius);
        gl.uniform1f(shu.fOuterRadius._pName, a.outerRadius);
        gl.uniform1f(shu.fOuterRadius2._pName, a.fOuterRadius2);
        gl.uniform1f(shu.fKrESun._pName, a.fKrESun);
        gl.uniform1f(shu.fKmESun._pName, a.fKmESun);
        gl.uniform1f(shu.fKr4PI._pName, a.fKr4PI);
        gl.uniform1f(shu.fKm4PI._pName, a.fKm4PI);
        gl.uniform1f(shu.fScale._pName, a.fScale);
        gl.uniform1f(shu.fScaleDepth._pName, a.fScaleDepth);
        gl.uniform1f(shu.fScaleOverScaleDepth._pName, a.fScaleOverScaleDepth);

        //bind night glowing material
        gl.activeTexture(gl.TEXTURE0 + layers.length + 2);
        gl.bindTexture(gl.TEXTURE_2D, this._nightTexture || this.transparentTexture);
        gl.uniform1i(shu.uNightImage._pName, layers.length + 2);

        //bind specular material
        gl.activeTexture(gl.TEXTURE0 + layers.length + 3);
        gl.bindTexture(gl.TEXTURE_2D, this._specularTexture || this.transparentTexture);
        gl.uniform1i(shu.uSpecularImage._pName, layers.length + 3);

    } else {
        h.shaderPrograms.overlays_nl.activate();
        sh = h.shaderPrograms.overlays_nl._program;
        gl.uniformMatrix4fv(sh.uniforms.projectionViewMatrix._pName, false, renderer.activeCamera._projectionViewMatrix._m);
    }

    var i = layers.length;
    while (i--) {
        var ll = layers[i];
        var nt4 = i * 4;
        this._tcolorArr[nt4] = ll.transparentColor[0];
        this._tcolorArr[nt4 + 1] = ll.transparentColor[1];
        this._tcolorArr[nt4 + 2] = ll.transparentColor[2];
        this._tcolorArr[nt4 + 3] = ll.opacity;
    }

    gl.uniform1i(sh.uniforms.numTex._pName, layers.length);
    gl.uniform4fv(sh.uniforms.tcolorArr._pName, this._tcolorArr);

    //draw planet's nodes
    var i = this._renderedNodes.length;
    while (i--) {
        og.planetSegment.drawOverlays(sh, this._renderedNodes[i].planetSegment);
    }

    gl.disable(gl.BLEND);
};

/**
 * @virtual
 */
og.scene.PlanetAtmosphere.prototype._drawSingle = function () {
    var sh;
    var renderer = this.renderer;
    var h = renderer.handler;
    var gl = h.gl;

    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    if (this.lightEnabled) {
        h.shaderPrograms.singleAtmosphere_wl.activate();
        sh = h.shaderPrograms.singleAtmosphere_wl._program,
        shu = sh.uniforms;

        gl.uniform4fv(shu.lightsPositions._pName, this._lightsTransformedPositions);
        gl.uniform3fv(shu.lightsParamsv._pName, this._lightsParamsv);
        gl.uniform1fv(shu.lightsParamsf._pName, this._lightsParamsf);

        gl.uniformMatrix3fv(shu.normalMatrix._pName, false, renderer.activeCamera._normalMatrix._m);
        gl.uniformMatrix4fv(shu.viewMatrix._pName, false, renderer.activeCamera._viewMatrix._m);
        gl.uniformMatrix4fv(shu.projectionMatrix._pName, false, renderer.activeCamera._projectionMatrix._m);

        //bind ground atmosphere
        var a = this.atmosphereGroundParams;
        var eye = renderer.activeCamera.eye;
        gl.uniform3fv(shu.cameraPosition._pName, [eye.x, eye.y, eye.z]);
        gl.uniform1f(shu.fCameraHeight2._pName, eye.length2());
        gl.uniform3fv(shu.v3LightPosition._pName, this._sunControl.sunlight._position.normal().toVec());
        gl.uniform3fv(shu.v3InvWavelength._pName, a.v3InvWavelength);
        gl.uniform1f(shu.fInnerRadius._pName, a.innerRadius);
        gl.uniform1f(shu.fOuterRadius._pName, a.outerRadius);
        gl.uniform1f(shu.fOuterRadius2._pName, a.fOuterRadius2);
        gl.uniform1f(shu.fKrESun._pName, a.fKrESun);
        gl.uniform1f(shu.fKmESun._pName, a.fKmESun);
        gl.uniform1f(shu.fKr4PI._pName, a.fKr4PI);
        gl.uniform1f(shu.fKm4PI._pName, a.fKm4PI);
        gl.uniform1f(shu.fScale._pName, a.fScale);
        gl.uniform1f(shu.fScaleDepth._pName, a.fScaleDepth);
        gl.uniform1f(shu.fScaleOverScaleDepth._pName, a.fScaleOverScaleDepth);

        //bind night and specular materials
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this._nightTexture || this.transparentTexture);
        gl.uniform1i(shu.uNightImage._pName, 3);

        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, this._specularTexture || this.transparentTexture);
        gl.uniform1i(shu.uSpecularImage._pName, 4);
    } else {
        h.shaderPrograms.single_nl.activate();
        sh = h.shaderPrograms.single_nl._program;
        gl.uniformMatrix4fv(sh.uniforms.projectionViewMatrix._pName, false, renderer.activeCamera._projectionViewMatrix._m);
    }

    //draw planet's nodes
    var i = this._renderedNodes.length;
    while (i--) {
        og.planetSegment.drawSingle(sh, this._renderedNodes[i].planetSegment);
    }

    gl.disable(gl.BLEND);
};

og.scene.PlanetAtmosphere.prototype._renderAtmosphere = function () {
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