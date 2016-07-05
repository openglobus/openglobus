goog.provide('og.terrainProvider.EmptyTerrainProvider')

/**
 * Class represents terrain provider without elevation data.
 * @class
 */
og.terrainProvider.EmptyTerrainProvider = function () {
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
};

/**
 * Loads or creates segment elevation data.
 * @public
 * @virtual
 * @param {og.planetSegment.Segment} segment - Segment to create elevation data.
 */
og.terrainProvider.EmptyTerrainProvider.prototype.handleSegmentTerrain = function (segment) {
    segment.terrainIsLoading = false;
    segment.terrainReady = true;
    segment.terrainExists = true;
};