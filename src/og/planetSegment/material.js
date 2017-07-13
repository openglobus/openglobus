goog.provide('og.planetSegment.Material');

og.planetSegment.Material = function(segment, layer) {
    this.segment = segment;
    this.layer = layer;
    this.isReady = false;
    this.isLoading = false;
    this.texture = null;
    this.pickingMask = null;
    this.image = null;
    this.textureExists = false;
    this.appliedNodeId = 0;

    //vector data
    this._updateTexture = null;
    this._updatePickingMask = null;
    this.pickingReady = false;
};

og.planetSegment.Material.prototype.assignLayer = function(layer) {
    this.layer = layer;
};

og.planetSegment.Material.prototype.abortLoading = function() {
    this.layer.abortMaterialLoading(this);
};

og.planetSegment.Material.prototype.applyImage = function(img) {
    this.image = img;
    this.texture = this.segment.handler.createTexture(img);
    this._updateTexture = null;
    this.appliedNodeId = this.segment.node.nodeId;
    this.isReady = true;
    this.pickingReady = true;
    this.textureExists = true;
    this.isLoading = false;
};

og.planetSegment.Material.prototype.applyTexture = function(texture, pickingMask) {

    this.texture = texture;
    this._updateTexture = null;

    this.pickingMask = pickingMask || null;
    this._updatePickingMask = null;

    this.isReady = true;
    this.pickingReady = true;
    this.textureExists = true;
    this.isLoading = false;
    this.appliedNodeId = this.segment.node.nodeId;
};

og.planetSegment.Material.prototype.textureNotExists = function() {
    this.isLoading = true;
    this.textureExists = false;
};

og.planetSegment.Material.prototype.clear = function() {
    this.layer.clearMaterial(this);
};
