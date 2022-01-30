/**
 * @module og/layer/BaseGeoImage
 */

"use strict";

import * as mercator from "../mercator.js";
import { Extent } from "../Extent.js";
import { Layer } from "./Layer.js";
import { LonLat } from "../LonLat.js";

/**
 * BaseGeoImage layer represents square imagery layer that could be an static image, or animated video or webgl buffer object displayed on the globe.
 * @class
 * @extends {Layer}
 */
class BaseGeoImage extends Layer {
    constructor(name, options) {
        super(name, options);

        this._projType = 0;

        this._frameWidth = 256;
        this._frameHeight = 256;

        this._sourceReady = false;
        this._sourceTexture = null;
        this._materialTexture = null;

        this._gridBuffer = null;
        this._extentWgs84Params = null;

        this._refreshFrame = true;
        this._frameCreated = false;
        this._sourceCreated = false;

        this._animate = false;
        this._ready = false;
        this._creationProceeding = false;
        this._isRendering = false;

        this._extentWgs84 = new Extent();
        this._cornersWgs84 = null;

        this.rendering = null;

        options.corners && this.setCorners(options.corners);
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

        if (this._projType === 0) {
            this._extentWgs84Params = [
                this._extentWgs84.southWest.lon,
                this._extentWgs84.southWest.lat,
                2.0 / this._extentWgs84.getWidth(),
                2.0 / this._extentWgs84.getHeight()
            ];
        } else {
            this._extentMercParams = [
                this._extentMerc.southWest.lon,
                this._extentMerc.southWest.lat,
                2.0 / this._extentMerc.getWidth(),
                2.0 / this._extentMerc.getHeight()
            ];
        }

        // creates material frame textures
        if (this._planet) {
            var p = this._planet,
                h = p.renderer.handler,
                gl = h.gl;

            gl.deleteTexture(this._materialTexture);
            this._materialTexture = h.createEmptyTexture_l(this._frameWidth, this._frameHeight);

            this._gridBuffer = this._planet._geoImageCreator.createGridBuffer(
                this._cornersWgs84,
                this._projType
            );

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
        var p = this._planet;

        if (p) {
            var gl = p.renderer.handler.gl;
            this._creationProceeding && p._geoImageCreator.remove(this);
            p._clearLayerMaterial(this);

            gl.deleteBuffer(this._gridBuffer);

            gl.deleteTexture(this._sourceTexture);
            !this._materialTexture.default && gl.deleteTexture(this._materialTexture);
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
     * @param {Material} material - GeoImage material.
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

        var v0s, v0t;
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
}

export { BaseGeoImage };
