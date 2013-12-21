goog.provide('og.Ray');

goog.require('og.Vector3');

og.Ray = function (origin, direction) {
    this.origin = origin.clone();
    this.direction = direction.clone().normalize();
};

og.Ray.prototype.getPoint = function (distance) {
    return og.Vector3.add(this.origin, this.direction.scaleTo(distance));
};