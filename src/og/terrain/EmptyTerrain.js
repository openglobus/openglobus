"use strict";

import { binarySearchFast } from "../utils/shared.js";
import { Geoid } from "./Geoid.js";

/**
 * Class represents terrain provider without elevation data.
 * @param {Object} [options] - Provider options:
 * @param {string} [options.name="empty"] - Provider name.
 * @param {number} [options.minZoom=2] - Minimal visible zoom index when terrain handler works.
 * @param {number} [options.minZoom=50] - Maximal visible zoom index when terrain handler works.
 * @param {number} [options.minNativeZoom=50] - Maximal available terrain zoom level.
 * @param {Array.<number>} [options.gridSizeByZoom] - Array of segment triangulation grid sizes where array index agreed to the segment zoom index.
 * @param {Array.<number>} [gridSizeByZoom] - Array of values, where each value corresponds to the size of a tile(or segment) on the globe. Each value must be power of two.
 */
class EmptyTerrain {
    constructor(options = {}) {

        this.equalizeVertices = options.equalizeVertices || false;

        this.equalizeNormals = false;

        this.isEmpty = true;

        /**
         * Provider name is "empty"
         * @public
         * @type {string}
         */
        this.name = options.name || "empty";

        /**
         * Minimal z-index value for segment elevation data handling.
         * @public
         * @type {number}
         */
        this.minZoom = options.minZoom || 2;

        /**
         * Maximal z-index value for segment elevation data handling.
         * @public
         * @type {number}
         */
        this.maxZoom = options.maxZoom || 50;

        /**
         * Maximal existent available zoom
         * @type {number}
         */
        this.maxNativeZoom = options.maxNativeZoom || this.maxZoom;

        /**
         * @public
         * @type {Array.<number>}
         */
        this.gridSizeByZoom = options.gridSizeByZoom || [
            64, 32, 16, 8, 4, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2
        ];

        this._maxNodeZoom = this.gridSizeByZoom.length - 1;

        /**
         * Elevation grid size. Currend is 2x2 is the smallest grid size.
         * @public
         * @type {number}
         */
        this.plainGridSize = 2;

        /**
         * Planet node.
         * @protected
         * @type {Planet}
         */
        this._planet = null;

        this._geoid =
            options.geoid ||
            new Geoid({
                src: options.geoidSrc || null
            });

        this._isReady = false;

        // const _ellToAltFn = [
        //     (lon, lat, alt, callback) => callback(alt),
        //     (lon, lat, alt, callback) => callback(alt - this._geoid.getHeight(lon, lat)),
        //     (lon, lat, alt, callback) => {

        //         let x = mercator.getTileX(lon, zoom),
        //             y = mercator.getTileY(lat, zoom);

        //         let mslAlt = alt - this._geoid.getHeight(lon, lat);

        //         if (true) {

        //         } else {

        //         }

        //         return callback(mslAlt);
        //     },
        // ];
    }

    static checkNoDataValue(noDataValues, value) {
        return binarySearchFast(noDataValues, value) !== -1;
    }

    isBlur() {
        return false;
    }

    set maxNodeZoom(val) {
        if (val > this.gridSizeByZoom.length - 1) {
            val = this.gridSizeByZoom.length - 1;
        }
        this._maxNodeZoom = val;
    }

    get maxNodeZoom() {
        return this._maxNodeZoom;
    }

    set geoid(geoid) {
        this._geoid = geoid;
    }

    get geoid() {
        return this._geoid;
    }

    getGeoid() {
        return this._geoid;
    }

    /**
     * Loads or creates segment elevation data.
     * @public
     * @virtual
     * @param {Segment} segment - Segment to create elevation data.
     */
    handleSegmentTerrain(segment) {
        segment.terrainIsLoading = false;
        segment.terrainReady = true;
        segment.terrainExists = true;
    }

    isReady() {
        return this._isReady;
    }

    /**
     * Abstract function
     * @public
     * @abstract
     */
    abortLoading() {
    }

    /**
     * Abstract function
     * @public
     * @abstract
     */
    clearCache() {
    }

    getHeightAsync(lonLat, callback) {
        callback(0);
        return true;
    }
}

export { EmptyTerrain };
