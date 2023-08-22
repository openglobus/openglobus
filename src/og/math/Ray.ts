import {EPS10} from "../math";
import {Box} from "../bv/Box";
import {Sphere} from "../bv/Sphere";
import {Vec3} from "./Vec3";

/**
 * Represents a ray that extends infinitely from the provided origin in the provided direction.
 * @class
 * @param {Vec3} origin - The origin of the ray.
 * @param {Vec3} direction - The direction of the ray.
 */
export class Ray {
    /**
     * The origin of the ray.
     * @public
     * @type {Vec3}
     */
    public origin: Vec3;

    /**
     * The direction of the ray.
     * @public
     * @type {Vec3}
     */
    public direction: Vec3;

    constructor(origin: Vec3 = Vec3.ZERO, direction: Vec3 = Vec3.ZERO) {

        this.origin = origin;

        this.direction = direction;
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
    public set(origin: Vec3, direction: Vec3): Ray {
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
    public getPoint(distance: number): Vec3 {
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
    public hitTriangle(v0: Vec3, v1: Vec3, v2: Vec3, res: Vec3): number {
        let u = v1.sub(v0);
        let v = v2.sub(v0);
        let n = u.cross(v);

        let w0 = this.origin.sub(v0);
        let a = -n.dot(w0);
        let b = n.dot(this.direction);

        // ray is  parallel to triangle plane
        if (Math.abs(b) < EPS10) {
            if (a === 0) {
                res.copy(this.origin);
                // ray lies in triangle plane
                return Ray.INPLANE;
            } else {
                // ray disjoint from plane
                return Ray.OUTSIDE;
            }
        }

        let r = a / b;

        // intersect point of ray and plane
        res.copy(this.origin.add(this.direction.scaleTo(r)));

        // ray goes away from triangle
        if (r < 0.0) {
            return Ray.AWAY;
        }

        // is res point inside the triangle?
        let uu = u.dot(u);
        let uv = u.dot(v);
        let vv = v.dot(v);
        let w = res.sub(v0);
        let wu = w.dot(u);
        let wv = w.dot(v);
        let D = uv * uv - uu * vv;

        let s = (uv * wv - vv * wu) / D;
        if (s < 0.0 || s > 1.0) {
            return Ray.OUTSIDE;
        }

        let t = (uv * wu - uu * wv) / D;
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
    public hitPlane(v0: Vec3, v1: Vec3, v2: Vec3, res: Vec3): number {
        let u = Vec3.sub(v1, v0);
        let v = Vec3.sub(v2, v0);
        let n = u.cross(v);

        let w0 = Vec3.sub(this.origin, v0);
        let a = -n.dot(w0);
        let b = n.dot(this.direction);

        // ray is  parallel to the plane
        if (Math.abs(b) < EPS10) {
            if (a === 0) {
                return Ray.OUTSIDE;
            }
        }

        let r = a / b;

        if (r < 0) {
            return Ray.OUTSIDE;
        }

        let d = this.direction.scaleTo(r);

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
    public hitSphere(sphere: Sphere) {
        let r = sphere.radius,
            c = sphere.center,
            o = this.origin,
            d = this.direction;

        let vpc = Vec3.sub(c, o);

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

    public hitBox(box: Box) {
        //
        // TODO
        //
    }
}