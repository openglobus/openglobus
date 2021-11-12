/**
 * @module og/math/Ray
 */

"use strict";

import * as math from "../math.js";
import { Vec3 } from "./Vec3.js";

/**
 * Represents a ray that extends infinitely from the provided origin in the provided direction.
 * @class
 * @param {Vec3} origin - The origin of the ray.
 * @param {Vec3} direction - The direction of the ray.
 */
export class Ray {
    constructor(origin, direction) {
        /**
         * The origin of the ray.
         * @public
         * @type {Vec3}
         */
        this.origin = origin || new Vec3();

        /**
         * The direction of the ray.
         * @public
         * @type {Vec3}
         */
        this.direction = direction || new Vec3();
    }

    /** @const */
    static get OUTSIDE() {
        return 0;
    }

    /** @const */
    static get INSIDE() {
        return 1;
    }
    /** @const */
    static get INPLANE() {
        return 2;
    }
    /** @const */
    static get AWAY() {
        return 3;
    }

    /**
     * Sets a ray parameters.
     * @public
     * @param {Vec3} origin - The origin of the ray.
     * @param {Vec3} direction - The direction of the ray.
     * @returns {Ray}
     */
    set(origin, direction) {
        this.origin = origin;
        this.direction = direction;
        return this;
    }

    /**
     * Computes the point along the ray on the distance.
     * @public
     * @param {number} distance - Point distance.
     * @returns {Vec3}
     */
    getPoint(distance) {
        return Vec3.add(this.origin, this.direction.scaleTo(distance));
    }

    /**
     * Returns ray hit a triange result.
     * @public
     * @param {Vec3} v0 - First triangle corner coordinate.
     * @param {Vec3} v1 - Second triangle corner coordinate.
     * @param {Vec3} v2 - Third triangle corner coordinate.
     * @param {Vec3} res - Hit point object pointer that stores hit result.
     * @returns {number} - Hit code, could 0 - og.Ray.OUTSIDE, 1 - og.Ray.INSIDE,
     *      2 - og.Ray.INPLANE and 3 - og.Ray.AWAY(ray goes away from triangle).
     */
    hitTriangle(v0, v1, v2, res, normal) {
        var u = v1.sub(v0);
        var v = v2.sub(v0);
        var n = u.cross(v);

        var w0 = this.origin.sub(v0);
        var a = -n.dot(w0);
        var b = n.dot(this.direction);

        // ray is  parallel to triangle plane
        if (Math.abs(b) < math.EPSILON10) {
            if (a === 0) {
                res.copy(this.origin);
                // ray lies in triangle plane
                return Ray.INPLANE;
            } else {
                // ray disjoint from plane
                return Ray.OUTSIDE;
            }
        }

        var r = a / b;

        // intersect point of ray and plane
        res.copy(this.origin.add(this.direction.scaleTo(r)));

        // ray goes away from triangle
        if (r < 0.0) {
            return Ray.AWAY;
        }

        // is res point inside the triangle?
        var uu = u.dot(u);
        var uv = u.dot(v);
        var vv = v.dot(v);
        var w = res.sub(v0);
        var wu = w.dot(u);
        var wv = w.dot(v);
        var D = uv * uv - uu * vv;

        var s = (uv * wv - vv * wu) / D;
        if (s < 0.0 || s > 1.0) {
            return Ray.OUTSIDE;
        }

        var t = (uv * wu - uu * wv) / D;
        if (t < 0.0 || s + t > 1.0) {
            return Ray.OUTSIDE;
        }

        return Ray.INSIDE;
    }

    /**
     * Gets a ray hit a plane result. If the ray cross the plane returns 1 - og.Ray.INSIDE otherwise returns 0 - og.Ray.OUTSIDE.
     * @public
     * @param {Vec3} v0 - First plane point.
     * @param {Vec3} v1 - Second plane point.
     * @param {Vec3} v2 - Third plane point.
     * @param {Vec3} res - Hit point object pointer that stores hit result.
     * @returns {number}
     */
    hitPlane(v0, v1, v2, res) {
        var u = Vec3.sub(v1, v0);
        var v = Vec3.sub(v2, v0);
        var n = u.cross(v);

        var w0 = Vec3.sub(this.origin, v0);
        var a = -n.dot(w0);
        var b = n.dot(this.direction);

        // ray is  parallel to the plane
        if (Math.abs(b) < math.EPSILON10) {
            if (a === 0) {
                return Ray.OUTSIDE;
            }
        }

        var r = a / b;

        if (r < 0) {
            return Ray.OUTSIDE;
        }

        var d = this.direction.scaleTo(r);

        // intersect point of ray and plane
        res.x = this.origin.x + d.x;
        res.y = this.origin.y + d.y;
        res.z = this.origin.z + d.z;

        return Ray.INSIDE;
    }

    /**
     * Returns a ray hit sphere coordiante. If there isn't hit returns null.
     * @public
     * @param {Sphere} sphere - Sphere object.
     * @returns {Vec3}
     */
    hitSphere(sphere) {
        var r = sphere.radius,
            c = sphere.center,
            o = this.origin,
            d = this.direction;
        var vpc = Vec3.sub(c, o);
        if (vpc.dot(d) < 0) {
            var l = vpc.length();
            if (l > r) {
                return null;
            } else if (l === r) {
                return o.clone();
            }
            let pc = c.projToRay(o, vpc);
            var lc = Vec3.sub(pc, c).length();
            let dist = Math.sqrt(r * r - lc * lc);
            let di1 = dist - Vec3.sub(pc, o).length();
            let intersection = Vec3.add(o, d.scaleTo(di1));
            return intersection;
        } else {
            let pc = c.projToRay(o, d);
            var cpcl = Vec3.sub(c, pc).length();
            if (cpcl > sphere.radius) {
                return null;
            } else {
                let dist = Math.sqrt(r * r - cpcl * cpcl);
                let di1;
                pc.subA(o);
                if (vpc.length() > r) {
                    di1 = pc.length() - dist;
                } else {
                    di1 = pc.length() + dist;
                }
                let intersection = Vec3.add(o, d.scaleTo(di1));
                return intersection;
            }
        }
    }

    hitBox(box) {
        //
        // TODO
        //
    }
}

/**
 * Ray object creator.
 * @function
 * @param {Vec3} origin - The origin of the ray.
 * @param {Vec3} direction - The direction of the ray.
 * @returns {Ray}
 */
export function ray(origin, direction) {
    return new Ray(origin, direction);
}
