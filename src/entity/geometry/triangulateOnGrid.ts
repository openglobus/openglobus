import earcut from "earcut";
import Delaunator from "delaunator";
import Constrainautor from "@kninnug/constrainautor";
import type { CoordinatesType } from "./Geometry";

type Triangulation = { points: CoordinatesType[]; indexes: number[] };

/**
 * Grid points closer to a ring than this part of the step are left out, a point on a ring edge would stop the edge
 * from being constrained.
 */
const GRID_POINT_MARGIN = 0.05;

const triangleArea = (a: CoordinatesType, b: CoordinatesType, c: CoordinatesType) =>
    ((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) * 0.5;

function ringArea(ring: CoordinatesType[]) {
    let s = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        s += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
    }
    return Math.abs(s * 0.5);
}

function distanceToSegment(x: number, y: number, a: CoordinatesType, b: CoordinatesType) {
    const dx = b[0] - a[0],
        dy = b[1] - a[1],
        l = dx * dx + dy * dy;
    let t = l > 0 ? ((x - a[0]) * dx + (y - a[1]) * dy) / l : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(a[0] + t * dx - x, a[1] + t * dy - y);
}

/**
 * The nodes of the grid inside the polygon, not too close to its rings: a scan along each grid row with the ring
 * segments that reach it.
 */
function gridPointsInside(rings: CoordinatesType[][], step: number): CoordinatesType[] {
    const rows = new Map<number, [CoordinatesType, CoordinatesType][]>(),
        margin = GRID_POINT_MARGIN * step,
        out: CoordinatesType[] = [];

    for (const ring of rings) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const a = ring[j],
                b = ring[i],
                from = Math.ceil((Math.min(a[1], b[1]) - margin) / step),
                to = Math.floor((Math.max(a[1], b[1]) + margin) / step);
            for (let r = from; r <= to; r++) {
                const row = rows.get(r);
                row ? row.push([a, b]) : rows.set(r, [[a, b]]);
            }
        }
    }

    for (const [r, segments] of rows) {
        const y = r * step,
            xs: number[] = [];

        for (const [a, b] of segments) {
            if (a[1] > y !== b[1] > y) {
                xs.push(a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]));
            }
        }
        xs.sort((p, q) => p - q);

        for (let k = 0; k + 1 < xs.length; k += 2) {
            for (let c = Math.ceil((xs[k] + margin) / step); c * step < xs[k + 1] - margin; c++) {
                const x = c * step;
                let near = false;
                for (const [a, b] of segments) {
                    if (distanceToSegment(x, y, a, b) < margin) {
                        near = true;
                        break;
                    }
                }
                if (!near) out.push([x, y]);
            }
        }
    }

    return out;
}

/**
 * Splits the triangles with an edge longer than the step, but for the rounding, at the middle of their longest edge until there is none.
 * Every triangle of a long edge splits it at the same point, so the triangles stay joined.
 */
function splitLongEdges(points: CoordinatesType[], indexes: number[], step: number): number[] {
    const out: number[] = [],
        middles = new Map<number, number>(),
        stack = indexes.slice(),
        longest = step * (1 + 1e-9);

    const length = (a: number, b: number) =>
        Math.max(Math.abs(points[b][0] - points[a][0]), Math.abs(points[b][1] - points[a][1]));

    const middle = (a: number, b: number) => {
        const lo = Math.min(a, b),
            hi = Math.max(a, b),
            key = (hi * (hi + 1)) / 2 + lo;
        let m = middles.get(key);
        if (m === undefined) {
            m = points.length;
            points.push([(points[a][0] + points[b][0]) * 0.5, (points[a][1] + points[b][1]) * 0.5]);
            middles.set(key, m);
        }
        return m;
    };

    while (stack.length) {
        const c = stack.pop()!,
            b = stack.pop()!,
            a = stack.pop()!,
            ab = length(a, b),
            bc = length(b, c),
            ca = length(c, a);

        if (ab <= longest && bc <= longest && ca <= longest) {
            out.push(a, b, c);
        } else if (ab >= bc && ab >= ca) {
            const m = middle(a, b);
            stack.push(a, m, c, m, b, c);
        } else if (bc >= ca) {
            const m = middle(b, c);
            stack.push(b, m, a, m, c, a);
        } else {
            const m = middle(c, a);
            stack.push(c, m, b, m, a, b);
        }
    }

    return out;
}

/**
 * The constrained Delaunay triangulation of the ring points and of the grid points inside, the triangles out of the
 * polygon and in its holes are left out. Throws when the rings are not a valid polygon.
 */
function triangulateDelaunay(rings: CoordinatesType[][], step: number): Triangulation {
    const points: CoordinatesType[] = rings.flat(),
        first = new Map<string, number>(),
        // The point of each Delaunator vertex and the vertex of each point
        vertexPoint: number[] = [],
        same: number[] = [];

    for (let i = 0; i < points.length; i++) {
        const k = points[i][0] + "," + points[i][1];
        let v = first.get(k);
        if (v === undefined) {
            v = vertexPoint.length;
            vertexPoint.push(i);
            first.set(k, v);
        }
        same.push(v);
    }

    const edges: [number, number][] = [];
    let offset = 0;
    for (const ring of rings) {
        for (let i = 0; i < ring.length; i++) {
            const a = same[offset + i],
                b = same[offset + ((i + 1) % ring.length)];
            if (a !== b) edges.push([a, b]);
        }
        offset += ring.length;
    }

    for (const p of gridPointsInside(rings, step)) {
        vertexPoint.push(points.length);
        points.push(p);
    }

    const coords = new Float64Array(vertexPoint.length * 2);
    for (let v = 0; v < vertexPoint.length; v++) {
        coords[2 * v] = points[vertexPoint[v]][0];
        coords[2 * v + 1] = points[vertexPoint[v]][1];
    }

    const del = new Delaunator(coords),
        con = new Constrainautor(del, edges),
        { triangles, halfedges } = del,
        count = triangles.length / 3,
        inside = new Int8Array(count).fill(-1),
        queue: number[] = [];

    // Over a hull edge is out of the polygon, over a constrained edge the side changes
    for (let e = 0; e < halfedges.length; e++) {
        if (halfedges[e] === -1) {
            const t = Math.floor(e / 3);
            if (inside[t] === -1) {
                inside[t] = con.isConstrained(e) ? 1 : 0;
                queue.push(t);
            }
        }
    }

    while (queue.length) {
        const t = queue.pop()!;
        for (let e = 3 * t; e < 3 * t + 3; e++) {
            const twin = halfedges[e];
            if (twin === -1) continue;
            const n = Math.floor(twin / 3),
                side = con.isConstrained(e) ? 1 - inside[t] : inside[t];
            if (inside[n] === -1) {
                inside[n] = side;
                queue.push(n);
            } else if (inside[n] !== side) {
                throw new Error("The rings are not a valid polygon");
            }
        }
    }

    let indexes: number[] = [],
        area = 0;
    for (let t = 0; t < count; t++) {
        if (inside[t] === 1) {
            const a = vertexPoint[triangles[3 * t]],
                b = vertexPoint[triangles[3 * t + 1]],
                c = vertexPoint[triangles[3 * t + 2]];
            indexes.push(a, b, c);
            area += triangleArea(points[a], points[b], points[c]);
        }
    }

    let expected = ringArea(rings[0]);
    for (let j = 1; j < rings.length; j++) expected -= ringArea(rings[j]);
    if (!(Math.abs(Math.abs(area) - expected) <= 1e-9 * expected)) {
        throw new Error("The rings are not a valid polygon");
    }

    indexes = splitLongEdges(points, indexes, step);

    return { points, indexes };
}

/**
 * Splits a convex polygon by the line where the coordinate on the axis is the value, into the parts below and above.
 * The point on the line is the same for both parts and for every polygon with that edge, whichever way it goes.
 */
function splitConvex(poly: CoordinatesType[], axis: number, value: number): [CoordinatesType[], CoordinatesType[]] {
    const below: CoordinatesType[] = [],
        above: CoordinatesType[] = [],
        other = 1 - axis;

    for (let i = 0; i < poly.length; i++) {
        const a = poly[i],
            b = poly[(i + 1) % poly.length],
            da = a[axis] - value,
            db = b[axis] - value;

        if (da <= 0) below.push(a);
        if (da >= 0) above.push(a);

        if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
            const first = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]),
                p = first ? a : b,
                q = first ? b : a,
                t = (value - p[axis]) / (q[axis] - p[axis]),
                c: CoordinatesType = [0, 0];
            c[axis] = value;
            c[other] = p[other] + t * (q[other] - p[other]);
            below.push(c);
            above.push(c);
        }
    }

    return [below, above];
}

/**
 * Earcut triangles cut by the grid. Earcut takes the rings that are not a valid polygon too.
 */
function triangulateEarcut(rings: CoordinatesType[][], step: number): Triangulation {
    const points: CoordinatesType[] = rings.flat(),
        vertices: number[] = [],
        holes: number[] = [];

    let offset = 0;
    for (let j = 0; j < rings.length; j++) {
        if (j > 0) holes.push(offset);
        offset += rings[j].length;
    }
    for (const p of points) vertices.push(p[0], p[1]);

    const tri = earcut(vertices, holes, 2);

    const index = new Map<string, number>();
    for (let i = 0; i < points.length; i++) {
        const k = points[i][0] + "," + points[i][1];
        if (!index.has(k)) index.set(k, i);
    }

    const indexOf = (p: CoordinatesType) => {
        const k = p[0] + "," + p[1];
        let i = index.get(k);
        if (i === undefined) {
            i = points.length;
            points.push([p[0], p[1]]);
            index.set(k, i);
        }
        return i;
    };

    const indexes: number[] = [];

    const addCell = (cell: CoordinatesType[]) => {
        if (cell.length < 3) return;
        const i0 = indexOf(cell[0]);
        let i1 = indexOf(cell[1]);
        for (let k = 2; k < cell.length; k++) {
            const i2 = indexOf(cell[k]);
            if (i0 !== i1 && i1 !== i2 && i2 !== i0) indexes.push(i0, i1, i2);
            i1 = i2;
        }
    };

    for (let t = 0; t < tri.length; t += 3) {
        const triangle = [points[tri[t]], points[tri[t + 1]], points[tri[t + 2]]];

        let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;
        for (const p of triangle) {
            minX = Math.min(minX, p[0]);
            maxX = Math.max(maxX, p[0]);
            minY = Math.min(minY, p[1]);
            maxY = Math.max(maxY, p[1]);
        }

        let rest = triangle;
        for (let i = Math.floor(minX / step) + 1; rest.length >= 3; i++) {
            let column: CoordinatesType[];
            if (i * step < maxX) {
                [column, rest] = splitConvex(rest, 0, i * step);
            } else {
                column = rest;
                rest = [];
            }

            let up = column;
            for (let j = Math.floor(minY / step) + 1; up.length >= 3; j++) {
                let cell: CoordinatesType[];
                if (j * step < maxY) {
                    [cell, up] = splitConvex(up, 1, j * step);
                } else {
                    cell = up;
                    up = [];
                }
                addCell(cell);
            }
        }
    }

    return { points, indexes };
}

/**
 * Triangulates a polygon with no edge longer than the step, for the cube tiles.
 * @param {Array.<Array.<CoordinatesType>>} rings - Geodetic rings, the outer one and the holes.
 * @param {number} step - Longest edge in degrees.
 * @returns {{points: Array.<CoordinatesType>, indexes: Array.<number>}} - The ring points, then the new ones.
 */
export function triangulateOnGrid(rings: CoordinatesType[][], step: number): Triangulation {
    try {
        return triangulateDelaunay(rings, step);
    } catch {
        return triangulateEarcut(rings, step);
    }
}
