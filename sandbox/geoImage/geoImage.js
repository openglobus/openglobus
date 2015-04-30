goog.provide('GeoImage');

//goog.require('og');
goog.require('og.node.RenderNode');
goog.require('og.inheritance');
goog.require('og.Extent');

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

GeoImage.prototype.initialization = function () {


    this._sourceImage = new Image();
    var that = this;
    this._sourceImage.onload = function () {
        that._sourceTexture = that.renderer.handler.createTexture_n(this);
    };

    //this._sourceImage.src = "bm.jpg";
    //var v = [og.lonLat(-180, 90), og.lonLat(180, 90), og.lonLat(180, -90), og.lonLat(-180, -90)];
    //var ext = og.Extent.createByCoordinates(v);
    //var tileExtent = new og.Extent(og.lonLat(-180, -90), og.lonLat(180, 90));

    this._sourceImage.src = "ql.jpg";
    var v = [og.lonLat(152.02, -31.29), og.lonLat(151.59, -30.93), og.lonLat(151.86, -30.68), og.lonLat(152.29, -31.04)];
    var ext = og.Extent.createByCoordinates(v);
    var tileExtent = new og.Extent(og.lonLat(151.59, -31.29), og.lonLat(152.29, -30.68));


    var dX = 2.0 / tileExtent.getWidth();
    var dY = 2.0 / tileExtent.getHeight();

    this.extentParams = [tileExtent.southWest.lon, tileExtent.southWest.lat, dX, dY];

    this._cornersBuffer = this.renderer.handler.createArrayBuffer(new Float32Array([
        v[3].lon, v[3].lat,
        v[2].lon, v[2].lat,
        v[0].lon, v[0].lat,
        v[1].lon, v[1].lat]), 2, 4);

    this._texCoordsBuffer = this.renderer.handler.createArrayBuffer(new Float32Array([
       0.0, 1.0,
       1.0, 1.0,
       0.0, 0.0,
       1.0, 0.0]), 2, 4);

    this.renderer.handler.deactivateFaceCulling();


    var sh = this.renderer.handler.shaderPrograms.geoImage._program;
    var sha = sh.attributes,
        shu = sh.uniforms;
    var gl = this.renderer.handler.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordsBuffer);
    gl.vertexAttribPointer(sha.a_texCoord._pName, this._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
};

GeoImage.prototype.frame = function () {

    var sh = this.renderer.handler.shaderPrograms.geoImage._program;
    var sha = sh.attributes,
        shu = sh.uniforms;
    var gl = this.renderer.handler.gl;

    this.renderer.handler.gl.clearColor(0.0, 0.0, 0.0, 0.0);
    this.renderer.handler.gl.clear(this.renderer.handler.gl.COLOR_BUFFER_BIT | this.renderer.handler.gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._cornersBuffer);
    gl.vertexAttribPointer(sha.a_corner._pName, this._cornersBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(shu.u_extentParams._pName, this.extentParams);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
    gl.uniform1i(shu.u_sourceImage._pName, 0);

    gl.drawArrays(this.renderer.handler.gl.TRIANGLE_STRIP, 0, 4);
};