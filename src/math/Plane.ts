import {EPS5} from "../math";
import {Vec3} from "./Vec3";
import {Line3} from "./Line3";

const DISJOINT = 0
const COINCIDE = 1;
const INTERSECT = 2;

/**
 * Plane class.
 * @constructor
 * @param {Vec3} [p] - Plane point.
 * @param {Vec3} [n] - Planet normal.
 */
class Plane {
    public p: Vec3;
    public n: Vec3;

    constructor(p?: Vec3, n?: Vec3) {
        this.p = p ? p.clone() : new Vec3();
        this.n = n ? n.clone() : (this.p.isZero() ? Vec3.UP : this.p.getNormal());
    }

    public setByPoints(v0: Vec3, v1: Vec3, v2: Vec3): Plane {
        let u = Vec3.sub(v1, v0);
        let v = Vec3.sub(v2, v0);
        this.n = u.cross(v);
        this.p.copy(v0);
        return this;
    }

    static fromPoints(v0: Vec3, v1: Vec3, v2: Vec3): Plane {
        return new Plane().setByPoints(v0, v1, v2);
    }

    public set(p: Vec3, n: Vec3) {
        this.p.copy(p);
        this.n.copy(n);
    }

    public getNormal(): Vec3 {
        return this.n.clone();
    }

    public distance(p: Vec3): number {
        let pp = this.getProjection(p);
        return p.distance(pp);
    }

    public getProjection(v: Vec3, def?: Vec3): Vec3 {
        return Vec3.proj_b_to_plane(v, this.n, def);
    }

    public getProjectionPoint(p: Vec3, vh?: Vec3): Vec3 {
        let v = p.sub(this.p),
            n = this.n,
            dist = v.dot(n);

        if (vh) {
            vh.copy(n.scale(dist));
        } else {
            vh = n.scale(dist);
        }
        return p.sub(vh);
    }

    public getIntersection(Pn1: Plane, Pn2: Plane, L: Line3): number {
        let u = Pn1.n.cross(Pn2.n);

        let ax = u.x >= 0 ? u.x : -u.x;
        let ay = u.y >= 0 ? u.y : -u.y;
        let az = u.z >= 0 ? u.z : -u.z;

        // test if the two planes are parallel
        if (ax + ay + az < EPS5) {
            // Pn1 and Pn2 are near parallel
            // test if disjoint or coincide
            let v = Pn2.p.sub(Pn1.p);
            if (Pn1.n.dot(v) == 0) {
                // Pn2.V0 lies in Pn1
                return COINCIDE; // Pn1 and Pn2 coincide
            } else {
                return DISJOINT; // Pn1 and Pn2 are disjoint
            }
        }

        // Pn1 and Pn2 intersect in a line
        // first determine max abs coordinate of cross product
        let maxc; // max coordinate
        if (ax > ay) {
            if (ax > az) {
                maxc = 1;
            } else {
                maxc = 3;
            }
        } else {
            if (ay > az) {
                maxc = 2;
            } else {
                maxc = 3;
            }
        }

        // next, to get a point on the intersect line
        // zero the max coord, and solve for the other two
        let iP = new Vec3(); // intersect point

        let d1, d2; // the constants in the 2 plane equations
        d1 = -Pn1.n.dot(Pn1.p); // note: could be pre-stored  with plane
        d2 = -Pn2.n.dot(Pn2.p); // ditto

        // select max coordinate
        if (maxc === 1) {
            // intersect with x=0
            iP.x = 0;
            iP.y = (d2 * Pn1.n.z - d1 * Pn2.n.z) / u.x;
            iP.z = (d1 * Pn2.n.y - d2 * Pn1.n.y) / u.x;
        } else if (maxc === 2) {
            // intersect with y=0
            iP.x = (d1 * Pn2.n.z - d2 * Pn1.n.z) / u.y;
            iP.y = 0;
            iP.z = (d2 * Pn1.n.x - d1 * Pn2.n.x) / u.y;
        } else if (maxc === 3) {
            // intersect with z=0
            iP.x = (d2 * Pn1.n.y - d1 * Pn2.n.y) / u.z;
            iP.y = (d1 * Pn2.n.x - d2 * Pn1.n.x) / u.z;
            iP.z = 0;
        }
        L.p0.copy(iP);
        L.p1.copy(iP.add(u));
        return INTERSECT;
    }
}

export {Plane};
