goog.provide('og.bv.Sphere');

goog.require('og.bv');
goog.require('og.math.Vector3');

og.bv.Sphere = function () {
    this.center = new og.math.Vector3();
    this.radius = 0;
};

og.bv.Sphere.prototype.setFromBounds = function (bounds) {
    this.center.set(bounds[0] + (bounds[1] - bounds[0]) / 2, bounds[2] + (bounds[3] - bounds[2]) / 2, bounds[4] + (bounds[5] - bounds[4]) / 2);
    this.radius = this.center.distance(new og.math.Vector3(bounds[0], bounds[2], bounds[4]));
};

og.bv.Sphere.prototype.setFromExtent = function (ellipsoid, extent) {
    this.setFromBounds(og.bv.getBoundsFromExtent(ellipsoid, extent));
};

og.bv.Sphere.prototype.rayIntersect = function (pos, direction) {
    var vpc = og.math.Vector3.sub(this.center, pos);
    if (vpc.dot(direction) < 0) {
        var l = vpc.length();
        if (l > this.radius) {
            return null;
        } else if (l === this.radius) {
            return pos;
        }
        var pc = this.center.projToRay(pos, vpc);
        var lc = og.math.Vector3.sub(pc, this.center).length();
        var dist = Math.sqrt(this.radius * this.radius - lc * lc);
        var di1 = dist - og.math.Vector3.sub(pc, pos).length();
        var intersection = og.math.Vector3.add(pos, direction.scaleTo(di1));
        return intersection;
    } else {
        var pc = this.center.projToRay(pos, direction);
        var cpcl = og.math.Vector3.sub(this.center, pc).length();
        if (cpcl > this.radius) {
            return null;
        } else {
            var dist = Math.sqrt(this.radius * this.radius - cpcl * cpcl);
            var di1;
            pc.sub(pos);
            if (vpc.length() > this.radius) {
                di1 = pc.length() - dist;
            } else {
                di1 = pc.length() + dist;
            }
            var intersection = og.math.Vector3.add(pos, direction.scaleTo(di1));
            return intersection;
        }
    }
};