goog.provide('og.planetSegment.Material');

og.planetSegment.Material = function (segment, layer) {
    this.segment = segment;
    this.layer = layer;
    this.imageReady = false;
    this.imageIsLoading = false;
    this.texBias = [0, 0, 1];
    this.texture = null;
    this.image = null;
    this.textureExists = false;
};

og.planetSegment.Material.prototype.assignLayer = function (layer) {
    this.layer = layer;
};

og.planetSegment.Material.prototype.loadTileImage = function () {

    if (this.layer._isBaseLayer) {
        this.texture = this.segment.planet.solidTexture;
    } else {
        this.texture = this.segment.planet.transparentTexture;
    }

    if (!this.imageIsLoading) {
        this.imageReady = false;
        this.imageIsLoading = true;
        this.layer.handleSegmentTile(this);
    }
};

og.planetSegment.Material.prototype.abortLoading = function () {
    if (this.image) {
        this.image.src = "";
        this.image = null;
    }
    this.imageIsLoading = false;
    this.imageReady = false;
};

og.planetSegment.Material.prototype.applyTexture = function (img) {
    if (!this.imageReady) {
        this.image = img;
        this.texture = this.segment.handler.createTexture(img);
        this.texBias = [0, 0, 1];
        this.segment.node.appliedTextureNodeId = this.segment.node.nodeId;
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
    this.imageIsLoading = false;
    if (this.imageReady) {
        this.imageReady = false;
        if (!this.texture.default)
            this.segment.handler.gl.deleteTexture(this.texture);
        this.texture = null;
        this.image = null;
        this.texBias = [0, 0, 1];
    }
};