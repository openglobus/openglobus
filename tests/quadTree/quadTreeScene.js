import { Vec3 } from "../../src/math/Vec3";
import { E, N, S } from "../../src/quadTree/quadTree";
import { EPSG4326QuadTreeStrategy } from "../../src/quadTree/EPSG4326/EPSG4326QuadTreeStrategy";
import { EarthQuadTreeStrategy } from "../../src/quadTree/earth/EarthQuadTreeStrategy";
import { EquiQuadTreeStrategy } from "../../src/quadTree/equi/EquiQuadTreeStrategy";
import { QuadTreeStrategy } from "../../src/quadTree/QuadTreeStrategy";
import { Wgs84QuadTreeStrategy } from "../../src/quadTree/wgs84/Wgs84QuadTreeStrategy";
import { TILEGROUP_NORTH, TILEGROUP_SOUTH } from "../../src/segment/Segment";
import { wgs84 } from "../../src/ellipsoid/wgs84";

export const GRID_SIZE_BY_ZOOM = [64, 32, 16, 8, 4, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];

// Width of the world in root widths, and where the rows of each tile group start.
export const STRATEGIES = [
    {
        name: "Earth",
        Strategy: EarthQuadTreeStrategy,
        period: 1,
        rows: { [TILEGROUP_NORTH]: -1, [TILEGROUP_SOUTH]: 1 }
    },
    { name: "Equi", Strategy: EquiQuadTreeStrategy, period: 2 },
    { name: "EPSG4326", Strategy: EPSG4326QuadTreeStrategy, period: 2 },
    { name: "Wgs84", Strategy: Wgs84QuadTreeStrategy, period: 1 }
];

export function createRandom(seed) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function createStrategy(Strategy) {
    const planet = {
        _createdNodesCount: 0,
        ellipsoid: wgs84,
        terrain: { gridSizeByZoom: GRID_SIZE_BY_ZOOM, minZoom: 2, equalizeVertices: true },
        renderer: { handler: {}, requestRedraw: () => {} },
        transitionTime: 580
    };
    const init = vi.spyOn(QuadTreeStrategy.prototype, "init").mockImplementation(() => {});
    const qts = new Strategy({ planet });
    qts.init({});
    init.mockRestore();
    return qts;
}

// The tile as a rectangle of the world grid in root widths: dyadic numbers, exact in floats.
export function tileRect(segment, { rows }) {
    const p = segment.powTileZoom,
        y0 = (rows && rows[segment.tileGroup]) || 0;
    return {
        x0: segment.tileX / p,
        x1: (segment.tileX + 1) / p,
        y0: y0 + segment.tileY / p,
        y1: y0 + (segment.tileY + 1) / p
    };
}

/**
 * A cut of the tree as the camera makes it: tiles get smaller towards the focus. Some tiles go deeper at random,
 * so the zoom can jump by more than one between neighbours, and some are dropped, as the frustum does.
 */
export function createCut(qts, world, seed, { detail = 1.5, maxZoom = 14, holes = 0.08 } = {}) {
    const random = createRandom(seed),
        P = world.period,
        fx = random() * P,
        fy = world.rows ? random() * 3 - 1 : random();

    const nodes = [];

    const visit = (node) => {
        const r = tileRect(node.segment, world),
            size = r.x1 - r.x0,
            dx = Math.abs((r.x0 + r.x1) / 2 - fx),
            dy = (r.y0 + r.y1) / 2 - fy,
            dist = Math.hypot(Math.min(dx, P - dx), dy),
            z = node.segment.tileZoom;

        if (z < 2 || (z < maxZoom && (size * detail > dist || random() < 0.1))) {
            if (!node.ready) {
                node.createChildNodes();
            }
            node.nodes.forEach(visit);
        } else if (random() >= holes) {
            node.segment.gridSize = GRID_SIZE_BY_ZOOM[z] / (random() < 0.15 && GRID_SIZE_BY_ZOOM[z] > 2 ? 2 : 1);
            nodes.push(node);
        }
    };

    qts.quadTreeList.forEach(visit);

    // _renderedNodes are kept sorted by the zoom
    return nodes.sort((a, b) => a.segment.tileZoom - b.segment.tileZoom);
}

export function vertexOnSide(seg, side, k) {
    const gs = seg.gridSize,
        one = gs + 1,
        index = side === N ? k : side === S ? gs * one + k : side === E ? k * one + gs : k * one,
        v = seg.renderVertices,
        c = seg._relativeCenter;
    return new Vec3(v[index * 3] + c.x, v[index * 3 + 1] + c.y, v[index * 3 + 2] + c.z);
}

// The side as it is drawn: the vertices the side size keeps, at positions from 0 to 1 along the side
export function drawnSide(node, side) {
    const seg = node.segment,
        count = 1 << node.sideSizeLog2[side],
        step = seg.gridSize / count,
        points = [];
    for (let k = 0; k <= count; k++) {
        points.push({ t: k / count, p: vertexOnSide(seg, side, k * step) });
    }
    return points;
}

export function pointAt(points, t) {
    for (let i = 1; i < points.length; i++) {
        if (t <= points[i].t) {
            const a = points[i - 1],
                b = points[i],
                f = (t - a.t) / (b.t - a.t);
            return a.p.add(b.p.sub(a.p).scaleTo(f));
        }
    }
    return points[points.length - 1].p;
}

export function link(qts, nodes) {
    const opaque = [];
    qts._neighborFrame++;
    nodes.forEach((n) => qts._addOpaqueNode(opaque, n));
    qts._linkOpaqueNodes(opaque);
}

// As Planet draws a frame: from the end of the list, the deepest nodes first
export function drawFrame(qts, nodes, reversed = false) {
    link(qts, nodes);
    for (let i = 0; i < nodes.length; i++) {
        const seg = nodes[reversed ? i : nodes.length - 1 - i].segment;
        seg.equalize();
    }
}

export function engage(nodes) {
    let uploads = 0;
    for (const node of nodes) {
        uploads += node.segment.readyToEngage ? 1 : 0;
        node.segment.readyToEngage = false;
    }
    return uploads;
}

// Draws the frames the segment corners ask for, returns their count
export function settle(qts, nodes, reversed = false) {
    let frames = 0;
    do {
        drawFrame(qts, nodes, reversed);
        frames++;
    } while (engage(nodes) > 0 && frames < 8);
    return frames;
}
