import { EPS10 } from "../math";
import { Vec2 } from "./Vec2";

export class Line2 {
    public a: number;
    public b: number;
    public c: number;

    constructor(a = 0, b = 0, c = 0) {
        this.a = a;
        this.b = b;
        this.c = c;
    }

    static get(p0: Vec2, p1: Vec2): Line2 {
        return new Line2(p1.y - p0.y, p0.x - p1.x, p1.x * p0.y - p0.x * p1.y);
    }

    static getParallel(l: Line2, p: Vec2): Line2 {
        return new Line2(l.a, l.b, -l.a * p.x - l.b * p.y);
    }

    static getIntersection(L0: Line2, L1: Line2): Vec2 {
        let x = (L1.b * L0.c - L0.b * L1.c) / (L0.b * L1.a - L1.b * L0.a);
        return new Vec2(x, -(L0.c + L0.a * x) / L0.b);
    }

    static getSegmentCircleIntersectionInto(
        p0: Vec2,
        p1: Vec2,
        center: Vec2,
        radius: number,
        out0: Vec2,
        out1: Vec2
    ): 0 | 1 | 2 {
        if (radius < 0) {
            return 0;
        }

        const x0 = p0.x,
            y0 = p0.y,
            dx = p1.x - x0,
            dy = p1.y - y0,
            fx = x0 - center.x,
            fy = y0 - center.y,
            a = dx * dx + dy * dy,
            c = fx * fx + fy * fy - radius * radius;

        if (a === 0) {
            if (c < -EPS10 || c > EPS10) {
                return 0;
            }

            out0.x = x0;
            out0.y = y0;

            return 1;
        }

        const q = fx * dx + fy * dy,
            h = q * q - a * c,
            tolerance = EPS10 * a;

        if (h < -tolerance) {
            return 0;
        }

        if (h <= tolerance) {
            const numerator = -q;

            if (numerator < 0 || numerator > a) {
                return 0;
            }

            const t = numerator / a;

            out0.x = x0 + dx * t;
            out0.y = y0 + dy * t;

            return 1;
        }

        const sqrtH = Math.sqrt(h),
            numerator0 = -q - sqrtH,
            numerator1 = -q + sqrtH,
            hit0 = numerator0 >= 0 && numerator0 <= a,
            hit1 = numerator1 >= 0 && numerator1 <= a;

        if (!hit0 && !hit1) {
            return 0;
        }

        const invA = 1 / a;

        if (hit0) {
            const t0 = numerator0 * invA;

            out0.x = x0 + dx * t0;
            out0.y = y0 + dy * t0;

            if (!hit1) {
                return 1;
            }

            const t1 = numerator1 * invA;

            out1.x = x0 + dx * t1;
            out1.y = y0 + dy * t1;

            return 2;
        }

        const t1 = numerator1 * invA;

        out0.x = x0 + dx * t1;
        out0.y = y0 + dy * t1;

        return 1;
    }

    static getSegmentCircleIntersection(p0: Vec2, p1: Vec2, center: Vec2, radius: number): [] | [Vec2] | [Vec2, Vec2] {
        const out0 = new Vec2(),
            out1 = new Vec2(),
            hits = Line2.getSegmentCircleIntersectionInto(p0, p1, center, radius, out0, out1);

        if (hits === 0) {
            return [];
        }

        if (hits === 1) {
            return [out0];
        }

        return [out0, out1];
    }

    public intersects(l: Line2): Vec2 {
        return Line2.getIntersection(this, l);
    }

    /**
     * Finds the intersection of the line with a circle.
     * @param {Vec2} center - Circle center.
     * @param {number} radius - Circle radius.
     * @returns {[Vec2] | [Vec2, Vec2] | []}
     */
    public getCircleIntersection(center: Vec2, radius: number): [] | [Vec2] | [Vec2, Vec2] {
        const a = this.a,
            b = this.b,
            c = this.c,
            x = center.x,
            y = center.y,
            ab2 = a * a + b * b;

        if (ab2 === 0 || radius < 0) {
            return [];
        }

        const lineValue = a * x + b * y + c,
            discriminant = radius * radius * ab2 - lineValue * lineValue,
            tolerance = EPS10 * ab2;

        if (discriminant < -tolerance) {
            return [];
        }

        const invAb2 = 1 / ab2,
            projection = lineValue * invAb2,
            closestX = x - a * projection,
            closestY = y - b * projection;

        if (discriminant <= tolerance) {
            return [new Vec2(closestX, closestY)];
        }

        const offset = Math.sqrt(discriminant) * invAb2,
            dx = -b * offset,
            dy = a * offset;

        return [new Vec2(closestX + dx, closestY + dy), new Vec2(closestX - dx, closestY - dy)];
    }
}
