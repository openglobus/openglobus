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

og.math.Ray.OUTSIDE = 0;
og.math.Ray.INSIDE = 1;
og.math.Ray.INPLANE = 2;
og.math.Ray.AWAY = 3;

og.math.Ray.prototype.hitTriangle = function (v0, v1, v2, res) {
    var state;
    var u = og.math.Vector3.sub(v1, v0);
    var v = og.math.Vector3.sub(v2, v0);
    var n = u.cross(v);

    var w0 = og.math.Vector3.sub(this.origin, v0);
    var a = -n.dot(w0);
    var b = n.dot(this.direction);

    // ray is  parallel to triangle plane
    if (Math.abs(b) < og.math.EPSILON10) {
        if (a == 0) {
            res.copy(this.origin);
            // ray lies in triangle plane
            return og.math.Ray.INPLANE;
        } else {
            // ray disjoint from plane
            return og.math.Ray.OUTSIDE;
        }
    }

    var r = a / b;

    // intersect point of ray and plane
    res.copy(og.math.Vector3.add(this.origin, this.direction.scaleTo(r)));

    // ray goes away from triangle
    if (r < 0.0)
        return og.math.Ray.AWAY;

    // is I inside triangle?
    var uu = u.dot(u);
    var uv = u.dot(v);
    var vv = v.dot(v);
    var w = og.math.Vector3.sub(res, v0);
    var wu = w.dot(u);
    var wv = w.dot(v);
    var D = uv * uv - uu * vv;

    var s = (uv * wv - vv * wu) / D;
    if (s < 0.0 || s > 1.0)
        return og.math.Ray.OUTSIDE;

    var t = (uv * wu - uu * wv) / D;
    if (t < 0.0 || (s + t) > 1.0)
        return og.math.Ray.OUTSIDE;

    return og.math.Ray.INSIDE;
};

//from JGT
//og.math.Ray.prototype.hitTriangle = function (vert0, vert1, vert2) {
//    var edge1 = og.math.Vector3.sub(vert1, vert0);
//    var edge2 = og.math.Vector3.sub(vert2, vert0);

//    var pvec = this.direction.cross(edge2);

//    /* if determinant is near zero, ray lies in plane of triangle */
//    var det = edge1.dot(pvec);

//    if (det > -og.math.EPSILON6 && det < og.math.EPSILON6)
//        return null;

//    var inv_det = 1.0 / det;

//    var tvec = og.math.Vector3.sub(this.origin, vert0);

//    var u = tvec.dot(pvec) * inv_det;
//    if (u < 0.0 || u > 1.0)
//        return null;

//    var qvec = tvec.cross(edge1);

//    var v = this.direction.dot(qvec) * inv_det;
//    if (v < 0.0 || u + v > 1.0)
//        return null;

//    var t = edge2.dot(qvec) * inv_det;

//    return new og.math.Vector3(u, v, t);
//};

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
        if (cpcl > sphere.radius) {
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

og.math.Ray.prototype.hitBox = function (box) {

};