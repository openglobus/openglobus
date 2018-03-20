/**
 * @module og/gmx/GmxMaterial
 */

'use strict';

import { inherits } from '../../inherits.js';
import { Material } from '../../layer/Material.js';

const GmxMaterial = function (segment, layer) {

    Material.call(this, segment, layer);

    this.fromTile = null;

    this.sceneIsLoading = {};
    this.sceneExists = {};
    this.sceneIsReady = {};
    this.sceneTexture = {};
};

inherits(GmxMaterial, Material);

GmxMaterial.applySceneBitmapImage = function (id, bitmapImage) {
    this.sceneTexture[id] = this.segment.handler.createTexture(bitmapImage);
    this.sceneExists[id] = true;
    this.sceneIsReady[id] = true;
    this.sceneIsLoading[id] = false;
};


GmxMaterial.prototype.sceneNotExists = function (id) {
    this.sceneExists[id] = false;
};

GmxMaterial.prototype.clear = function () {
    if (this.isReady) {
        var gl = this.segment.handler.gl;

        this.isReady = false;
        this.pickingReady = false;

        var t = this.texture;
        this.texture = null;
        t && !t.default && gl.deleteTexture(t);

        t = this.pickingMask;
        this.pickingMask = null;
        t && !t.default && gl.deleteTexture(t);

        t = this._updateTexture;
        this._updateTexture = null;
        t && !t.default && gl.deleteTexture(t);

        t = this._updatePickingMask;
        this._updatePickingMask = null;
        t && !t.default && gl.deleteTexture(t);
    }

    this.layer.abortMaterialLoading(this);

    this.isLoading = false;
    this.textureExists = false;
    this.fromTile = null;
};

GmxMaterial.prototype.abort = function () {
    this.isLoading = false;
    this.isReady = false;
};

export { GmxMaterial };