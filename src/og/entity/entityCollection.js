goog.provide('og.EntityCollection');

goog.require('og.BillboardHandler');
goog.require('og.LabelHandler');
goog.require('og.ShapeHandler');
goog.require('og.LineStringHandler');
goog.require('og.Events');

/**
 * An observable collection of og.Entity instances where each entity has a unique id.
 * Entity collection provide handlers for an each type of entity like billboard, label or 3ds object.
 * @constructor
 * @params {Object} [options] - Entity options:
 * @params {boolean} [options.visibility] - Entity visibility.
 * @params {Array.<number,number,number>} [options.scaleByDistance] - Entity scale by distance parameters.
 * @params {number} [options.opacity] - Entity global opacity.
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
 * @fires og.Events#touchmove
 * @fires og.Events#touchstart
 * @fires og.Events#touchend
 * @fires og.Events#doubletouch
 */
og.EntityCollection = function (options) {

    options = options || {};

    /**
     * Unic identifier.
     * @public
     * @readonly
     */
    this.id = og.EntityCollection.__staticCounter++;

    /**
     * Render node collections array index.
     * @private
     * @type {number}
     */
    this._renderNodeIndex = -1;

    /**
     * Render node context.
     * @public
     * @type {og.node.RenderNode}
     */
    this.renderNode = null;

    /**
     * Visibility option.
     * @private
     * @type {boolean}
     */
    this._visibility = options.visibility == undefined ? true : options.visibility;

    /**
     * Billboards handler
     * @public
     * @type {og.BillboardHandler}
     */
    this.billboardHandler = new og.BillboardHandler(this);

    /**
     * Labels handler
     * @public
     * @type {og.LabelHandler}
     */
    this.labelHandler = new og.LabelHandler(this);

    /**
     * Shape handler
     * @public
     * @type {og.ShapeHandler}
     */
    this.shapeHandler = new og.ShapeHandler(this);

    /**
     * LineString handler
     * @public
     * @type {og.LineStringHandler}
     */
    this.lineStringHandler = new og.LineStringHandler(this);

    //
    //...

    /**
     * Entities array.
     * @private
     * type {Array.<og.Entity>}
     */
    this._entities = [];

    /**
     * First index - near distance to the entity, after entity becomes full scale.
     * Second index - far distance to the entity, when entity becomes zero scale.
     * Third index - far distance to the entity, when entity becomes invisible.
     * @public
     * @type {Array.<number,number,number>}
     */
    this.scaleByDistance = options.scaleByDistance || [og.math.MAX32, og.math.MAX32, og.math.MAX32];

    /**
     * Global opacity.
     * @private
     * @type {number}
     */
    this._opacity = options.opacity == undefined ? 1.0 : options.opacity;

    /**
     * Opacity state during the animated opacity.
     * @private
     * @type {number}
     */
    this._animatedOpacity = this._opacity;

    /**
     * Entity collection events handler.
     * @public
     * @type {og.Events}
     */
    this.events = new og.Events();
    this.events.registerNames(og.EntityCollection.EVENT_NAMES);
};

og.EntityCollection.__staticCounter = 0;

/**
 * Entity collection events names
 * @type {Array.<string>}
 * @const
 */
og.EntityCollection.EVENT_NAMES = [
        /**
         * Triggered when entity has moved.
         * @event og.Events#draw
         */
        "entitymove",

        /**
         * Triggered when collection entities begin draw.
         * @event og.Events#draw
         */
        "draw",

        /**
         * Triggered when added to the render node.
         * @event og.Events#add
         */
        "add",

        /**
         * Triggered when removed from the render node.
         * @event og.Events#remove
         */
        "remove",

        /**
         * Triggered when new entity added to the collection.
         * @event og.Events#entityadd
         */
        "entityadd",

        /**
         * Triggered when entity removes from the collection.
         * @event og.Events#entityremove
         */
        "entityremove",

        /**
         * Triggered when visibility changes.
         * @event og.Events#visibilitychange
         */
        "visibilitychange",

        /**
         * Triggered when mouse moves over the entity.
         * @event og.Events#mousemove
         */
        "mousemove",

        /**
         * Triggered when mouse has entered over the entity.
         * @event og.Events#mouseenter
         */
        "mouseenter",

        /**
         * Triggered when mouse leaves the entity.
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

        "touchmove",
        "touchstart",
        "touchend",
        "doubletouch",
        "touchleave",
        "touchenter"];

/**
 * Sets collection visibility.
 * @public
 * @param {boolean} visibility - Visibility flag.
 */
og.EntityCollection.prototype.setVisibility = function (visibility) {
    this._visibility = visibility;
    this._animatedOpacity = this._opacity * (visibility ? 1 : 0);
    this.events.dispatch(this.events.visibilitychange, this);
};

/**
 * Returns collection visibility.
 * @public
 * @returns {boolean}
 */
og.EntityCollection.prototype.getVisibility = function () {
    return this._visibility;
};

/**
 * Sets collection opacity.
 * @public
 * @param {number} opacity - Opacity.
 */
og.EntityCollection.prototype.setOpacity = function (opacity) {
    this._opacity = opacity;
};

/**
 * Gets collection opacity.
 * @public
 * @param {number} opacity - Opacity.
 */
og.EntityCollection.prototype.getOpacity = function () {
    return this._opacity;
};

/**
 * Sets scale by distance parameters.
 * @public
 * @param {number} near - Full scale entity distance.
 * @param {number} far - Zerol scale entity distance.
 * @param {number} [farInvisible] - Entity visibility distance.
 */
og.EntityCollection.prototype.setScaleByDistance = function (near, far, farInisible) {
    this.scaleByDistance[0] = near;
    this.scaleByDistance[1] = far;
    this.scaleByDistance[2] = farInisible || og.math.MAX32;
};

og.EntityCollection.prototype._addRecursively = function (entity) {

    //billboard
    entity.billboard && this.billboardHandler.add(entity.billboard);

    //label
    entity.label && this.labelHandler.add(entity.label);

    //shape
    entity.shape && this.shapeHandler.add(entity.shape);

    //shape
    entity.lineString && this.lineStringHandler.add(entity.lineString);

    this.events.dispatch(this.events.entityadd, entity);

    for (var i = 0; i < entity.childrenNodes.length; i++) {
        entity.childrenNodes[i]._entityCollection = this;
        entity.childrenNodes[i]._entityCollectionIndex = entity._entityCollectionIndex;
        entity.childrenNodes[i]._pickingColor = entity._pickingColor;
        this._addRecursively(entity.childrenNodes[i]);
    }
};

/**
 * Adds entity to the collection and returns collection.
 * @public
 * @param {og.Entity} entity - Entity.
 * @returns {og.EntityCollection}
 */
og.EntityCollection.prototype.add = function (entity) {
    if (!entity._entityCollection) {
        entity._entityCollection = this;
        entity._entityCollectionIndex = this._entities.length;
        this._entities.push(entity);
        var rn = this.renderNode;
        if (rn) {
            rn.renderer && rn.renderer.assignPickingColor(entity);
            rn.ellipsoid && entity._lonlat && entity.setCartesian3v(rn.ellipsoid.lonLatToCartesian(entity._lonlat));
        }
        this._addRecursively(entity);
    }
    return this;
};

/**
 * Adds entities array to the collection and returns collection.
 * @public
 * @param {Array.<og.Entity>} entities - Entities array.
 * @returns {og.EntityCollection}
 */
og.EntityCollection.prototype.addEntities = function (entities) {
    var i = entities.length;
    while (i--) {
        this.add(entities[i]);
    }
    return this;
};

/**
 * Returns true if the entity belongs this collection, otherwise returns false.
 * @public
 * @param {og.Entity} entity - Entity.
 * @returns {boolean}
 */
og.EntityCollection.prototype.belongs = function (entity) {
    return (entity._entityCollection && this._renderNodeIndex == entity._entityCollection._renderNodeIndex);
};

og.EntityCollection.prototype._removeRecursively = function (entity) {
    entity._entityCollection = null;
    entity._entityCollectionIndex = -1;

    //billboard
    entity.billboard && this.billboardHandler.remove(entity.billboard);

    //label
    entity.label && this.labelHandler.remove(entity.label);

    //shape
    entity.shape && this.shapeHandler.remove(entity.shape);

    //lineString
    entity.lineString && this.lineStringHandler.remove(entity.lineString);

    for (var i = 0; i < entity.childrenNodes.length; i++) {
        this._removeRecursively(entity.childrenNodes[i]);
    }
};

/**
 * Removes entity from this collection.
 * @public
 * @param {og.Entity} entity - Entity to remove.
 */
og.EntityCollection.prototype.removeEntity = function (entity) {
    this._entities.splice(entity._entityCollectionIndex, 1);
    this.reindexEntitiesArray(entity._entityCollectionIndex);

    //clear picking color
    if (this.renderNode && this.renderNode.renderer) {
        this.renderNode.renderer.clearPickingColor(entity);
        entity._pickingColor.clear();
    }

    if (this.belongs(entity)) {
        this._removeRecursively(entity);
    }

    this.events.dispatch(this.events.entityremove, entity);
};

/**
 * Removes entity from this collection without event dispatching.
 * @public
 * @param {og.Entity} entity - Entity to remove.
 */
og.EntityCollection.prototype._removeEntitySilent = function (entity) {
    this._entities.splice(entity._entityCollectionIndex, 1);
    this.reindexEntitiesArray(entity._entityCollectionIndex);

    //clear picking color
    if (this.renderNode && this.renderNode.renderer) {
        this.renderNode.renderer.clearPickingColor(entity);
        entity._pickingColor.clear();
    }

    if (this.belongs(entity)) {
        this._removeRecursively(entity);
    }
};

/**
 * Creates or refresh collected entities picking color.
 * @public
 */
og.EntityCollection.prototype.createPickingColors = function () {
    var e = this._entities;
    for (var i = 0; i < e.length; i++) {
        if (!e[i].parent) {
            this.renderNode.renderer.assignPickingColor(e[i]);
            e[i].setPickingColor();
        }
    }
};

/**
 * Refresh collected entities indexes from startIndex entitytes collection array position.
 * @public
 * @param {number} startIndex - Entities collection array index.
 */
og.EntityCollection.prototype.reindexEntitiesArray = function (startIndex) {
    var e = this._entities;
    for (var i = startIndex; i < e.length; i++) {
        e[i]._entityCollectionIndex = i;
    }
};

/**
 * Adds this collection to render node.
 * @public
 * @param {og.node.RenderNode} renderNode - Render node.
 * @param {boolean} [isHidden] - Uses in vector layers that render in planet render specific function.
 * @returns {og.EntityCollection}
 */
og.EntityCollection.prototype.addTo = function (renderNode, isHidden) {
    if (!this.renderNode) {
        this.renderNode = renderNode;
        if (!isHidden) {
            this._renderNodeIndex = renderNode.entityCollections.length;
            renderNode.entityCollections.push(this);
        }
        this.setRenderer(renderNode.renderer);
        renderNode.ellipsoid && this._updateGeodeticCoordinates(renderNode.ellipsoid);
        this.shapeHandler.setRenderNode(renderNode);
        this.lineStringHandler.setRenderNode(renderNode);
        this.events.dispatch(this.events.add, this);
    }
    return this;
};

/**
 * Updates coordiantes all lonLat entities in collection after collecction attached to the planet node.
 * @private
 */
og.EntityCollection.prototype._updateGeodeticCoordinates = function (ellipsoid) {
    var e = this._entities;
    var i = e.length;
    while (i--) {
        var ei = e[i];
        ei._lonlat && ei.setCartesian3v(ellipsoid.lonLatToCartesian(ei._lonlat));
    }
};

/**
 * Sets renderer. Used in renderer initialization, when entity collection starts before renderer has initialized.
 * @public
 * @param {og.Renderer} renderer - Renderer.
 */
og.EntityCollection.prototype.setRenderer = function (renderer) {
    if (renderer) {
        this.billboardHandler.setRenderer(renderer);
        this.labelHandler.setRenderer(renderer);
        this.updateBillboardsTextureAtlas();
        this.updateLabelsFontAtlas();
        this.createPickingColors();
    }
};

/**
 * Updates billboard texture atlas.
 * @public
 */
og.EntityCollection.prototype.updateBillboardsTextureAtlas = function () {
    var b = this.billboardHandler._billboards;
    for (var i = 0; i < b.length; i++) {
        b[i].setSrc(b[i]._src);
    }
};

/**
 * Updates labels font atlas.
 * @public
 */
og.EntityCollection.prototype.updateLabelsFontAtlas = function () {
    if (this.renderNode) {
        var l = this.labelHandler._billboards;
        for (var i = 0; i < l.length; i++) {
            l[i].assignFontAtlas(this.renderNode.fontAtlas);
        }
    }
};

/**
 * Removes collection from render node.
 * @public
 */
og.EntityCollection.prototype.remove = function () {
    if (this.renderNode) {
        if (this._renderNodeIndex != -1) {
            this.renderNode.entityCollections.splice(this._renderNodeIndex, 1);
            //reindex in the renderNode
            for (var i = this._renderNodeIndex; i < this.renderNode.entityCollections.length; i++) {
                this.renderNode.entityCollections._renderNodeIndex = i;
            }
        }
        this.renderNode = null;
        this._renderNodeIndex = -1;
        this.events.dispatch(this.events.remove, this);
    }
};

/**
 * Gets entities.
 * @public
 * @returns {Array.<og.Entity>}
 */
og.EntityCollection.prototype.getEntities = function () {
    return [].concat(this._entities);
};

/**
 * Safety entities loop.
 * @public
 * @param {function} callback - Entity callback.
 */
og.EntityCollection.prototype.each = function (callback) {
    var i = this._entities.length;
    while (i--) {
        var ei = this._entities[i];
        ei && callback(ei);
    }
};

/**
 * Removes all entities from colection and clear handlers.
 * @public
 */
og.EntityCollection.prototype.clear = function () {

    //TODO: Optimize by replace delete 
    //code to the clearEntity function.
    this.billboardHandler.clear();
    this.labelHandler.clear();
    this.shapeHandler.clear();
    this.lineStringHandler.clear();

    var i = this._entities.length;
    while (i--) {
        var ei = this._entities[i];
        if (this.renderNode && this.renderNode.renderer) {
            this.renderNode.renderer.clearPickingColor(ei);
            ei._pickingColor.clear();
        }
        this._clearEntity(ei);
    }
    this._entities.length = 0;
    this._entities = [];
};

og.EntityCollection.prototype._clearEntity = function (entity) {
    entity._entityCollection = null;
    entity._entityCollectionIndex = -1;
    for (var i = 0; i < entity.childrenNodes.length; i++) {
        this._clearEntity(entity.childrenNodes[i]);
    }
};