/**
 * @module og/terrainProvider/EmptyTerrainProvider
 */

'use strict';

/**
 * Class represents terrain provider without elevation data.
 * @class
 */
class EmptyTerrainProvider {
    constructor() {
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
        this.minZoom = 50;

        /**
         * Maximal z-index value for segment elevation data handling.
         * @public
         * @type {number}
         */
        this.maxZoom = 50;

        /**
         * @public
         * @type {Array.<number>}
         */
        this.gridSizeByZoom = [32, 16, 16, 8, 4, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];

        /**
         * Elevation grid size. Currend is 2x2 is the smallest grid size.
         * @public
         * @type {number}
         */
        this.fileGridSize = 2;

        /**
         * Planet node.
         * @protected
         * @type {og.scene.Planet}
         */
        this._planet = null;
    }

    /**
     * Loads or creates segment elevation data.
     * @public
     * @virtual
     * @param {og.planetSegment.Segment} segment - Segment to create elevation data.
     */
    handleSegmentTerrain(segment) {
        segment.terrainIsLoading = false;
        segment.terrainReady = true;
        segment.terrainExists = true;
    }

    /**
     * Abstract function
     * @public
     * @abstract
     */
    abortLoading() { }
};

export { EmptyTerrainProvider };