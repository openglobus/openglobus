goog.provide('og.layer.IGeoImage');

goog.require('og.math');
goog.require('og.layer.Layer');

og.layer.IGeoImage = function (name, options) {
    og.inheritance.base(this, name, options);

    this._frameWidth = 256;
    this._frameHeight = 256;

    this._sourceReady = false;
    this._sourceTexture = null;
    this._materialTexture = null;
    this._materialTextureMerc = null;
    this._intermediateTextureWgs84 = null;

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

    this._animate = false;
    this._ready = false;
    this._creationProceeding = false;
    this._isRendering = false;

    options.corners && this.setCorners(options.corners);
};

og.inheritance.extend(og.layer.IGeoImage, og.layer.Layer);

/**
 * Adds layer to the planet.
 * @public
 * @param {og.scene.Planet}
 */
og.layer.IGeoImage.prototype.addTo = function (planet) {
    this._assignPlanet(planet);
};

og.layer.IGeoImage.prototype.getCornersLonLat = function () {
    var c = this._corners;
    return [new og.LonLat(c[0].lon, c[0].lat), new og.LonLat(c[1].lon, c[1].lat),
        new og.LonLat(c[2].lon, c[2].lat), new og.LonLat(c[3].lon, c[3].lat)];
};

og.layer.IGeoImage.prototype.getCorners = function () {
    var c = this._corners;
    return [[c[0].lon, c[0].lat], [c[1].lon, c[1].lat], [c[2].lon, c[2].lat], [c[3].lon, c[3].lat]];
};

og.layer.IGeoImage.prototype.setCorners = function (corners) {
    this.setCornersLonLat(og.lonLatArray(corners));
};

og.layer.IGeoImage.prototype.setCornersLonLat = function (corners) {
    this._refreshCorners = true;
    this._corners = corners || [0, 0, 0, 0];
    this._extent.setByCoordinates(this._corners);
    if (this._ready && !this._creationProceeding) {
        this._planet._geoImageCreator.add(this);
    }
};

og.layer.IGeoImage.prototype._updateCorners = function () {
    if (this._refreshCorners) {
        //Whole extent in wgs84
        this._extent.setByCoordinates(this._corners);
        this._extentParams = [this._extent.southWest.lon, this._extent.southWest.lat, 2.0 / this._extent.getWidth(), 2.0 / this._extent.getHeight()];

        this._isOverMerc = false;

        this._frameCreated = false;

        //Extent inside mercator grid.
        var me = this._extent.clone();
        if (me.southWest.lat <= og.mercator.MIN_LAT) {
            me.southWest.lat = og.mercator.MIN_LAT;
            this._isOverMerc = true;
        }
        if (me.northEast.lat >= og.mercator.MAX_LAT) {
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
            this._gridBuffer = this._planet._geoImageCreator.createGridBuffer(this._corners);
            this._refreshCorners = false;
        }
    }
};

og.layer.IGeoImage.prototype.abortMaterialLoading = function (material) {
    this._creationProceeding = false;
    material.imageIsLoading = false;
    material.imageReady = false;
};

og.layer.IGeoImage.prototype.clear = function () {
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

/**
 * Sets layer visibility.
 * @public
 * @param {boolean} visibility - Layer visibility.
 */
og.layer.IGeoImage.prototype.setVisibility = function (visibility) {
    if (visibility != this._visibility) {
        this._visibility = visibility;
        if (this._isBaseLayer && visibility) {
            this._planet.setBaseLayer(this);
        }
        this._planet.updateVisibleLayers();
        this.events.dispatch(this.events.visibilitychange, this);

        //remove from creator
        if (visibility)
            this._sourceReady && this._planet._geoImageCreator.add(this);
        else
            this._sourceReady && this._planet._geoImageCreator.remove(this);
    }
};

og.layer.IGeoImage.prototype.clearMaterial = function (material) {
    //just clear material pointer not geoimage
    material.image = null;
    material.texture = null;
    material.imageIsLoading = false;
    material.imageReady = false;
};

/**
 * @protected
 */
og.layer.IGeoImage.prototype.applyMaterial = function (material) {

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