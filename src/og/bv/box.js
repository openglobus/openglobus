goog.provide('og.bv.Box');

goog.require('og.bv');
goog.require('og.math.Vector3');

og.bv.Box = function () {
    this.vertices = [new og.math.Vector3(), new og.math.Vector3(), new og.math.Vector3(), new og.math.Vector3(), new og.math.Vector3(), new og.math.Vector3(), new og.math.Vector3(), new og.math.Vector3()];
};

og.bv.Box.prototype.setFromBounds = function (bounds) {
    var xmin = bounds[0], xmax = bounds[1],
        ymin = bounds[2], ymax = bounds[3],
        zmin = bounds[4], zmax = bounds[5];

    this.vertices[0].set(xmin, ymin, zmin);
    this.vertices[1].set(xmax, ymin, zmin);
    this.vertices[2].set(xmax, ymin, zmax);
    this.vertices[3].set(xmin, ymin, zmax);
    this.vertices[4].set(xmin, ymax, zmin);
    this.vertices[5].set(xmax, ymax, zmin);
    this.vertices[6].set(xmax, ymax, zmax);
    this.vertices[7].set(xmin, ymax, zmax);

};

og.bv.Box.prototype.setFromExtent = function (ellipsoid, extent) {
    this.setFromBounds(og.bv.getBoundsFromExtent(ellipsoid, extent));
};