import { E, N, NE, NW, S, SE, SW, W } from "../../src/quadTree/quadTree";
import {
    GRID_SIZE_BY_ZOOM,
    STRATEGIES,
    createCut,
    createRandom,
    createStrategy,
    drawFrame,
    drawnSide,
    engage,
    link,
    pointAt,
    settle,
    tileRect
} from "./quadTreeScene";

const TOLERANCE = 1e-6;

const OPPOSITE = [S, W, N, E];

// Every tile has its own heights: neighbours disagree on their common side until they are equalized
function setVertices(node, world, random, version = 0) {
    const seg = node.segment,
        gs = seg.gridSize,
        r = tileRect(seg, world),
        size = (gs + 1) * (gs + 1) * 3;

    seg._relativeCenter.set(r.x0 + 0.1, r.y0 - 0.2, 0.3);

    const v = new Float64Array(size);
    for (let i = 0; i <= gs; i++) {
        for (let j = 0; j <= gs; j++) {
            const k = (i * (gs + 1) + j) * 3;
            v[k] = r.x0 + ((r.x1 - r.x0) * j) / gs - seg._relativeCenter.x;
            v[k + 1] = r.y0 + ((r.y1 - r.y0) * i) / gs - seg._relativeCenter.y;
            v[k + 2] = random() - seg._relativeCenter.z;
        }
    }

    seg.renderVertices = seg.terrainVertices = v;
    seg.renderVerticesHigh = new Float32Array(size);
    seg.renderVerticesLow = new Float32Array(size);
    seg.readyToEngage = true;

    node.appliedTerrainNodeId = node.nodeId + version * 1e9;
    node.equalizedSideWithNodeId = new Array(4).fill(node.appliedTerrainNodeId);
}

/** The biggest gap between the drawn sides of the node and of its neighbour of the same or a lower zoom. */
function sideGap(node, side, neighbor) {
    const dz = 1 / (1 << (node.segment.tileZoom - neighbor.segment.tileZoom)),
        offset = node.getOffsetOppositeNeighbourSide(neighbor, side),
        a = drawnSide(node, side),
        b = drawnSide(neighbor, OPPOSITE[side]),
        inSpan = b.map(({ t }) => (t - offset) / dz).filter((t) => t >= 0 && t <= 1);

    let gap = 0;
    for (const t of [...a.map((p) => p.t), ...inSpan]) {
        gap = Math.max(gap, pointAt(a, t).distance(pointAt(b, offset + t * dz)));
    }
    return gap;
}

function collectGaps(nodes) {
    const gaps = [];
    for (const node of nodes) {
        for (let side = N; side <= W; side++) {
            for (const n of node.neighbors[side]) {
                const finer = node.segment.tileZoom > n.segment.tileZoom,
                    equal = node.segment.tileZoom === n.segment.tileZoom && node.__id > n.__id;
                if (finer || equal) {
                    const gap = sideGap(node, side, n);
                    if (gap > TOLERANCE) {
                        gaps.push({ node, side, n, gap });
                    }
                }
            }
        }
    }
    return gaps;
}

function setNodes(nodes, world, random) {
    for (const node of nodes) {
        node.sideSizeLog2 = new Array(4).fill(Math.log2(node.segment.gridSize));
        setVertices(node, world, random);
    }
}

function createScene(world, seed, { uniformGrid = true } = {}) {
    const qts = createStrategy(world.Strategy),
        random = createRandom(seed * 7919),
        nodes = createCut(qts, world, seed, { holes: 0 });

    if (uniformGrid) {
        for (const node of nodes) {
            node.segment.gridSize = GRID_SIZE_BY_ZOOM[node.segment.tileZoom];
        }
    }

    setNodes(nodes, world, random);

    return { qts, nodes, random };
}

// Gaps at the ends of the sides, whatever happens between them
function collectCornerGaps(nodes) {
    return collectGaps(nodes).filter(({ node, side, n }) => {
        const dz = 1 / (1 << (node.segment.tileZoom - n.segment.tileZoom)),
            offset = node.getOffsetOppositeNeighbourSide(n, side),
            a = drawnSide(node, side),
            b = drawnSide(n, OPPOSITE[side]);
        return (
            pointAt(a, 0).distance(pointAt(b, offset)) > TOLERANCE ||
            pointAt(a, 1).distance(pointAt(b, offset + dz)) > TOLERANCE
        );
    });
}

function getVertices(nodes) {
    return nodes.map((n) => {
        const seg = n.segment,
            c = seg._relativeCenter;
        return Array.from(seg.renderVertices, (v, i) => v + [c.x, c.y, c.z][i % 3]);
    });
}

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

const WORLDS = [STRATEGIES[0], STRATEGIES[1]];

describe.each(WORLDS)("corners of the equalized segments of $name", (world) => {
    test.each(SEEDS)("the drawn sides meet in a few frames, seed %i", (seed) => {
        const { qts, nodes } = createScene(world, seed);

        expect(settle(qts, nodes)).toBeLessThanOrEqual(4);

        expect(collectGaps(nodes)).toEqual([]);
    });

    test.each(SEEDS)("the drawn sides meet after new terrain comes to some tiles, seed %i", (seed) => {
        const { qts, nodes, random } = createScene(world, seed);

        for (let round = 1; round <= 5; round++) {
            settle(qts, nodes);
            for (const node of nodes) {
                if (random() < 0.1) {
                    setVertices(node, world, random, round);
                }
            }
            expect(settle(qts, nodes)).toBeLessThanOrEqual(4);
            expect(collectGaps(nodes)).toEqual([]);
        }
    });

    test.each(SEEDS)("corners meet while some tiles have a smaller grid, seed %i", (seed) => {
        const { qts, nodes } = createScene(world, seed, { uniformGrid: false });

        settle(qts, nodes);

        expect(collectCornerGaps(nodes)).toEqual([]);
    });

    test.each(SEEDS)("the order of the segments doesn't matter, seed %i", (seed) => {
        const a = createScene(world, seed),
            b = createScene(world, seed);

        settle(a.qts, a.nodes);
        settle(b.qts, b.nodes, true);

        // Segments of the two scenes differ by __id, which picks the owner of equal zooms, so the check is on the gaps
        expect(collectGaps(a.nodes)).toEqual([]);
        expect(collectGaps(b.nodes)).toEqual([]);
    });

    test.each(SEEDS)("a frame is asked for only while a corner moves, seed %i", (seed) => {
        const { qts, nodes } = createScene(world, seed),
            requestRedraw = vi.spyOn(qts.planet.renderer, "requestRedraw");

        settle(qts, nodes);
        expect(requestRedraw).toHaveBeenCalled();

        requestRedraw.mockClear();
        drawFrame(qts, nodes);
        expect(requestRedraw).not.toHaveBeenCalled();
    });

    test.each(SEEDS)("corners are not gone through while nothing changes, seed %i", (seed) => {
        const { qts, nodes } = createScene(world, seed),
            corner = vi.spyOn(nodes[0].segment, "_equalizeCorner");

        settle(qts, nodes);
        expect(corner).toHaveBeenCalled();

        corner.mockClear();
        drawFrame(qts, nodes);
        expect(corner).not.toHaveBeenCalled();
    });

    test.each(SEEDS)("corners are gone through when the set of nodes changes, seed %i", (seed) => {
        const { qts, nodes } = createScene(world, seed);

        settle(qts, nodes);
        drawFrame(qts, nodes);
        expect(qts._cornersChanged).toBe(false);

        const dropped = nodes.pop();
        drawFrame(qts, nodes);
        expect(qts._cornersChanged).toBe(true);

        nodes.push(dropped);
        settle(qts, nodes);

        expect(collectGaps(nodes)).toEqual([]);
    });

    test.each(SEEDS)("the result doesn't change in the next frames, seed %i", (seed) => {
        const { qts, nodes } = createScene(world, seed);

        settle(qts, nodes);
        const first = getVertices(nodes);

        drawFrame(qts, nodes);

        expect(getVertices(nodes)).toEqual(first);
    });

    test.each(SEEDS)("nothing is uploaded when nothing changes, seed %i", (seed) => {
        const { qts, nodes } = createScene(world, seed);

        settle(qts, nodes);

        for (let frame = 0; frame < 3; frame++) {
            drawFrame(qts, nodes);
            expect(engage(nodes)).toBe(0);
        }
    });
});

describe("corner cases of the equalized segments", () => {
    const world = STRATEGIES[0];

    function descend(root, ...parts) {
        let node = root;
        for (const part of parts) {
            if (!node.ready) {
                node.createChildNodes();
            }
            node = node.nodes[part];
        }
        return node;
    }

    function setup(pick) {
        const qts = createStrategy(world.Strategy),
            nodes = pick(qts.quadTreeList[0], (...parts) => descend(qts.quadTreeList[0], ...parts));

        for (const node of nodes) {
            node.segment.gridSize = GRID_SIZE_BY_ZOOM[node.segment.tileZoom];
        }

        nodes.sort((a, b) => a.segment.tileZoom - b.segment.tileZoom);
        setNodes(nodes, world, createRandom(5));

        return { qts, nodes };
    }

    test("a lower zoom diagonal pair around a point of deeper tiles agrees", () => {
        const { qts, nodes } = setup((root, at) => {
            const path = [NW, SE, SE];
            return [
                at(...path, NW),
                at(...path, SE),
                ...[NW, NE, SW, SE].map((p) => at(...path, NE, p)),
                ...[NW, NE, SW, SE].map((p) => at(...path, SW, p))
            ];
        });

        settle(qts, nodes);

        expect(collectGaps(nodes)).toEqual([]);
    });

    test("a corner inside the side of a neighbor stays on that side", () => {
        const { qts, nodes } = setup((root, at) => [
            at(NW, SE, NE),
            at(NW, SE, SE, NW),
            at(NW, SE, SE, NE),
            at(NW, SE, SE, SW),
            at(NW, SE, SE, SE)
        ]);

        settle(qts, nodes);

        expect(collectGaps(nodes)).toEqual([]);
        expect(nodes[1].getCornerNeighbor(N, NE)).toBeUndefined();
        expect(nodes[1].getCornerNeighbor(N, NW)).toBe(nodes[0]);
        expect(nodes[1].getCornerNeighbor(W, NW)).toBe(null);
    });

    test("the corners of the side next to a neighbor of a much lower zoom follow its corner", () => {
        const { qts, nodes } = setup((root, at) => [
            at(NW, SE),
            at(NW, SW, SE, SE),
            at(SW, NE, NE, NE, NE),
            at(SW, NE, NE, NE, NW),
            at(SW, NW, NE, NE)
        ]);

        settle(qts, nodes);

        expect(collectGaps(nodes)).toEqual([]);
    });

    test("a vertex that is not a number is not taken and doesn't cause uploads", () => {
        const { qts, nodes } = createScene(world, 1),
            owner = nodes[0];

        owner.segment.renderVertices.fill(NaN);

        settle(qts, nodes);

        drawFrame(qts, nodes);

        expect(engage(nodes)).toBe(0);
    });
});
