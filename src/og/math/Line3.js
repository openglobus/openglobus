'use strict';

import * as math from '../math.js';
import { Vec3 } from './Vec3.js';

export class Line3 {
    constructor(p0, p1) {
        this.p0 = p0 || new Vec3();
        this.p1 = p1 || new Vec3();
    };

    getMagnitude() {
        return this.p0.distance(this.p1);
    };

    getSphereIntersection(sphere) {
        var p0 = this.p0,
            p1 = this.p1;

        var cx = sphere.x,
            cy = sphere.y,
            cz = sphere.z;

        var px = p0.x,
            py = p0.y,
            pz = p0.z;

        var vx = p1.x - px,
            vy = p1.y - py,
            vz = p1.z - pz;

        var A = vx * vx + vy * vy + vz * vz,
            B = 2.0 * (px * vx + py * vy + pz * vz - vx * cx - vy * cy - vz * cz),
            C = px * px - 2 * px * cx + cx * cx + py * py - 2 * py * cy + cy * cy +
                pz * pz - 2 * pz * cz + cz * cz - sphere.radius * sphere.radius;
        var D = B * B - 4 * A * C;

        if (D < 0) {
            return null;
        }

        var t1 = (-B - Math.Sqrt(D)) / (2.0 * A);

        var solution1 = new Vec3(
            p0.x * (1 - t1) + t1 * p1.x,
            p0.y * (1 - t1) + t1 * p1.y,
            p0.z * (1 - t1) + t1 * p1.z);

        if (D == 0) {
            return solution1;
        }

        var t2 = (-B + Math.Sqrt(D)) / (2.0 * A);
        var solution2 = new Vec3(
            p0.x * (1 - t2) + t2 * p1.x,
            p0.y * (1 - t2) + t2 * p1.y,
            p0.z * (1 - t2) + t2 * p1.z);

        // prefer a solution that's on the line segment itself
        if (Math.Abs(t1 - 0.5) < Math.abs(t2 - 0.5)) {
            return [solution1, solution2];
        }

        return [solution2, solution1];
    };

    intersects(line, res, res2) {

        let p13 = this.p0.sub(line.p0),
            p43 = line.p1.sub(line.p0);

        if (Math.abs(p43.x) < math.EPSILON10 && Math.abs(p43.y) < math.EPSILON10 && Math.abs(p43.z) < math.EPSILON10) {
            return false;
        }

        let p21 = this.p1.sub(this.p0);

        if (Math.abs(p21.x) < math.EPSILON10 && Math.abs(p21.y) < math.EPSILON10 && Math.abs(p21.z) < math.EPSILON10) {
            return false;
        }

        let d1343 = p13.x * p43.x + p13.y * p43.y + p13.z * p43.z,
            d4321 = p43.x * p21.x + p43.y * p21.y + p43.z * p21.z,
            d1321 = p13.x * p21.x + p13.y * p21.y + p13.z * p21.z,
            d4343 = p43.x * p43.x + p43.y * p43.y + p43.z * p43.z,
            d2121 = p21.x * p21.x + p21.y * p21.y + p21.z * p21.z;

        let denom = d2121 * d4343 - d4321 * d4321;

        if (Math.abs(denom) < math.EPSILON10) {
            return false;
        }

        let numer = d1343 * d4321 - d1321 * d4343;

        let mua = numer / denom;

        res.x = this.p0.x + mua * p21.x;
        res.y = this.p0.y + mua * p21.y;
        res.z = this.p0.z + mua * p21.z;

        if (res2) {

            let mub = (d1343 + d4321 * mua) / d4343;

            res2.x = line.p0.x + mub * p43.x;
            res2.y = line.p0.y + mub * p43.y;
            res2.z = line.p0.z + mub * p43.z;
        }

        return true;
    };

    getNearestDistancePoint(point, res) {

        let p0 = this.p0,
            p1 = this.p1;

        let mag = this.getMagnitude();

        let u =
            (
                ((point.x - p0.x) * (p1.x - p0.x)) +
                ((point.y - p0.y) * (p1.y - p0.y)) +
                ((point.z - p0.z) * (p1.z - p0.z))
            ) /
            (mag * mag);

        res.x = p0.x + u * (p1.x - p0.x);
        res.y = p0.y + u * (p1.y - p0.y);
        res.z = p0.z + u * (p1.z - p0.z);

        if (u < 0.0 || u > 1.0) {
            return false;
        }

        return true;
    };

}