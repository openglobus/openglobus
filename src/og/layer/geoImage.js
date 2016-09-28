goog.provide('og.layer.GeoImage');

goog.require('og.layer.Layer');

/**
 * Used to load and display a single image over specific corner coordinates on the globe, implements og.layer.Layer interface.
 * @class
 */
og.layer.GeoImage = function (name, options) {
    og.inheritance.base(this, name, options);

    this._image = null;
    this._src = options.src;
    this._imageReady = false;

    this._sourceTexture = null;
    this._materialTexture = null;
    this._materialTextureMerc = null;
    this._intermediateTextureWgs84 = null;

    this._frameWidth = 0;
    this._frameHeight = 0;

    this._gridBuffer = null;
    this._extentParams = null;
    this._extentOverParams = null;
    this._wgs84MercParams = null;
    this._wgs84MercExtent = null;
    this._extentOverParams = null;
    this._mercExtentParams = null;

    this._wgs84 = options.wgs84 || false;
    this._refreshCorners = true;
    this._frameCreated = false;
    this._sourceCreated = false;
    this._isOverMerc = false;

    this._ready = false;
    this._creationProceeding = false;

    options.corners && this.setCorners(options.corners);
};

og.inheritance.extend(og.layer.GeoImage, og.layer.Layer);

og.layer.GeoImage.CURVATURE_SIZE = 0.005;

/**
 * Adds layer to the planet.
 * @public
 * @param {og.scene.Planet}
 */
og.layer.GeoImage.prototype.addTo = function (planet) {
    this._assignPlanet(planet);
};

og.layer.GeoImage.prototype.getWidth = function () {
    return this._width;
};

og.layer.GeoImage.prototype.getHeight = function () {
    return this._height;
};

og.layer.GeoImage.prototype.setCorners = function (corners) {
    this.setCornersLonLat(og.lonLatArray(corners));
};

og.layer.GeoImage.prototype.setCornersLonLat = function (corners) {
    this._refreshCorners = true;

    this._corners = corners || [0, 0, 0, 0];

    //Whole extent in wgs84
    this._extent.setByCoordinates(this._corners);
    this._extentParams = [this._extent.southWest.lon, this._extent.southWest.lat, 2.0 / this._extent.getWidth(), 2.0 / this._extent.getHeight()];

    //Extent inside mercator latitude limits in mercator meters.
    var me = this._extent.clone();
    if (me.southWest.lat < og.mercator.MIN_LAT) {
        me.southWest.lat = og.mercator.MIN_LAT;
        this._isOverMerc = true;
    }
    if (me.northEast.lat > og.mercator.MAX_LAT) {
        me.northEast.lat = og.mercator.MAX_LAT;
        this._isOverMerc = true;
    }
    this._extentOverParams = [me.southWest.lon, me.southWest.lat, 2.0 / me.getWidth(), 2.0 / me.getHeight()];
    this._extentMerc = me.forwardMercator();
    this._correctFullExtent();
    this._wgs84MercExtent = me;
    this._wgs84MercParams = [this._wgs84MercExtent.southWest.lon, this._wgs84MercExtent.southWest.lat,
                1.0 / this._wgs84MercExtent.getWidth(), 1.0 / this._wgs84MercExtent.getHeight()];
    this._mercExtentParams = [this._extentMerc.southWest.lon, this._extentMerc.southWest.lat,
                this._extentMerc.getWidth(), this._extentMerc.getHeight()]

    if (this._planet) {
        this._gridBuffer = this._planet._geoImageCreator.createGridBuffer(corners);
        this._refreshCorners = false;

        if (this._ready && !this._creationProceeding) {
            this._planet._geoImageCreator.queue(this);
        }
    }
};

og.layer.GeoImage.prototype.loadMaterial = function (material) {
    material.imageIsLoading = true;
    this._creationProceeding = true;
    if (!this._imageReady) {
        var that = this;
        this._image = new Image();
        this._image.onload = function (e) {
            that._frameWidth = og.math.nextHighestPowerOfTwo(this.width),
            that._frameHeight = og.math.nextHighestPowerOfTwo(this.height);
            that._planet._geoImageCreator.queue(that);
            that._imageReady = true;
        }
        this._image.src = this._src;
    } else {
        this._frameWidth = og.math.nextHighestPowerOfTwo(this._image.width),
        this._frameHeight = og.math.nextHighestPowerOfTwo(this._image.height);
        this._planet._geoImageCreator.queue(this);
    }
};

og.layer.GeoImage.prototype.abortMaterialLoading = function (material) {
    this._image && (this._image.src = "");
    this._creationProceeding = false;
    material.imageIsLoading = false;
    material.imageReady = false;
};

og.layer.GeoImage.prototype.clear = function () {
    var p = this._planet;

    if (p) {
        var gl = p.renderer.handler.gl;
        this._creationProceeding && p._geoImageCreator.remove(this);
        p._clearLayerMaterial(this);

        gl.deleteBuffer(this._gridBuffer);
        gl.deleteTexture(this._sourceTexture);
        !this._materialTexture.default && gl.deleteTexture(this._materialTexture);
        !this._materialTextureMerc.default && gl.deleteTexture(this._materialTextureMerc);
        gl.deleteTexture(this._intermediateTextureWgs84);
    }

    this._sourceTexture = null;
    this._materialTexture = null;
    this._materialTextureMerc = null;
    this._intermediateTextureWgs84 = null;

    this._gridBuffer = null;

    this._refreshCorners = true;
    this._frameCreated = false;
    this._sourceCreated = false;

    this._ready = false;
    this._creationProceeding = false;
};

og.layer.GeoImage.prototype.clearMaterial = function (material) {
    material.image = null;
    material.texture = null;
    material.imageIsLoading = false;
    material.imageReady = false;
};

/**
 * @protected
 */
og.layer.GeoImage.prototype.applyMaterial = function (material) {

    var segment = material.segment;

    if (this._ready) {
        material.imageReady = true;
        material.imageIsLoading = false;
        material.texture = segment.getLayerTexture(this);
    } else {
        material.texture = this._planet.transparentTexture;
        !this._creationProceeding && this.loadMaterial(material);
    }

    var v0s = segment.getLayerExtent(this);
    var v0t = segment.extent;
    var sSize_x = v0s.northEast.lon - v0s.southWest.lon;
    var sSize_y = v0s.northEast.lat - v0s.southWest.lat;
    var dV0s_x = (v0t.southWest.lon - v0s.southWest.lon) / sSize_x;
    var dV0s_y = (v0s.northEast.lat - v0t.northEast.lat) / sSize_y;
    var dSize_x = (v0t.northEast.lon - v0t.southWest.lon) / sSize_x;
    var dSize_y = (v0t.northEast.lat - v0t.southWest.lat) / sSize_y;
    return [dV0s_x, dV0s_y, dSize_x, dSize_y];
};