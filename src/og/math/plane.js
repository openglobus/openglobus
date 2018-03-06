/**
 * @module og/math/Plane
 */

'use strict';

import * as math from '../math.js');
import { Vec3 } from './Vec3.js');

class Plane {
    constructor(p, n) {
        this.p = (p ? p.clone() : new Vec3());
        this.n = (n ? n.clone() : new Vec3());
    }

    set(p, n) {
        this.p.copy(p);
        this.n.copy(n);
    }

    getNormal() {
        return this.n;
    }

    getIntersection(Pn1, Pn2, L) {

        var u = Pn1.n.cross(Pn2.n);

        var ax = (u.x >= 0 ? u.x : -u.x);
        var ay = (u.y >= 0 ? u.y : -u.y);
        var az = (u.z >= 0 ? u.z : -u.z);

        // test if the two planes are parallel
        if ((ax + ay + az) < math.EPSILON5) {  // Pn1 and Pn2 are near parallel
            // test if disjoint or coincide
            var v = Pn2.p.sub(Pn1.p);
            if (Pn1.n.dot(v) == 0)      // Pn2.V0 lies in Pn1
                return 1;               // Pn1 and Pn2 coincide
            else
                return 0;               // Pn1 and Pn2 are disjoint
        }

        // Pn1 and Pn2 intersect in a line
        // first determine max abs coordinate of cross product
        var maxc;                       // max coordinate
        if (ax > ay) {
            if (ax > az)
                maxc = 1;
            else maxc = 3;
        }
        else {
            if (ay > az)
                maxc = 2;
            else maxc = 3;
        }

        // next, to get a point on the intersect line
        // zero the max coord, and solve for the other two
        var iP = new Vec3(); // intersect point

        var d1, d2;                     // the constants in the 2 plane equations
        d1 = -Pn1.n.dot(Pn1.p);         // note: could be pre-stored  with plane
        d2 = -Pn2.n.dot(Pn2.p);         // ditto

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
        return 2;
    }
};

export { Plane };