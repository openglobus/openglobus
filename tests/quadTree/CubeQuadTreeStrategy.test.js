import { LonLat } from "../../src/LonLat";
import { EquiangularCubeQuadTreeStrategy, CubeQuadTreeStrategy } from "../../src/quadTree/cube/CubeQuadTreeStrategy";
import { Vec3 } from "../../src/math/Vec3";
import { CUBE_FACES, CUBE_FACE_LINKS, cube, cubeEquiangular } from "../../src/proj/cube";
import {
    CORNERSIDE,
    E,
    N,
    NE,
    NOPSORD,
    NW,
    OPSIDE,
    ROOTPART,
    S,
    SE,
    SIDEFLIP,
    SIDE_CORNER,
    SW,
    W
} from "../../src/quadTree/quadTree";
import { PlainSegmentWorker } from "../../src/utils/PlainSegmentWorker";
import { Geoid } from "../../src/terrain/Geoid";
import { Ellipsoid } from "../../src/ellipsoid/Ellipsoid";
import { wgs84 } from "../../src/ellipsoid/wgs84";
import {
    GRID_SIZE_BY_ZOOM,
    STRATEGIES,
    createRandom,
    createStrategy,
    drawnSide,
    pointAt,
    settle
} from "./quadTreeScene";

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

const MAX_ZOOM = 6;

const ALL_FACES = [0, 1, 2, 3, 4, 5];

const RADIANS = Math.PI / 180;

function toDirection(lonLat) {
    const c = Math.cos(lonLat.lat * RADIANS);
    return new Vec3(
        c * Math.cos(lonLat.lon * RADIANS),
        c * Math.sin(lonLat.lon * RADIANS),
        Math.sin(lonLat.lat * RADIANS)
    );
}

function direction(face, s, t) {
    return toDirection(cubeEquiangular.toLonLat(face + s, t, face));
}

// The corners and the sides of the tile as positions on its face, s goes to the east, t goes to the north
function cornerPosition(seg, corner) {
    const p = seg.powTileZoom;
    return [(seg.tileX + (corner & 1)) / p, 1 - (seg.tileY + (corner >> 1)) / p];
}

function cornerDirection(seg, corner) {
    const [s, t] = cornerPosition(seg, corner);
    return direction(seg.tileGroup, s, t);
}

function sideDirection(seg, side, k) {
    const [a, b] = SIDE_CORNER[side].map((c) => cornerPosition(seg, c));
    return direction(seg.tileGroup, a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k);
}

function key(v) {
    return [v.x, v.y, v.z].map((c) => Math.round(c * 1e7) + 0).join();
}

/** Tiles get smaller towards the focus, so the zoom can change on the edges and in the corners of the cube. */
function createCubeCut(qts, seed, focus, holes = 0) {
    const random = createRandom(seed),
        nodes = [];

    const visit = (node) => {
        const seg = node.segment,
            z = seg.tileZoom,
            center = direction(
                seg.tileGroup,
                (seg.tileX + 0.5) / seg.powTileZoom,
                1 - (seg.tileY + 0.5) / seg.powTileZoom
            ),
            size = 2 / seg.powTileZoom;

        if (z < 2 || (z < MAX_ZOOM && (center.distance(focus) < size || random() < 0.1))) {
            if (!node.ready) {
                node.createChildNodes();
            }
            node.nodes.forEach(visit);
        } else if (random() >= holes) {
            node.segment.gridSize = GRID_SIZE_BY_ZOOM[z];
            nodes.push(node);
        }
    };

    qts.quadTreeList.forEach(visit);

    return nodes.sort((a, b) => a.segment.tileZoom - b.segment.tileZoom);
}

const FOCUSES = [
    ...[1, -1].flatMap((x) => [1, -1].flatMap((y) => [1, -1].map((z) => new Vec3(x, y, z).normalize()))),
    new Vec3(1, 1, 0).normalize(),
    new Vec3(-1, 0, 1).normalize(),
    new Vec3(0, -1, -1).normalize(),
    new Vec3(0, 0, 1),
    new Vec3(-1, 0, 0)
];

function linkNodes(qts, nodes) {
    const opaque = [];
    qts._neighborFrame++;
    nodes.forEach((n) => qts._addOpaqueNode(opaque, n));
    qts._linkOpaqueNodes(opaque);
}

/** The neighbors by geometry: the sides are cut into the pieces of the deepest tiles, a piece is on two sides. */
function trueNeighbors(nodes) {
    const pieces = new Map();

    for (const node of nodes) {
        for (let side = N; side <= W; side++) {
            const count = 1 << (MAX_ZOOM - node.segment.tileZoom);
            for (let i = 0; i < count; i++) {
                const k = key(sideDirection(node.segment, side, (i + 0.5) / count));
                pieces.set(k, [...(pieces.get(k) || []), { node, side }]);
            }
        }
    }

    const result = new Map();

    for (const owners of pieces.values()) {
        expect(owners.length).toBeLessThanOrEqual(2);
        if (owners.length === 2) {
            for (const [a, b] of [owners, [...owners].reverse()]) {
                const k = `${a.node.__id}:${a.side}`;
                result.set(k, (result.get(k) || new Set()).add(`${b.node.__id}:${b.side}`));
            }
        }
    }

    return result;
}

describe("cube mapping", () => {
    test("a point comes back from the cube, the poles too", () => {
        const random = createRandom(11),
            points = [new LonLat(0, 90), new LonLat(77, -90), new LonLat(180, 0), new LonLat(-180, 45)];

        for (let i = 0; i < 2000; i++) {
            points.push(new LonLat(random() * 360 - 180, Math.asin(random() * 2 - 1) / RADIANS));
        }

        for (const p of points) {
            const native = cubeEquiangular.fromLonLat(p),
                back = cubeEquiangular.toLonLat(native.lon, native.lat);
            expect(toDirection(back).distance(toDirection(p))).toBeLessThan(1e-12);
        }
    });

    test("the faces lie where they are named", () => {
        expect(cubeEquiangular.fromLonLat(new LonLat(0, 90)).lon).toBe(0.5);
        expect(cubeEquiangular.fromLonLat(new LonLat(0, 0)).lon).toBe(1.5);
        expect(cubeEquiangular.fromLonLat(new LonLat(90, 0)).lon).toBe(2.5);
        expect(cubeEquiangular.fromLonLat(new LonLat(180, 0)).lon).toBeCloseTo(3.5, 12);
        expect(cubeEquiangular.fromLonLat(new LonLat(-90, 0)).lon).toBe(4.5);
        expect(cubeEquiangular.fromLonLat(new LonLat(0, -90)).lon).toBe(5.5);
    });

    test("the east and north directions of a face look like that from the outside", () => {
        for (const f of CUBE_FACES) {
            const c = new Vec3(f[0], f[1], f[2]),
                u = new Vec3(f[3], f[4], f[5]),
                v = new Vec3(f[6], f[7], f[8]);
            expect(u.cross(v).distance(c)).toBe(0);
        }
    });

    test("the east edge of a face stays on the face", () => {
        expect(cubeEquiangular.toLonLat(2, 0.5, 1).lon).toBeCloseTo(45, 10);
        expect(cubeEquiangular.toLonLat(2, 0.5).lon).toBeCloseTo(45, 10);
        expect(direction(1, 1, 0.5).distance(direction(2, 0, 0.5))).toBeLessThan(1e-14);
    });

    test("a point on the edge of a face never gets into the next face", () => {
        const p = cubeEquiangular.fromLonLat(new LonLat(45, 0));
        expect(Math.floor(p.lon) === 1 || Math.floor(p.lon) === 2).toBe(true);
        expect(cubeEquiangular.toLonLat(p.lon, p.lat).lon).toBeCloseTo(45, 10);
    });
});

describe("cube faces", () => {
    test("the links of the faces follow the geometry and go both ways", () => {
        ALL_FACES.forEach((face) => {
            for (let side = N; side <= W; side++) {
                const [other, otherSide] = CUBE_FACE_LINKS[face][side],
                    flip = SIDEFLIP[side][otherSide],
                    back = CUBE_FACE_LINKS[other][otherSide];

                expect(back).toEqual([face, side]);

                const corners = SIDE_CORNER[side],
                    otherCorners = SIDE_CORNER[otherSide];

                corners.forEach((corner, i) => {
                    const oc = otherCorners[flip ? 1 - i : i],
                        a = direction(face, corner & 1, 1 - (corner >> 1)),
                        b = direction(other, oc & 1, 1 - (oc >> 1));
                    expect(a.distance(b)).toBeLessThan(1e-14);
                });
            }
        });
    });

    test("tile ids don't repeat between the faces", () => {
        const qts = createStrategy(EquiangularCubeQuadTreeStrategy),
            ids = new Set(),
            indexes = new Set();

        let count = 0;

        const visit = (node) => {
            count++;
            ids.add(node.nodeId);
            indexes.add(node.segment.tileIndex);
            if (node.segment.tileZoom < 3) {
                node.createChildNodes();
                node.nodes.forEach(visit);
            }
        };

        qts.quadTreeList.forEach(visit);

        expect(count).toBe(6 * (1 + 4 + 16 + 64));
        expect(ids.size).toBe(count);
        expect(indexes.size).toBe(count);
    });

    test("tile indexes are on the face", () => {
        const qts = createStrategy(EquiangularCubeQuadTreeStrategy),
            root = qts.quadTreeList[3];

        root.createChildNodes();
        root.nodes[SE].createChildNodes();

        const seg = root.nodes[SE].nodes[NW].segment;

        expect([seg.tileGroup, seg.tileX, seg.tileY, seg.tileZoom]).toEqual([3, 2, 2, 2]);
        expect(seg._extent.southWest.lon).toBe(3.5);
        expect(seg._extent.northEast.lat).toBe(0.5);
    });

    test("the node and the tile of a point are found, the strategy and the node agree", () => {
        const qts = createStrategy(EquiangularCubeQuadTreeStrategy),
            random = createRandom(5),
            visit = (node) => {
                if (node.segment.tileZoom < 4) {
                    node.createChildNodes();
                    node.nodes.forEach(visit);
                }
            };

        qts.quadTreeList.forEach(visit);

        for (let i = 0; i < 300; i++) {
            const p = new LonLat(random() * 360 - 180, Math.asin(random() * 2 - 1) / RADIANS),
                seg = qts.getNodeByLonLat(p).segment,
                [x, y, z, face] = qts.getTileXY(p, seg.tileZoom),
                [row, column] = qts.getLonLatTileOffset(p, x, y, z, 9);

            expect(seg.tileZoom).toBe(4);
            expect(seg.isLonLatInside(p)).toBe(true);
            expect([x, y, face]).toEqual([seg.tileX, seg.tileY, seg.tileGroup]);
            expect(row >= 0 && row < 8 && column >= 0 && column < 8).toBe(true);
        }
    });

    test("the lon lat extent and the bounds of a tile hold its points", () => {
        const qts = createStrategy(EquiangularCubeQuadTreeStrategy),
            tolerance = 1e-9;

        const check = (node) => {
            const seg = node.segment,
                ext = seg.getExtentLonLat(),
                box = seg.bbox.vertices;

            const min = new Vec3(
                    Math.min(...box.map((v) => v.x)),
                    Math.min(...box.map((v) => v.y)),
                    Math.min(...box.map((v) => v.z))
                ),
                max = new Vec3(
                    Math.max(...box.map((v) => v.x)),
                    Math.max(...box.map((v) => v.y)),
                    Math.max(...box.map((v) => v.z))
                );

            let outside = 0;

            for (let i = 0; i <= 16; i++) {
                for (let j = 0; j <= 16; j++) {
                    const e = seg._extent,
                        p = seg.getLonLat(
                            e.southWest.lon + (e.getWidth() * j) / 16,
                            e.southWest.lat + (e.getHeight() * i) / 16
                        ),
                        v = wgs84.lonLatToCartesian(p);

                    const inExtent =
                            p.lat >= ext.southWest.lat - tolerance &&
                            p.lat <= ext.northEast.lat + tolerance &&
                            p.lon >= ext.southWest.lon - tolerance &&
                            p.lon <= ext.northEast.lon + tolerance,
                        inBox =
                            seg.tileZoom === 0 ||
                            (v.x >= min.x - 1e-3 &&
                                v.y >= min.y - 1e-3 &&
                                v.z >= min.z - 1e-3 &&
                                v.x <= max.x + 1e-3 &&
                                v.y <= max.y + 1e-3 &&
                                v.z <= max.z + 1e-3);

                    outside += inExtent && inBox ? 0 : 1;
                }
            }

            expect(outside).toBe(0);

            if (seg.tileZoom < 2) {
                node.createChildNodes();
                node.nodes.forEach(check);
            }
        };

        qts.quadTreeList.forEach(check);
    });
});

describe.each(FOCUSES.map((focus, i) => ({ focus, i })))("neighbors on the cube, focus $i", ({ focus, i }) => {
    test.each([0, 0.1])("are the ones the geometry says, %f of the tiles are out of the frame", (holes) => {
        const qts = createStrategy(EquiangularCubeQuadTreeStrategy),
            nodes = createCubeCut(qts, i + 1, focus, holes);

        linkNodes(qts, nodes);

        const truth = trueNeighbors(nodes);

        for (const node of nodes) {
            for (let side = N; side <= W; side++) {
                const found = node.neighbors[side].map((n) => `${n.__id}:${node.segment.opside[side]}`);
                expect(new Set(found)).toEqual(truth.get(`${node.__id}:${side}`) || new Set());
                expect(found.length).toBe(new Set(found).size);
            }
        }
    });

    test("corners of the neighbors lie in the same point", () => {
        const qts = createStrategy(EquiangularCubeQuadTreeStrategy),
            nodes = createCubeCut(qts, i + 1, focus);

        linkNodes(qts, nodes);

        let checked = 0;

        for (const node of nodes) {
            for (let side = N; side <= W; side++) {
                for (const corner of SIDE_CORNER[side]) {
                    const n = node.getCornerNeighbor(side, corner);
                    if (n) {
                        const nc = node.getNeighborCorner(side, corner);
                        expect(
                            cornerDirection(n.segment, nc).distance(cornerDirection(node.segment, corner))
                        ).toBeLessThan(1e-12);
                        checked++;
                    }
                }
            }
        }

        expect(checked).toBeGreaterThan(nodes.length);
    });
});

// Every tile has its own heights: the tiles disagree on what they share until they are equalized
function setVertices(node, random) {
    const seg = node.segment,
        gs = seg.gridSize,
        size = (gs + 1) * (gs + 1) * 3,
        c = direction(seg.tileGroup, (seg.tileX + 0.5) / seg.powTileZoom, 1 - (seg.tileY + 0.5) / seg.powTileZoom);

    seg._relativeCenter.copy(c);

    const v = new Float64Array(size);

    for (let i = 0; i <= gs; i++) {
        for (let j = 0; j <= gs; j++) {
            const k = (i * (gs + 1) + j) * 3,
                p = direction(
                    seg.tileGroup,
                    (seg.tileX + j / gs) / seg.powTileZoom,
                    1 - (seg.tileY + i / gs) / seg.powTileZoom
                ).scale(1 + random() * 0.01);
            v[k] = p.x - c.x;
            v[k + 1] = p.y - c.y;
            v[k + 2] = p.z - c.z;
        }
    }

    seg.renderVertices = seg.terrainVertices = v;
    seg.renderVerticesHigh = new Float32Array(size);
    seg.renderVerticesLow = new Float32Array(size);
    seg.readyToEngage = true;

    node.sideSizeLog2 = new Array(4).fill(Math.log2(gs));
    node.appliedTerrainNodeId = node.nodeId;
    node.equalizedSideWithNodeId = new Array(4).fill(node.nodeId);
}

function sideGap(node, side, neighbor) {
    const dz = 1 / (1 << (node.segment.tileZoom - neighbor.segment.tileZoom)),
        offset = node.getOffsetOppositeNeighbourSide(neighbor, side),
        opcs = node.segment.opside[side],
        flip = SIDEFLIP[side][opcs],
        toNeighbor = (t) => (flip ? 1 - (offset + t * dz) : offset + t * dz),
        a = drawnSide(node, side),
        b = drawnSide(neighbor, opcs),
        inSpan = b.map(({ t }) => ((flip ? 1 - t : t) - offset) / dz).filter((t) => t >= 0 && t <= 1);

    let gap = 0;
    for (const t of [...a.map((p) => p.t), ...inSpan]) {
        gap = Math.max(gap, pointAt(a, t).distance(pointAt(b, toNeighbor(t))));
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
                    if (gap > 1e-9) {
                        gaps.push({ tile: node.segment.tileIndex, side, neighbor: n.segment.tileIndex, gap });
                    }
                }
            }
        }
    }
    return gaps;
}

function cornerVertex(seg, corner) {
    const i = seg._getCornerVertexIndex(corner),
        v = seg.renderVertices,
        c = seg._relativeCenter;
    return new Vec3(v[i] + c.x, v[i + 1] + c.y, v[i + 2] + c.z);
}

function createScene(seed, focus) {
    const qts = createStrategy(EquiangularCubeQuadTreeStrategy),
        random = createRandom(seed * 7919),
        nodes = createCubeCut(qts, seed, focus);

    nodes.forEach((node) => setVertices(node, random));

    return { qts, nodes, random };
}

describe.each(FOCUSES.map((focus, i) => ({ focus, i })))("equalized tiles on the cube, focus $i", ({ focus, i }) => {
    test("the drawn sides meet on the edges of the faces too", () => {
        const { qts, nodes } = createScene(i + 1, focus);

        expect(settle(qts, nodes)).toBeLessThanOrEqual(4);

        expect(collectGaps(nodes)).toEqual([]);
    });

    test("all the tiles with a corner in one point agree on it, three of them in the corner of the cube", () => {
        const { qts, nodes } = createScene(i + 1, focus);

        settle(qts, nodes);

        const points = new Map();

        for (const node of nodes) {
            for (const corner of [NW, NE, SW, SE]) {
                const k = key(cornerDirection(node.segment, corner));
                points.set(k, [...(points.get(k) || []), cornerVertex(node.segment, corner)]);
            }
        }

        const valences = new Set();

        for (const vertices of points.values()) {
            valences.add(vertices.length);
            for (const v of vertices) {
                expect(v.distance(vertices[0])).toBeLessThan(1e-9);
            }
        }

        expect(valences.has(3)).toBe(true);
    });

    test("the drawn sides meet after new terrain comes to some tiles", () => {
        const { qts, nodes, random } = createScene(i + 1, focus);

        for (let round = 0; round < 3; round++) {
            settle(qts, nodes);
            for (const node of nodes) {
                if (random() < 0.1) {
                    setVertices(node, random);
                    node.appliedTerrainNodeId = node.nodeId + (round + 1) * 1e9;
                    node.equalizedSideWithNodeId = new Array(4).fill(node.appliedTerrainNodeId);
                }
            }
            expect(settle(qts, nodes)).toBeLessThanOrEqual(4);
            expect(collectGaps(nodes)).toEqual([]);
        }
    });
});

describe("normals on the edges of the faces", () => {
    test.each(
        ALL_FACES.flatMap((face) => [N, E, S, W].map((side) => ({ face, side, link: CUBE_FACE_LINKS[face][side] })))
    )("the face $face and its side $side are averaged point by point", ({ face, side, link }) => {
        const qts = createStrategy(EquiangularCubeQuadTreeStrategy),
            [other, otherSide] = link,
            size = 5,
            make = (root) => {
                root.createChildNodes();
                root.nodes.forEach((n) => n.createChildNodes());
            };

        qts.planet.terrain.maxZoom = 19;
        qts.planet._normalMapCreator = { queue: () => {} };

        make(qts.quadTreeList[face]);
        make(qts.quadTreeList[other]);

        // The tiles are next to the middle of the edge, so a position on the side is not the same as its mirror
        const a = tileOnSide(qts.quadTreeList[face], side, 0),
            nodes = [a, ...qts.quadTreeList[other].nodes.flatMap((n) => n.nodes)];

        linkNodes(qts, nodes);

        const b = a.neighbors[side][0];

        expect(b.segment.tileGroup).toBe(other);
        expect(a.segment.opside[side]).toBe(otherSide);

        for (const node of [a, b]) {
            const seg = node.segment;
            seg.terrainReady = seg.terrainExists = true;
            seg.normalMapNormals = new Float32Array(size * size * 3);
            seg.gridSize = size - 1;
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    const n = direction(
                        seg.tileGroup,
                        (seg.tileX + j / (size - 1)) / seg.powTileZoom,
                        1 - (seg.tileY + i / (size - 1)) / seg.powTileZoom
                    );
                    seg.normalMapNormals.set([n.x, n.y, n.z], (i * size + j) * 3);
                }
            }
        }

        const expected = (node, s) => {
            const seg = node.segment,
                out = [];
            for (let k = 0; k < size; k++) {
                const [i, j] = s === N ? [0, k] : s === S ? [size - 1, k] : s === E ? [k, size - 1] : [k, 0],
                    m = (i * size + j) * 3;
                out.push(new Vec3(...seg.normalMapNormals.slice(m, m + 3)));
            }
            return out;
        };

        const before = expected(a, side);

        a.segment._normalMapEdgeEqualize(side);

        // The normals stand for the same points, so the average of the right pairs leaves them as they are
        expected(a, side).forEach((n, k) => expect(n.distance(before[k])).toBeLessThan(1e-6));

        const onB = expected(b, otherSide);
        (SIDEFLIP[side][otherSide] ? onB.reverse() : onB).forEach((n, k) =>
            expect(n.distance(before[k])).toBeLessThan(1e-6)
        );
    });
});

function tileOnSide(root, side, position) {
    const part = SIDE_CORNER[side][position],
        next = SIDE_CORNER[side][1 - position];
    return root.nodes[part].nodes[next];
}

describe("plain vertices of the worker", () => {
    test.each(ALL_FACES)("are the ones of the main thread on the face %i", async (face) => {
        await import("../../src/utils/PlainSegmentWorker.worker.js");

        const qts = createStrategy(EquiangularCubeQuadTreeStrategy),
            planet = qts.planet;

        planet.terrain.plainGridSize = 8;
        planet._heightFactor = 1;

        const root = qts.quadTreeList[face];
        root.createChildNodes();

        const seg = root.nodes[SE].segment,
            sent = [],
            worker = Object.create(PlainSegmentWorker.prototype);

        worker._workerQueue = [{ postMessage: (message) => sent.push(message) }];
        worker._source = new Map();
        worker._sourceId = 0;

        seg.initialized = true;
        worker.make(seg);

        const postMessage = vi.spyOn(self, "postMessage").mockImplementation(() => {});

        self.onmessage({ data: sent[0] });

        const result = postMessage.mock.calls[0][0];
        postMessage.mockRestore();

        seg._createPlainVertices();

        expect(result.plainVertices.length).toBe(seg.plainVertices.length);

        for (let i = 0; i < seg.plainVertices.length; i++) {
            expect(Math.abs(result.plainVertices[i] - seg.plainVertices[i])).toBeLessThan(1e-6);
            expect(Math.abs(result.plainNormals[i] - seg.plainNormals[i])).toBeLessThan(1e-6);
        }
    });
});

describe("the tile across a point", () => {
    function createUniformScene(seed) {
        const qts = createStrategy(EquiangularCubeQuadTreeStrategy),
            random = createRandom(seed),
            nodes = [];

        const visit = (node) => {
            if (node.segment.tileZoom < 3) {
                node.createChildNodes();
                node.nodes.forEach(visit);
            } else {
                node.segment.gridSize = GRID_SIZE_BY_ZOOM[3];
                setVertices(node, random);
                nodes.push(node);
            }
        };

        qts.quadTreeList.forEach(visit);

        return { qts, nodes };
    }

    function tilesAtPoints(nodes) {
        const points = new Map();
        for (const node of nodes) {
            for (const corner of [NW, NE, SW, SE]) {
                const k = key(cornerDirection(node.segment, corner));
                points.set(k, [...(points.get(k) || []), { node, corner }]);
            }
        }
        return [...points.values()];
    }

    const onFaces = (a, b) => (tiles) =>
        tiles.some(({ node }) => node.segment.tileGroup === a) &&
        tiles.some(({ node }) => node.segment.tileGroup === b);

    const POINTS = [
        ["inside a face", (tiles) => tiles.every(({ node }) => node.segment.tileGroup === 2)],
        ["on an edge of equal sides with a flip", onFaces(0, 2)],
        ["on an edge of N and S sides", onFaces(0, 4)],
        ["on an edge of E and N sides with a flip", onFaces(0, 1)],
        ["on an edge of W and N sides", onFaces(0, 3)],
        ["on an edge of W and S sides with a flip", onFaces(5, 3)],
        ["on an edge of E and S sides", onFaces(5, 1)]
    ];

    // Which way round the point leads to the tile depends on the order of the tile ids, so all the points are taken
    test.each(POINTS)(
        "is found when a neighbor is out of the frame, %s",
        (_, isPoint) => {
            const count = tilesAtPoints(createUniformScene(1).nodes).filter((t) => t.length === 4 && isPoint(t)).length;

            expect(count).toBeGreaterThan(3);

            for (let point = 0; point < count; point++) {
                for (let gone = 0; gone < 4; gone++) {
                    const { qts, nodes } = createUniformScene(point + 1),
                        tiles = tilesAtPoints(nodes).filter((t) => t.length === 4 && isPoint(t))[point],
                        left = tiles.filter((_, i) => i !== gone);

                    settle(
                        qts,
                        nodes.filter((n) => n !== tiles[gone].node)
                    );

                    const first = cornerVertex(left[0].node.segment, left[0].corner);

                    for (const { node, corner } of left) {
                        expect(cornerVertex(node.segment, corner).distance(first)).toBeLessThan(1e-9);
                    }
                }
            }
        },
        30000
    );
});

describe("the geoid on the cube", () => {
    const HEIGHT_FACTOR = 8000;

    function createModel() {
        const width = 72,
            height = 37,
            rawfile = new Uint8Array(width * height * 2);

        for (let k = 0; k < width * height; k++) {
            const v = (k * 977) % 65535;
            rawfile[k * 2] = v >> 8;
            rawfile[k * 2 + 1] = v & 255;
        }

        return { scale: 0.003, offset: -108, width, height, rlonres: 0.2, rlatres: 0.2, i: 0, rawfile };
    }

    test.each(ALL_FACES)("lifts the vertices of the face %i by the height under their lon lat", async (face) => {
        // The model stays in the worker module, the others go without it
        vi.resetModules();
        await import("../../src/utils/PlainSegmentWorker.worker.js");

        const model = createModel(),
            geoid = new Geoid({ model }),
            qts = createStrategy(EquiangularCubeQuadTreeStrategy),
            planet = qts.planet;

        planet.terrain.plainGridSize = 8;
        planet._heightFactor = HEIGHT_FACTOR;

        self.onmessage({ data: { model, rawfile: model.rawfile } });

        // Geoid takes its first cell for the cached one, the pole is in this cell
        geoid.getHeight(100, 10);

        const root = qts.quadTreeList[face];
        root.createChildNodes();

        const seg = root.nodes[SE].segment,
            sent = [],
            worker = Object.create(PlainSegmentWorker.prototype);

        worker._workerQueue = [{ postMessage: (message) => sent.push(message) }];
        worker._source = new Map();
        worker._sourceId = 0;

        seg.initialized = true;
        worker.make(seg);

        const postMessage = vi.spyOn(self, "postMessage").mockImplementation(() => {});

        self.onmessage({ data: sent[0] });

        const { plainVertices } = postMessage.mock.calls[0][0];
        postMessage.mockRestore();

        const gs = GRID_SIZE_BY_ZOOM[1],
            e = seg._extent,
            c = seg._relativeCenter;

        let highest = -Infinity,
            lowest = Infinity;

        for (let i = 0; i <= gs; i++) {
            for (let j = 0; j <= gs; j++) {
                const p = seg.getLonLat(
                        e.southWest.lon + (e.getWidth() * j) / gs,
                        e.northEast.lat - (e.getHeight() * i) / gs
                    ),
                    h = geoid.getHeight(p.lon, p.lat) * HEIGHT_FACTOR,
                    expected = wgs84.lonLatToCartesian(new LonLat(p.lon, p.lat, h)),
                    k = (i * (gs + 1) + j) * 3,
                    v = new Vec3(plainVertices[k] + c.x, plainVertices[k + 1] + c.y, plainVertices[k + 2] + c.z);

                expect(v.distance(expected)).toBeLessThan(1e-3);

                highest = Math.max(highest, h);
                lowest = Math.min(lowest, h);
            }
        }

        // The test means nothing on a flat surface
        expect(highest - lowest).toBeGreaterThan(100000);
    });
});

describe("the side of a neighbor", () => {
    function createUniformTree(qts, zoom) {
        const nodes = [],
            visit = (node) => {
                if (node.segment.tileZoom < zoom) {
                    node.createChildNodes();
                    node.nodes.forEach(visit);
                } else {
                    nodes.push(node);
                }
            };

        qts.quadTreeList.forEach(visit);

        return nodes;
    }

    test("a corner is at its position on its side", () => {
        for (let side = N; side <= W; side++) {
            for (const corner of SIDE_CORNER[side]) {
                expect(SIDE_CORNER[side][NOPSORD[side][corner]]).toBe(corner);
            }
        }
    });

    test("a corner has two sides, each of them leads to the other", () => {
        for (let side = N; side <= W; side++) {
            for (const corner of [NW, NE, SW, SE]) {
                const other = CORNERSIDE[side][corner];

                if (SIDE_CORNER[side].includes(corner)) {
                    expect(other).not.toBe(side);
                    expect(other).not.toBe(OPSIDE[side]);
                    expect(SIDE_CORNER[other]).toContain(corner);
                    expect(CORNERSIDE[other][corner]).toBe(side);
                } else {
                    expect(other).toBe(-1);
                }
            }
        }
    });

    test("the flip follows the direction of the positions round a tile", () => {
        // Going round a tile counterclockwise, seen from the outside
        const along = [false, false, true, true];

        for (let a = N; a <= W; a++) {
            for (let b = N; b <= W; b++) {
                expect(SIDEFLIP[a][b]).toBe(along[a] === along[b]);
            }
        }
    });

    test("the positions run the same way on the opposite sides", () => {
        expect(SIDEFLIP[N][S]).toBe(false);
        expect(SIDEFLIP[S][N]).toBe(false);
        expect(SIDEFLIP[E][W]).toBe(false);
        expect(SIDEFLIP[W][E]).toBe(false);
    });

    test("the flip is the same seen from both sides", () => {
        for (let a = N; a <= W; a++) {
            for (let b = N; b <= W; b++) {
                expect(SIDEFLIP[a][b]).toBe(SIDEFLIP[b][a]);
            }
        }
    });

    test("the part behind a root side lies on the neighbor side, next to the same point", () => {
        CUBE_FACE_LINKS.forEach((links, face) => {
            links.forEach(([other, otherSide], side) => {
                for (const part of SIDE_CORNER[side]) {
                    const behind = ROOTPART[side][otherSide][part];

                    expect(SIDE_CORNER[otherSide]).toContain(behind);

                    // The parts share the corner of the root at the end of the side
                    const p = direction(face, part & 1, 1 - (part >> 1)),
                        q = direction(other, behind & 1, 1 - (behind >> 1));

                    expect(p.distance(q)).toBeLessThan(1e-14);
                }
            });
        });
    });

    test("the part behind a root side is the mirror one when the side is the opposite", () => {
        expect(ROOTPART[N][S][NW]).toBe(SW);
        expect(ROOTPART[N][S][NE]).toBe(SE);
        expect(ROOTPART[S][N][SE]).toBe(NE);
        expect(ROOTPART[E][W][NE]).toBe(NW);
        expect(ROOTPART[E][W][SE]).toBe(SW);
        expect(ROOTPART[W][E][SW]).toBe(SE);
    });

    test("only the sides on the edge of a face have another side", () => {
        const qts = createStrategy(EquiangularCubeQuadTreeStrategy),
            nodes = createUniformTree(qts, 2);

        const seg = nodes.find(
            (n) => n.segment.tileGroup === 0 && n.segment.tileX === 0 && n.segment.tileY === 1
        ).segment;

        expect(seg.opside[W]).toBe(N);
        expect(seg.opside[E]).toBe(W);
        expect(seg.opside[N]).toBe(S);
        expect(seg.opside[S]).toBe(N);
    });

    test("a tile in a corner of a face has two other sides", () => {
        const qts = createStrategy(EquiangularCubeQuadTreeStrategy),
            nodes = createUniformTree(qts, 3);

        const seg = nodes.find(
            (n) => n.segment.tileGroup === 5 && n.segment.tileX === 7 && n.segment.tileY === 7
        ).segment;

        expect(seg.opside[E]).toBe(S);
        expect(seg.opside[S]).toBe(S);
        expect(seg.opside[W]).toBe(E);
        expect(seg.opside[N]).toBe(S);
    });

    test.each([1, 2, 3, 4])("every side of the zoom %i meets the neighbor in the same points", (zoom) => {
        const qts = createStrategy(EquiangularCubeQuadTreeStrategy),
            nodes = createUniformTree(qts, zoom);

        nodes.forEach((n) => (n.segment.gridSize = GRID_SIZE_BY_ZOOM[zoom]));

        linkNodes(qts, nodes);

        for (const node of nodes) {
            const seg = node.segment;

            for (let side = N; side <= W; side++) {
                expect(node.neighbors[side].length).toBe(1);

                const neighbor = node.neighbors[side][0],
                    opcs = seg.opside[side],
                    flip = SIDEFLIP[side][opcs];

                expect(neighbor.segment.opside[opcs]).toBe(side);
                expect(neighbor.neighbors[opcs]).toContain(node);

                for (const k of [0, 0.25, 1]) {
                    const a = sideDirection(seg, side, k),
                        b = sideDirection(neighbor.segment, opcs, flip ? 1 - k : k);
                    expect(a.distance(b)).toBeLessThan(1e-12);
                }
            }
        }
    });

    test.each(STRATEGIES)("is always the opposite one in $name", ({ Strategy }) => {
        const qts = createStrategy(Strategy);

        for (const node of createUniformTree(qts, 2)) {
            for (let side = N; side <= W; side++) {
                const opcs = node.segment.opside[side];
                expect(opcs).toBe(OPSIDE[side]);
                expect(SIDEFLIP[side][opcs]).toBe(false);
            }
            expect(node.segment.opside).toBe(OPSIDE);
        }
    });

    test("tiles share the tables of the sides, a tile doesn't make its own", () => {
        const qts = createStrategy(EquiangularCubeQuadTreeStrategy),
            tables = new Set(createUniformTree(qts, 3).map((n) => n.segment.opside));

        // On each face: the middle, 4 sides and 4 corners
        expect(tables.size).toBeLessThanOrEqual(6 * 9);
    });
});

// Around the point: T and H on one face, V behind the edge from T and D next to it on the other face. H is out of the
// frame, V is deeper than T and T is deeper than D, so V takes the corner of D and T can get it only round the point.
describe("the owner of a point on the edge of a cube", () => {
    function createScene(seed) {
        const qts = createStrategy(EquiangularCubeQuadTreeStrategy),
            random = createRandom(seed),
            nodes = [];

        const visit = (node) => {
            if (node.segment.tileZoom < 2) {
                node.createChildNodes();
                node.nodes.forEach(visit);
            } else {
                node.segment.gridSize = GRID_SIZE_BY_ZOOM[2];
                setVertices(node, random);
                nodes.push(node);
            }
        };

        qts.quadTreeList.forEach(visit);

        return { qts, nodes, random };
    }

    function findCorner(seg, point) {
        return [NW, NE, SW, SE].find((corner) => key(cornerDirection(seg, corner)) === point);
    }

    function getPoints(nodes, face, otherFace) {
        const points = new Map();

        for (const node of nodes) {
            for (const corner of [NW, NE, SW, SE]) {
                const k = key(cornerDirection(node.segment, corner));
                points.set(k, [...(points.get(k) || []), node]);
            }
        }

        return [...points.entries()].filter(
            ([, tiles]) =>
                tiles.length === 4 &&
                tiles.filter((n) => n.segment.tileGroup === face).length === 2 &&
                tiles.filter((n) => n.segment.tileGroup === otherFace).length === 2
        );
    }

    // Replaces the tile with its children, down to the zoom towards the point, returns the last one at the point
    function refine(nodes, node, point, zoom, random) {
        nodes.splice(nodes.indexOf(node), 1);

        if (!node.ready) {
            node.createChildNodes();
        }

        for (const child of node.nodes) {
            child.segment.gridSize = GRID_SIZE_BY_ZOOM[child.segment.tileZoom];
            setVertices(child, random);
            nodes.push(child);
        }

        const next = node.nodes.find((child) => findCorner(child.segment, point) !== undefined);

        return next.segment.tileZoom < zoom ? refine(nodes, next, point, zoom, random) : next;
    }

    const EDGES = ALL_FACES.flatMap((face) =>
        [N, E, S, W].map((side) => ({ face, side, other: CUBE_FACE_LINKS[face][side][0] }))
    );

    test.each(EDGES)("reaches the tiles behind the side $side of the face $face", ({ face, other }) => {
        const count = getPoints(createScene(1).nodes, face, other).length;

        expect(count).toBe(3);

        for (let point = 0; point < count; point++) {
            for (let first = 0; first < 2; first++) {
                const { qts, nodes, random } = createScene(point * 2 + first + 1);

                linkNodes(qts, nodes);

                const [k, tiles] = getPoints(nodes, face, other)[point],
                    own = tiles.filter((n) => n.segment.tileGroup === face),
                    behind = tiles.filter((n) => n.segment.tileGroup === other),
                    t = own[first],
                    h = own[1 - first],
                    isNext = (n) => t.neighbors.some((list) => list.includes(n)),
                    v = behind.find(isNext),
                    d = behind.find((n) => !isNext(n));

                nodes.splice(nodes.indexOf(h), 1);

                const deepT = refine(nodes, t, k, 3, random),
                    deepV = refine(nodes, v, k, 4, random);

                settle(
                    qts,
                    nodes.sort((a, b) => a.segment.tileZoom - b.segment.tileZoom)
                );

                const expected = cornerVertex(d.segment, findCorner(d.segment, k));

                for (const node of [deepT, deepV]) {
                    const vertex = cornerVertex(node.segment, findCorner(node.segment, k));
                    expect(vertex.distance(expected)).toBeLessThan(1e-9);
                }
            }
        }
    });
});

describe("the cube on an ellipsoid flattened twice", () => {
    const A = 6378137,
        B = A / 2,
        ellipsoid = new Ellipsoid(A, B);

    function createSegment(face) {
        const qts = createStrategy(EquiangularCubeQuadTreeStrategy);

        qts.planet.ellipsoid = ellipsoid;
        qts.planet.terrain.plainGridSize = 8;
        qts.planet._heightFactor = 1;

        const root = qts.quadTreeList[face];
        root.createChildNodes();

        return root.nodes[NE].segment;
    }

    test.each(ALL_FACES)("the worker puts the vertices of the face %i on it, along their normals", async (face) => {
        vi.resetModules();
        await import("../../src/utils/PlainSegmentWorker.worker.js");

        const seg = createSegment(face),
            sent = [],
            worker = Object.create(PlainSegmentWorker.prototype);

        worker._workerQueue = [{ postMessage: (message) => sent.push(message) }];
        worker._source = new Map();
        worker._sourceId = 0;

        seg.initialized = true;
        worker.make(seg);

        const postMessage = vi.spyOn(self, "postMessage").mockImplementation(() => {});

        self.onmessage({ data: sent[0] });

        const { plainVertices, plainNormals } = postMessage.mock.calls[0][0];
        postMessage.mockRestore();

        seg._createPlainVertices();

        const gs = GRID_SIZE_BY_ZOOM[1],
            e = seg._extent,
            c = seg._relativeCenter;

        let worst = 0,
            worstNormal = 0,
            worstMain = 0;

        for (let i = 0; i <= gs; i++) {
            for (let j = 0; j <= gs; j++) {
                const k = (i * (gs + 1) + j) * 3,
                    x = plainVertices[k] + c.x,
                    y = plainVertices[k + 1] + c.y,
                    z = plainVertices[k + 2] + c.z,
                    n = toDirection(
                        seg.getLonLat(
                            e.southWest.lon + (e.getWidth() * j) / gs,
                            e.northEast.lat - (e.getHeight() * i) / gs
                        )
                    );

                worst = Math.max(worst, Math.abs((x * x + y * y) / (A * A) + (z * z) / (B * B) - 1));
                worstNormal = Math.max(
                    worstNormal,
                    n.distance(new Vec3(plainNormals[k], plainNormals[k + 1], plainNormals[k + 2]))
                );
                worstMain = Math.max(worstMain, Math.abs(plainVertices[k] - seg.plainVertices[k]));
            }
        }

        expect(worst).toBeLessThan(1e-12);
        expect(worstNormal).toBeLessThan(1e-6);
        expect(worstMain).toBeLessThan(1e-6);
    });

    test.each(ALL_FACES)("the bounds of a tile of the face %i hold its points", (face) => {
        const seg = createSegment(face),
            box = seg.bbox.vertices,
            min = new Vec3(
                Math.min(...box.map((v) => v.x)),
                Math.min(...box.map((v) => v.y)),
                Math.min(...box.map((v) => v.z))
            ),
            max = new Vec3(
                Math.max(...box.map((v) => v.x)),
                Math.max(...box.map((v) => v.y)),
                Math.max(...box.map((v) => v.z))
            ),
            e = seg._extent;

        let outside = 0;

        for (let i = 0; i <= 16; i++) {
            for (let j = 0; j <= 16; j++) {
                const v = ellipsoid.lonLatToCartesian(
                    seg.getLonLat(e.southWest.lon + (e.getWidth() * j) / 16, e.southWest.lat + (e.getHeight() * i) / 16)
                );

                outside +=
                    v.x >= min.x - 1 &&
                    v.y >= min.y - 1 &&
                    v.z >= min.z - 1 &&
                    v.x <= max.x + 1 &&
                    v.y <= max.y + 1 &&
                    v.z <= max.z + 1
                        ? 0
                        : 1;
            }
        }

        expect(outside).toBe(0);
    });
});

describe("the gnomonic cube", () => {
    const RADIANS_TO_DEGREES = 180 / Math.PI;

    function createUniformNodes(zoom) {
        const qts = createStrategy(CubeQuadTreeStrategy),
            nodes = [],
            visit = (node) => {
                if (node.segment.tileZoom < zoom) {
                    node.createChildNodes();
                    node.nodes.forEach(visit);
                } else {
                    node.segment.gridSize = GRID_SIZE_BY_ZOOM[zoom];
                    nodes.push(node);
                }
            };

        qts.quadTreeList.forEach(visit);

        return { qts, nodes };
    }

    test("equal steps are equal distances on the plane of a face", () => {
        expect(cube.toLonLat(1.75, 0.5).lon).toBeCloseTo(Math.atan(0.5) * RADIANS_TO_DEGREES, 10);
        expect(cubeEquiangular.toLonLat(1.75, 0.5).lon).toBeCloseTo(22.5, 10);
    });

    test("both cubes have the same corners and the same centers of the faces", () => {
        for (const face of ALL_FACES) {
            for (const [s, t] of [
                [0, 0],
                [1, 0],
                [0, 1],
                [1, 1],
                [0.5, 0.5]
            ]) {
                const a = cubeEquiangular.toLonLat(face + s, t, face),
                    b = cube.toLonLat(face + s, t, face);
                expect(toDirection(a).distance(toDirection(b))).toBeLessThan(1e-12);
            }
        }
    });

    test("a point comes back from the cube", () => {
        const random = createRandom(23);

        for (let i = 0; i < 2000; i++) {
            const p = new LonLat(random() * 360 - 180, Math.asin(random() * 2 - 1) / RADIANS),
                n = cube.fromLonLat(p);
            expect(toDirection(cube.toLonLat(n.lon, n.lat)).distance(toDirection(p))).toBeLessThan(1e-12);
        }
    });

    test("the segments use the projection of the strategy", () => {
        const { nodes } = createUniformNodes(1);

        expect(nodes[0].segment._projection).toBe(cube);
        expect(createStrategy(EquiangularCubeQuadTreeStrategy).quadTreeList[0].segment._projection).toBe(
            cubeEquiangular
        );
    });

    test("every side of a tile meets its neighbor in the same points", () => {
        const { qts, nodes } = createUniformNodes(3);

        linkNodes(qts, nodes);

        const point = (seg, side, k) => {
            const [a, b] = SIDE_CORNER[side].map((c) => cornerPosition(seg, c));
            return toDirection(seg.getLonLat(seg.tileGroup + a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k));
        };

        for (const node of nodes) {
            for (let side = N; side <= W; side++) {
                const n = node.neighbors[side][0],
                    opcs = node.segment.opside[side],
                    flip = SIDEFLIP[side][opcs];

                for (const k of [0, 0.25, 1]) {
                    expect(
                        point(node.segment, side, k).distance(point(n.segment, opcs, flip ? 1 - k : k))
                    ).toBeLessThan(1e-12);
                }
            }
        }
    });

    test("the node of a point and the tile of the strategy agree", () => {
        const { qts } = createUniformNodes(4),
            random = createRandom(29);

        for (let i = 0; i < 300; i++) {
            const p = new LonLat(random() * 360 - 180, Math.asin(random() * 2 - 1) / RADIANS),
                seg = qts.getNodeByLonLat(p).segment,
                [x, y, , face] = qts.getTileXY(p, seg.tileZoom);

            expect(seg.tileZoom).toBe(4);
            expect([x, y, face]).toEqual([seg.tileX, seg.tileY, seg.tileGroup]);
        }
    });

    test.each(ALL_FACES)("the worker makes the vertices of the main thread on the face %i", async (face) => {
        vi.resetModules();
        await import("../../src/utils/PlainSegmentWorker.worker.js");

        const qts = createStrategy(CubeQuadTreeStrategy);

        qts.planet.terrain.plainGridSize = 8;
        qts.planet._heightFactor = 1;

        const root = qts.quadTreeList[face];
        root.createChildNodes();

        const seg = root.nodes[NE].segment,
            sent = [],
            worker = Object.create(PlainSegmentWorker.prototype);

        worker._workerQueue = [{ postMessage: (message) => sent.push(message) }];
        worker._source = new Map();
        worker._sourceId = 0;

        seg.initialized = true;
        worker.make(seg);

        const postMessage = vi.spyOn(self, "postMessage").mockImplementation(() => {});

        self.onmessage({ data: sent[0] });

        const { plainVertices } = postMessage.mock.calls[0][0];
        postMessage.mockRestore();

        seg._createPlainVertices();

        let worst = 0;
        for (let i = 0; i < plainVertices.length; i++) {
            worst = Math.max(worst, Math.abs(plainVertices[i] - seg.plainVertices[i]));
        }

        expect(worst).toBeLessThan(1e-6);
    });
});
