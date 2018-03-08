/**
 * @module og/layer/WMS
 */

'use strict';

import * as mercator from '../mercator.js';
import { Extent } from './Extent.js';
import { LonLat } from './LonLat.js';
import { XYZ } from './XYZ.js';

/**
 * Used to display WMS services as tile layers on the globe.
 * @class
 * @extends {og.layer.XYZ}
 * //TODO: WMS version, format, and custom srs cpecification.
 * @param {string} name - Layer name.
 * @param {Object} options - Options:
 * @param {number} [options.opacity=1.0] - Layer opacity.
 * @param {Array.<number,number,number>} [options.transparentColor=[-1,-1,-1]] - RGB color that defines transparent color.
 * @param {number} [options.minZoom=0] - Minimal visibility zoom level.
 * @param {number} [options.maxZoom=0] - Maximal visibility zoom level.
 * @param {string} [options.attribution] - Layer attribution that displayed in the attribution area on the screen.
 * @param {boolean} [options.isBaseLayer=false] - Base layer flag.
 * @param {boolean} [options.visibility=true] - Layer visibility.
 * @param {string} options.url - WMS url source.
 * @param {number} [options.width=256] - Tile width.
 * @param {number} [options.height=256] - Tile height.
 * @param {string} options.layers - WMS layers string.
 * @param {string} [options.version="1.1.1"] - WMS version.
 * @example:
 * new og.layer.WMS("USA States", { 
 *     isBaseLayer: false,
 *     url: "http://openglobus.org/geoserver/", 
 *     layers: "topp:states", 
 *     opacity: 0.5, 
 *     zIndex: 50, 
 *     attribution: 'USA states - geoserver WMS example', 
 *     transparentColor: [1.0, 1.0, 1.0],
 *     version: "1.1.1",
 *     visibility: false }
 * );
 *
 * @fires og.layer.XYZ#load
 * @fires og.layer.XYZ#loadend 
 */
class WMS extends XYZ {
    constructor(name, options) {
        super(name, options);

        if (!options.extent) {
            this.setExtent(new Extent(new LonLat(-180.0, -90), new LonLat(180.0, 90)));
        }

        /**
         * WMS layers string.
         * @public
         * @type {string}
         */
        this.layers = options.layers;

        /**
         * WMS tile width.
         * @public
         * @type {number}
         */
        this.imageWidth = options.imageWidth || 256;

        /**
         * WMS tile height.
         * @public
         * @type {number}
         */
        this.imageHeight = options.imageHeight || 256;

        this.setVersion(options.version);
    }


    /**
     * Start to load tile material.
     * @public
     * @virtual
     * @param {og.planetSegment.Material} mateial
     */
    loadMaterial(material) {
        var seg = material.segment;
        if (!material.isLoading) {
            if (this._planet.layerLock.isFree()) {
                material.isReady = false;
                material.isLoading = true;
                if (WMS.__requestsCounter >= WMS.MAX_REQUESTS && this.counter) {
                    this.pendingsQueue.push(material);
                } else {
                    this._exec(material);
                }
            }
        }
    }

    /**
     * Creates query url.
     * @protected
     * @virtual
     * @param {og.planetSegment.Segment}
     */
    _createUrl(segment) {
        return this.url + "wms?" + "LAYERS=" + this.layers +
            "&FORMAT=image/jpeg&SERVICE=WMS&VERSION=" + this._version + "&REQUEST=GetMap" +
            "&SRS=" + segment._projection.code +
            "&BBOX=" + this._getBbox(segment) +
            "&WIDTH=" + this.imageWidth +
            "&HEIGHT=" + this.imageHeight;
    }

    setVersion(version) {
        if (version) {
            this._version = version;
        } else {
            this._version = "1.1.1";
        }

        if (this._version === "1.1.1") {
            this._getBbox = this._getBbox111;
        } else if (version === "1.3.0") {
            this._getBbox = this._getBbox130;
        } else {
            this._getBbox = this._getBbox111;
        }
    }

    /**
     * @private
     * @return {string}
     */
    _getBbox111(segment) {
        return segment._extent.getWest() + "," + segment._extent.getSouth() + "," + segment._extent.getEast() + "," + segment._extent.getNorth();
    }

    /**
     * @private
     * @return {string}
     */
    _getBbox130(segment) {
        return segment._extent.getSouth() + "," + segment._extent.getWest() + "," + segment._extent.getNorth() + "," + segment._extent.getEast();
    }

    /**
     * @protected
     */
    _correctFullExtent() {
        var e = this._extent,
            em = this._extentMerc;
        var ENLARGE_MERCATOR_LON = mercator.POLE + 50000;
        var ENLARGE_MERCATOR_LAT = mercator.POLE + 50000;
        if (e.northEast.lat === 90.0) {
            em.northEast.lat = ENLARGE_MERCATOR_LAT;
        }
        if (e.northEast.lon === 180.0) {
            em.northEast.lon = ENLARGE_MERCATOR_LON;
        }
        if (e.southWest.lat === -90.0) {
            em.southWest.lat = -ENLARGE_MERCATOR_LAT;
        }
        if (e.southWest.lon === -180.0) {
            em.southWest.lon = -ENLARGE_MERCATOR_LON;
        }
    }
};

export { WMS };