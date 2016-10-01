goog.provide('og.layer.GeoImage');

goog.require('og.layer.IGeoImage');
goog.require('og.inheritance');

/**
 * Used to load and display a single image over specific corner coordinates on the globe, implements og.layer.IGeoImage interface.
 * @class
 */
og.layer.GeoImage = function (name, options) {
    og.inheritance.base(this, name, options);

    this._image = null;
    this._src = options.src;

    if (options.image) {
        this._image = options.image;
        this._src = options.image.src;
        this._frameWidth = og.math.nextHighestPowerOfTwo(this._image.width),
        this._frameHeight = og.math.nextHighestPowerOfTwo(this._image.height);
        this._sourceReady = true;
    }
};

og.inheritance.extend(og.layer.GeoImage, og.layer.IGeoImage);

og.layer.GeoImage.prototype._createSourceTexture = function () {
    if (!this._sourceCreated) {
        this._sourceTexture = this._planet.renderer.handler.createTexture_n(this._image);
        this._sourceCreated = true;
    }
};

og.layer.GeoImage.prototype.loadMaterial = function (material) {
    material.imageIsLoading = true;
    this._creationProceeding = true;
    if (!this._sourceReady && this._src) {
        var that = this;
        this._image = new Image();
        this._image.onload = function (e) {
            that._frameWidth = og.math.nextHighestPowerOfTwo(this.width),
            that._frameHeight = og.math.nextHighestPowerOfTwo(this.height);
            that._planet._geoImageCreator.add(that);
            that._sourceReady = true;
        }
        this._image.src = this._src;
    } else {
        this._planet._geoImageCreator.add(this);
    }
};

og.layer.GeoImage.prototype.abortMaterialLoading = function (material) {
    this._image && (this._image.src = "");
    this._creationProceeding = false;
    material.imageIsLoading = false;
    material.imageReady = false;
};