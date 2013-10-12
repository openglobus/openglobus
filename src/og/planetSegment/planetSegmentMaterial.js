goog.provide('og.planetSegment.PlanetSegmentMaterial');

og.planetSegment.PlanetSegmentMaterial = function (segment, layer) {
    this.segment = segment;
    this.layer = layer;
    this.imageReady = false;
    this.imageIsLoading = false;
    this.texBias = [0, 0, 1];
    this.texture = null;
};

og.planetSegment.PlanetSegmentMaterial.prototype.assignLayer = function (layer) {
    this.layer = layer;
};

og.planetSegment.PlanetSegmentMaterial.prototype.loadTileImage = function () {
    if (!this.imageIsLoading) {
        this.imageReady = false;
        this.imageIsLoading = true;
        this.layer.handleSegmentTile(this);
    }
};

og.planetSegment.PlanetSegmentMaterial.prototype.applyTexture = function (img) {
    if (this.segment.ready && this.imageIsLoading) {
        this.segment.node.appliedTextureNodeId = this.segment.node.nodeId;
        this.imageReady = true;
        this.texture = this.segment._ctx.createTextureFromImage(img);
        this.texBias = [0, 0, 1];
    } else {
        this.imageReady = false;
        this.texture = null;
    }
    this.imageIsLoading = false;
};

og.planetSegment.PlanetSegmentMaterial.prototype.textureNotExists = function () {
    this.imageIsLoading = true;
};

og.planetSegment.PlanetSegmentMaterial.prototype.clear = function () {
    if (this.imageReady) {
        this.imageReady = false;
        this.segment._ctx.gl.deleteTexture(this.texture);
        this.texture = null;
    }
    this.imageIsLoading = false;
};