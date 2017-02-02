goog.provide('og.layer.CanvasTiles');

goog.require('og.inheritance');
goog.require('og.layer.Layer');
goog.require('og.ImageCanvas');

/**
 * Layer used to rendering each tile as a separate canvas object.
 * @class
 * @extends {og.layer.Layer}
 * //TODO: make asynchronous handler.
 * @param {String} [name="noname"] - Layer name.
 * @param {Object} options:
 * @param {number} [options.opacity=1.0] - Layer opacity.
 * @param {Array.<number,number,number>} [options.transparentColor=[-1,-1,-1]] - RGB color that defines transparent color.
 * @param {number} [options.minZoom=0] - Minimal visibility zoom level.
 * @param {number} [options.maxZoom=0] - Maximal visibility zoom level.
 * @param {string} [options.attribution] - Layer attribution that displayed in the attribution area on the screen.
 * @param {boolean} [options.isBaseLayer=false] - Base layer flag.
 * @param {boolean} [options.visibility=true] - Layer visibility.
 * @param {og.layer.CanvasTiles~drawTileCallback} [options.drawTile] - Draw tile callback.
 */
og.layer.CanvasTiles = function(name, options) {
    options = options || {};

    og.inheritance.base(this, name, options);


    /**
     * Current creating tiles couter.
     * @protected
     * @type {number}
     */
    this._counter = 0;

    /**
     * Tile pending queue that waiting for create.
     * @protected
     * @type {Array.<og.planetSegment.Material>}
     */
    this._pendingsQueue = []; //new og.QueueArray();

    /**
     * Draw tile callback.
     * @type {og.layer.CanvasTiles~drawTileCallback}
     * @public
     */
    this.drawTile = options.drawTile || null;
};

og.inheritance.extend(og.layer.CanvasTiles, og.layer.Layer);

/**
 * CanvasTiles layer {@link og.layer.CanvasTiles} object factory.
 * @static
 * @returns {og.layer.CanvasTiles} Returns canvas tiles layer.
 */
og.layer.canvasTiles = function(name, options) {
    return new og.layer.CanvasTiles(name, options);
};

og.layer.CanvasTiles.__requestsCounter = 0;

/**
 * Maximum tiles per frame.
 * @const
 * @type {number}
 */
og.layer.CanvasTiles.MAX_REQUESTS = 7;


/**
 * Abort loading tiles.
 * @public
 */
og.layer.CanvasTiles.prototype.abortLoading = function() {
    var q = this._pendingsQueue;
    for (var i = q._shiftIndex + 1; i < q._popIndex + 1; i++) {
        if (q._array[i]) {
            this.abortMaterialLoading(q._array[i]);
        }
    }
    this._pendingsQueue = [];
    //this._pendingsQueue.clear();
};

/**
 * Sets layer visibility.
 * @public
 * @param {boolean} visibility - Layer visibility.
 */
og.layer.CanvasTiles.prototype.setVisibility = function(visibility) {
    if (visibility != this._visibility) {
        this._visibility = visibility;
        if (this._isBaseLayer && visibility) {
            this._planet.setBaseLayer(this);
        } else if (!visibility) {
            this.abortLoading();
        }
        this._planet.updateVisibleLayers();
        this.events.dispatch(this.events.visibilitychange, this);
    }
};

/**
 * Start to load tile material.
 * @public
 * @virtual
 * @param {og.planetSegment.Material} mateial
 */
og.layer.CanvasTiles.prototype.loadMaterial = function(material) {

    var seg = material.segment;

    if (this._isBaseLayer) {
        material.texture = seg._isNorth ? seg.planet.solidTextureOne : seg.planet.solidTextureTwo;
    } else {
        material.texture = seg.planet.transparentTexture;
    }

    if (this._planet.layersActivity) {
        material.isReady = false;
        material.isLoading = true;
        if (og.layer.CanvasTiles.__requestsCounter >= og.layer.CanvasTiles.MAX_REQUESTS && this._counter) {
            this._pendingsQueue.push(material);
        } else {
            this._exec(material);
        }
    }
};

/**
 * Loads material image and apply it to the planet segment.
 * @protected
 * @param {og.planetSegment.Material} material - Loads material image.
 */
og.layer.CanvasTiles.prototype._exec = function(material) {
    og.layer.CanvasTiles.__requestsCounter++;
    this._counter++;
    var that = this;
    if (this.drawTile) {

        /**
         * Tile custom draw function.
         * @callback og.layer.CanvasTiles~drawTileCallback
         * @param {og.planetSegment.Material} material
         * @param {applyCanvasCallback} applyCanvasCallback
         */
        setTimeout(function() {
            var e = that.events.load;
            if (e.length) {
                that.events.dispatch(e, material);
            }
            that.drawTile(material,
                /**
                 * Apply canvas.
                 * @callback applyCanvasCallback
                 * @param {Object} canvas
                 */
                function(canvas) {
                    that._counter--;
                    og.layer.CanvasTiles.__requestsCounter--;
                    if (material.isLoading) {
                        material.applyImage(canvas);
                    }
                    that._dequeueRequest();
                });
        }, 50);
    } else {
        material.textureNotExists();
    }
};

/**
 * Abort exact material loading.
 * @public
 * @param {og.planetSegment.Material} material - Segment material.
 */
og.layer.CanvasTiles.prototype.abortMaterialLoading = function(material) {
    if (material.isLoading && material.image) {
        material.image.src = "";
        this._counter--;
        og.layer.CanvasTiles.__requestsCounter--;
        this._dequeueRequest();
    }
    material.isLoading = false;
    material.isReady = false;
};

og.layer.CanvasTiles.prototype._dequeueRequest = function() {
    if (this._pendingsQueue.length) {
        if (og.layer.CanvasTiles.__requestsCounter < og.layer.CanvasTiles.MAX_REQUESTS) {
            var pmat;
            if (pmat = this._whilePendings())
                this._exec.call(this, pmat);
        }
    } else if (this._counter === 0) {
        this.events.dispatch(this.events.loadend);
    }
};

og.layer.CanvasTiles.prototype._whilePendings = function() {
    while (this._pendingsQueue.length) {
        var pmat = this._pendingsQueue.pop();
        if (pmat.segment.node) {
            if (pmat.segment.ready && pmat.segment.node.getState() === og.quadTree.RENDERING) {
                return pmat;
            }
            pmat.isLoading = false;
        }
    }
    return null;
};


og.layer.CanvasTiles.prototype.applyMaterial = function(material) {
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
};

og.layer.CanvasTiles.prototype.clearMaterial = function(material) {
    if (material.isReady) {
        material.isReady = false;

        !material.texture.default &&
            material.segment.handler.gl.deleteTexture(material.texture);

        material.texture = null;
    }

    this.abortMaterialLoading(material);

    material.isLoading = false;
    material.textureExists = false;

    if (material.image) {
        material.image.src = '';
        material.image = null;
    }
};
