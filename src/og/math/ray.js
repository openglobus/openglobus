goog.provide('og.math.Ray');

goog.require('og.math.Vector3');

og.math.Ray = function (origin, direction) {
    this.origin = origin.clone();
    this.direction = direction.clone().normalize();
};

og.math.Ray.prototype.set = function (origin, direction) {
    this.origin = origin.clone();
    this.direction = direction.clone();
};

og.math.Ray.prototype.getPoint = function (distance) {
    return og.Vector3.add(this.origin, this.direction.scaleTo(distance));
};

og.math.Ray.prototype.hitTriangle = function (v1, v2, v3) {

};

og.math.Ray.prototype.hitPlane = function (point, normal) {

};

og.math.Ray.prototype.hitSphere = function (sphere) {
    var r = sphere.radius, c = sphere.center,
        o = this.origin, d = this.direction;
    var vpc = og.math.Vector3.sub(c, o);
    if (vpc.dot(d) < 0) {
        var l = vpc.length();
        if (l > r) {
            return null;
        } else if (l === r) {
            return o.clone();
        }
        var pc = c.projToRay(o, vpc);
        var lc = og.math.Vector3.sub(pc, c).length();
        var dist = Math.sqrt(r * r - lc * lc);
        var di1 = dist - og.math.Vector3.sub(pc, o).length();
        var intersection = og.math.Vector3.add(o, d.scaleTo(di1));
        return intersection;
    } else {
        var pc = c.projToRay(o, d);
        var cpcl = og.math.Vector3.sub(c, pc).length();
        if (cpcl > this.radius) {
            return null;
        } else {
            var dist = Math.sqrt(r * r - cpcl * cpcl);
            var di1;
            pc.sub(o);
            if (vpc.length() > r) {
                di1 = pc.length() - dist;
            } else {
                di1 = pc.length() + dist;
            }
            var intersection = og.math.Vector3.add(o, d.scaleTo(di1));
            return intersection;
        }
    }
};

og.math.Ray.prototype.hitPlanetEllipsoid = function (planet) {
    var mxTr = planet.transformationMatrix.transpose();
    var sx = new og.math.Ray(
        mxTr.mulVec3(this.origin),
        mxTr.mulVec3(this.direction))
    .hitSphere(new og.bv.Sphere(planet.ellipsoid._a));
    if (sx) {
        return planet.itransformationMatrix.mulVec3(sx);
    }
    return null;
};

og.math.Ray.prototype.hitBox = function (box) {

};