/**
 * @module og/layer/Material
 */

"use strict";

class Material {
    /**
     *
     * @param {*} segment
     * @param {*} layer
     */
    constructor(segment, layer) {
        this.segment = segment;
        this.layer = layer;
        this.isReady = false;
        this.isLoading = false;
        this.texture = null;
        this.pickingMask = null;
        //this.image = null;
        this.textureExists = false;
        this.appliedNodeId = 0;
        this.texOffset = [0.0, 0.0, 1.0, 1.0];
        this.loadingAttempts = 0;

        // vector data
        this._updateTexture = null;
        this._updatePickingMask = null;
        this.pickingReady = false;
    }

    ///**
    // * @param {*} layer
    // */
    //assignLayer(layer) {
    //    this.layer = layer;
    //}

    /**
     *
     */
    abortLoading() {
        this.layer.abortMaterialLoading(this);
    }

    _createTexture(img) {
        return this.layer._planet && this.layer.createTexture(img, this.layer._internalFormat, this.isReady ? this.texture : null);
    }

    /**
     *
     * @param {*} img
     */
    applyImage(img) {
        if (this.segment.initialized) {
            this._updateTexture = null;
            //this.image = img;
            this.texture = this._createTexture(img);
            this.appliedNodeId = this.segment.node.nodeId;
            this.isReady = true;
            this.pickingReady = true;
            this.textureExists = true;
            this.isLoading = false;
            this.texOffset = [0.0, 0.0, 1.0, 1.0];
        }
    }

    /**
     *
     * @param {*} texture
     * @param {*} pickingMask
     */
    applyTexture(texture, pickingMask) {
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
    }

    /**
     *
     */
    textureNotExists() {
        if (this.segment.initialized) {
            this.pickingReady = true;
            this.isLoading = false;
            this.isReady = true;
            this.textureExists = false;
        }
    }

    /**
     *
     */
    clear() {
        this.loadingAttempts = 0;
        this.layer.clearMaterial(this);
    }
}

export { Material };
