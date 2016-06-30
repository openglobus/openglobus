goog.provide('og.math.Ray');

goog.require('og.math.Vector3');

/**
 * Represents a ray that extends infinitely from the provided origin in the provided direction.
 * @class
 * @param {og.math.Vector3} origin - The origin of the ray.
 * @param {og.math.Vector3} direction - The direction of the ray.
 */
og.math.Ray = function (origin, direction) {

    /**
     * The origin of the ray.
     * @public
     * @type {og.math.Vector3}
     */
    this.origin = origin.clone();

    /**
     * The direction of the ray.
     * @public
     * @type {og.math.Vector3}
     */
    this.direction = direction.clone();
};

/**
 * Ray object creator.
 * @function
 * @param {og.math.Vector3} origin - The origin of the ray.
 * @param {og.math.Vector3} direction - The direction of the ray.
 * @returns {og.math.Ray}
 */
og.math.ray = function (origin, direction) {
    return new og.math.Ray(origin, direction);
};

/** @const */
og.math.Ray.OUTSIDE = 0;
/** @const */
og.math.Ray.INSIDE = 1;
/** @const */
og.math.Ray.INPLANE = 2;
/** @const */
og.math.Ray.AWAY = 3;

/**
 * Sets a ray parameters.
 * @public
 * @param {og.math.Vector3} origin - The origin of the ray.
 * @param {og.math.Vector3} direction - The direction of the ray.
 * @returns {og.math.Ray}
 */
og.math.Ray.prototype.set = function (origin, direction) {
    this.origin = origin.clone();
    this.direction = direction.clone();
    return this;
};

/**
 * Computes the point along the ray on the distance.
 * @public
 * @param {number} distance - Point distance.
 * @returns {og.math.Vector3}
 */
og.math.Ray.prototype.getPoint = function (distance) {
    return og.Vector3.add(this.origin, this.direction.scaleTo(distance));
};

/**
 * Returns ray hit a triange result.
 * @public
 * @param {og.math.Vector3} v0 - First triangle corner coordinate.
 * @param {og.math.Vector3} v1 - Second triangle corner coordinate.
 * @param {og.math.Vector3} v2 - Third triangle corner coordinate.
 * @param {og.math.Vector3} res - Hit point object pointer that stores hit result.
 * @returns {number} - Hit code, could 0 - og.math.Ray.OUTSIDE, 1 - og.math.Ray.INSIDE, 
 *      2 - og.math.Ray.INPLANE and 3 - og.math.Ray.AWAY(ray goes away from triangle).
 */
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
        if (a === 0) {
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

/**
 * Gets a ray hit a plane result. If the ray cross the plane returns 1 - og.math.Ray.INSIDE otherwise returns 0 - og.math.Ray.OUTSIDE.
 * @public
 * @param {og.math.Vector3} v0 - First plane point.
 * @param {og.math.Vector3} v1 - Second plane point.
 * @param {og.math.Vector3} v2 - Third plane point.
 * @param {og.math.Vector3} res - Hit point object pointer that stores hit result.
 * @returns {number}
 */
og.math.Ray.prototype.hitPlane = function (v0, v1, v2, res) {
    var u = og.math.Vector3.sub(v1, v0);
    var v = og.math.Vector3.sub(v2, v0);
    var n = u.cross(v);

    var w0 = og.math.Vector3.sub(this.origin, v0);
    var a = -n.dot(w0);
    var b = n.dot(this.direction);

    // ray is  parallel to the plane
    if (Math.abs(b) < og.math.EPSILON10) {
        if (a === 0) {
            return og.math.Ray.OUTSIDE;
        }
    }

    var r = a / b;

    if (r < 0) {
        return og.math.Ray.OUTSIDE;
    }

    var d = this.direction.scaleTo(r);

    // intersect point of ray and plane
    res.x = this.origin.x + d.x;
    res.y = this.origin.y + d.y;
    res.z = this.origin.z + d.z;

    return og.math.Ray.INSIDE;
};

/**
 * Returns a ray hit sphere coordiante. If there isn't hit returns null.
 * @public
 * @param {og.bv.Sphere} sphere - Sphere object.
 * @returns {og.math.Vector3}
 */
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
            pc.subA(o);
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
    //
    //TODO
    //
};