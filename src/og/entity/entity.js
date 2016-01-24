goog.provide('og.Entity');
goog.provide('og.entity');

goog.require('og.math.Vector3');
goog.require('og.Billboard');
goog.require('og.Label');
goog.require('og.LonLat');
goog.require('og.shape.Sphere');

/**
 * Entity instances aggregate multiple forms of visualization into a single high-level object.
 * They can be created manually and added to entity collection.
 *
 * @class
 * @param {Object} [options] - Entity options:
 * @param {string} [options.name] - A human readable name to display to users. It does not have to be unique.
 * @param {og.math.Vector3|Array.<number>} [options.cartesian] - Spatial entities like billboard, lanel, sphere etc. cartesian position.
 * @param {og.LonLat} [options.lonlat] - Geidetic coordiantes for an entities like billboard, lanel, sphere etc. cartesian position.
 * @param {boolean} [options.aground] - Geodetic type entity replaces over a relief.
 * @param {boolean} [options.visibility] - Entity visibility.
 * @param {Object} [options.billboard] - Billboard options.
 * @param {Object} [options.label] - Label options.
 * @param {Object} [properties] - Entity properties.
 */
og.Entity = function (options, properties) {

    options = options || {};

    /**
     * Unic identifier.
     * @public
     * @readonly
     */
    this.id = og.Entity.__staticCounter++;

    /**
     * Entity user defined properties.
     * @public
     * @type {Object}
     */
    this.properties = properties || {};
    this.properties.name = this.properties.name || "noname";

    /**
     * Children entities.
     * @public
     * @type {og.Entity}
     */
    this.childrenNodes = [];

    /**
     * Parent entity.
     * @public
     * @type {og.Entity}
     */
    this.parent = null;

    /**
     * Entity cartesian position
     * @private
     * @type {og.math.Vector3}
     */
    this._cartesian = og.utils.createVector3(options.cartesian);

    /**
     * Geodetic entity coordiantes.
     * @private
     * @type {og.LonLat}
     */
    this._lonlat = options.lonlat || null;

    /**
     * Visibility.
     * @private
     * @type {boolean}
     */
    this._visibility = options.visibility != undefined ? options.visibility : true;

    /**
     * Entity collection that this entity belongs to.
     * @private
     * @type {og.EntityCollection}
     */
    this._entityCollection = null;

    /**
     * Entity collection array store index.
     * @private
     */
    this._entityCollectionIndex = -1;

    /**
     * Picking color.
     * @private
     */
    this._pickingColor = new og.math.Vector3(0, 0, 0);

    this._featureConstructorArray = {
        "billboard": [og.Billboard, this.setBillboard],
        "label": [og.Label, this.setLabel],
        "sphere": [og.shape.Sphere, this.setSphere],
        "box": [og.shape.Box, this.setBox],
    };

    this.billboard = this._createOptionFeature('billboard', options.billboard);
    this.label = this._createOptionFeature('label', options.label);
    this.sphere = this._createOptionFeature('sphere', options.sphere);
    this.box = this._createOptionFeature('sphere', options.box);
    //this.model = null;
    //this.lineString = null;
    //this.linearRing = null;
    //this.polygon = null;
    //this.multiPolygon = null;
    //...
};

og.entity = function (options, properties) {
    return new og.Entity(options, properties);
};

og.Entity.__staticCounter = 0;

og.Entity.prototype._createOptionFeature = function (featureName, options) {
    if (options) {
        var c = this._featureConstructorArray[featureName];
        return c[1].call(this, new c[0](options));
    } return null;
};

/**
 * Adds current entity into the specified entity collection.
 * @public
 * @param {og.EntityCollection} entityCollection - Specified entity collection.
 */
og.Entity.prototype.addTo = function (entityCollection) {
    entityCollection.add(this);
    return this;
};

/**
 * Removes current entity from specifeid entity collection.
 * @public
 */
og.Entity.prototype.remove = function () {
    this._entityCollection && this._entityCollection.removeEntity(this);
};

/**
 * Sets the entity visibility.
 * @public
 * @param {boolean} visibilty - Entity visibility.
 */
og.Entity.prototype.setVisibility = function (visibility) {
    this._visibility = visibility;

    //billboards
    this.billboard && this.billboard.setVisibility(visibility);

    //labels
    this.label && this.label.setVisibility(visibility);

    //sphere
    this.sphere && this.sphere.setVisibility(visibility);

    //box
    this.box && this.box.setVisibility(visibility);

    for (var i = 0; i < this.childrenNodes.length; i++) {
        this.childrenNodes[i].setVisibility(visibility);
    }
};

/**
 * Returns entity visibility.
 * @public
 * @returns {boolean}
 */
og.Entity.prototype.getVisibility = function () {
    return this._visibility;
};

/**
 * Sets entity cartesian position.
 * @public
 * @param {og.math.Vector3} position - Cartesian position in 3d space.
 */
og.Entity.prototype.setCartesian3v = function (cartesian) {
    this.setCartesian(cartesian.x, cartesian.y, cartesian.z);
};

/**
 * Sets entity cartesian position.
 * @public
 * @param {number} x - 3d space X - position.
 * @param {number} y - 3d space Y - position.
 * @param {number} z - 3d space Z - position.
 */
og.Entity.prototype.setCartesian = function (x, y, z) {

    var p = this._cartesian;

    p.x = x;
    p.y = y;
    p.z = z;

    //billboards
    this.billboard && this.billboard.setPosition3v(p);

    //labels
    this.label && this.label.setPosition3v(p);

    //sphere
    this.sphere && this.sphere.setPosition3v(p);

    //box
    this.box && this.box.setPosition3v(p);

    for (var i = 0; i < this.childrenNodes.length; i++) {
        this.childrenNodes[i].setCartesian(x, y, z);
    }
};

og.Entity.prototype.getLonLat = function () {
    var ec = this._entityCollectio;
    if (ec && ec.renderNode && ec.renderNode.ellipsoid) {
        this._lonlat = ec.renderNode.ellipsoid.cartesianToLonLat(lonlat);
        return this._lonlat;
    }
};

/**
 * Sets geodetic coordinates of the entity point object.
 * @public
 * @param {og.LonLat} lonlat - WGS84 coordinates.
 */
og.Entity.prototype.setLonLat = function (lonlat) {
    var l = this._lonlat;

    l.lon = lonlat.lon;
    l.lat = lonlat.lat;
    l.height = lonlat.height;

    var ec = this._entityCollection;
    if (ec && ec.renderNode && ec.renderNode.ellipsoid) {
        this._cartesian = ec.renderNode.ellipsoid.lonLatToCartesian(lonlat);
        this.setCartesian3v(this._cartesian);
    }
};

/**
 * Returns carteain position.
 * @public
 * @returns {og.math.Vector3}
 */
og.Entity.prototype.getCartesian = function () {
    return this._cartesian;
};

/**
 * Sets entity billboard.
 * @public
 * @param {og.Billboard} billboard - Billboard image.
 */
og.Entity.prototype.setBillboard = function (billboard) {
    if (this.billboard) {
        this.billboard.remove();
    }
    this.billboard = billboard;
    this.billboard._entity = this;
    this.billboard.setPosition3v(this._cartesian);
    this.billboard.setVisibility(this._visibility);
    this._entityCollection && this._entityCollection._billboardHandler.add(billboard);
    return billboard;
};

/**
 * Sets entity label.
 * @public
 * @param {og.Label} label - Text label.
 */
og.Entity.prototype.setLabel = function (label) {
    if (this.label) {
        this.label.remove();
    }
    this.label = label;
    this.label._entity = this;
    this.label.setPosition3v(this._cartesian);
    this.label.setVisibility(this._visibility);
    this._entityCollection && this._entityCollection._labelHandler.add(label);
    return label;
};

/**
 * Sets entity sphere.
 * @public
 * @param {og.Sphere} sphere - Sphere shape.
 */
og.Entity.prototype.setSphere = function (sphere) {
    if (this.sphere) {
        this.sphere.remove();
    }
    this.sphere = sphere;
    this.sphere._entity = this;
    this.sphere.setPosition3v(this._cartesian);
    this.sphere.setVisibility(this._visibility);
    this._entityCollection && this._entityCollection._shapeHandler.add(sphere);
    return sphere;
};

/**
 * Sets entity box.
 * @public
 * @param {og.Box} box - Box shape.
 */
og.Entity.prototype.setBox = function (box) {
    //TODO
};

/**
 * Append child entity.
 * @public
 * @param {og.Entity} entity - Entity child.
 */
og.Entity.prototype.appendChild = function (entity) {
    entity._entityCollection = this._entityCollection;
    entity._pickingColor = this._pickingColor;
    entity.parent = this;
    this.childrenNodes.push(entity);
    this._entityCollection && this._entityCollection._addRecursively(entity);
};

/**
 * Appends entity items(billboard, label etc.) picking color.
 * @public
 */
og.Entity.prototype.setPickingColor = function () {

    var c = this._pickingColor;

    //billboard
    this.billboard && this.billboard.setPickingColor3v(c);

    //label
    this.label && this.label.setPickingColor3v(c);

    //sphere
    this.sphere && this.sphere.setPickingColor3v(c);

    //box
    this.box && this.box.setPickingColor3v(c);

    for (var i = 0; i < this.childrenNodes.length; i++) {
        this.childrenNodes[i].setPickingColor3v(c);
    }
};