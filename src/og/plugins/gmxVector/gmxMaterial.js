goog.provide('og.gmx.Material');

goog.require('og.inheritance');

og.gmx.Material = function (segment, layer) {
    og.inheritance.base(this, segment, layer);

    this.fromTile = null;

    this.sceneIsLoading = false;
    this.sceneExists = false;
    this.sceneReady = false;
    this.sceneTexture = null;
};

og.inheritance.extend(og.gmx.Material, og.layer.Material);


og.gmx.Material.applySceneBitmapImage = function (bitmapImage) {
    this.sceneTexture = this.segment.handler.createTexture(bitmapImage);
    this.sceneExists = true;
    this.sceneReady = true;
    this.sceneIsLoading = false;
};


og.gmx.Material.prototype.sceneNotExists = function () {
    this.sceneExists = false;
};