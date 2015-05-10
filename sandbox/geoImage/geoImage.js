goog.provide('GeoImage');

//goog.require('og');
goog.require('og.node.RenderNode');
goog.require('og.inheritance');
goog.require('og.Extent');
goog.require('og.mercator');
goog.require('og.webgl.Framebuffer');
goog.require('og.LonLat');

GeoImage = function () {
    og.inheritance.base(this);

    this._handler = null;
    this._width = 256;
    this._height = 256;

    //sourceImage and texture
    this._sourceImage = null;
    this._sourceTexture = null;
};

og.inheritance.extend(GeoImage, og.node.RenderNode);

var SIZE = 300;

GeoImage.prototype.initialization = function () {

    this._handler = this.renderer.handler;

    this._framebuffers = [];

    for (var i = 0; i < SIZE; i++) {
        this._framebuffers[i] = new og.webgl.Framebuffer(this._handler.gl, 2920, 2080);
        this._framebuffers[i].initialize();
    }


    this.imageLoaded = false;
    this._sourceImage = new Image();
    var that = this;
    this._sourceImage.onload = function () {
        that._sourceTexture = that._handler.createTexture_n(this);
        for (var i = 0; i < SIZE; i++) {
            that._framebuffers[i].setSize(this.width, this.height);
        }
        that.projMercFrame();
        that.imageLoaded = true;
    };

    this._sourceImage.src = "bm.jpg";
    this.wgs84corners = [og.lonLat(-180, 90), og.lonLat(180, 90), og.lonLat(180, -90), og.lonLat(-180, -90)];
    this.mercExtent = og.Extent.createByCoordinates(this.wgs84corners);
    if (this.mercExtent.southWest.lat < og.mercator.MIN_LAT) {
        this.mercExtent.southWest.lat = og.mercator.MIN_LAT
    }
    if (this.mercExtent.northEast.lat > og.mercator.MAX_LAT) {
        this.mercExtent.northEast.lat = og.mercator.MAX_LAT
    }
    var dX = 2.0 / this.mercExtent.getWidth();
    var dY = 2.0 / this.mercExtent.getHeight();

    this.mercExtentParams = [this.mercExtent.southWest.lon, this.mercExtent.southWest.lat, dX, dY];

    this._cornersBuffer = this._handler.createArrayBuffer(new Float32Array([
        this.wgs84corners[3].lon, this.wgs84corners[3].lat,
        this.wgs84corners[2].lon, this.wgs84corners[2].lat,
        this.wgs84corners[0].lon, this.wgs84corners[0].lat,
        this.wgs84corners[1].lon, this.wgs84corners[1].lat]), 2, 4);

    this._texCoordsBuffer = this.renderer.handler.createArrayBuffer(new Float32Array([
       0, 1,
       1, 1,
       0, 0,
       1, 0]), 2, 4);

    this._handler.deactivateFaceCulling();

    this._vertexBuffer = this._handler.createArrayBuffer(new Float32Array([
    -1,  1,
     1,  1,
    -1, -1,
     1, -1]), 2, 4);

};

GeoImage.prototype.projMercFrame = function () {
    var gl = this._handler.gl;

    //wgs84 image extent making
    this._framebuffers[0].activate();
    this._handler.shaderPrograms.geoImage.activate();
    var sh = this._handler.shaderPrograms.geoImage._program;
    var sha = sh.attributes,
        shu = sh.uniforms;
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordsBuffer);
    gl.vertexAttribPointer(sha.a_texCoord._pName, this._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._cornersBuffer);
    gl.vertexAttribPointer(sha.a_corner._pName, this._cornersBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(shu.u_extentParams._pName, this.mercExtentParams);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
    gl.uniform1i(shu.u_sourceImage._pName, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this._framebuffers[0].deactivate();

    //mercator projection
    this._handler.shaderPrograms.geoImageMercProj.activate();
    sh = this._handler.shaderPrograms.geoImageMercProj._program;
    sha = sh.attributes;
    shu = sh.uniforms;
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordsBuffer);
    gl.vertexAttribPointer(sha.a_texCoord._pName, this._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.a_vertex._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._framebuffers[0].texture);
    gl.uniform1i(shu.u_sampler._pName, 0);
    gl.uniform4fv(shu.u_extent._pName, [this.mercExtent.southWest.lon, this.mercExtent.southWest.lat, this.mercExtent.northEast.lon, this.mercExtent.northEast.lat]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

GeoImage.prototype.frame = function () {
    if (this.imageLoaded) {
        this.projMercFrame();
    }
};