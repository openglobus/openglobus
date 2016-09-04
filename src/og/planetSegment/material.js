goog.provide('og.planetSegment.Material');

og.planetSegment.Material = function (segment, layer) {
    this.segment = segment;
    this.layer = layer;
    this.imageReady = false;
    this.imageIsLoading = false;
    this.texture = null;
    this.image = null;
    this.textureExists = false;
    this.appliedNodeId = 0;
};

og.planetSegment.Material.prototype.assignLayer = function (layer) {
    this.layer = layer;
};

og.planetSegment.Material.prototype.abortLoading = function () {
    this.layer.abortMaterialLoading(this);
};

og.planetSegment.Material.prototype.applyTexture = function (img) {
    if (!this.imageReady && this.imageIsLoading) {
        this.image = img;
        this.texture = this.segment.handler.createTexture(img);
        this.appliedNodeId = this.segment.node.nodeId;
        this.imageReady = true;
        this.textureExists = true;
        this.imageIsLoading = false;
    }
};

og.planetSegment.Material.prototype.textureNotExists = function () {
    //TODO: texture have to stop loading
    //This is a bug
    this.imageIsLoading = true;
    this.textureExists = false;
};

og.planetSegment.Material.prototype.clear = function () {
    this.layer.clearMaterial(this);

};