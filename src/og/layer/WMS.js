/**
 * @module og/layer/WMS
 */

"use strict";

import * as mercator from "../mercator.js";
import { Extent } from "../Extent.js";
import { LonLat } from "../LonLat.js";
import { XYZ } from "./XYZ.js";

/**
 * Used to display WMS services as tile layers on the globe.
 * @class
 * @extends {XYZ}
 * //TODO: WMS version, format, and custom srs cpecification.
 * @param {string} name - Layer name.
 * @param {Object} options - Options:
 * @param {number} [options.opacity=1.0] - Layer opacity.
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

        this._getBbox = WMS.get_bbox_v1_1_1;

        this.setVersion(options.version);
    }

    static createRequestUrl(
        url,
        layers,
        format = "image/png",
        version = "1.1.1",
        request = "GetMap",
        srs,
        bbox,
        width = 256,
        height = 256
    ) {
        return `${url}/wms?LAYERS=${layers}&FORMAT=${format}&SERVICE=WMS&VERSION=${version}&REQUEST=${request}
        &SRS=${srs}&BBOX=${bbox}&WIDTH=${width}&HEIGHT=${height}`;
    }

    static get_bbox_v1_1_1(extent) {
        return (
            extent.getWest() +
            "," +
            extent.getSouth() +
            "," +
            extent.getEast() +
            "," +
            extent.getNorth()
        );
    }

    static get_bbox_v1_3_0(extent) {
        return (
            extent.getSouth() +
            "," +
            extent.getWest() +
            "," +
            extent.getNorth() +
            "," +
            extent.getEast()
        );
    }

    _checkSegment(segment) {
        return true;
    }

    get instanceName() {
        return "WMS";
    }

    _createUrl(segment) {
        return WMS.createRequestUrl(
            this.url,
            this.layers,
            "image/png",
            this._version,
            "GetMap",
            segment._projection.code,
            this._getBbox(segment.getExtent()),
            this.imageWidth,
            this.imageHeight
        );
    }

    setVersion(version) {
        if (version) {
            this._version = version;
        } else {
            this._version = "1.1.1";
        }

        if (this._version === "1.1.1") {
            this._getBbox = WMS.get_bbox_v1_1_1;
        } else if (version === "1.3.0") {
            this._getBbox = WMS.get_bbox_v1_3_0;
        }
    }

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
}

export { WMS };
