import * as segmentHelper from "./segmentHelper";
import { Ray } from "../math/Ray";
import { Vec3 } from "../math/Vec3";
import type { Segment } from "./Segment";

/**
 * How far outside of a triangle, in barycentric coordinates, the ray still hits it, so that it does not slip
 * through the edge between two triangles by rounding.
 */
const RAY_TRIANGLE_MARGIN = 1e-7;

// The ray in the frame of the segment's render vertices, and the corners of the triangle tested
const _rtcOrigin = new Vec3(),
    _rtcRay = new Ray(_rtcOrigin, new Vec3()),
    _v0 = new Vec3(),
    _v1 = new Vec3(),
    _v2 = new Vec3();

/**
 * Returns the distance along the ray to the nearest triangle of the segment as it is drawn, hit from either side,
 * in lengths of ray.direction. Infinity when the ray misses the segment, the segment has no vertices yet,
 * or the hit is not closer than maxDistance. Allocates nothing.
 * @param {Segment} seg - Segment.
 * @param {Ray} ray - Ray, cartesian coordinates.
 * @param {number} [maxDistance=Infinity] - Hits from this distance on are not looked for.
 * @returns {number} -
 */
export function getSegmentRayDistance(seg: Segment, ray: Ray, maxDistance: number = Infinity): number {
    const verts = seg.renderVertices;

    if (!verts || !verts.length) {
        return Infinity;
    }

    const size = Math.round(Math.sqrt(verts.length / 3)) - 1;

    if (size < 1) {
        return Infinity;
    }

    // The triangles the GPU draws, by cell; a triangle of the outer ring can be listed in several cells,
    // it is then tested again
    const tri = segmentHelper.getInstance().getCellTriangles(Math.log2(size), seg.node.sideSizeLog2).vertices,
        c = seg._relativeCenter;

    _rtcOrigin.set(ray.origin.x - c.x, ray.origin.y - c.y, ray.origin.z - c.z);
    _rtcRay.direction = ray.direction;

    let best = maxDistance,
        hit = false;

    for (let i = 0; i < tri.length; i += 3) {
        const i0 = tri[i] * 3,
            i1 = tri[i + 1] * 3,
            i2 = tri[i + 2] * 3;

        _v0.set(verts[i0], verts[i0 + 1], verts[i0 + 2]);
        _v1.set(verts[i1], verts[i1 + 1], verts[i1 + 2]);
        _v2.set(verts[i2], verts[i2 + 1], verts[i2 + 2]);

        const t = _rtcRay.hitTriangleDistance(_v0, _v1, _v2, RAY_TRIANGLE_MARGIN);

        if (t < best) {
            best = t;
            hit = true;
        }
    }

    return hit ? best : Infinity;
}
