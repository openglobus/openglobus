goog.provide('og.GeoImage');

goog.require('og.LonLat');
goog.require('og.Extent');
goog.require('og.mercator');
goog.require('og.Events');

og.GeoImage = function (options) {
    this.planet = options.planet || null;
    this._wgs84Corners = options.corners || [];
    this._wgs84CornersBuffer = null;
    this._mercExtentCornersBuffer = null;
    this._mercCornersBuffer = null;
    this._wgs84Extent = new og.Extent();
    this._mercExtentCorners = []; //equal the _mercExtent
    this._mercExtent = new og.Extent();
    this._mercSamplerReady = false;
    this.image = null;
    this.src = options.src;
    this._wgs84SourceTexture = null;
    this._mercFramebuffer = null;//merc projected texture
    this.imageLoaded = false;
    this._curvature = 0.0;
    this.zIndex = options.zIndex || 0;
    this.minZoom = options.minZoom || 0;
    this.maxZoom = options.minZoom || 0;
    this.visibility = (options.visibility != undefined ? options.visibility : true);
    this.opacity = options.opacity || 1.0;
    this.events = new og.Events();
    this.events.registerNames(["loadend"]);
};

og.GeoImage.prototype.initialize = function (planet) {
    this.planet = planet;
    this._mercFramebuffer = new og.webgl.Framebuffer(planet.geoImageTileCreator._handler);
    this.loadImage(this.src);
    this.setCorners(this._wgs84Corners);
};

og.GeoImage.prototype.getCorners = function () {
    return this._wgs84Corners;
};

og.GeoImage.prototype.getExtent = function () {
    return this._wgs84Extent;
};

og.GeoImage.prototype.clear = function () {
    this.image.src = "";
    this.image = null;
    if (this.imageLoaded) {
        this.planet.geoImageTileCreator._handler.gl.deleteBuffer(this._wgs84CornersBuffer);
        this.planet.geoImageTileCreator._handler.gl.deleteBuffer(this._mercExtentCornersBuffer);
        this.planet.geoImageTileCreator._handler.gl.deleteTexture(this._wgs84SourceTexture);
        this.planet.geoImageTileCreator._handler.gl.deleteBuffer(this._mercCornersBuffer);
        this._mercFramebuffer.clear();
        this.imageLoaded = false;
        this._mercSamplerReady = false;
    }
    this.planet.redrawGeoImages();
};

og.GeoImage.prototype.loadImage = function (src) {
    this.src = src;
    var that = this;
    this.image = new Image();
    this.image.onload = function () {
        that._wgs84SourceTexture = that.planet.geoImageTileCreator._handler.createTexture_n(this);
        that.imageLoaded = true;
        that.events.dispatch(that.events.loadend, that);
        if (that.visibility) {
            that.planet.redrawGeoImages();
        }
    };
    this.image.src = src;
};

og.GeoImage.prototype.setOpacity = function (opacity) {
    this.opacity = opacity;
    this.planet.redrawGeoImages();
};

og.GeoImage.prototype.setVisibility = function (visibility) {
    this.visibility = visibility;
    this.planet.redrawGeoImages();
};

og.GeoImage.prototype.getVisibility = function () {
    return this.visibility;
};

og.GeoImage.prototype.addTo = function (planet) {
    this.initialize(planet);
    planet.geoImagesArray.unshift(this);
    planet.events.dispatch(planet.events.geoimageadd, this);
    planet.redrawGeoImages();
};

og.GeoImage.prototype.setZIndex = function (zIndex) {
    this.zIndex = zIndex;
    this.planet.redrawGeoImages();
};

og.GeoImage.prototype.getCurvature = function () {
    return this._curvature;
};

og.GeoImage.prototype.calculateCurvature = function () {
    var ex = this._wgs84MercExtent,
        el = this.planet.ellipsoid;
    var c = el.lonLatToCartesian(ex.northEast).normalize();
    var p = el.lonLatToCartesian(ex.southWest).normalize();
    return Math.acos(c.dot(p)) / Math.PI;
};

og.GeoImage.prototype.setCorners = function (corners) {
    this._mercSamplerReady = false;

    this._wgs84Corners = corners;
    this._wgs84Extent.setByCoordinates(this._wgs84Corners);
    this._wgs84MercExtent = this._wgs84Extent.clone();
    if (this._wgs84MercExtent.southWest.lat < og.mercator.MIN_LAT) {
        this._wgs84MercExtent.southWest.lat = og.mercator.MIN_LAT;
    }
    if (this._wgs84MercExtent.northEast.lat > og.mercator.MAX_LAT) {
        this._wgs84MercExtent.northEast.lat = og.mercator.MAX_LAT;
    }

    if (this.planet) {
        this._curvature = this.calculateCurvature();

        var h = this.planet.geoImageTileCreator._handler;
        h.gl.deleteBuffer(this._wgs84CornersBuffer);
        this._wgs84CornersBuffer = h.createArrayBuffer(new Float32Array([this._wgs84Corners[3].lon, this._wgs84Corners[3].lat, this._wgs84Corners[2].lon, this._wgs84Corners[2].lat,
            this._wgs84Corners[0].lon, this._wgs84Corners[0].lat, this._wgs84Corners[1].lon, this._wgs84Corners[1].lat]), 2, 4);

        this._mercExtent = this._wgs84MercExtent.forwardMercator();
        this._mercExtentCorners = [this._mercExtent.getNorthWest(), this._mercExtent.getNorthEast(), this._mercExtent.getSouthEast(), this._mercExtent.getSouthWest()];
        h.gl.deleteBuffer(this._mercExtentCornersBuffer);
        this._mercExtentCornersBuffer = h.createArrayBuffer(new Float32Array([this._mercExtentCorners[3].lon, this._mercExtentCorners[3].lat, this._mercExtentCorners[2].lon, this._mercExtentCorners[2].lat,
            this._mercExtentCorners[0].lon, this._mercExtentCorners[0].lat, this._mercExtentCorners[1].lon, this._mercExtentCorners[1].lat]), 2, 4);

        h.gl.deleteBuffer(this._mercCornersBuffer);
        this._mercCornersBuffer = h.createArrayBuffer(new Float32Array([og.mercator.forward_lon(this._wgs84Corners[3].lon), og.mercator.forward_lat(this._wgs84Corners[3].lat), og.mercator.forward_lon(this._wgs84Corners[2].lon), og.mercator.forward_lat(this._wgs84Corners[2].lat),
            og.mercator.forward_lon(this._wgs84Corners[0].lon), og.mercator.forward_lat(this._wgs84Corners[0].lat), og.mercator.forward_lon(this._wgs84Corners[1].lon), og.mercator.forward_lat(this._wgs84Corners[1].lat)]), 2, 4);


        this.planet.redrawGeoImages();
    }
};