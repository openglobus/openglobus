import {EPS10} from "../math";
import {Box} from "../bv/Box";
import {Sphere} from "../bv/Sphere";
import {Vec3} from "./Vec3";
import {Plane} from "./Plane";

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
     * Get a point on the ray at a given distance `t`.
     * @param {number} distance - Distance from the origin along the ray.
     * @returns {Vec3} The point at distance `t`.
     */
    public getPoint(distance: number): Vec3 {
        return Vec3.add(this.origin, this.direction.scaleTo(distance));
    }

    /**
     * Returns ray hit a triangle result.
     * @public
     * @param {Vec3} v0 - First triangle corner coordinate.
     * @param {Vec3} v1 - Second triangle corner coordinate.
     * @param {Vec3} v2 - Third triangle corner coordinate.
     * @param {Vec3} res - Hit point object pointer that stores hit result.
     * @returns {number} - Hit code, could 0 - og.Ray.OUTSIDE, 1 - og.Ray.INSIDE,
     *      2 - og.Ray.INPLANE and 3 - og.Ray.AWAY(ray goes away from triangle).
     */
    public hitTriangleRes(v0: Vec3, v1: Vec3, v2: Vec3, res: Vec3): number {
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

    // /**
    //  * Gets a ray hit a plane result. If the ray cross the plane returns 1 - og.Ray.INSIDE otherwise returns 0 - og.Ray.OUTSIDE.
    //  * @public
    //  * @param {Vec3} v0 - First plane point.
    //  * @param {Vec3} v1 - Second plane point.
    //  * @param {Vec3} v2 - Third plane point.
    //  * @param {Vec3} res - Hit point object pointer that stores hit result.
    //  * @returns {number}
    //  */
    // public hitPlaneRes(v0: Vec3, v1: Vec3, v2: Vec3, res: Vec3): number {
    //     let u = Vec3.sub(v1, v0);
    //     let v = Vec3.sub(v2, v0);
    //     let n = u.cross(v);
    //
    //     let w0 = Vec3.sub(this.origin, v0);
    //     let a = -n.dot(w0);
    //     let b = n.dot(this.direction);
    //
    //     // ray is  parallel to the plane
    //     if (Math.abs(b) < EPS10) {
    //         if (a === 0) {
    //             return Ray.OUTSIDE;
    //         }
    //     }
    //
    //     let r = a / b;
    //
    //     if (r < 0) {
    //         return Ray.OUTSIDE;
    //     }
    //
    //     let d = this.direction.scaleTo(r);
    //
    //     // intersect point of ray and plane
    //     res.x = this.origin.x + d.x;
    //     res.y = this.origin.y + d.y;
    //     res.z = this.origin.z + d.z;
    //
    //     return Ray.INSIDE;
    // }

    /**
     * Finds the intersection of the ray with a plane.
     * @param {Plane} plane - The plane to intersect with.
     * @returns {Vec3 | null} The intersection point or null if no intersection.
     */
    public hitPlaneRes(plane: Plane, res: Vec3): number {
        const d = this.direction.dot(plane.n);

        if (Math.abs(d) < EPS10) {
            return Ray.OUTSIDE;
        }

        const t = plane.p.sub(this.origin).dot(plane.n) / d;

        if (t < 0) {
            return Ray.AWAY;
        }

        res.copy(this.getPoint(t));

        return Ray.INSIDE;
    }

    /**
     * Returns a ray hit sphere coordinates. If there isn't hit returns null.
     * @public
     * @param {Sphere} sphere - Sphere object.
     * @returns {Vec3}
     */
    public hitSphere(sphere: Sphere) {
        const oc = Vec3.sub(this.origin, sphere.center);
        const a = this.direction.dot(this.direction);
        const b = 2.0 * oc.dot(this.direction);
        const c = oc.dot(oc) - sphere.radius * sphere.radius;
        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0) {
            return null;
        }

        const sqrtDisc = Math.sqrt(discriminant);
        const t1 = (-b - sqrtDisc) / (2.0 * a);
        const t2 = (-b + sqrtDisc) / (2.0 * a);

        let t = t1;
        if (t < 0) t = t2;
        if (t < 0) return null;

        return Vec3.add(this.origin, this.direction.scaleTo(t));
    }

    public hitBox(box: Box) {
        //
        // TODO
        //
    }
}