/**
 * @module og/gmx/GmxMaterial
 */

'use strict';

import { inherits } from '../../inherits.js';
import { Material } from '../../layer/Material.js';

const GmxMaterial = function (segment, layer) {

    Material.call(this, segment, layer);

    this.fromTile = null;

    this.sceneIsLoading = false;
    this.sceneExists = false;
    this.sceneReady = false;
    this.sceneTexture = null;
};

inherits(GmxMaterial, Material);

GmxMaterial.applySceneBitmapImage = function (bitmapImage) {
    this.sceneTexture = this.segment.handler.createTexture(bitmapImage);
    this.sceneExists = true;
    this.sceneReady = true;
    this.sceneIsLoading = false;
};


GmxMaterial.prototype.sceneNotExists = function () {
    this.sceneExists = false;
};

export { GmxMaterial };