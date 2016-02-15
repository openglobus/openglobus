goog.provide('og.layer.Vector')

goog.require('og.EntityCollection');
goog.require('og.Entity');
goog.require('og.LonLat');
goog.require('og.quadTree');
goog.require('og.quadTree.EntityCollectionQuadNode');
goog.require('og.math');
goog.require('og.inheritance');

og.layer.Vector = function (name, options) {
    options = options || {};

    og.inheritance.base(this, name, options);

    this.events.registerNames(og.layer.Vector.EVENT_NAMES);

    /**
     * First index - near distance to the entity, after entity becomes full scale.
     * Second index - far distance to the entity, when entity becomes zero scale.
     * Third index - far distance to the entity, when entity becomes invisible.
     * @public
     * @type {Array.<number,number,number>}
     */
    this.scaleByDistance = options.scaleByDistance || [og.math.MAX32, og.math.MAX32, og.math.MAX32];

    this._maxCountPerCollection = 30;

    this._entities = options.entities ? [].concat(options.entities) : [];

    this._entityCollectionsTree = null;
    this._entityCollectionsTreeNorth = null;
    this._entityCollectionsTreeSouth = null;

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
 * @public
 */
og.layer.Vector.prototype.addTo = function (planet) {
    this._assignPlanet(planet);
    this._buildEntityCollectionsTree();
};

og.layer.Vector.prototype.getEntities = function () {
    return [].concat(this._entities);
};

/**
 * @public
 * @param {og.Entity} entity - Entity.
 */
og.layer.Vector.prototype.addEntity = function (entity) {
    this._entities.push(entity);
    this._entityCollectionsTree.insertEntity(entity);
    this.events.dispatch(this.events.entityadd, entity);
    return this;
};

/**
 * @public
 * @param {Array.<og.Entity>} entities - Entities array.
 */
og.layer.Vector.prototype.addEntities = function (entities) {
    var i = entities.length;
    while (i--) {
        this.addEntity(entities[i]);
    }
    return this;
};

og.layer.Vector.prototype.removeEntity = function (entity) {
    //TODO:
    this.events.dispatch(this.events.entityremove, entity);
    return this;
};

og.layer.Vector.prototype.removeEntities = function (entities) {
    var i = entities.length;
    while (i--) {
        this.removeEntity(entities[i]);
    }
    return this;
};

og.layer.Vector.prototype.setEntities = function (entities) {
    this.clear();
    this._entities = [].concat(entities);
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
 * @public
 */
og.layer.Vector.prototype.setMaxEntitiesCountPerCollection = function (count) {
    this._maxCountPerCollection = count;
};

/**
 * @public
 */
og.layer.Vector.prototype.clear = function () {
    //TODO
};

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

og.layer.Vector.prototype._bindEventsDefault = function (entityCollection) {
    var ve = this.events;
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

og.layer.Vector.prototype._collectVisibleCollections = function (outArr) {
    this._secondPASS = [];
    if (this.minZoom <= this._planet.maxCurrZoom && this.maxZoom >= this._planet.maxCurrZoom) {
        this._entityCollectionsTree.collectRenderCollections(this._planet._visibleNodes, outArr);
        var i = this._secondPASS.length;
        while (i--) {
            this._secondPASS[i].collectRenderCollectionsPASS2(outArr);
        }
    }
};