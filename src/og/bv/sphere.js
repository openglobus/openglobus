goog.provide('og.bv.Sphere');

goog.require('og.bv');
goog.require('og.math.Vector3');

og.bv.Sphere = function (radius, center) {
    this.radius = radius || 0;
    this.center = center ? center.clone() : new og.math.Vector3();
};

og.bv.Sphere.prototype.setFromBounds = function (bounds) {
    this.center.set(bounds[0] + (bounds[1] - bounds[0]) / 2, bounds[2] + (bounds[3] - bounds[2]) / 2, bounds[4] + (bounds[5] - bounds[4]) / 2);
    this.radius = this.center.distance(new og.math.Vector3(bounds[0], bounds[2], bounds[4]));
};

og.bv.Sphere.prototype.setFromExtent = function (ellipsoid, extent) {
    this.setFromBounds(og.bv.getBoundsFromExtent(ellipsoid, extent));
};
