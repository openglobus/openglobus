goog.provide('og.EntityCollection');

goog.require('og.BillboardHandler');
goog.require('og.LabelHandler');
goog.require('og.Events');

/**
 * An observable collection of og.Entity instances where each entity has a unique id.
 * Entity collection provide handlers for an each type of entity like billboard, label or 3ds object.
 * @constructor
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
og.EntityCollection = function () {

    this._renderNodeIndex = -1;

    /**
     * Render node context.
     * @public
     * @type {og.node.RenderNode}
     */
    this.renderNode = null;

    /**
     * Visibility option.
     * @public
     * @type {boolean}
     */
    this.visibility = true;

    this.billboardHandler = new og.BillboardHandler(this);
    this.labelHandler = new og.LabelHandler(this);

    /**
     * Entities array.
     * @public
     * type {Array.<og.Entity>}
     */
    this.entities = [];

    /**
     *Entity collection events handler.
     * @public
     * @type {og.Events}
     */
    this.events = new og.Events();
    this.events.registerNames(og.EntityCollection.EVENT_NAMES);
};

/**
 * Entity collection events names
 * @type {Array.<string>}
 * @const
 */
og.EntityCollection.EVENT_NAMES = [
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

        "touchstart",
        "touchend"];

og.EntityCollection.prototype.setVisibility = function (visibility) {
    this.visibility = visibility;
    this.events.dispatch(this.events.visibilitychange, this);
};

og.EntityCollection.prototype._addRecursively = function (entity) {

    //billboard
    entity.billboard && this.billboardHandler.add(entity.billboard);

    //label
    entity.label && this.labelHandler.add(entity.label);

    this.events.dispatch(this.events.entityadd, entity);

    for (var i = 0; i < entity.childrenNodes.length; i++) {
        entity.childrenNodes[i]._entityCollection = this;
        entity.childrenNodes[i]._entityCollectionIndex = entity._entityCollectionIndex;
        entity.childrenNodes[i]._pickingColor = entity._pickingColor;
        this._addRecursively(entity.childrenNodes[i]);
    }
};

og.EntityCollection.prototype.add = function (entity) {
    if (!entity._entityCollection) {
        entity._entityCollection = this;
        entity._entityCollectionIndex = this.entities.length;
        this.entities.push(entity);
        this.renderNode && this.renderNode.renderer && this.renderNode.renderer.assignPickingColor(entity);
        this._addRecursively(entity);
    }
    return this;
};

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

    this.events.dispatch(this.events.entityremove, entity);

    for (var i = 0; i < entity.childrenNodes.length; i++) {
        this._removeRecursively(entity.childrenNodes[i]);
    }
};

og.EntityCollection.prototype.removeEntity = function (entity) {
    this.entities.splice(entity._entityCollectionIndex, 1);
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

og.EntityCollection.prototype.createPickingColors = function () {
    var e = this.entities;
    for (var i = 0; i < e.length; i++) {
        if (!e[i].parent) {
            this.renderNode.renderer.assignPickingColor(e[i]);
            e[i].setPickingColor();
        }
    }
};

og.EntityCollection.prototype.reindexEntitiesArray = function (startIndex) {
    var e = this.entities;
    for (var i = startIndex; i < e.length; i++) {
        e[i]._entityCollectionIndex = i;
    }
};

og.EntityCollection.prototype.addTo = function (renderNode) {
    if (!this.renderNode) {
        this._renderNodeIndex = renderNode.entityCollections.length;
        this.renderNode = renderNode;
        renderNode.entityCollections.push(this);
        this.setRenderer(renderNode.renderer);
        this.events.dispatch(this.events.add, this);
    }
    return this;
};

og.EntityCollection.prototype.setRenderer = function (renderer) {
    if (renderer) {
        this.billboardHandler.setRenderer(renderer);
        this.labelHandler.setRenderer(renderer);
        this.updateBillboardsTextureAtlas();
        this.updateLabelsFontAtlas();
        this.createPickingColors();
    }
};

og.EntityCollection.prototype.updateBillboardsTextureAtlas = function () {
    var b = this.billboardHandler._billboards;
    for (var i = 0; i < b.length; i++) {
        b[i].setSrc(b[i].src);
    }
};

og.EntityCollection.prototype.updateLabelsFontAtlas = function () {
    if (this.renderNode) {
        var l = this.labelHandler._billboards;
        for (var i = 0; i < l.length; i++) {
            l[i].assignFontAtlas(this.renderNode.fontAtlas);
        }
    }
};

og.EntityCollection.prototype.remove = function () {
    if (this.renderNode) {
        this.renderNode.billboardCollection.splice(this._renderNodeIndex, 1);
        this.renderNode = null;
        this._renderNodeIndex = -1;
        for (var i = this._renderNodeIndex; i < this.renderNode.entityCollections.length; i++) {
            this.renderNode.entityCollections._renderNodeIndex = i;
        }
        this.events.dispatch(this.events.remove, this);
    }
};

og.EntityCollection.prototype.clear = function () {
    for (var i = 0; i < this.entities.length; i++) {
        this.entities[i].remove();
    }
};