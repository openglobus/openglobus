import { EPS10 } from "../math";
import { Box } from "../bv/Box";
import { Sphere } from "../bv/Sphere";
import { Vec3 } from "./Vec3";
import { Plane } from "./Plane";

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
     * Returns a point on the ray at the given distance.
     * @param {number} distance - Distance from the origin along the ray.
     * @returns {Vec3} The point at the given distance.
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
     * @param {Vec3} res - Output intersection point when result is `Ray.INSIDE`.
     * @returns {number} Intersection status: `Ray.INSIDE`, `Ray.OUTSIDE`, or `Ray.AWAY`.
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

    /**
     * Returns the distance along the ray to where it enters the sphere, in lengths of the direction vector:
     * 0 when the origin is inside the sphere, Infinity when the ray misses it or the sphere is behind the origin.
     * Allocates nothing.
     * @public
     * @param {Sphere} sphere - Sphere object.
     * @returns {number} -
     */
    public hitSphereDistance(sphere: Sphere): number {
        const o = this.origin,
            d = this.direction,
            c = sphere.center,
            ox = o.x - c.x,
            oy = o.y - c.y,
            oz = o.z - c.z,
            cc = ox * ox + oy * oy + oz * oz - sphere.radius * sphere.radius;

        if (cc <= 0) {
            return 0;
        }

        const a = d.x * d.x + d.y * d.y + d.z * d.z,
            // half of b of the quadratic, negative when the ray goes toward the sphere centre
            b = ox * d.x + oy * d.y + oz * d.z;

        if (a === 0 || b >= 0) {
            return Infinity;
        }

        const disc = b * b - a * cc;

        if (disc < 0) {
            return Infinity;
        }

        return (-b - Math.sqrt(disc)) / a;
    }

    /**
     * Returns the distance along the ray to the triangle, hit from either side, in lengths of the direction vector.
     * Infinity when the ray misses the triangle, the triangle is behind the origin, the ray is parallel to it,
     * or the triangle has no area. Allocates nothing.
     * @public
     * @param {Vec3} v0 - First triangle corner coordinate.
     * @param {Vec3} v1 - Second triangle corner coordinate.
     * @param {Vec3} v2 - Third triangle corner coordinate.
     * @param {number} [margin=0] - How far outside of the triangle, in barycentric coordinates, it is still hit.
     * @returns {number} -
     */
    public hitTriangleDistance(v0: Vec3, v1: Vec3, v2: Vec3, margin: number = 0): number {
        const d = this.direction,
            o = this.origin,
            e1x = v1.x - v0.x,
            e1y = v1.y - v0.y,
            e1z = v1.z - v0.z,
            e2x = v2.x - v0.x,
            e2y = v2.y - v0.y,
            e2z = v2.z - v0.z,
            px = d.y * e2z - d.z * e2y,
            py = d.z * e2x - d.x * e2z,
            pz = d.x * e2y - d.y * e2x,
            det = e1x * px + e1y * py + e1z * pz;

        // The ray is parallel to the triangle, or the triangle has no area
        if (
            det * det <=
            1e-24 *
                (e1x * e1x + e1y * e1y + e1z * e1z) *
                (e2x * e2x + e2y * e2y + e2z * e2z) *
                (d.x * d.x + d.y * d.y + d.z * d.z)
        ) {
            return Infinity;
        }

        const inv = 1.0 / det,
            sx = o.x - v0.x,
            sy = o.y - v0.y,
            sz = o.z - v0.z,
            u = (sx * px + sy * py + sz * pz) * inv;

        if (u < -margin || u > 1 + margin) {
            return Infinity;
        }

        const qx = sy * e1z - sz * e1y,
            qy = sz * e1x - sx * e1z,
            qz = sx * e1y - sy * e1x,
            w = (d.x * qx + d.y * qy + d.z * qz) * inv;

        if (w < -margin || u + w > 1 + margin) {
            return Infinity;
        }

        const t = (e2x * qx + e2y * qy + e2z * qz) * inv;

        return t >= 0 ? t : Infinity;
    }

    public hitBox(box: Box) {
        //
        // TODO
        //
    }
}
