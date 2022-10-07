/**
 * @module og/layer/CanvasTiles
 */

"use strict";

import * as quadTree from "../quadTree/quadTree.js";
import { Layer } from "./Layer.js";

/**
 * Maximum tiles per frame.
 * @const
 * @type {number}
 */

const EVENT_NAMES = [
    /**
     * Triggered when current tile image has loaded before rendereing.
     * @event og.layer.CanvasTiles#load
     */
    "load",

    /**
     * Triggered when all tiles have loaded or loading has stopped.
     * @event og.layer.CanvasTiles#loadend
     */
    "loadend"
];

/**
 * Layer used to rendering each tile as a separate canvas object.
 * @class
 * @extends {Layer}
 * //TODO: make asynchronous handler.
 * @param {String} [name="noname"] - Layer name.
 * @param {Object} options:
 * @param {number} [options.opacity=1.0] - Layer opacity.
 * @param {number} [options.minZoom=0] - Minimal visibility zoom level.
 * @param {number} [options.maxZoom=0] - Maximal visibility zoom level.
 * @param {string} [options.attribution] - Layer attribution that displayed in the attribution area on the screen.
 * @param {boolean} [options.isBaseLayer=false] - Base layer flag.
 * @param {boolean} [options.visibility=true] - Layer visibility.
 * @param {layer.CanvasTiles~drawTileCallback} [options.drawTile] - Draw tile callback.
 * @fires og.layer.CanvasTiles#load
 * @fires og.layer.CanvasTiles#loadend
 */
class CanvasTiles extends Layer {
    constructor(name, options = {}) {
        super(name, options);

        this.events.registerNames(EVENT_NAMES);

        this.minNativeZoom = options.minNativeZoom;
        /**
         * Current creating tiles couter.
         * @protected
         * @type {number}
         */
        this._counter = 0;

        /**
         * Tile pending queue that waiting for create.
         * @protected
         * @type {Array.<planetSegment.Material>}
         */
        this._pendingsQueue = []; // new og.QueueArray();

        /**
         * Draw tile callback.
         * @type {layer.CanvasTiles~drawTileCallback}
         * @public
         */
        this.drawTile = options.drawTile || null;
    }

    addTo(planet) {
        this._onLoadend_ = this._onLoadend.bind(this);
        this.events.on("loadend", this._onLoadend_, this);
        return super.addTo(planet);
    }

    remove() {
        this.events.off("loadend", this._onLoadend_);
        this._onLoadend_ = null;
        return super.remove();
    }

    _onLoadend() {
        if (this._planet && this._planet._terrainCompletedActivated) {
            this._planet.events.dispatch(this._planet.events.layerloadend, this);
        }
    }

    get instanceName() {
        return "CanvasTiles";
    }

    get isIdle() {
        return super.isIdle && this._counter === 0;
    }

    /**
     * Abort loading tiles.
     * @public
     */
    abortLoading() {
        var q = this._pendingsQueue;
        for (var i = q._shiftIndex + 1; i < q._popIndex + 1; i++) {
            if (q._array[i]) {
                this.abortMaterialLoading(q._array[i]);
            }
        }
        this._pendingsQueue = [];
        // this._pendingsQueue.clear();
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
     * Start to load tile material.
     * @public
     * @virtual
     * @param {Material} material -
     */
    loadMaterial(material) {
        var seg = material.segment;

        if (this._isBaseLayer) {
            material.texture = seg._isNorth
                ? seg.planet.solidTextureOne
                : seg.planet.solidTextureTwo;
        } else {
            material.texture = seg.planet.transparentTexture;
        }

        if (this._planet.layerLock.isFree() || material.segment.tileZoom < 2) {
            material.isReady = false;
            material.isLoading = true;
            if (CanvasTiles.__requestsCounter >= CanvasTiles.MAX_REQUESTS && this._counter) {
                this._pendingsQueue.push(material);
            } else {
                this._exec(material);
            }
        }
    }

    /**
     * Loads material image and apply it to the planet segment.
     * @protected
     * @param {Material} material - Loads material image.
     */
    _exec(material) {
        CanvasTiles.__requestsCounter++;
        this._counter++;
        var that = this;
        if (this.drawTile) {
            /**
             * Tile custom draw function.
             * @callback og.layer.CanvasTiles~drawTileCallback
             * @param {Material} material
             * @param {applyCanvasCallback} applyCanvasCallback
             */
            var e = that.events.load;
            if (e.handlers.length) {
                that.events.dispatch(e, material);
            }
            requestAnimationFrame(() => {
                that.drawTile(
                    material,
                    /**
                     * Apply canvas.
                     * @callback applyCanvasCallback
                     * @param {Object} canvas -
                     */
                    function (canvas) {
                        that._counter--;
                        CanvasTiles.__requestsCounter--;
                        if (material.isLoading) {
                            material.applyImage(canvas);
                        }
                        that._dequeueRequest();
                    }
                );
            });
        } else {
            material.textureNotExists();
        }
    }

    /**
     * Abort exact material loading.
     * @public
     * @param {Material} material - Segment material.
     */
    abortMaterialLoading(material) {
        if (material.isLoading && material.image) {
            material.image.src = "";
            this._counter--;
            CanvasTiles.__requestsCounter--;
            this._dequeueRequest();
        }
        material.isLoading = false;
        material.isReady = false;
    }

    _dequeueRequest() {
        if (this._pendingsQueue.length) {
            if (CanvasTiles.__requestsCounter < CanvasTiles.MAX_REQUESTS) {
                var pmat = this._whilePendings();
                if (pmat) {
                    this._exec(pmat);
                }
            }
        } else if (this._counter === 0 && this._planet && this._planet._terrainCompletedActivated) {
            this.events.dispatch(this.events.loadend);
        }
    }

    _whilePendings() {
        while (this._pendingsQueue.length) {
            var pmat = this._pendingsQueue.pop();
            if (pmat.segment.node) {
                if (
                    pmat.segment.initialized &&
                    pmat.segment.node.getState() === quadTree.RENDERING
                ) {
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
        } else if (material.segment.tileZoom <= this.minNativeZoom) {
            material.textureNotExists();
        }else {

            var segment = material.segment;
            var pn = segment.node,
                notEmpty = false;

            if (segment.passReady && !material.isLoading) {
                this.loadMaterial(material);
            }

            var mId = this._id;
            var psegm = material;
            while (pn.parentNode) {
                pn = pn.parentNode;
                psegm = pn.segment.materials[mId];
                if (psegm && psegm.isReady) {
                    notEmpty = true;
                    break;
                }
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
            if (material.texture && !material.texture.default) {
                material.segment.handler.gl.deleteTexture(material.texture);
                material.texture = null;
            }
        }

        this.abortMaterialLoading(material);
        material.isLoading = false;
        material.textureExists = false;

        material.layer = null;
        material.segment = null;

        if (material.image) {
            material.image.src = "";
            material.image = null;
        }
    }
}

export { CanvasTiles };
