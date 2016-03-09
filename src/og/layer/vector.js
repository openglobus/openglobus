goog.provide('og.layer.Vector')

goog.require('og.EntityCollection');
goog.require('og.Entity');
goog.require('og.LonLat');
goog.require('og.quadTree');
goog.require('og.quadTree.EntityCollectionQuadNode');
goog.require('og.math');
goog.require('og.inheritance');
goog.require('og.QueueArray');

/**
 * Vector layer represents alternative entities store. Used for geospatial data rendering like 
 * points, lines, polygons etc.
 * @class
 * @param {string} [name] - Layer name.
 * @param {Object} [options] - Options:
 * @param {number} [options.minZoom] - Minimal visible zoom. 0 is default
 * @param {number} [options.maxZoom] - Maximal visible zoom. 50 is default.
 * @param {string} [options.attribution] - Layer attribution.
 * @param {string} [options.zIndex] - Layer Z-order index. 0 is default.
 * @param {boolean} [options.visibility] - Layer visibility. True is default.
 * @param {boolean} [options.isBaseLayer] - Layer base layer. False is default.
 * @param {Array.<og.Entity>} [options.entities] - Entities array.
 * @param {Array.<number,number,number>} [options.scaleByDistance] - Scale by distance parameters.
 *      First index - near distance to the entity, after entity becomes full scale.
 *      Second index - far distance to the entity, when entity becomes zero scale.
 *      Third index - far distance to the entity, when entity becomes invisible.
 * @param {number} [options.maxCountNode] - Rendering optimization parameter. 30 is default.
 *
 * @fires og.Events#entitymove
 * @fires og.Events#draw
 * @fires og.Events#add
 * @fires og.Events#remove
 * @fires og.Events#entityadd
 * @fires og.Events#entityremove
 * @fires og.Events#visibilitychange
 * @fires og.Events#mousemove
 * @fires og.Events#mouseenter
 * @fires og.Events#mouseleave
 * @fires og.Events#mouselbuttonclick
 * @fires og.Events#mouserbuttonclick
 * @fires og.Events#mousembuttonclick
 * @fires og.Events#mouselbuttondoubleclick
 * @fires og.Events#mouserbuttondoubleclick
 * @fires og.Events#mousembuttondoubleclick
 * @fires og.Events#mouselbuttonup
 * @fires og.Events#mouserbuttonup
 * @fires og.Events#mousembuttonup
 * @fires og.Events#mouselbuttondown
 * @fires og.Events#mouserbuttondown
 * @fires og.Events#mousembuttondown
 * @fires og.Events#mouselbuttonhold
 * @fires og.Events#mouserbuttonhold
 * @fires og.Events#mousembuttonhold
 * @fires og.Events#mousewheel
 * @fires og.Events#touchstart
 * @fires og.Events#touchend
 */
og.layer.Vector = function (name, options) {
    options = options || {};

    og.inheritance.base(this, name, options);

    /**
     * @public
     */
    this.events.registerNames(og.layer.Vector.EVENT_NAMES);

    /**
     * First index - near distance to the entity, after entity becomes full scale.
     * Second index - far distance to the entity, when entity becomes zero scale.
     * Third index - far distance to the entity, when entity becomes invisible.
     * @public
     * @type {Array.<number,number,number>}
     */
    this.scaleByDistance = options.scaleByDistance || [og.math.MAX32, og.math.MAX32, og.math.MAX32];

    this.async = options.async != undefined ? options.async : true;

    this.groundAlign = options.groundAlign || false;

    /**
     * Maximum entities quantity in the tree node.
     * @private
     */
    this._maxCountPerCollection = options.maxCountNode || 30;

    /**
     * Manimal tree node deep index.
     * @private
     */
    this._minTreeZoom = 5;

    /**
     * Stored entities.
     * @private
     */
    this._entities = options.entities ? [].concat(options.entities) : [];

    this._entityCollectionsTree = null;
    this._entityCollectionsTreeNorth = null;
    this._entityCollectionsTreeSouth = null;

    this._renderingNodes = {};
    this._renderingNodesNorth = {};
    this._renderingNodesSouth = {};

    this._counter = 0;
    this._deferredEntitiesPendingQueue = new og.QueueArray();

    /** Creates collections tree*/
    this._buildEntityCollectionsTree();
};

og.inheritance.extend(og.layer.Vector, og.layer.Layer);

/**
 * Vector layer event names
 * @type {Array.<string>}
 * @const
 */
og.layer.Vector.EVENT_NAMES = [
        /**
         * Triggered when entity has moved.
         * @event og.Events#draw
         */
        "entitymove",

        /**
         * Triggered when layer begin draw.
         * @event og.Events#draw
         */
        "draw",

        /**
         * Triggered when new entity added to the layer.
         * @event og.Events#entityadd
         */
        "entityadd",

        /**
         * Triggered when entity removes from the collection.
         * @event og.Events#entityremove
         */
        "entityremove",

        /**
         * Triggered when mouse moves over the layer.
         * @event og.Events#mousemove
         */
        "mousemove",

        /**
         * Triggered when mouse has entered over the layer.
         * @event og.Events#mouseenter
         */
        "mouseenter",

        /**
         * Triggered when mouse leaves the layer.
         * @event og.Events#mouseenter
         */
        "mouseleave",

        /**
         * Mouse left button clicked.
         * @event og.Events#mouselbuttonclick
         */
        "mouselbuttonclick",

        /**
         * Mouse right button clicked.
         * @event og.Events#mouserbuttonclick
         */
        "mouserbuttonclick",

        /**
         * Mouse right button clicked.
         * @event og.Events#mousembuttonclick
         */
        "mousembuttonclick",

        /**
         * Mouse left button double click.
         * @event og.Events#mouselbuttondoubleclick
         */
        "mouselbuttondoubleclick",

        /**
         * Mouse right button double click.
         * @event og.Events#mouserbuttondoubleclick
         */
        "mouserbuttondoubleclick",

        /**
         * Mouse middle button double click.
         * @event og.Events#mousembuttondoubleclick
         */
        "mousembuttondoubleclick",

        /**
         * Mouse left button up(stop pressing).
         * @event og.Events#mouselbuttonup
         */
        "mouselbuttonup",

        /**
         * Mouse right button up(stop pressing).
         * @event og.Events#mouserbuttonup
         */
        "mouserbuttonup",

        /**
         * Mouse middle button up(stop pressing).
         * @event og.Events#mouserbuttonup
         */
        "mousembuttonup",

        /**
         * Mouse left button is just pressed down(start pressing).
         * @event og.Events#mouselbuttondown
         */
        "mouselbuttondown",

        /**
         * Mouse right button is just pressed down(start pressing).
         * @event og.Events#mouserbuttondown
         */
        "mouserbuttondown",

        /**
         * Mouse middle button is just pressed down(start pressing).
         * @event og.Events#mousembuttondown
         */
        "mousembuttondown",

        /**
         * Mouse left button is pressing.
         * @event og.Events#mouselbuttonhold
         */
        "mouselbuttonhold",

        /**
         * Mouse right button is pressing.
         * @event og.Events#mouserbuttonhold
         */
        "mouserbuttonhold",

        /**
         * Mouse middle button is pressing.
         * @event og.Events#mousembuttonhold
         */
        "mousembuttonhold",

        /**
         * Mouse wheel is rotated.
         * @event og.Events#mousewheel
         */
        "mousewheel",

        "touchstart",
        "touchend"];

/**
 * Adds layer to the planet.
 * @public
 */
og.layer.Vector.prototype.addTo = function (planet) {
    this._assignPlanet(planet);
    this._buildEntityCollectionsTree();
};

/**
 * Returns stored entities.
 * @public
 * @returns {Array.<og.Entity>}
 */
og.layer.Vector.prototype.getEntities = function () {
    return [].concat(this._entities);
};

/**
 * Adds entity to the layer.
 * @public
 * @param {og.Entity} entity - Entity.
 * @param {boolean} [rightNow] - Entity insertion option. False is deafult.
 * @returns {og.layer.Vector} - Returns this layer.
 */
og.layer.Vector.prototype.add = function (entity, rightNow) {
    if (!(entity._vectorLayer || entity._entityCollection)) {
        entity._vectorLayer = this;
        entity._vectorLayerIndex = this._entities.length;
        this._entities.push(entity);
        if (this._planet) {
            if (!entity._lonlat) {
                entity._lonlat = this.layer._planet.ellipsoid.cartesianToLonLat(entity._cartesian);
            }
            if (entity._lonlat.lat > og.mercator.MAX_LAT) {
                this._entityCollectionsTreeNorth.insertEntity(entity, rightNow);
            } else if (entity._lonlat.lat < og.mercator.MIN_LAT) {
                this._entityCollectionsTreeSouth.insertEntity(entity, rightNow);
            } else {
                this._entityCollectionsTree.insertEntity(entity, rightNow);
            }
        }
        this.events.dispatch(this.events.entityadd, entity);
    }
    return this;
};

/**
 * Adds entity array to the layer.
 * @public
 * @param {Array.<og.Entity>} entities - Entities array.
 * @param {boolean} [rightNow] - Entity insertion option. False is deafult.
 * @returns {og.layer.Vector} - Returns this layer.
 */
og.layer.Vector.prototype.addEntities = function (entities, rightNow) {
    var i = entities.length;
    while (i--) {
        this.add(entities[i], rightNow);
    }
    return this;
};

/**
 * Remove entity from layer.
 * @public
 * @param {og.Entity} entity - Entity to remove.
 * @returns {og.layer.Vector} - Returns this layer.
 */
og.layer.Vector.prototype.removeEntity = function (entity) {
    if (entity._vectorLayer && this.isEqual(entity._vectorLayer)) {
        this._entities.splice(entity._vectorLayerIndex, 1);
        this._reindexEntitiesArray(entity._vectorLayerIndex);
        entity._vectorLayer = null;
        entity._vectorLayerIndex = -1;

        if (entity._entityCollection) {
            entity._entityCollection._removeEntitySilent(entity);
            var node = entity._nodePtr;
            while (node) {
                node.count--;
                node = node.parentNode;
            }
            if (entity._nodePtr && entity._nodePtr.count === 0 &&
                entity._nodePtr.deferredEntities.length === 0) {
                entity._nodePtr.entityCollection = null;
                //
                //...
                //
            }
        } else if (entity._nodePtr &&
            entity._nodePtr.deferredEntities.length) {
            var defEntities = entity._nodePtr.deferredEntities;
            var j = defEntities.length;
            while (j--) {
                if (defEntities[j].id === entity.id) {
                    defEntities.splice(j, 1);
                    var node = entity._nodePtr;
                    while (node) {
                        node.count--;
                        node = node.parentNode;
                    }
                    break;
                }
            }
        }
        entity._nodePtr = null;
        this.events.dispatch(this.events.entityremove, entity);
    }
    return this;
};

/**
 * Refresh collected entities indexes from startIndex entitytes collection array position.
 * @public
 * @param {number} startIndex - Entity array index.
 */
og.layer.Vector.prototype._reindexEntitiesArray = function (startIndex) {
    var e = this._entities;
    for (var i = startIndex; i < e.length; i++) {
        e[i]._vectorLayerIndex = i;
    }
};

/**
 * Removes entities from layer.
 * @public
 * @param {Array.<og.Entity>} entities - Entity array.
 * @returns {og.layer.Vector} - Returns this layer.
 */
og.layer.Vector.prototype.removeEntities = function (entities) {
    var i = entities.length;
    while (i--) {
        this.removeEntity(entities[i]);
    }
    return this;
};

/**
 * Removes current entities from layer and adds new entities.
 * @public
 * @param {Array.<og.Entity>} entities - New entity array.
 */
og.layer.Vector.prototype.setEntities = function (entities) {
    this.clear();
    this._entities = [].concat(entities);
    var i = entities.length;
    while (i--) {
        var ei = entities[i];
        if (!ei._vectorLayer) {
            ei._vectorLayer = this;
            ei._vectorLayerIndex = i;
        }
    }
    this._buildEntityCollectionsTree();
};

/**
 * Sets scale by distance parameters.
 * @public
 * @param {number} near - Full scale entity distance.
 * @param {number} far - Zerol scale entity distance.
 * @param {number} [farInvisible] - Entity visibility distance.
 */
og.layer.Vector.prototype.setScaleByDistance = function (near, far, farInisible) {
    this.scaleByDistance[0] = near;
    this.scaleByDistance[1] = far;
    this.scaleByDistance[2] = farInisible || og.math.MAX32;
};

/**
 * Clear the layer.
 * @public
 */
og.layer.Vector.prototype.clear = function () {
    //TODO
};

/**
 * Safety entities loop.
 * @public
 * @param {callback} callback - Entity callback.
 */
og.layer.Vector.prototype.each = function (callback) {
    var e = this._entities;
    var i = e.length;
    while (i--) {
        callback(e[i]);
    }
};

/**
 * @private
 */
og.layer.Vector.prototype._buildEntityCollectionsTree = function () {
    if (this._planet) {
        this._entityCollectionsTree = new og.quadTree.EntityCollectionQuadNode(this, og.quadTree.NW, null, 0,
            og.Extent.createFromArray([-20037508.34, -20037508.34, 20037508.34, 20037508.34]), this._planet, 0);

        this._entityCollectionsTreeNorth = new og.quadTree.EntityCollectionQuadNodeWGS84(this, og.quadTree.NW, null, 0,
            og.Extent.createFromArray([-180, og.mercator.MAX_LAT, 180, 90]), this._planet, 0);

        this._entityCollectionsTreeSouth = new og.quadTree.EntityCollectionQuadNodeWGS84(this, og.quadTree.NW, null, 0,
            og.Extent.createFromArray([-180, -90, 180, og.mercator.MIN_LAT]), this._planet, 0);

        this._entityCollectionsTree.buildTree(this._entities);
        this._entityCollectionsTreeNorth.buildTree(this._entities);
        this._entityCollectionsTreeSouth.buildTree(this._entities);
    }
};

/**
 * @private
 */
og.layer.Vector.prototype._bindEventsDefault = function (entityCollection) {
    var ve = this.events;
    entityCollection.events.on("entitymove", null, function (e) { ve.dispatch(ve.entitymove, e); });
    entityCollection.events.on("mousemove", null, function (e) { ve.dispatch(ve.mousemove, e); });
    entityCollection.events.on("mouseenter", null, function (e) { ve.dispatch(ve.mouseenter, e); });
    entityCollection.events.on("mouseleave", null, function (e) { ve.dispatch(ve.mouseleave, e); });
    entityCollection.events.on("mouselbuttonclick", null, function (e) { ve.dispatch(ve.mouselbuttonclick, e); });
    entityCollection.events.on("mouserbuttonclick", null, function (e) { ve.dispatch(ve.mouserbuttonclick, e); });
    entityCollection.events.on("mousembuttonclick", null, function (e) { ve.dispatch(ve.mousembuttonclick, e); });
    entityCollection.events.on("mouselbuttondoubleclick", null, function (e) { ve.dispatch(ve.mouselbuttondoubleclick, e); });
    entityCollection.events.on("mouserbuttondoubleclick", null, function (e) { ve.dispatch(ve.mouserbuttondoubleclick, e); });
    entityCollection.events.on("mousembuttondoubleclick", null, function (e) { ve.dispatch(ve.mousembuttondoubleclick, e); });
    entityCollection.events.on("mouselbuttonup", null, function (e) { ve.dispatch(ve.mouselbuttonup, e); });
    entityCollection.events.on("mouserbuttonup", null, function (e) { ve.dispatch(ve.mouserbuttonup, e); });
    entityCollection.events.on("mousembuttonup", null, function (e) { ve.dispatch(ve.mousembuttonup, e); });
    entityCollection.events.on("mouselbuttondown", null, function (e) { ve.dispatch(ve.mouselbuttondown, e); });
    entityCollection.events.on("mouserbuttondown", null, function (e) { ve.dispatch(ve.mouserbuttondown, e); });
    entityCollection.events.on("mousembuttondown", null, function (e) { ve.dispatch(ve.mousembuttondown, e); });
    entityCollection.events.on("mouselbuttonhold", null, function (e) { ve.dispatch(ve.mouselbuttonhold, e); });
    entityCollection.events.on("mouserbuttonhold", null, function (e) { ve.dispatch(ve.mouserbuttonhold, e); });
    entityCollection.events.on("mousembuttonhold", null, function (e) { ve.dispatch(ve.mousembuttonhold, e); });
    entityCollection.events.on("mousewheel", null, function (e) { ve.dispatch(ve.mousewheel, e); });
    entityCollection.events.on("touchstart", null, function (e) { ve.dispatch(ve.touchstart, e); });
    entityCollection.events.on("touchend", null, function (e) { ve.dispatch(ve.touchend, e); });
};

/**
 * @private
 */
og.layer.Vector.prototype._collectVisibleCollections = function (outArr) {
    if (this.minZoom <= this._planet.maxCurrZoom && this.maxZoom >= this._planet.maxCurrZoom) {

        this._renderingNodes = {};
        this._renderingNodesNorth = {};
        this._renderingNodesSouth = {};

        this._secondPASS = [];
        this._entityCollectionsTree.collectRenderCollections(this._planet._visibleNodes, outArr);
        var i = this._secondPASS.length;
        while (i--) {
            this._secondPASS[i].collectRenderCollectionsPASS2(this._planet._visibleNodes, outArr, this._secondPASS[i].nodeId);
        }

        this._secondPASS = [];
        this._entityCollectionsTreeNorth.collectRenderCollections(this._planet._visibleNodesNorth, outArr);
        i = this._secondPASS.length;
        while (i--) {
            this._secondPASS[i].collectRenderCollectionsPASS2(this._planet._visibleNodesNorth, outArr, this._secondPASS[i].nodeId);
        }

        this._secondPASS = [];
        this._entityCollectionsTreeSouth.collectRenderCollections(this._planet._visibleNodesSouth, outArr);
        i = this._secondPASS.length;
        while (i--) {
            this._secondPASS[i].collectRenderCollectionsPASS2(this._planet._visibleNodesSouth, outArr, this._secondPASS[i].nodeId);
        }
    }
};

og.layer.Vector.prototype._queueDeferredNode = function (node) {
    if (this._visibility) {
        node._inTheQueue = true;
        if (this._counter >= 1) {
            this._deferredEntitiesPendingQueue.push(node);
        } else {
            this._execDeferredNode(node);
        }
    }
};

og.layer.Vector.prototype._execDeferredNode = function (node) {
    this._counter++;
    var that = this;
    setTimeout(function () {
        node.applyCollection();
        that._dequeueRequest();
    }, 0);
};

og.layer.Vector.prototype._dequeueRequest = function () {
    this._counter--;
    if (this._deferredEntitiesPendingQueue.length && this._counter < 1) {
        var node;
        if (node = this._whilePendings())
            this._execDeferredNode(node);
    }
};

og.layer.Vector.prototype._whilePendings = function () {
    while (this._deferredEntitiesPendingQueue.length) {
        var node = this._deferredEntitiesPendingQueue.pop();
        node._inTheQueue = false;
        if (node.isVisible()) {
            return node;
        }
    }
    return null;
};