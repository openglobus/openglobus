goog.provide('og.bv.Sphere');

goog.require('og.bv');
goog.require('og.math.Vector3');

/**
 * Bounding sphere class.
 * @class
 * @param {Number} [radius] - Bounding sphere radius.
 * @param {og.math.Vector3} [center] - Bounding sphere coordiantes.
 */
og.bv.Sphere = function (radius, center) {

    /**
     * Sphere radius.
     * @public
     * @type {Number}
     */
    this.radius = radius || 0;

    /**
     * Sphere coordiantes.
     * @public
     * @type {og.math.Vector3}
     */
    this.center = center ? center.clone() : new og.math.Vector3();
};

/**
 * Sets bounding sphere coordinates by the bounds array.
 * @param {Array.<number>} bounds - Bounds is an array where [minX, maxX, minY, maxY, minZ, maxZ]
 */
og.bv.Sphere.prototype.setFromBounds = function (bounds) {
    this.center.set(bounds[0] + (bounds[1] - bounds[0]) / 2, bounds[2] + (bounds[3] - bounds[2]) / 2, bounds[4] + (bounds[5] - bounds[4]) / 2);
    this.radius = this.center.distance(new og.math.Vector3(bounds[0], bounds[2], bounds[4]));
};

/**
 * Sets bounding sphere coordiantes by ellipsoid geodetic extend.
 * @param {og.Ellipsoid} ellipsoid - Ellipsoid.
 * @param {og.Extent} extent - Geodetic extent.
 */
og.bv.Sphere.prototype.setFromExtent = function (ellipsoid, extent) {
    this.setFromBounds(extent.getCartesianBounds(ellipsoid));
};
