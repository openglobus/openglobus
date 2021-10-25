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
        if (!this._sourceCreated) {
            this._sourceTexture = this._planet.renderer.handler.createTexture_n(this._video);
            this._sourceCreated = true;
        } else {
            var gl = this._planet.renderer.handler.gl;
            gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._video);
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
        var err = "unknown error";
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
     * @param {og.planetSegment.Material} material - GeoImage planet material.
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
     * @param {og.planetSegment.Material} material - GeoImage material.
     */
    abortMaterialLoading(material) {
        this._video && (this._video.src = "");
        this._creationProceeding = false;
        material.isLoading = false;
        material.isReady = false;
    }

    _renderingProjType1() {
        var p = this._planet,
            h = p.renderer.handler,
            gl = h.gl,
            creator = p._geoImageCreator;

        this._refreshFrame && this._createFrame();

        if (this._sourceCreated) {
            gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._video);
        } else {
            this._sourceTexture = this._planet.renderer.handler.createTexture_n(this._video);
            this._sourceCreated = true;
        }

        var f = creator._framebuffer;
        f.setSize(this._frameWidth, this._frameHeight);
        f.activate();

        h.programs.geoImageTransform.activate();
        var sh = h.programs.geoImageTransform._program;
        var sha = sh.attributes,
            shu = sh.uniforms;

        var tr = this.transparentColor[0],
            tg = this.transparentColor[1],
            tb = this.transparentColor[2];

        gl.disable(gl.CULL_FACE);

        f.bindOutputTexture(this._materialTexture);
        gl.clearColor(tr, tg, tb, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, creator._texCoordsBuffer);

        gl.vertexAttribPointer(sha.texCoords, 2, gl.UNSIGNED_SHORT, true, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBuffer);
        gl.vertexAttribPointer(sha.corners, this._gridBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(shu.extentParams, this._extentMercParams);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
        gl.uniform1i(shu.sourceTexture, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, creator._indexBuffer);
        gl.drawElements(gl.TRIANGLE_STRIP, creator._indexBuffer.numItems, gl.UNSIGNED_INT, 0);
        f.deactivate();

        gl.enable(gl.CULL_FACE);

        this._ready = true;

        this._creationProceeding = false;
    }

    _renderingProjType0() {
        var p = this._planet,
            h = p.renderer.handler,
            gl = h.gl,
            creator = p._geoImageCreator;

        this._refreshFrame && this._createFrame();
        if (!this._sourceCreated) {
            this._sourceTexture = this._planet.renderer.handler.createTexture_n(this._video);
            this._sourceCreated = true;
        } else {
            gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._video);
        }

        var f = creator._framebuffer;
        f.setSize(this._frameWidth, this._frameHeight);
        f.activate();

        h.programs.geoImageTransform.activate();
        var sh = h.programs.geoImageTransform._program;
        var sha = sh.attributes,
            shu = sh.uniforms;

        var tr = this.transparentColor[0],
            tg = this.transparentColor[1],
            tb = this.transparentColor[2];

        gl.disable(gl.CULL_FACE);

        f.bindOutputTexture(this._materialTexture);
        gl.clearColor(tr, tg, tb, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, creator._texCoordsBuffer);

        gl.vertexAttribPointer(sha.texCoords, 2, gl.UNSIGNED_SHORT, true, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBuffer);
        gl.vertexAttribPointer(sha.corners, this._gridBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(shu.extentParams, this._extentWgs84Params);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
        gl.uniform1i(shu.sourceTexture, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, creator._indexBuffer);
        gl.drawElements(gl.TRIANGLE_STRIP, creator._indexBuffer.numItems, gl.UNSIGNED_INT, 0);
        f.deactivate();

        gl.enable(gl.CULL_FACE);

        this._ready = true;

        this._creationProceeding = false;
    }
}

export { GeoVideo };
