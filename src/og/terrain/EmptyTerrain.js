/**
 * @module og/terrainProvider/EmptyTerrain
 */

'use strict';

/**
 * Class represents terrain provider without elevation data.
 * @class
 */
class EmptyTerrain {
    constructor() {

        this.blur = false;

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
        this.gridSizeByZoom = [32, 16, 16, 8, 4, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];

        this._maxNodeZoom = this.gridSizeByZoom.length - 1;

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

        this._geoid = null;
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

    get geoid() {
        return this._geoid;
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

    setGeoid(geoid) {
        this._geoid = geoid;
        //...this._planet
    }

    isReady() {
        return this._geoid && this._geoid.model || !this._geoid;
    }

    /**
     * Abstract function
     * @public
     * @abstract
     */
    abortLoading() { }
};

export { EmptyTerrain };