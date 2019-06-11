/**
 * @module og/layer/XYZ
 */

'use strict';

import * as mercator from '../mercator.js';
import { EPSG3857 } from '../proj/EPSG3857.js';
import { Extent } from '../Extent.js';
import { Layer } from './Layer.js';
import { stringTemplate } from '../utils/shared.js';
import { LonLat } from '../LonLat.js';
import { RENDERING } from '../quadTree/quadTree.js';

/**
 * Represents an imagery tiles source provider.
 * @class
 * @extends {og.Layer}
 * @param {string} name - Layer name.
 * @param {Object} options:
 * @param {number} [options.opacity=1.0] - Layer opacity.
 * @param {Array.<number,number,number>} [options.transparentColor=[-1,-1,-1]] - RGB color that defines transparent color.
 * @param {Array.<string>} [options.subdomains=['a','b','c']] - Subdomains of the tile service.
 * @param {number} [options.minZoom=0] - Minimal visibility zoom level.
 * @param {number} [options.maxZoom=0] - Maximal visibility zoom level.
 * @param {string} [options.attribution] - Layer attribution that displayed in the attribution area on the screen.
 * @param {boolean} [options.isBaseLayer=false] - Base layer flag.
 * @param {boolean} [options.visibility=true] - Layer visibility.
 * @param {string} [options.crossOrigin=true] - If true, all tiles will have their crossOrigin attribute set to ''.
 * @param {string} options.url - Tile url source template(see example below).
 * @param {og.layer.XYZ~_urlRewriteCallback} options.urlRewrite - Url rewrite function.
 * @fires og.layer.XYZ#load
 * @fires og.layer.XYZ#loadend
 *
 * @example <caption>Creates OpenStreetMap base tile layer</caption>
 * new og.layer.XYZ("OpenStreetMap", {
 *     isBaseLayer: true,
 *     url: "http://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
 *     visibility: true,
 *     attribution: 'Data @ <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="http://www.openstreetmap.org/copyright">ODbL</a>'
 * });
 */
class XYZ extends Layer {
    constructor(name, options) {
        super(name, options);

        this.events.registerNames(EVENT_NAMES);

        if (!options.extent) {
            this.setExtent(new Extent(new LonLat(-180.0, mercator.MIN_LAT), new LonLat(180.0, mercator.MAX_LAT)));
        }

        this.transparentColor = options.transparentColor || [-1, -1, -1];

        /**
         * Tile url source template.
         * @public
         * @type {string}
         */
        this.url = options.url || "";

        /**
         * @protected
         */
        this._s = options.subdomains || ['a', 'b', 'c'];

        /**
         * @protected
         */
        this._crossOrigin = options.crossOrigin === undefined ? '' : options.crossOrigin;

        /**
         * Rewrites imagery tile url query.
         * @private
         * @callback og.layer.XYZ~_urlRewriteCallback
         * @param {og.planetSegment.Segment} segment - Segment to load.
         * @param {string} url - Created url.
         * @returns {string} - Url query string.
         */
        this._urlRewriteCallback = options.urlRewrite || null;
    }

    get instanceName() {
        return "XYZ";
    }

    /**
     * Abort loading tiles.
     * @public
     */
    abortLoading() {
        this._planet._tileLoader.abort();
    }

    /**
     * Sets layer visibility.
     * @public
     * @param {boolean} visibility - Layer visibility.
     */
    setVisibility(visibility) {
        if (visibility !== this._visibility) {

            super.setVisibility(visibility);

            if (!visibility) {
                this.abortLoading();
            }
        }
    }

    /**
     * Sets imagery tiles url source template.
     * @public
     * @param {string} url - Url template.
     * @example
     * http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
     * where {z}, {x} and {y} - replaces by current tile values, {s} - random domen.
     */
    setUrl(url) {
        this.url = url;
    }

    _checkSegment(segment) {
        return segment._projection.id === EPSG3857.id;
    }

    /**
     * Start to load tile material.
     * @public
     * @virtual
     * @param {og.planetSegment.Material} material - Loads current material.
     */
    loadMaterial(material) {

        let seg = material.segment;

        if (this._isBaseLayer) {
            material.texture = seg._isNorth ? seg.planet.solidTextureOne : seg.planet.solidTextureTwo;
        } else {
            material.texture = seg.planet.transparentTexture;
        }

        if (this._planet.layerLock.isFree()) {

            material.isReady = false;
            material.isLoading = true;

            if (this._checkSegment(seg)) {
                this._planet._tileLoader.load({
                    'src': this._getHTTPRequestString(material.segment),
                    'type': 'imageBitmap',
                    'filter': () => seg.initialized && seg.node.getState() === RENDERING,
                    'options': {}
                }, (response) => {
                    if (response.status === "ready") {
                        if (material.isLoading) {
                            let e = this.events.load;
                            if (e.handlers.length) {
                                this.events.dispatch(e, material);
                            }
                            material.applyImage(response.data);
                        }
                    } else if (response.status === "abort") {
                        material.isLoading = false;
                    } else if (response.status === "error") {
                        if (material.isLoading) {
                            material.textureNotExists();
                        }
                    }
                });
            } else {
                material.textureNotExists();
            }
        }
    }

    /**
     * Creates query url.
     * @protected
     * @virtual
     * @param {og.planetSegment.Segment} segment - Creates specific url for current segment.
     * @returns {String} - Returns url string.
     */
    _createUrl(segment) {
        return stringTemplate(this.url, {
            "s": this._getSubdomain(),
            "x": segment.tileX.toString(),
            "y": segment.tileY.toString(),
            "z": segment.tileZoom.toString()
        });
    }

    _getSubdomain() {
        return this._s[Math.floor(Math.random() * this._s.length)];
    }

    /**
     * Returns actual url query string.
     * @protected
     * @param {og.planetSegment.Segment} segment - Segment that loads image data.
     * @returns {string} - Url string.
     */
    _getHTTPRequestString(segment) {
        return this._urlRewriteCallback ? this._urlRewriteCallback(segment, this.url) : this._createUrl(segment);
    }

    /**
     * Sets url rewrite callback, used for custom url rewriting for every tile laoding.
     * @public
     * @param {og.layer.XYZ~_urlRewriteCallback} ur - The callback that returns tile custom created url.
     */
    setUrlRewriteCallback(ur) {
        this._urlRewriteCallback = ur;
    }

    applyMaterial(material) {
        if (material.isReady) {
            return [0, 0, 1, 1];
        } else {

            !material.isLoading && this.loadMaterial(material);

            var segment = material.segment;
            var pn = segment.node,
                notEmpty = false;

            var mId = this._id;
            var psegm = material;
            while (pn.parentNode) {
                if (psegm && psegm.isReady) {
                    notEmpty = true;
                    break;
                }
                pn = pn.parentNode;
                psegm = pn.segment.materials[mId];
            }

            if (notEmpty) {
                material.appliedNodeId = pn.nodeId;
                material.texture = psegm.texture;
                var dZ2 = 1.0 / (2 << (segment.tileZoom - pn.segment.tileZoom - 1));
                return [
                    segment.tileX * dZ2 - pn.segment.tileX,
                    segment.tileY * dZ2 - pn.segment.tileY,
                    dZ2,
                    dZ2
                ];
            } else {
                material.texture = segment.planet.transparentTexture;
                return [0, 0, 1, 1];
            }
        }
    }

    clearMaterial(material) {
        if (material.isReady) {
            material.isReady = false;
            !material.texture.default &&
                material.segment.handler.gl.deleteTexture(material.texture);
            material.texture = null;
        } else {
            //this.abortMaterialLoading(material);
        }

        material.textureExists = false;

        if (material.image) {
            material.image.src = '';
            material.image = null;
        }
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

        if (e.northEast.lat >= mercator.MAX_LAT) {
            e.northEast.lat = mercator.MAX_LAT;
        }

        if (e.northEast.lat <= mercator.MIN_LAT) {
            e.northEast.lat = mercator.MIN_LAT;
        }
    };
};


const EVENT_NAMES = [
    /**
     * Triggered when current tile image has loaded before rendereing.
     * @event og.layer.XYZ#load
     */
    "load",

    /**
     * Triggered when all tiles have loaded or loading has stopped.
     * @event og.layer.XYZ#loadend
     */
    "loadend"
];

export { XYZ };