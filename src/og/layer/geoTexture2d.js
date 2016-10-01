goog.provide('og.layer.GeoTexture2d');

goog.require('og.layer.IGeoImage');
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

og.inheritance.extend(og.layer.GeoTexture2d, og.layer.IGeoImage);

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
    material.imageIsLoading = false;
    material.imageReady = false;
};