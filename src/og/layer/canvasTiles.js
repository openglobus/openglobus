goog.provide('og.layer.CanvasTiles');

goog.require('og.inheritance');
goog.require('og.layer.Layer');
goog.require('og.ImageCanvas');

og.layer.CanvasTiles = function (name, options) {
    og.inheritance.base(this, name, options);

    this.width = options && options.width ? options.width : 256;
    this.height = options && options.height ? options.height : 256;
};

og.inheritance.extend(og.layer.CanvasTiles, og.layer.Layer);


og.layer.CanvasTiles.prototype.handleSegmentTile = function (material) {
    if (this.drawTile) {
        this.drawTile(material, function (canvas) {
            material.imageReady = false;
            material.applyTexture(canvas);
        });
    } else {
        material.textureNotExists();
    }
};