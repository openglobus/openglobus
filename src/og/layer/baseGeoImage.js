goog.provide('og.layer.BaseGeoImage');

goog.require('og.math');
goog.require('og.layer.Layer');

og.layer.BaseGeoImage = function (name, options) {
    og.inheritance.base(this, name, options);

    this._projType = 0;

    this._frameWidth = 256;
    this._frameHeight = 256;

    this._sourceReady = false;
    this._sourceTexture = null;
    this._materialTexture = null;
    this._intermediateTexture = null;

    this._gridBufferWgs84 = null;
    this._gridBufferMerc = null;
    this._extentWgs84Params = null;
    this._mercExtentParams = null;

    this._refreshCorners = true;
    this._frameCreated = false;
    this._sourceCreated = false;

    this._animate = false;
    this._ready = false;
    this._creationProceeding = false;
    this._isRendering = false;

    this._extentWgs84 = new og.Extent();
    this._cornersWgs84 = null;
    options.corners && this.setCorners(options.corners);
};

og.inheritance.extend(og.layer.BaseGeoImage, og.layer.Layer);

/**
 * Adds layer to the planet.
 * @public
 * @param {og.scene.Planet}
 */
og.layer.BaseGeoImage.prototype.addTo = function (planet) {
    this._assignPlanet(planet);
};

og.layer.BaseGeoImage.prototype.getCornersLonLat = function () {
    var c = this._cornersWgs84;
    return [new og.LonLat(c[0].lon, c[0].lat), new og.LonLat(c[1].lon, c[1].lat),
        new og.LonLat(c[2].lon, c[2].lat), new og.LonLat(c[3].lon, c[3].lat)];
};

og.layer.BaseGeoImage.prototype.getCorners = function () {
    var c = this._cornersWgs84;
    return [[c[0].lon, c[0].lat], [c[1].lon, c[1].lat], [c[2].lon, c[2].lat], [c[3].lon, c[3].lat]];
};

og.layer.BaseGeoImage.prototype.setCorners = function (corners) {
    this.setCornersLonLat(og.lonLatArray(corners));
};

og.layer.BaseGeoImage.prototype.setCornersLonLat = function (corners) {
    this._refreshCorners = true;
    this._cornersWgs84 = corners || [0, 0, 0, 0];
    if (this._ready && !this._creationProceeding) {
        this._planet._geoImageCreator.add(this);
    }
};

og.layer.BaseGeoImage.prototype._updateCorners = function () {
    if (this._refreshCorners) {
        this._frameCreated = false;

        this._extentWgs84.setByCoordinates(this._cornersWgs84);
        this._extent = this._extentWgs84;
        var me = this._extentWgs84;
        this._cornersMerc = [this._cornersWgs84[0].forwardMercatorEPS01(), this._cornersWgs84[1].forwardMercatorEPS01(),
            this._cornersWgs84[2].forwardMercatorEPS01(), this._cornersWgs84[3].forwardMercatorEPS01()];
        this._extentMerc = new og.Extent(me.southWest.forwardMercatorEPS01(), me.northEast.forwardMercatorEPS01());

        if (me.southWest.lat > og.mercator.MAX_LAT ||
            me.northEast.lat < og.mercator.MIN_LAT) {
            this._projType = 0;
            this._extentWgs84Params = [this._extentWgs84.southWest.lon, this._extentWgs84.southWest.lat, 2.0 / this._extentWgs84.getWidth(), 2.0 / this._extentWgs84.getHeight()];
            if (this._planet) {
                this._gridBufferWgs84 = this._planet._geoImageCreator.createGridBuffer(this._cornersWgs84);
            }
        } else if (me.northEast.lat > og.mercator.MAX_LAT &&
                    me.southWest.lat < og.mercator.MIN_LAT) {
            this._projType = 2;
            this._extentMercParams = [this._extentMerc.southWest.lon, this._extentMerc.southWest.lat, 2.0 / this._extentMerc.getWidth(), 2.0 / this._extentMerc.getHeight()];
            //this._correctFullExtent();
            this._wgs84MercExtent = me;
            this._wgs84MercParams = [this._wgs84MercExtent.southWest.lon, this._wgs84MercExtent.southWest.lat,
                        1.0 / this._wgs84MercExtent.getWidth(), 1.0 / this._wgs84MercExtent.getHeight()];
            this._mercExtentParams = [this._extentMerc.southWest.lon, this._extentMerc.southWest.lat,
                        this._extentMerc.getWidth(), this._extentMerc.getHeight()]

            if (this._planet) {
                this._gridBufferMerc = this._planet._geoImageCreator.createGridBuffer(this._cornersMerc);
            }
        } else {
            this._projType = 1;
            this._extentMercParams = [this._extentMerc.southWest.lon, this._extentMerc.southWest.lat, 2.0 / this._extentMerc.getWidth(), 2.0 / this._extentMerc.getHeight()];
            if (this._planet) {
                this._gridBufferMerc = this._planet._geoImageCreator.createGridBuffer(this._cornersMerc);
            }
        }

        this._planet && (this._refreshCorners = false);
    }
};

og.layer.BaseGeoImage.prototype.abortMaterialLoading = function (material) {
    this._creationProceeding = false;
    material.isLoading = false;
    material.isReady = false;
};

og.layer.BaseGeoImage.prototype.clear = function () {
    var p = this._planet;

    if (p) {
        var gl = p.renderer.handler.gl;
        this._creationProceeding && p._geoImageCreator.remove(this);
        p._clearLayerMaterial(this);

        gl.deleteBuffer(this._gridBufferMerc);
        gl.deleteBuffer(this._gridBufferWgs84);

        gl.deleteTexture(this._sourceTexture);
        !this._materialTexture.default && gl.deleteTexture(this._materialTexture);
    }

    this._sourceTexture = null;
    this._materialTexture = null;

    this._gridBufferMerc = null;
    this._gridBufferWgs84 = null;

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
og.layer.BaseGeoImage.prototype.setVisibility = function (visibility) {
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

og.layer.BaseGeoImage.prototype.clearMaterial = function (material) {
    //just clear material pointer not geoimage
    material.image = null;
    material.texture = null;
    material.isLoading = false;
    material.isReady = false;
};

/**
 * @protected
 */
og.layer.BaseGeoImage.prototype.applyMaterial = function (material) {

    var segment = material.segment;

    if (this._ready) {
        material.isReady = true;
        material.isLoading = false;
        material.texture = this._materialTexture;
    } else {
        material.texture = this._planet.transparentTexture;
        !this._creationProceeding && this.loadMaterial(material);
    }

    if (this._projType === 0) {
        var v0s = this._extent;
        var v0t = segment._extent;
    } else {
        var v0s = this._extentMerc;
        var v0t = segment.getExtentMerc();
    }

    var sSize_x = v0s.northEast.lon - v0s.southWest.lon;
    var sSize_y = v0s.northEast.lat - v0s.southWest.lat;
    var dV0s_x = (v0t.southWest.lon - v0s.southWest.lon) / sSize_x;
    var dV0s_y = (v0s.northEast.lat - v0t.northEast.lat) / sSize_y;
    var dSize_x = (v0t.northEast.lon - v0t.southWest.lon) / sSize_x;
    var dSize_y = (v0t.northEast.lat - v0t.southWest.lat) / sSize_y;
    return [dV0s_x, dV0s_y, dSize_x, dSize_y];
};