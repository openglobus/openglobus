goog.provide('og.GeoImage');

goog.require('og.LonLat');
goog.require('og.Extent');

og.GeoImage = function (options) {
    this.planet = options.planet || null;
    this.corners = options.corners || [og.lonLat(-180, 90), og.lonLat(180, 90), og.lonLat(180, -90), og.lonLat(-180, -90)];
    this._cornersBuffer = null;
    this.extent = og.Extent.createByCoordinates(this.corners);
    this.src = options.src;
    this.sourceTexture = null;
    this.ready = false;
    this.zIndex = options.zIndex || 0;
    this.minZoom = options.minZoom || 0;
    this.maxZoom = options.minZoom || 0;
    this.visibility = (options.visibility != undefined ? options.visibility : true);
    this.opacity = 1.0;
};

og.GeoImage.prototype.initialize = function () {
    this.loadImage(this.src);
    this.setCorners(this.corners);
};

og.GeoImage.prototype.clear = function () {
    if (this.ready) {
        this.planet.geoImageTileCreator._handler.gl.deleteBuffer(this._cornersBuffer);
        this.planet.geoImageTileCreator._handler.gl.deleteTexture(this.sourceTexture);
        this.sourceTexture = null;
        this.ready = false;
    }
};

og.GeoImage.prototype.loadImage = function (src) {
    this.src = src;
    var that = this;
    var img = new Image();
    img.onload = function () {
        that._sourceTexture = that.planet.geoImageTileCreator._handler.createTexture_n(this);
        that.ready = true;
    };
    img.src = src;
};

og.GeoImage.prototype.addTo = function (planet) {
    this.planet = planet;
    this.initialize();
    planet.geoImagesArray.push(this);
};

og.GeoImage.prototype.setCorners = function (corners) {
    this.corners = corners;
    this.extent.setByCoordinates(corners);
    var h = this.planet.geoImageTileCreator._handler;
    h.gl.deleteBuffer(this._cornersBuffer);
    this._cornersBuffer = h.createArrayBuffer(new Float32Array([corners[3].lon, corners[3].lat, corners[2].lon, corners[2].lat,
        corners[0].lon, corners[0].lat, corners[1].lon, corners[1].lat]), 2, 4);
};