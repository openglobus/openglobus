goog.provide('og.layer.GMXVector')

goog.require('og.EntityCollection');
goog.require('og.Entity');
goog.require('og.LonLat');
goog.require('og.quadTree');
goog.require('og.quadTree.EntityCollectionQuadNode');
goog.require('og.math');
goog.require('og.inheritance');
goog.require('og.QueueArray');
goog.require('og.GeometryHandler');

/**
 * Vector layer represents alternative entities store. Used for geospatial data rendering like
 * points, lines, polygons, geometry objects etc.
 * @class
 * @extends {og.layer.Layer}
 * @param {string} [name="noname"] - Layer name.
 * @param {Object} [options] - Layer options:
 * @param {number} [options.minZoom=0] - Minimal visible zoom. 0 is default
 * @param {number} [options.maxZoom=50] - Maximal visible zoom. 50 is default.
 * @param {string} [options.attribution] - Layer attribution.
 * @param {string} [options.zIndex=0] - Layer Z-order index. 0 is default.
 * @param {boolean} [options.visibility=true] - Layer visibility. True is default.
 * @param {boolean} [options.isBaseLayer=false] - Layer base layer. False is default.
 * @param {Array.<og.Entity>} [options.entities] - Entities array.
 * @param {Array.<number,number,number>} [options.scaleByDistance] - Scale by distance parameters.
 *      First index - near distance to the entity, after entity becomes full scale.
 *      Second index - far distance to the entity, when entity becomes zero scale.
 *      Third index - far distance to the entity, when entity becomes invisible.
 * @param {number} [options.nodeCapacity=30] - Maximum entities quantity in the tree node. Rendering optimization parameter. 30 is default.
 * @param {boolean} [options.async=true] - Asynchronous vector data handling before rendering. True for optimization huge data.
 * @param {boolean} [options.groundAlign = false] - Vector data align to the ground relief. Like points with zero altitude lay on the ground.
 *
 * @fires og.layer.GMXVector#entitymove
 * @fires og.layer.GMXVector#draw
 * @fires og.layer.GMXVector#add
 * @fires og.layer.GMXVector#remove
 * @fires og.layer.GMXVector#entityadd
 * @fires og.layer.GMXVector#entityremove
 * @fires og.layer.GMXVector#visibilitychange
 */
og.layer.GMXVector = function (name, options) {
    options = options || {};

    og.inheritance.base(this, name, options);

    this.events.registerNames(og.layer.GMXVector.EVENT_NAMES);
};

og.inheritance.extend(og.layer.GMXVector, og.layer.Layer);

og.layer.GMXVector.EVENT_NAMES = [
    /**
     * Triggered when entity has moved.
     * @event og.layer.GMXVector#draw
     */
    "entitymove",

    /**
     * Triggered when layer begin draw.
     * @event og.layer.GMXVector#draw
     */
    "draw",

    /**
     * Triggered when new entity added to the layer.
     * @event og.layer.GMXVector#entityadd
     */
    "entityadd",

    /**
     * Triggered when entity removes from the collection.
     * @event og.layer.GMXVector#entityremove
     */
    "entityremove"
];

/**
 * Vector layer {@link og.layer.GMXVector} object factory.
 * @static
 * @returns {og.layer.GMXVector} Returns vector layer.
 */
og.layer.gmxVector = function (name, options) {
    return new og.layer.GMXVector(name, options);
};