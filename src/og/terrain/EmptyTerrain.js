/**
 * @module og/terrainProvider/EmptyTerrain
 */

"use strict";

import { binarySearchFast } from "../utils/shared.js";

/**
 * Class represents terrain provider without elevation data.
 * @class
 */
class EmptyTerrain {
    constructor(options = {}) {
        this.equalizeVertices = false;

        this.equalizeNormals = false;

        /**
         * Provider name is "empty"
         * @public
         * @type {string}
         */
        this.name = "empty";

        /**
         * Minimal z-index value for segment elevation data handling.
         * @public
         * @type {number}
         */
        this.minZoom = 1000000;

        /**
         * Maximal z-index value for segment elevation data handling.
         * @public
         * @type {number}
         */
        this.maxZoom = 21;

        /**
         * @public
         * @type {Array.<number>}
         */
        this.gridSizeByZoom = options.gridSizeByZoom || [
            32, 16, 16, 8, 4, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2
        ];
        //this.gridSizeByZoom = options.gridSizeByZoom || [32, 16, 16, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 4, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2];

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
         * @type {scene.Planet}
         */
        this._planet = null;

        this._geoid = null;

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
        //...this._planet
    }

    get geoid() {
        return this._geoid;
    }

    /**
     * Loads or creates segment elevation data.
     * @public
     * @virtual
     * @param {planetSegment.Segment} segment - Segment to create elevation data.
     */
    handleSegmentTerrain(segment) {
        segment.terrainIsLoading = false;
        segment.terrainReady = true;
        segment.terrainExists = true;
    }

    isReady() {
        return (this._geoid && this._geoid.model) || !this._geoid;
    }

    /**
     * Abstract function
     * @public
     * @abstract
     */
    abortLoading() {}

    /**
     * Abstract function
     * @public
     * @abstract
     */
    clearCache() {}
}

export { EmptyTerrain };
