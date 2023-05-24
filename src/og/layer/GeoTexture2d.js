'use strict';

import * as math from '../math.js';
import { BaseGeoImage } from './BaseGeoImage.js';

class GeoTexture2d extends BaseGeoImage {
    constructor(name, options) {
        super(name, options);

        this._sourceTexture = options.texture || null;

        if (options.texture) {
            this._sourceReady = true;
            this._sourceCreated = true;
        }

        this._frameWidth = options.frameWidth ? math.nextHighestPowerOfTwo(options.frameWidth) : 256;
        this._frameHeight = options.frameHeight ? math.nextHighestPowerOfTwo(options.frameHeight) : 256;

        this._animate = true;
    }

    get instanceName() {
        return "GeoTexture2d";
    }

    loadMaterial(material) {
        this._planet._geoImageCreator.add(this);
    }

    bindTexture(texture) {
        this._sourceReady = true;
        this._sourceCreated = true;
        this._sourceTexture = texture;
    }

    setSize(width, height) {
        this._frameWidth = width;
        this._frameHeight = height;
        this._frameCreated = false;
    }

    abortMaterialLoading(material) {
        this._creationProceeding = false;
        material.isLoading = false;
        material.isReady = false;
    }
}

export { GeoTexture2d };
