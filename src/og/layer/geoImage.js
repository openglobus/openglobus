goog.provide('og.layer.GeoImage');

goog.require('og.layer.BaseGeoImage');
goog.require('og.inheritance');

/**
 * Used to load and display a single image over specific corner coordinates on the globe, implements og.layer.IGeoImage interface.
 * @class
 */
og.layer.GeoImage = function (name, options) {
    og.inheritance.base(this, name, options);

    this._image = options.image || null;
    this._src = options.src || null;
};

og.inheritance.extend(og.layer.GeoImage, og.layer.BaseGeoImage);

og.layer.GeoImage.prototype.setSrc = function (src) {
    this._planet._geoImageCreator.remove(this);
    this._src = src;
    this._sourceReady = false;
};

og.layer.GeoImage.prototype.setImage = function (image) {
    this._planet._geoImageCreator.remove(this);
    this._image = options.image;
    this._src = options.image.src;
    this._sourceReady = false;
};

og.layer.GeoImage.prototype._createSourceTexture = function () {
    if (!this._sourceCreated) {
        this._sourceTexture = this._planet.renderer.handler.createTexture_n(this._image);
        this._sourceCreated = true;
    }
};

og.layer.GeoImage.prototype._onLoad = function (img) {
    this._frameWidth = img.width;
    if (this._projType === 2) {
        var h = img.height * 2;
        if (h > 4096) {
            h = 4096;
        }
        this._frameHeight = h;
    } else {
        this._frameHeight = img.height;
    }
    this._sourceReady = true;
    this._planet._geoImageCreator.add(this);
};

og.layer.GeoImage.prototype.loadMaterial = function (material) {
    material.isLoading = true;
    this._creationProceeding = true;
    if (!this._sourceReady && this._src) {
        if (this._image) {
            if (this._image.complete) {
                this._onLoad(this._image);
            } else if (this._image.src) {
                var that = this;
                this._image.addEventListener('load', function (e) {
                    that._onLoad(this);
                });
            }
        } else {
            var that = this;
            this._image = new Image();
            this._image.addEventListener('load', function (e) {
                that._onLoad(this);
            });
            this._image.src = this._src;
        }
    } else {
        this._planet._geoImageCreator.add(this);
    }
};

og.layer.GeoImage.prototype.abortMaterialLoading = function (material) {
    this._image && (this._image.src = '');
    this._creationProceeding = false;
    material.isLoading = false;
    material.isReady = false;
};