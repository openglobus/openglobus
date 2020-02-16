/**
 * @module og/layer/Material
 */

'use strict';

const Material = function (segment, layer) {
    this.segment = segment;
    this.layer = layer;
    this.isReady = false;
    this.isLoading = false;
    this.texture = null;
    this.pickingMask = null;
    this.image = null;
    this.textureExists = false;
    this.appliedNodeId = 0;
    this.texOffset = [0.0, 0.0, 1.0, 1.0];
    this.loadingAttempts = 0;

    // vector data
    this._updateTexture = null;
    this._updatePickingMask = null;
    this.pickingReady = false;
};

Material.prototype.assignLayer = function (layer) {
    this.layer = layer;
};

Material.prototype.abortLoading = function () {
    this.layer.abortMaterialLoading(this);
};

Material.prototype.applyImage = function (img) {
    if (this.segment.initialized) {
        this._updateTexture = null;
        this.image = img;
        this.texture = this.segment.handler.createTexture(img);
        this.appliedNodeId = this.segment.node.nodeId;
        this.isReady = true;
        this.pickingReady = true;
        this.textureExists = true;
        this.isLoading = false;
        this.texOffset = [0.0, 0.0, 1.0, 1.0];
    }
};

Material.prototype.applyTexture = function (texture, pickingMask) {
    if (this.segment.initialized) {
        this.texture = texture;
        this._updateTexture = null;
        this.pickingMask = pickingMask || null;
        this._updatePickingMask = null;
        this.isReady = true;
        this.pickingReady = true;
        this.textureExists = true;
        this.isLoading = false;
        this.appliedNodeId = this.segment.node.nodeId;
        this.texOffset = [0.0, 0.0, 1.0, 1.0];
    }
};

Material.prototype.textureNotExists = function () {
    if (this.segment.initialized) {
        this.pickingReady = true;
        this.isLoading = false;
        this.isReady = true;
        this.textureExists = false;
    }
};

Material.prototype.clear = function () {
    this.loadingAttempts = 0;
    this.layer.clearMaterial(this);
};

export { Material };