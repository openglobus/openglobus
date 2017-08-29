goog.provide('og.math.Line3');

goog.require('og.math.Vector3');

og.math.Line3 = function (p0, p1) {
    this.p0 = (p0 ? p0.clone() : new og.math.Vector3());
    this.p1 = (p1 ? p1.clone() : new og.math.Vector3());
};

og.math.Line3.prototype.getSphereIntersection = function (sphere) {
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
        //return new Point3D[0];
        return null;
    }

    var t1 = (-B - Math.Sqrt(D)) / (2.0 * A);

    var solution1 = new og.math.Vector3(
        p0.x * (1 - t1) + t1 * p1.x,
        p0.y * (1 - t1) + t1 * p1.y,
        p0.z * (1 - t1) + t1 * p1.z);

    if (D == 0) {
        //return new Point3D[] { solution1 };
        return solution1;
    }

    var t2 = (-B + Math.Sqrt(D)) / (2.0 * A);
    var solution2 = new og.math.Vector3(
        p0.x * (1 - t2) + t2 * p1.x,
        p0.y * (1 - t2) + t2 * p1.y,
        p0.z * (1 - t2) + t2 * p1.z);

    // prefer a solution that's on the line segment itself
    if (Math.Abs(t1 - 0.5) < Math.abs(t2 - 0.5)) {
        //return new Point3D[] { solution1, solution2 };
        return [solution1, solution2];
    }

    //return new Point3D[] { solution2, solution1 };
    return [solution2, solution1];
};