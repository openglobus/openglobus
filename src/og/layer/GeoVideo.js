/**
 * @module og/layer/GeoVideo
 */

"use strict";

import { BaseGeoImage } from "./BaseGeoImage.js";

/**
 * Used to load and display a video stream by specific corners coordinates on the globe, implements og.layer.BaseGeoImage interface.
 * @class
 * @extends {BaseGeoImage}
 */
class GeoVideo extends BaseGeoImage {
    constructor(name, options) {
        super(name, options);

        /**
         * @protected
         * @const
         * @type {Boolean}
         */
        this._animate = true;

        /**
         * HTML5 video element object.
         * @private
         * @type {Object}
         */
        this._video = options.videoElement || null;

        /**
         * VIdeo source url path.
         * @private
         * @type {String}
         */
        this._src = options.src || null;
    }

    get instanceName() {
        return "GeoVideo";
    }

    /**
     * Sets video source url path.
     * @public
     * @param {String} srs - Video url path.
     */
    setSrc(src) {
        this._planet && this._planet._geoImageCreator.remove(this);
        this._src = src;
        this._sourceReady = false;
    }

    /**
     * Sets HTML5 video object.
     * @public
     * @param {Object} video - HTML5 video element object.
     */
    setVideoElement(video) {
        this._planet && this._planet._geoImageCreator.remove(this);
        this._video = video;
        this._src = video.src;
        this._sourceReady = false;
    }

    /**
     * Sets layer visibility.
     * @public
     * @param {boolean} visibility - Layer visibility.
     */
    setVisibility(visibility) {
        if (visibility != this._visibility) {
            super.setVisibility(visibility);

            // remove from creator
            if (visibility) {
                this._sourceReady && this._planet._geoImageCreator.add(this);
                this._video && this._video.play();
            } else {
                this._sourceReady && this._planet._geoImageCreator.remove(this);
                this._video && this._video.pause();
            }
        }
    }

    /**
     * Creates or refresh source video GL texture.
     * @virtual
     * @protected
     */
    _createSourceTexture() {
        let gl = this._planet.renderer.handler.gl;
        if (this._sourceCreated) {
            gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._video);
        } else {
            this._sourceTexture = this._planet.renderer.handler.createTexture_n_webgl1(this._video);
            this._sourceCreated = true;
        }
    }

    /**
     * @private
     */
    _onCanPlay(video) {
        this._frameWidth = video.videoWidth;
        this._frameHeight = video.videoHeight;
        video.width = video.videoWidth;
        video.height = video.videoHeight;
        video.play();
        this._sourceReady = true;
        this._planet._geoImageCreator.add(this);
    }

    /**
     * @private
     */
    _onError(video) {
        let err = "unknown error";
        switch (video.error.code) {
            case 1:
                err = "video loading aborted";
                break;
            case 2:
                err = "network loading error";
                break;
            case 3:
                err = "video decoding failed / corrupted data or unsupported codec";
                break;
            case 4:
                err = "video not supported";
                break;
        }
        console.log("Error: " + err + " (errorcode=" + video.error.code + ")");
    }

    /**
     * Loads planet segment material. In this case - GeoImage source video.
     * @virtual
     * @public
     * @param {Material} material - GeoImage planet material.
     */
    loadMaterial(material) {
        material.isLoading = true;
        this._creationProceeding = true;
        if (!this._sourceReady && this._src) {
            if (this._video) {
                if (this._video.readyState === this._video.HAVE_ENOUGH_DATA) {
                    this._onCanPlay(this._video);
                } else if (this._video.src) {
                    let that = this;
                    this._video.addEventListener("canplay", function (e) {
                        that._onCanPlay(this);
                    });
                }
            } else {
                this._video = document.createElement("video");
                this._video.crossOrigin = "Anonymous";
                let that = this;
                this._video.addEventListener("canplay", function () {
                    that._onCanPlay(this);
                });
                this._video.addEventListener("error", function () {
                    that._onError(this);
                });
            }
            this._video.autoplay = true;
            this._video.loop = true;
            this._video.src = this._src;
            this._video.muted = "muted";
            this._video.setAttribute("playsinline", "true");
            this._video.setAttribute("webkit-playsinline", "true");
        } else {
            this._planet._geoImageCreator.add(this);
        }
    }

    /**
     * @virtual
     * @param {Material} material - GeoImage material.
     */
    abortMaterialLoading(material) {
        this._video && (this._video.src = "");
        this._creationProceeding = false;
        material.isLoading = false;
        material.isReady = false;
    }
}

export { GeoVideo };
