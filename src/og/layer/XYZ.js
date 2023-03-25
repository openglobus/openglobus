/**
 * @module og/layer/XYZ
 */

"use strict";

import * as mercator from "../mercator.js";
import { RENDERING } from "../quadTree/quadTree.js";
import { stringTemplate } from "../utils/shared.js";
import { Layer } from "./Layer.js";

/**
 * Represents an imagery tiles source provider.
 * @class
 * @extends {Layer}
 * @param {string} name - Layer name.
 * @param {Object} options:
 * @param {number} [options.opacity=1.0] - Layer opacity.
 * @param {Array.<string>} [options.subdomains=['a','b','c']] - Subdomains of the tile service.
 * @param {number} [options.minZoom=0] - Minimal visibility zoom level.
 * @param {number} [options.maxZoom=0] - Maximal visibility zoom level.
 * @param {number} [options.minNativeZoom=0] - Minimal available zoom level.
 * @param {number} [options.maxNativeZoom=19] - Maximal available zoom level.
 * @param {string} [options.attribution] - Layer attribution that displayed in the attribution area on the screen.
 * @param {boolean} [options.isBaseLayer=false] - Base layer flag.
 * @param {boolean} [options.visibility=true] - Layer visibility.
 * @param {string} [options.crossOrigin=true] - If true, all tiles will have their crossOrigin attribute set to ''.
 * @param {string} options.url - Tile url source template(see example below).
 * @param {string} options.textureFilter - texture gl filter. NEAREST, LINEAR, MIPMAP, ANISOTROPHIC.
 * @param {layer.XYZ~_urlRewriteCallback} options.urlRewrite - Url rewrite function.
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
    /**
     * @param {string} name - Layer name.
     * @param {*} options
     */
    constructor(name, options = {}) {
        super(name, options);

        this.events.registerNames(EVENT_NAMES);

        /**
         * Tile url source template.
         * @public
         * @type {string}
         */
        this.url = options.url || "";

        /**
         * @protected
         */
        this._s = options.subdomains || ["a", "b", "c"];

        /**
         * Minimal native zoom level when tiles are available.
         * @public
         * @type {number}
         */
        this.minNativeZoom = options.minNativeZoom || 0;

        /**
         * Maximal native zoom level when tiles are available.
         * @public
         * @type {number}
         */
        this.maxNativeZoom = options.maxNativeZoom || 19;

        /**
         * Rewrites imagery tile url query.
         * @private
         * @callback og.layer.XYZ~_urlRewriteCallback
         * @param {Segment} segment - Segment to load.
         * @param {string} url - Created url.
         * @returns {string} - Url query string.
         */
        this._urlRewriteCallback = options.urlRewrite || null;

        this._requestsPeerSubdomian = 4;
        this._requestCount = 0;
    }

    /**
     * @warning Use XYZ.isIdle in requesAnimationFrame(after setVisibility)
     */
    get isIdle() {
        return super.isIdle && this._planet._tileLoader.getRequestCounter(this) === 0;
    }

    get instanceName() {
        return "XYZ";
    }

    /**
     * Abort loading tiles.
     * @public
     */
    abortLoading() {
        if (this._planet) {
            this._planet._tileLoader.abort(this);
        }
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

    remove() {
        this.abortLoading();
        super.remove();
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
        return segment._projection.id === this._planet.quadTreeStrategy.projection.id;// EPSG4326.id;// EPSG3857.id;
    }

    /**
     * Start to load tile material.
     * @public
     * @virtual
     * @param {Material} material - Loads current material.
     */
    loadMaterial(material, forceLoading) {

        let seg = material.segment;

        if (this._isBaseLayer) {
            material.texture = seg.getDefaultTexture();
        } else {
            material.texture = seg.planet.transparentTexture;
        }

        // Q: Maybe we should change "<2" to material.segment.tileZoom < (material.layer.minZoom + 1)
        if (this._planet.layerLock.isFree() || material.segment.tileZoom < 2) {
            material.isReady = false;
            material.isLoading = true;

            if (this._checkSegment(seg)) {
                material.loadingAttempts++;

                this._planet._tileLoader.load(
                    {
                        sender: this,
                        src: this._getHTTPRequestString(material.segment),
                        type: "imageBitmap",
                        filter: () =>
                            (seg.initialized && seg.node.getState() === RENDERING) || forceLoading,
                        options: {}
                    },
                    (response) => {
                        if (response.status === "ready") {
                            if (material.isLoading) {
                                let e = this.events.load;
                                if (e.handlers.length) {
                                    this.events.dispatch(e, material);
                                }
                                material.applyImage(response.data);
                                response.data = null;
                            }
                        } else if (response.status === "abort") {
                            material.isLoading = false;
                        } else if (response.status === "error") {
                            if (material.isLoading) {
                                material.textureNotExists();
                            }
                        }
                    },
                    this._id
                );
            } else {
                material.textureNotExists();
            }
        }
    }

    /**
     * Creates query url.
     * @protected
     * @virtual
     * @param {Segment} segment - Creates specific url for current segment.
     * @returns {String} - Returns url string.
     */
    _createUrl(segment) {
        return stringTemplate(this.url, {
            s: this._getSubdomain(),
            x: segment.tileX.toString(),
            y: segment.tileY.toString(),
            z: segment.tileZoom.toString()
        });
    }

    _getSubdomain() {
        this._requestCount++;
        return this._s[Math.floor(this._requestCount % (this._requestsPeerSubdomian * this._s.length) / this._requestsPeerSubdomian)];

    }

    /**
     * Returns actual url query string.
     * @protected
     * @param {Segment} segment - Segment that loads image data.
     * @returns {string} - Url string.
     */
    _getHTTPRequestString(segment) {
        return this._urlRewriteCallback
            ? this._urlRewriteCallback(segment, this.url)
            : this._createUrl(segment);
    }

    /**
     * Sets url rewrite callback, used for custom url rewriting for every tile laoding.
     * @public
     * @param {layer.XYZ~_urlRewriteCallback} ur - The callback that returns tile custom created url.
     */
    setUrlRewriteCallback(ur) {
        this._urlRewriteCallback = ur;
    }

    applyMaterial(material, forceLoading) {
        if (material.isReady) {
            return material.texOffset;
        } else if (material.segment.tileZoom < this.minNativeZoom) {
            material.textureNotExists();
        } else {

            let segment = material.segment,
                pn = segment.node,
                notEmpty = false;

            let mId = this._id;
            let psegm = material;
            while (pn.parentNode) {
                pn = pn.parentNode;
                psegm = pn.segment.materials[mId];
                if (psegm && psegm.textureExists) {
                    notEmpty = true;
                    break;
                }
            }

            if (segment.passReady) {
                let maxNativeZoom = material.layer.maxNativeZoom;
                if (pn.segment.tileZoom === maxNativeZoom) {
                    material.textureNotExists();
                } else if (material.segment.tileZoom <= maxNativeZoom) {
                    !material.isLoading && !material.isReady && this.loadMaterial(material, forceLoading);
                } else {
                    let pn = segment.node;
                    while (pn.segment.tileZoom > material.layer.maxNativeZoom) {
                        pn = pn.parentNode;
                    }
                    let pnm = pn.segment.materials[material.layer._id];
                    if (pnm) {
                        !pnm.isLoading && !pnm.isReady && this.loadMaterial(pnm, true);
                    } else {
                        pnm = pn.segment.materials[material.layer._id] = material.layer.createMaterial(
                            pn.segment
                        );
                        this.loadMaterial(pnm, true);
                    }
                }
            }

            if (notEmpty) {
                material.appliedNode = pn;
                material.appliedNodeId = pn.nodeId;
                material.texture = psegm.texture;
                let dZ2 = 1.0 / (2 << (segment.tileZoom - pn.segment.tileZoom - 1));
                material.texOffset[0] = segment.tileX * dZ2 - pn.segment.tileX;
                material.texOffset[1] = segment.tileY * dZ2 - pn.segment.tileY;
                material.texOffset[2] = dZ2;
                material.texOffset[3] = dZ2;
            } else {
                material.texture = segment.planet.transparentTexture;
                material.texOffset[0] = 0.0;
                material.texOffset[1] = 0.0;
                material.texOffset[2] = 1.0;
                material.texOffset[3] = 1.0;
            }
        }

        return material.texOffset;
    }

    clearMaterial(material) {
        if (material.isReady && material.textureExists) {
            !material.texture.default &&
            material.segment.handler.gl.deleteTexture(material.texture);
            material.texture = null;

            if (material.image) {
                material.image.src = "";
                material.image = null;
            }
        }

        material.isReady = false;
        material.textureExists = false;
        material.isLoading = false;
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
    }
}

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
