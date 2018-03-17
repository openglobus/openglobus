/**
 * @module og/terrainProvider/GlobusTerrain
 */

'use strict';

import * as quadTree from '../quadTree/quadTree.js';
import { ajax } from '../ajax.js';
import { EmptyTerrain } from './EmptyTerrain.js';
import { EPSG3857 } from '../proj/EPSG3857.js';
import { Events } from '../Events.js';
import { QueueArray } from '../QueueArray.js';
import { stringTemplate } from '../utils/shared.js';

const EVENT_NAMES = [
    /**
    * Triggered when current elevation tile has loaded but before rendereing.
    * @event og.terrainProvider.TerrainProvider#load
    */
    "load",

    /**
    * Triggered when all elevation tiles have loaded or loading has stopped.
    * @event og.terrainProvider.TerrainProvider#loadend
    */
    "loadend"
];

/**
 * Class that loads segment elevation data, converts it to the array and passes it to the planet segment.
 * @class
 * @extends {og.terrainProvider.EmptyTerrainProvider}
 * @param {string} [name=""] - Terrain provider name.
 * @param {Object} [options] - Provider options:
 * @param {number} [options.minZoom=3] - Minimal visible zoom index when terrain handler works.
 * @param {number} [options.minZoom=14] - Maximal visible zoom index when terrain handler works.
 * @param {string} [options.url="http://earth3.openglobus.org/{z}/{y}/{x}.ddm"] - Terrain source path url template. Default is openglobus ddm elevation file.
 * @param {Array.<number>} [options.gridSizeByZoom] - Array of segment triangulation grid sizes where array index agreed to the segment zoom index.
 * @param {number} [options.fileGridSize=32] - Elevation tile grid size. Default is 32x32.
 * @param {string} [options.responseType="arraybuffer"] - Ajax responce type.
 * @param {number} [options.MAX_LOADING_TILES] - Maximum at one time loading tiles.
 * @fires og.terrainProvider.TerrainProvider#load
 * @fires og.terrainProvider.TerrainProvider#loadend
 */
class GlobusTerrain extends EmptyTerrain {
    constructor(name, options) {
        super();
        options = options || {};

        /**
         * Provider name.
         * @public
         * @type {string}
         */
        this.name = name || "";

        /**
         * Minimal visible zoom index when terrain handler works.
         * @public
         * @type {number}
         */
        this.minZoom = options.minZoom || 3;

        /**
         * Maximal visible zoom index when terrain handler works.
         * @public
         * @type {number}
         */
        this.maxZoom = options.maxZoom || 14;

        /**
         * Terrain source path url template. 
         * @public
         * @type {string}
         */
        this.url = options.url || "http://earth3.openglobus.org/{z}/{y}/{x}.ddm";

        /**
         * Array of segment triangulation grid sizes where array index agreed to the segment zoom index.
         * @public
         * @type {Array.<number>}
         */
        this.gridSizeByZoom = options.gridSizeByZoom || [64, 32, 32, 16, 16, 8, 8, 8, 8, 16, 16, 16, 16, 32, 32, 32, 32, 32, 32, 32, 32];

        /**
         * Elevation tile grid size.
         * @public
         * @type {number}
         */
        this.fileGridSize = options.fileGridSize || 32;

        /**
         * Ajax elevation data tile query responce type.
         * @public
         * @type {string}
         */
        this.responseType = options.responseType || "arraybuffer";

        /**
         * Maximum at one time loading tiles.
         * @public
         * @number
         */
        this.MAX_LOADING_TILES = options.MAX_LOADING_TILES || 8;

        /**
         * Events handler.
         * @public
         * @type {og.Events}
         */
        this.events = new Events(EVENT_NAMES, this);

        this._elevationCache = {};

        /**
         * Current loadings counter.
         * @protected
         * @type {number}
         */
        this._counter = 0;

        /**
         * Loading pending queue.
         * @protected
         * @type {Array.<og.planetSegment.Segment>}
         */
        this._pendingsQueue = new QueueArray();

        /**
         * Rewrites elevation storage url query.
         * @private
         * @callback og.terrainProvider.TerrainProvider~_urlRewriteCallback
         * @param {og.planetSegment.Segment} segment - Segment to load.
         * @param {string} url - Created url.
         * @returns {string} - Url query string.
         */
        this._urlRewriteCallback = null;
    }

    /**
     * Stop loading.
     * @public
     */
    abort() {
        this._pendingsQueue.length = 0;
    }

    /**
     * Sets terrain data url template.
     * @public
     * @param {string} url - Url template.
     * @example <caption>Default openglobus url template:</caption>:
     * "http://earth3.openglobus.org/{z}/{y}/{x}.ddm"
     */
    setUrl(url) {
        this.url = url;
    }

    /**
     * Sets provider name.
     * @public
     * @param {string} name - Name.
     */
    setName(name) {
        this.name = name;
    }

    /**
     * Starts to load segment data.
     * @public
     * @virtual
     * @param {og.planetSegment.Segment} segment - Segment that wants a terrain data.
     */
    handleSegmentTerrain(segment) {
        if (this._planet.terrainLock.isFree()) {
            segment.terrainReady = false;
            segment.terrainIsLoading = true;
            if (segment._projection.id === EPSG3857.id) {
                var cacheData = this._elevationCache[segment.getTileIndex()];
                if (cacheData) {
                    this._applyElevationsData(segment, cacheData, true);
                } else {
                    if (this._counter >= this.MAX_LOADING_TILES) {
                        this._pendingsQueue.push(segment);
                    } else {
                        this._exec(segment);
                    }
                }
            } else {
                //TODO: poles elevation
            }
        } else {
            segment.terrainIsLoading = false;
        }
    }

    /**
     * Creates query url.
     * @protected
     * @virtual
     * @param {og.planetSegment.Segment}
     */
    _createUrl(segment) {
        return stringTemplate(this.url, {
            "x": segment.tileX.toString(),
            "y": segment.tileY.toString(),
            "z": segment.tileZoom.toString()
        });
    }

    /**
     * Returns actual url query string.
     * @protected
     * @param {og.planetSegment.Segment} segment - Segment that loads elevation data.
     * @returns {string}
     */
    _getHTTPRequestString(segment) {
        var url = this._createUrl(segment);
        return this._urlRewriteCallback ? this._urlRewriteCallback(segment, url) : url;
    }

    /**
     * Sets url rewrite callback, used for custom url rewriting for every tile laoding.
     * @public
     * @param {og.terrainProvider.TerrainProvider~_urlRewriteCallback} ur - The callback that returns tile custom created url.
     */
    setUrlRewriteCallback(ur) {
        this._urlRewriteCallback = ur;
    }

    /**
     * Method that converts loaded elevation data to segment elevation data type(columr major elevation data array in meters)
     * @public
     * @virtual
     * @param {*} data - Loaded elevation data.
     * @returns {Array.<number>}
     */
    getElevations(data) {
        return new Float32Array(data);
    }

    /**
     * Loads elevation data and apply it to the planet segment.
     * @protected
     * @param {og.planetSegment.Material} material - Loads material image.
     */
    _exec(segment) {
        this._counter++;
        var xhr = ajax.request(this._getHTTPRequestString(segment), {
            responseType: this.responseType,
            sender: this,
            success: function (data) {
                this._elevationCache[segment.getTileIndex()] = data;
                this._applyElevationsData(segment, data);
            },
            error: function () {
                this._applyElevationsData(segment, []);
            },
            abort: function () {
                segment.terrainIsLoading = false;
            }
        });
    }

    /**
     * @protected
     * @param {og.planetSegment.Segment} segment
     * @param {*} data
     */
    _applyElevationsData(segment, data, skipDeque) {
        if (segment) {
            var elevations = this.getElevations(data);
            var e = this.events.load;
            if (e.length) {
                this.events.dispatch(e, {
                    "elevations": elevations,
                    "segment": segment
                });
            }
            segment.applyTerrain(elevations);
        }
        !skipDeque && this._dequeueRequest();
    }

    _dequeueRequest() {
        this._counter--;
        if (this._pendingsQueue.length) {
            if (this._counter < this.MAX_LOADING_TILES) {
                var pseg;
                if (pseg = this._whilePendings())
                    this._exec.call(this, pseg);
            }
        } else if (this._counter === 0) {
            this.events.dispatch(this.events.loadend);
        }
    }

    _whilePendings() {
        while (this._pendingsQueue.length) {
            var pseg = this._pendingsQueue.pop();
            if (pseg.node) {
                if (pseg.ready && pseg.node.getState() !== quadTree.NOTRENDERING) {
                    return pseg;
                }
                pseg.terrainIsLoading = false;
            }
        }
        return null;
    }

    /**
     * Stop loading.
     * @public
     */
    abortLoading() {
        this._pendingsQueue.each(function (s) {
            s && (s.terrainIsLoading = false);
        });
        //this._pendingsQueue.length = 0;
        this._pendingsQueue.clear();
    }
};

export { GlobusTerrain };
