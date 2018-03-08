/**
 * @module og/layer/XYZ
 */

'use strict';

import * as mercator from '../mercator.js';
import * as quadTree from '../quadTree/quadTree.js';
import { EPSG3857 } from '../proj/EPSG3857.js';
import { Layer } from './Layer.js';
import { stringTemplate } from '../utils/utils.js';
import { LonLat } from '../LonLat.js';
import { QueueArray } from '../QueueArray.js';

/**
 * Represents an imagery tiles source provider.
 * @class
 * @extends {og.layer.Layer}
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
            this.setExtent(new og.Extent(new og.LonLat(-180.0, og.mercator.MIN_LAT), new LonLat(180.0, og.mercator.MAX_LAT)));
        }

        this.transparentColor = options.transparentColor || [-1, -1, -1];

        /**
         * Tile url source template.
         * @public
         * @type {string}
         */
        this.url = options.url || "";

        /**
         * Current loading tiles couter.
         * @protected
         * @type {number}
         */
        this._counter = 0;

        /**
         * Tile pending queue that waiting for loading.
         * @protected
         * @type {Array.<og.planetSegment.Material>}
         */
        this._pendingsQueue = new QueueArray();

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

    static get __requestsCounter() {
        return this.__reqcounter;
    }

    static set __requestsCounter(v) {
        this.__reqcounter = v;
    }

    /**
     * Maximum loading queries at one time.
     * @const
     * @type {number}
     */
    static get MAX_REQUESTS() {
        return 7;
    }

    /**
     * Abort loading tiles.
     * @public
     */
    abortLoading() {
        var that = this;
        this._pendingsQueue.each(function (q) {
            q && that.abortMaterialLoading(q);
        });
        this._pendingsQueue.clear();
    }

    /**
     * Sets layer visibility.
     * @public
     * @param {boolean} visibility - Layer visibility.
     */
    setVisibility(visibility) {
        if (visibility !== this._visibility) {
            this._visibility = visibility;
            if (this._isBaseLayer && visibility) {
                this._planet.setBaseLayer(this);
            } else if (!visibility) {
                this.abortLoading();
            }
            this._planet.updateVisibleLayers();
            this.events.dispatch(this.events.visibilitychange, this);
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

    /**
     * Start to load tile material.
     * @public
     * @virtual
     * @param {og.planetSegment.Material} material - Loads current material.
     */
    loadMaterial(material) {

        var seg = material.segment;

        if (this._isBaseLayer) {
            material.texture = seg._isNorth ? seg.planet.solidTextureOne : seg.planet.solidTextureTwo;
        } else {
            material.texture = seg.planet.transparentTexture;
        }

        if (this._planet.layerLock.isFree()) {
            material.isReady = false;
            material.isLoading = true;
            if (material.segment._projection.id === EPSG3857.id) {
                if (XYZ.__requestsCounter >= XYZ.MAX_REQUESTS && this._counter) {
                    this._pendingsQueue.push(material);
                } else {
                    this._exec(material);
                }
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
            "s": this._s[Math.floor(Math.random() * this._s.length)],
            "x": segment.tileX.toString(),
            "y": segment.tileY.toString(),
            "z": segment.tileZoom.toString()
        });
    }

    /**
     * Returns actual url query string.
     * @protected
     * @param {og.planetSegment.Segment} segment - Segment that loads image data.
     * @returns {string} - Url string.
     */
    _getHTTPRequestString(segment) {
        var url = this._createUrl(segment);
        return this._urlRewriteCallback ? this._urlRewriteCallback(segment, url) : url;
    }

    /**
     * Sets url rewrite callback, used for custom url rewriting for every tile laoding.
     * @public
     * @param {og.layer.XYZ~_urlRewriteCallback} ur - The callback that returns tile custom created url.
     */
    setUrlRewriteCallback(ur) {
        this._urlRewriteCallback = ur;
    }

    /**
     * Loads material image and apply it to the planet segment.
     * @protected
     * @param {og.planetSegment.Material} material - Loads material image.
     */
    _exec(material) {
        XYZ.__requestsCounter++;
        this._counter++;

        material.image = new Image();
        material.image.crossOrigin = this._crossOrigin;

        var that = this;
        material.image.onload = function (evt) {
            that._counter--;
            XYZ.__requestsCounter--;

            if (material.isLoading) {
                var e = that.events.load;
                if (e.handlers.length) {
                    that.events.dispatch(e, material);
                }
                this.onerror = null;
                this.onload = null;
                material.applyImage(this);
            }
            that._dequeueRequest();
        };

        material.image.onerror = function (evt) {
            that._counter--;
            XYZ.__requestsCounter--;
            this.onerror = null;
            this.onload = null;
            if (material.isLoading && material.image) {
                material.textureNotExists.call(material);
            }
            that._dequeueRequest();
        };

        material.image.src = this._getHTTPRequestString(material.segment);
    }

    /**
     * Abort exact material loading.
     * @public
     * @param {og.planetSegment.Material} material - Segment material.
     */
    abortMaterialLoading(material) {
        if (material.isLoading && material.image) {
            material.image.src = "";
            material.image.__og_canceled = true;
            material.image = null;
        } else {
            this._dequeueRequest();
        }
    }

    _dequeueRequest() {
        if (this._pendingsQueue.length) {
            if (XYZ.__requestsCounter < XYZ.MAX_REQUESTS) {
                var pmat = this._whilePendings();
                if (pmat)
                    this._exec.call(this, pmat);
            }
        } else if (this._counter === 0) {
            this.events.dispatch(this.events.loadend);
        }
    }

    _whilePendings() {
        while (this._pendingsQueue.length) {
            var pmat = this._pendingsQueue.pop();
            if (pmat.segment.node) {
                if (pmat.segment.ready && pmat.segment.node.getState() === quadTree.RENDERING) {
                    return pmat;
                }
                pmat.isLoading = false;
            }
        }
        return null;
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
                psegm = pn.planetSegment.materials[mId];
            }

            if (notEmpty) {
                material.appliedNodeId = pn.nodeId;
                material.texture = psegm.texture;
                var dZ2 = 1.0 / (2 << (segment.tileZoom - pn.planetSegment.tileZoom - 1));
                return [
                    segment.tileX * dZ2 - pn.planetSegment.tileX,
                    segment.tileY * dZ2 - pn.planetSegment.tileY,
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
            this.abortMaterialLoading(material);
        }

        material.textureExists = false;

        if (material.image) {
            material.image.onload = null;
            material.image.onerror = null;
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