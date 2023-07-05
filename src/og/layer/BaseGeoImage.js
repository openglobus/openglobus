"use strict";

import { Extent } from "../Extent.js";
import { LonLat } from "../LonLat.js";
import * as mercator from "../mercator.js";
import { Layer } from "./Layer.js";
import { doubleToTwoFloats2 } from "../math/coder.js";

const EVENT_NAMES = [
    /**
     * Triggered when image data is loaded
     * @event og.layer.BaseGeoImage#loadend
     */
    "loadend"
];

/**
 * BaseGeoImage layer represents square imagery layer that could be an static image, or animated video or webgl buffer object displayed on the globe.
 * @class
 * @extends {Layer}
 */
class BaseGeoImage extends Layer {
    constructor(name, options) {
        super(name, { ...options, events: EVENT_NAMES });

        this._projType = 0;

        this._frameWidth = 256;
        this._frameHeight = 256;

        this._sourceReady = false;
        this._sourceTexture = null;
        this._materialTexture = null;

        this._gridBuffer = null;
        this._extentWgs84Params = null;
        this._extentWgs84ParamsHigh = new Float32Array(4);
        this._extentWgs84ParamsLow = new Float32Array(4);

        this._extentMercParams = null;
        this._extentMercParamsHigh = new Float32Array(4);
        this._extentMercParamsLow = new Float32Array(4);

        this._refreshFrame = true;
        this._frameCreated = false;
        this._sourceCreated = false;

        this._animate = false;
        this._ready = false;
        this._creationProceeding = false;
        this._isRendering = false;

        this._extentWgs84 = new Extent();
        this._cornersWgs84 = null;

        this._isFullExtent = options.fullExtent || false;

        /**
         * rendering function pointer
         */
        this.rendering = null;

        options.corners && this.setCorners(options.corners);
    }

    get isIdle() {
        return super.isIdle && this._ready;
    }

    addTo(planet) {
        this._onLoadend_ = this._onLoadend.bind(this);
        this.events.on("loadend", this._onLoadend_, this);
        return super.addTo(planet);
    }

    _onLoadend() {
        if (this._planet) {
            this._planet.events.dispatch(this._planet.events.layerloadend, this);
        }
    }

    remove() {
        this.events.off("loadend", this._onLoadend_);
        this._onLoadend_ = null;
        return super.remove();
    }

    get instanceName() {
        return "BaseGeoImage";
    }

    /**
     * Gets corners coordinates.
     * @public
     * @return {Array.<LonLat>} - (exactly 4 entries)
     */
    getCornersLonLat() {
        var c = this._cornersWgs84;
        return [
            new LonLat(c[0].lon, c[0].lat),
            new LonLat(c[1].lon, c[1].lat),
            new LonLat(c[2].lon, c[2].lat),
            new LonLat(c[3].lon, c[3].lat)
        ];
    }

    /**
     * Gets corners coordinates.
     * @public
     * @return {Array.<Array<number>>} - (exactly 3 entries)
     */
    getCorners() {
        var c = this._cornersWgs84;
        return [
            [c[0].lon, c[0].lat],
            [c[1].lon, c[1].lat],
            [c[2].lon, c[2].lat],
            [c[3].lon, c[3].lat]
        ];
    }

    /**
     * Sets geoImage geographical corners coordinates.
     * @public
     * @param {Array.<Array.<number>>} corners - GeoImage corners coordinates. Where first coordinate (exactly 3 entries)
     * coincedents to the left top image corner, secont to the right top image corner, third to the right bottom
     * and fourth - left bottom image corner.
     */
    setCorners(corners) {
        this.setCornersLonLat(LonLat.join(corners));
    }

    /**
     * Sets geoImage geographical corners coordinates.
     * @public
     * @param {Array.<LonLat>} corners - GeoImage corners coordinates. Where first coordinate
     * coincedents to the left top image corner, secont to the right top image corner, third to the right bottom
     * and fourth - left bottom image corner. (exactly 4 entries)
     */
    setCornersLonLat(corners) {
        this._refreshFrame = true;
        this._cornersWgs84 = [
            corners[0].clone(),
            corners[1].clone(),
            corners[2].clone(),
            corners[3].clone()
        ] || [0, 0, 0, 0];

        for (var i = 0; i < this._cornersWgs84.length; i++) {
            if (this._cornersWgs84[i].lat >= 89.9) {
                this._cornersWgs84[i].lat = 89.9;
            }
            if (this._cornersWgs84[i].lat <= -89.9) {
                this._cornersWgs84[i].lat = -89.9;
            }
        }
        this._extent.setByCoordinates(this._cornersWgs84);

        var me = this._extent;
        if (me.southWest.lat > mercator.MAX_LAT || me.northEast.lat < mercator.MIN_LAT) {
            this._projType = 0;
            this.rendering = this._renderingProjType0;
        } else {
            this._projType = 1;
            this.rendering = this._renderingProjType1;
        }

        if (this._ready && !this._creationProceeding) {
            this._planet._geoImageCreator.add(this);
        }
    }

    /**
     * Creates geoImage frame.
     * @protected
     */
    _createFrame() {
        this._extentWgs84 = this._extent.clone();

        this._cornersMerc = [
            this._cornersWgs84[0].forwardMercatorEPS01(),
            this._cornersWgs84[1].forwardMercatorEPS01(),
            this._cornersWgs84[2].forwardMercatorEPS01(),
            this._cornersWgs84[3].forwardMercatorEPS01()
        ];

        this._extentMerc = new Extent(
            this._extentWgs84.southWest.forwardMercatorEPS01(),
            this._extentWgs84.northEast.forwardMercatorEPS01()
        );

        let tempArr = new Float32Array(2);

        if (this._projType === 0) {

            doubleToTwoFloats2(this._extentWgs84.southWest.lon, tempArr);
            this._extentWgs84ParamsHigh[0] = tempArr[0];
            this._extentWgs84ParamsLow[0] = tempArr[1];

            doubleToTwoFloats2(this._extentWgs84.southWest.lat, tempArr);
            this._extentWgs84ParamsHigh[1] = tempArr[0];
            this._extentWgs84ParamsLow[1] = tempArr[1];

            this._extentWgs84ParamsHigh[2] = 2.0 / this._extentWgs84.getWidth();
            this._extentWgs84ParamsHigh[3] = 2.0 / this._extentWgs84.getHeight();

        } else {

            doubleToTwoFloats2(this._extentMerc.southWest.lon, tempArr);
            this._extentMercParamsHigh[0] = tempArr[0];
            this._extentMercParamsLow[0] = tempArr[1];

            doubleToTwoFloats2(this._extentMerc.southWest.lat, tempArr);
            this._extentMercParamsHigh[1] = tempArr[0];
            this._extentMercParamsLow[1] = tempArr[1];

            this._extentMercParamsHigh[2] = 2.0 / this._extentMerc.getWidth();
            this._extentMercParamsHigh[3] = 2.0 / this._extentMerc.getHeight();
        }

        // creates material frame textures
        if (this._planet) {
            var p = this._planet,
                h = p.renderer.handler,
                gl = h.gl;

            gl.deleteTexture(this._materialTexture);
            this._materialTexture = h.createEmptyTexture_l(this._frameWidth, this._frameHeight);

            let gridBufferArr = this._planet._geoImageCreator.createGridBuffer(
                this._cornersWgs84,
                this._projType
            );

            this._gridBufferHigh = gridBufferArr[0];
            this._gridBufferLow = gridBufferArr[1];

            this._refreshFrame = false;
        }
    }

    /**
     * @virtual
     * @param {Material} material - GeoImage material.
     */
    abortMaterialLoading(material) {
        this._creationProceeding = false;
        material.isLoading = false;
        material.isReady = false;
    }

    /**
     * Clear layer material.
     * @virtual
     */
    clear() {
        let p = this._planet;

        if (p) {
            let gl = p.renderer.handler.gl;
            this._creationProceeding && p._geoImageCreator.remove(this);
            p._clearLayerMaterial(this);

            if (gl) {
                gl.deleteBuffer(this._gridBuffer);
                gl.deleteTexture(this._sourceTexture);
                this._materialTexture && !this._materialTexture.default && gl.deleteTexture(this._materialTexture);
            }
        }

        this._sourceTexture = null;
        this._materialTexture = null;

        this._gridBuffer = null;

        this._refreshFrame = true;
        this._sourceCreated = false;

        this._ready = false;
        this._creationProceeding = false;
    }

    /**
     * Sets layer visibility.
     * @public
     * @virtual
     * @param {boolean} visibility - GeoImage visibility.
     */
    setVisibility(visibility) {
        if (visibility !== this._visibility) {
            super.setVisibility(visibility);

            // remove from creator
            if (visibility) {
                this._sourceReady && this._planet._geoImageCreator.add(this);
            } else {
                this._sourceReady && this._planet._geoImageCreator.remove(this);
            }
        }
    }

    /**
     * @virtual
     * @protected
     * @param {Material} material - GeoImage material.
     */
    clearMaterial(material) {
        material.image = null;
        material.texture = null;
        material.isLoading = false;
        material.isReady = false;
    }

    /**
     * @virtual
     * @protected
     * @param {Material} material - GeoImage segment material.
     * @returns {Array<number> } -
     */
    applyMaterial(material) {
        var segment = material.segment;

        if (this._ready) {
            material.applyTexture(this._materialTexture);
        } else {
            material.texture = this._planet.transparentTexture;
            !this._creationProceeding && this.loadMaterial(material);
        }

        let v0s, v0t;
        if (this._projType === 0) {
            v0s = this._extentWgs84;
            v0t = segment._extent;
        } else {
            v0s = this._extentMerc;
            v0t = segment.getExtentMerc();
        }

        var sSize_x = v0s.northEast.lon - v0s.southWest.lon;
        var sSize_y = v0s.northEast.lat - v0s.southWest.lat;
        var dV0s_x = (v0t.southWest.lon - v0s.southWest.lon) / sSize_x;
        var dV0s_y = (v0s.northEast.lat - v0t.northEast.lat) / sSize_y;
        var dSize_x = (v0t.northEast.lon - v0t.southWest.lon) / sSize_x;
        var dSize_y = (v0t.northEast.lat - v0t.southWest.lat) / sSize_y;
        return [dV0s_x, dV0s_y, dSize_x, dSize_y];
    }

    /**
     * Gets frame width size in pixels.
     * @public
     * @returns {Number} Frame width.
     */
    get getFrameWidth() {
        return this._frameWidth;
    }

    /**
     * Gets frame height size in pixels.
     * @public
     * @returns {Number} Frame height.
     */
    get getFrameHeight() {
        return this._frameHeight;
    }

    /**
     * Method depends on GeoImage instance
     * @virtual
     * @private
     */
    _createSourceTexture() {
        //empty
    }

    _renderingProjType1() {
        let p = this._planet,
            h = p.renderer.handler,
            gl = h.gl,
            creator = p._geoImageCreator;

        this._refreshFrame && this._createFrame();
        this._createSourceTexture();

        let f = creator._framebuffer;
        f.setSize(this._frameWidth, this._frameHeight);
        f.activate();

        h.programs.geoImageTransform.activate();
        var sh = h.programs.geoImageTransform._program;
        var sha = sh.attributes,
            shu = sh.uniforms;

        gl.disable(gl.CULL_FACE);

        f.bindOutputTexture(this._materialTexture);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform1i(shu.isFullExtent, this._isFullExtent);

        gl.bindBuffer(gl.ARRAY_BUFFER, creator._texCoordsBuffer);

        gl.vertexAttribPointer(sha.texCoords, 2, gl.UNSIGNED_SHORT, true, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBufferHigh);
        gl.vertexAttribPointer(sha.cornersHigh, this._gridBufferHigh.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBufferLow);
        gl.vertexAttribPointer(sha.cornersLow, this._gridBufferLow.itemSize, gl.FLOAT, false, 0, 0);

        gl.uniform4fv(shu.extentParamsHigh, this._extentMercParamsHigh);
        gl.uniform4fv(shu.extentParamsLow, this._extentMercParamsLow);

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
        let p = this._planet,
            h = p.renderer.handler,
            gl = h.gl,
            creator = p._geoImageCreator;

        this._refreshFrame && this._createFrame();
        this._createSourceTexture();

        let f = creator._framebuffer;
        f.setSize(this._frameWidth, this._frameHeight);
        f.activate();

        h.programs.geoImageTransform.activate();
        let sh = h.programs.geoImageTransform._program;
        let sha = sh.attributes,
            shu = sh.uniforms;

        gl.disable(gl.CULL_FACE);

        f.bindOutputTexture(this._materialTexture);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, creator._texCoordsBuffer);

        gl.vertexAttribPointer(sha.texCoords, 2, gl.UNSIGNED_SHORT, true, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBufferHigh);
        gl.vertexAttribPointer(sha.cornersHigh, this._gridBufferHigh.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBufferLow);
        gl.vertexAttribPointer(sha.cornersLow, this._gridBufferLow.itemSize, gl.FLOAT, false, 0, 0);

        gl.uniform4fv(shu.extentParamsHigh, this._extentWgs84ParamsHigh);
        gl.uniform4fv(shu.extentParamsLow, this._extentWgs84ParamsLow);

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

export { BaseGeoImage };
