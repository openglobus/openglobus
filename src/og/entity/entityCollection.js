goog.provide('og.EntityCollection');


goog.require('og.BillboardHandler');
goog.require('og.LabelHandler');
goog.require('og.Events');

/*
 * og.EntityCollection
 *
 *
 */
og.EntityCollection = function () {
    this.events = new og.Events();
    this._renderNodeIndex = -1;
    this.renderNode = null;
    this.visibility = true;
    this._billboardHandler = new og.BillboardHandler(this);
    this._labelHandler = new og.LabelHandler(this);

    this.entities = [];

    this.events.registerNames([
        "add",
        "remove",
        "entityadd",
        "entityremove",
        "visibilitychange",
        "mousemove",
        "mousein",
        "mouseout",
        "mouselbuttonclick",
        "mouselbuttondown",
        "mouselbuttonup",
        "mouserbuttonclick",
        "mouserbuttondown",
        "mouserbuttonup",
        "touchstart",
        "touchend"
    ]);

    this.labelPickingEnabled = true;
    this.billboardPickingEnabled = true;
};

og.EntityCollection.prototype.setVisibility = function (visibility) {
    this.visibility = visibility;
    this.events.dispatch(this.events.visibilitychange, this);
};

og.EntityCollection.prototype._addRecursively = function (entity) {

    //billboard
    entity.billboard && this._billboardHandler.add(entity.billboard);

    //label
    entity.label && this._labelHandler.add(entity.label);

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
    entity.billboard && this._billboardHandler.remove(entity.billboard);

    //label
    entity.label && this._labelHandler.remove(entity.label);

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
        this._billboardHandler.setRenderer(renderer);
        this._labelHandler.setRenderer(renderer);
        this.updateBillboardsTextureAtlas();
        this.updateLabelsFontAtlas();
        this.createPickingColors();
    }
};

og.EntityCollection.prototype.updateBillboardsTextureAtlas = function () {
    var b = this._billboardHandler._billboards;
    for (var i = 0; i < b.length; i++) {
        b[i].setSrc(b[i].src);
    }
};

og.EntityCollection.prototype.updateLabelsFontAtlas = function () {
    if (this.renderNode) {
        var l = this._labelHandler._billboards;
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