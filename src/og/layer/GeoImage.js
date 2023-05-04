/**
 * @module og/layer/GeoImage
 */

"use strict";

import { nextHighestPowerOfTwo } from "../math.js";
import { BaseGeoImage } from "./BaseGeoImage.js";

/**
 * Used to load and display a single image over specific corner coordinates on the globe, implements og.layer.BaseGeoImage interface.
 * @class
 * @extends {BaseGeoImage}
 */
class GeoImage extends BaseGeoImage {
    constructor(name, options) {
        super(name, options);

        /**
         * Image object.
         * @private
         * @type {Image}
         */
        this._image = options.image || null;

        /**
         * Image source url path.
         * @private
         * @type {String}
         */
        this._src = options.src || null;
    }

    get instanceName() {
        return "GeoImage";
    }

    abortLoading() {
        this._image.src = "";
    }

    /**
     * Sets image source url path.
     * @public
     * @param {String} srs - Image url path.
     */
    setSrc(src) {
        this._planet && this._planet._geoImageCreator.remove(this);
        this._image = null;
        this._src = src;
        this._sourceReady = false;
        this._sourceCreated = false;

        let that = this;
        this._image = new Image();
        this._image.addEventListener("load", function (e) {
            that._onLoad(this);
        });
        this._image.src = this._src;

    }

    /**
     * Sets image object.
     * @public
     * @param {Image} image - Image object.
     */
    setImage(image) {
        this._planet && this._planet._geoImageCreator.remove(this);
        this._sourceCreated = false;
        this._sourceReady = false;
        this._image = image;
        this._src = image.src;
    }

    /**
     * Creates source gl texture.
     * @virtual
     * @protected
     */
    _createSourceTexture() {
        if (!this._sourceCreated) {
            this._sourceTexture = this._planet.renderer.handler.createTexture_l(this._image);
            this._sourceCreated = true;
        }
    }

    /**
     * @private
     * @param {Image} img
     */
    _onLoad(img) {
        this._frameWidth = nextHighestPowerOfTwo(img.width * 2, 4096);
        this._frameHeight = nextHighestPowerOfTwo(img.height * 3, 4096);
        this._sourceReady = true;
        this._planet._geoImageCreator.add(this);
    }

    /**
     * Loads planet segment material. In this case - GeoImage source image.
     * @virtual
     * @public
     * @param {Material} material - GeoImage planet material.
     */
    loadMaterial(material) {
        material.isLoading = true;
        this._creationProceeding = true;
        if (!this._sourceReady && this._src) {
            if (this._image) {
                if (this._image.complete) {
                    this._onLoad(this._image);
                } else if (this._image.src) {
                    let that = this;
                    this._image.addEventListener("load", function (e) {
                        that._onLoad(this);
                    });
                }
            } else {
                let that = this;
                this._image = new Image();
                this._image.addEventListener("load", function (e) {
                    that._onLoad(this);
                });
                this._image.src = this._src;
            }
        } else {
            this._planet._geoImageCreator.add(this);
        }
    }

    /**
     * @virtual
     * @param {Material} material - GeoImage material.
     */
    abortMaterialLoading(material) {
        this._image && (this._image.src = "");
        this._creationProceeding = false;
        material.isLoading = false;
        material.isReady = false;
    }
}

export { GeoImage };
