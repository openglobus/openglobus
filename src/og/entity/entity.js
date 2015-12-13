goog.provide('og.Entity');

goog.require('og.math.Vector3');
goog.require('og.Billboard');
goog.require('og.Label');

/**
 * Entity instances aggregate multiple forms of visualization into a single high-level object.
 * They can be created manually and added to entity collection.
 *
 * @class
 * @param {Object} [options] - Object with the following properties:
 * @param {string} [options.name] - A human readable name to display to users. It does not have to be unique.
 */
og.Entity = function (options) {

    options = options || {};
    
    this.name = options.name || ("noname_" + og.Entity.__staticCounter++);

    this.billboard = null;
    this.label = null;
    //...

    this.childrenNodes = [];
    this.parent = null;

    /**
     * Entity position
     * @private
     * @type {og.math.Vector3}
     */
    this._position = new og.math.Vector3();

    /**
     * Visibility.
     * @private
     * @type {boolean}
     */
    this._visibility = true;

    /**
     * Entity collection that this entity belongs to.
     * @private
     * @type {og.EntityCollection}
     */
    this._entityCollection = null;

    this._entityCollectionIndex = -1;

    this._pickingColor = new og.math.Vector3(0, 0, 0);
};

og.Entity.__staticCounter = 0;

og.Entity.prototype.addTo = function (entityCollection) {
    entityCollection.add(this);
};

og.Entity.prototype.remove = function () {
    this._entityCollection && this._entityCollection.removeEntity(this);
};

og.Entity.prototype.setVisibility = function (visibility) {
    this._visibility = visibility;

    //billboards
    this.billboard && this.billboard.setVisibility(visibility);

    //labels
    this.label && this.label.setVisibility(visibility);

    for (var i = 0; i < this.childrenNodes.length; i++) {
        this.childrenNodes[i].setVisibility(visibility);
    }
};

og.Entity.prototype.getVisibility = function () {
    return this._visibility;
};

og.Entity.prototype.getPosition = function () {
    return this._position;
};

og.Entity.prototype.setPosition3v = function (position) {
    this.setPosition(position.x, position.y, position.z);
};

og.Entity.prototype.setPosition = function (x, y, z) {

    var p = this._position;

    p.x = x;
    p.y = y;
    p.z = z;

    //billboards
    this.billboard && this.billboard.setPosition3v(p);

    //labels
    this.label && this.label.setPosition3v(p);

    for (var i = 0; i < this.childrenNodes.length; i++) {
        this.childrenNodes[i].setPosition3v(p);
    }
};

og.Entity.prototype.setPickingColor = function () {

    var c = this._pickingColor;

    //billboards
    this.billboard && this.billboard.setPickingColor3v(c);

    //labels
    this.label && this.label.setPickingColor3v(c);

    for (var i = 0; i < this.childrenNodes.length; i++) {
        this.childrenNodes[i].setPickingColor3v(c);
    }
};

og.Entity.prototype.setBillboard = function (billboard) {
    if (this.billboard) {
        this.billboard.remove();
    }
    this.billboard = billboard;
    this.billboard._entity = this;
    this.billboard.setPosition3v(this._position);
    this.billboard.setVisibility(this._visibility);
    this._entityCollection && this._entityCollection._billboardHandler.add(billboard);
};

og.Entity.prototype.setLabel = function (label) {
    if (this.label) {
        this.label.remove();
    }
    this.label = label;
    this.label._entity = this;
    this.label.setPosition3v(this._position);
    this.label.setVisibility(this._visibility);
    this._entityCollection && this._entityCollection._labelHandler.add(label);
};

og.Entity.prototype.appendChild = function (entity) {
    entity._entityCollection = this._entityCollection;
    entity._pickingColor = this._pickingColor;
    entity.parent = this;
    this.childrenNodes.push(entity);
    this._entityCollection && this._entityCollection._addRecursively(entity);
};
