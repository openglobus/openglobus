goog.provide('og.layer.GeoTexture2d');

goog.require('og.layer.BaseGeoImage');
goog.require('og.inheritance');


og.layer.GeoTexture2d = function (name, options) {
    og.inheritance.base(this, name, options);

    this._sourceTexture = options.texture || null;

    if (options.texture) {
        this._sourceReady = true;
        this._sourceCreated = true;
    }

    this._frameWidth = options.frameWidth ? og.math.nextHighestPowerOfTwo(options.frameWidth) : 256;
    this._frameHeight = options.frameHeight ? og.math.nextHighestPowerOfTwo(options.frameHeight) : 256;

    this._animate = true;
};

og.inheritance.extend(og.layer.GeoTexture2d, og.layer.BaseGeoImage);

og.layer.GeoTexture2d.prototype.loadMaterial = function (material) {
    this._planet._geoImageCreator.add(this);
};

og.layer.GeoTexture2d.prototype._createSourceTexture = function () { };

og.layer.GeoTexture2d.prototype.bindTexture = function (texture) {
    this._sourceReady = true;
    this._sourceCreated = true;
    this._sourceTexture = texture;
};

og.layer.GeoTexture2d.prototype.setSize = function (width, height) {
    this._frameWidth = width;
    this._frameHeight = height;
    this._frameCreated = false;
};

og.layer.GeoTexture2d.prototype.abortMaterialLoading = function (material) {
    this._creationProceeding = false;
    material.isLoading = false;
    material.isReady = false;
};

og.layer.GeoTexture2d.prototype._renderingProjType1 = function () {
    var p = this._planet,
    h = p.renderer.handler,
    gl = h.gl,
    creator = p._geoImageCreator;

    var width = this._frameWidth,
        height = this._frameHeight;

    this._refreshFrame && this._createFrame();
    this._createSourceTexture();

    var f = creator._framebuffer;
    f.setSize(width, height);
    f.activate();

    h.shaderPrograms.geoImageTransform.activate();
    var sh = h.shaderPrograms.geoImageTransform._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    var tr = this.transparentColor[0],
        tg = this.transparentColor[1],
        tb = this.transparentColor[2];

    gl.disable(gl.CULL_FACE);

    f.bindOutputTexture(this._materialTexture);
    gl.clearColor(tr, tg, tb, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, creator._texCoordsBuffer);
    gl.vertexAttribPointer(sha.texCoords._pName, creator._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBufferMerc);
    gl.vertexAttribPointer(sha.corners._pName, this._gridBufferMerc.itemSize, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(shu.extentParams._pName, this._extentMercParams);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
    gl.uniform1i(shu.sourceTexture._pName, 0);
    sh.drawIndexBuffer(gl.TRIANGLE_STRIP, creator._indexBuffer);
    f.deactivate();

    gl.enable(gl.CULL_FACE);

    this._ready = true;

    this._creationProceeding = false;
};

og.layer.GeoTexture2d.prototype._renderingProjType0 = function () {
    var p = this._planet,
    h = p.renderer.handler,
    gl = h.gl,
    creator = p._geoImageCreator;

    var width = this._frameWidth,
        height = this._frameHeight;

    this._refreshFrame && this._createFrame();
    this._createSourceTexture();

    var f = creator._framebuffer;
    f.setSize(width, height);
    f.activate();

    h.shaderPrograms.geoImageTransform.activate();
    var sh = h.shaderPrograms.geoImageTransform._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    var tr = this.transparentColor[0],
        tg = this.transparentColor[1],
        tb = this.transparentColor[2];

    gl.disable(gl.CULL_FACE);

    f.bindOutputTexture(this._materialTexture);
    gl.clearColor(tr, tg, tb, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, creator._texCoordsBuffer);
    gl.vertexAttribPointer(sha.texCoords._pName, creator._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBufferWgs84);
    gl.vertexAttribPointer(sha.corners._pName, this._gridBufferWgs84.itemSize, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(shu.extentParams._pName, this._extentWgs84Params);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
    gl.uniform1i(shu.sourceTexture._pName, 0);
    sh.drawIndexBuffer(gl.TRIANGLE_STRIP, creator._indexBuffer);
    f.deactivate();

    gl.enable(gl.CULL_FACE);

    this._ready = true;

    this._creationProceeding = false;
};