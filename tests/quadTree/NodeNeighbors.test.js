import { EPSG4326QuadTreeStrategy } from "../../src/quadTree/EPSG4326/EPSG4326QuadTreeStrategy";
import { EarthQuadTreeStrategy } from "../../src/quadTree/earth/EarthQuadTreeStrategy";
import { EquiQuadTreeStrategy } from "../../src/quadTree/equi/EquiQuadTreeStrategy";
import { E, N, NE, NOTRENDERING, NW, RENDERING, S, SE, SW, W, WALKTHROUGH } from "../../src/quadTree/quadTree";
import { TILEGROUP_COMMON, TILEGROUP_NORTH, TILEGROUP_SOUTH } from "../../src/segment/Segment";
import { GRID_SIZE_BY_ZOOM, STRATEGIES, createCut, createStrategy, tileRect } from "./quadTreeScene";

/**
 * Side of a that b touches, -1 if there is none. It knows nothing about the tree: only the tile rectangles
 * of the world grid, which is cyclic along the columns.
 */
function geometricSide(a, b, world) {
    const ra = tileRect(a.segment, world),
        rb = tileRect(b.segment, world),
        P = world.period;

    const rowsOverlap = ra.y0 < rb.y1 && rb.y0 < ra.y1;
    if (rowsOverlap && (ra.x1 - rb.x0) % P === 0) return E;
    if (rowsOverlap && (rb.x1 - ra.x0) % P === 0) return W;

    let columnsOverlap = false;
    for (let k = -1; k <= 1; k++) {
        columnsOverlap = columnsOverlap || (ra.x0 < rb.x1 + k * P && rb.x0 + k * P < ra.x1);
    }

    if (columnsOverlap && ra.y0 === rb.y1) return N;
    if (columnsOverlap && ra.y1 === rb.y0) return S;
    return -1;
}

// Node.getCommonSide and Segment.getNeighborSide as they were before the tree walk.
function legacyNeighborSide(a, b) {
    if (a.tileY === b.tileY) {
        if (a.tileX === b.tileXE) {
            return W;
        } else if (a.tileX === b.tileXW) {
            return E;
        }
    } else if (a.tileX === b.tileX) {
        if (a.tileY === b.tileYS) {
            return N;
        } else if (a.tileY === b.tileYN) {
            return S;
        }
    }
    return -1;
}

function legacyCommonSide(nodeA, nodeB) {
    const as = nodeA.segment;
    const bs = nodeB.segment;

    if (as.tileZoom === bs.tileZoom && as.tileGroup === bs.tileGroup) {
        return legacyNeighborSide(as, bs);
    } else {
        const a = as._extentLonLat;
        const b = bs._extentLonLat;

        let a_ne = a.northEast,
            a_sw = a.southWest,
            b_ne = b.northEast,
            b_sw = b.southWest;

        let a_ne_lon = a_ne.lon,
            a_ne_lat = a_ne.lat,
            a_sw_lon = a_sw.lon,
            a_sw_lat = a_sw.lat,
            b_ne_lon = b_ne.lon,
            b_ne_lat = b_ne.lat,
            b_sw_lon = b_sw.lon,
            b_sw_lat = b_sw.lat;

        if (as.tileGroup === bs.tileGroup) {
            if (
                a_ne_lon === b_sw_lon &&
                ((a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat) || (a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat))
            ) {
                return E;
            } else if (
                a_sw_lon === b_ne_lon &&
                ((a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat) || (a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat))
            ) {
                return W;
            } else if (
                a_ne_lat === b_sw_lat &&
                ((a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon) || (a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon))
            ) {
                return N;
            } else if (
                a_sw_lat === b_ne_lat &&
                ((a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon) || (a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon))
            ) {
                return S;
            } else if (
                bs.tileX === 0 &&
                b_sw_lon === -a_ne_lon &&
                ((a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat) || (a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat))
            ) {
                return E;
            } else if (
                as.tileX === 0 &&
                a_sw_lon === -b_ne_lon &&
                ((a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat) || (a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat))
            ) {
                return W;
            }
        }

        if (
            as.tileGroup === TILEGROUP_COMMON &&
            bs.tileGroup === TILEGROUP_NORTH &&
            as.tileY === 0 &&
            bs.tileY === bs.powTileZoom - 1 &&
            ((a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon) || (a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon))
        ) {
            return N;
        } else if (
            as.tileGroup === TILEGROUP_COMMON &&
            bs.tileGroup === TILEGROUP_SOUTH &&
            as.tileY === as.powTileZoom - 1 &&
            bs.tileY === 0 &&
            ((a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon) || (a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon))
        ) {
            return S;
        } else if (
            as.tileGroup === TILEGROUP_SOUTH &&
            bs.tileGroup === TILEGROUP_COMMON &&
            as.tileY === 0 &&
            bs.tileY === bs.powTileZoom - 1 &&
            ((a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon) || (a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon))
        ) {
            return N;
        } else if (
            as.tileGroup === TILEGROUP_NORTH &&
            bs.tileGroup === TILEGROUP_COMMON &&
            as.tileY === as.powTileZoom - 1 &&
            bs.tileY === 0 &&
            ((a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon) || (a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon))
        ) {
            return S;
        }
    }

    return -1;
}

function linkLegacy(nodes) {
    const linked = [];
    for (const node of nodes) {
        node.clearNeighbors();
        for (let i = linked.length - 1; i >= 0; --i) {
            const side = legacyCommonSide(node, linked[i]);
            if (side !== -1) {
                node.applyNeighbor(linked[i], side);
            }
        }
        linked.push(node);
    }
}

function linkTree(qts, nodes) {
    const opaqueNodes = [];
    qts._neighborFrame++;
    for (const node of nodes) {
        qts._addOpaqueNode(opaqueNodes, node);
    }
    qts._linkOpaqueNodes(opaqueNodes);
}

function resetSides(nodes) {
    for (const node of nodes) {
        node.clearNeighbors();
        node.sideSizeLog2 = new Array(4).fill(Math.log2(node.segment.gridSize));
    }
}

function collectPairs(nodes) {
    const pairs = new Set();
    for (const node of nodes) {
        node.neighbors.forEach((list, side) => {
            for (const n of list) {
                pairs.add(`${node.__id}:${side}:${n.__id}`);
            }
        });
    }
    return pairs;
}

function geometricPairs(nodes, world) {
    const pairs = new Set();
    for (const a of nodes) {
        for (const b of nodes) {
            const side = a === b ? -1 : geometricSide(a, b, world);
            if (side !== -1) {
                pairs.add(`${a.__id}:${side}:${b.__id}`);
            }
        }
    }
    return pairs;
}

const difference = (a, b) => [...a].filter((v) => !b.has(v));

const getSides = (nodes) => nodes.map((n) => [...n.sideSizeLog2]);

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

describe.each(STRATEGIES)("neighbours of $name", (world) => {
    test.each(SEEDS)("the tree walk finds every tile neighbour and nothing else, seed %i", (seed) => {
        const qts = createStrategy(world.Strategy),
            nodes = createCut(qts, world, seed);

        resetSides(nodes);
        linkTree(qts, nodes);

        const found = collectPairs(nodes),
            expected = geometricPairs(nodes, world);

        expect(difference(expected, found)).toEqual([]);
        expect(difference(found, expected)).toEqual([]);
    });

    test.each(SEEDS)("the tree walk is not worse than the scan of the list, seed %i", (seed) => {
        const qts = createStrategy(world.Strategy),
            nodes = createCut(qts, world, seed);

        resetSides(nodes);
        linkLegacy(nodes);
        const legacy = collectPairs(nodes),
            legacySides = getSides(nodes);

        resetSides(nodes);
        linkTree(qts, nodes);
        const tree = collectPairs(nodes);

        // Everything the old scan found is found, what it has missed is checked against the tiles above
        expect(difference(legacy, tree)).toEqual([]);

        const added = new Set(difference(tree, legacy).map((pair) => Number(pair.split(":")[0])));
        const sides = getSides(nodes);
        nodes.forEach((node, i) => {
            if (!added.has(node.__id)) {
                expect(sides[i]).toEqual(legacySides[i]);
            }
        });
    });

    test("links each pair once", () => {
        const qts = createStrategy(world.Strategy),
            nodes = createCut(qts, world, 11);

        resetSides(nodes);
        linkTree(qts, nodes);

        for (const node of nodes) {
            for (const list of node.neighbors) {
                expect(new Set(list).size).toBe(list.length);
            }
        }
    });
});

describe("neighbours on the tree seams", () => {
    function tile(root, ...parts) {
        let node = root;
        for (const part of parts) {
            if (!node.ready) {
                node.createChildNodes();
            }
            node = node.nodes[part];
        }
        return node;
    }

    function link(qts, nodes) {
        resetSides(nodes);
        linkTree(qts, nodes);
    }

    test("the antimeridian closes the Mercator tree, also between different zooms", () => {
        const qts = createStrategy(EarthQuadTreeStrategy),
            [merc] = qts.quadTreeList,
            west = tile(merc, NW, NW),
            east = tile(merc, NE, NE, NE);

        link(qts, [west, east]);

        expect(east.neighbors[E]).toEqual([west]);
        expect(west.neighbors[W]).toEqual([east]);
    });

    test("the Mercator tree meets the pole trees", () => {
        const qts = createStrategy(EarthQuadTreeStrategy),
            [merc, north, south] = qts.quadTreeList,
            top = tile(merc, NW, NE),
            cap = tile(north, SW, SE),
            bottom = tile(merc, SE, SW),
            southCap = tile(south, NE, NW);

        link(qts, [top, cap, bottom, southCap]);

        expect(top.neighbors[N]).toEqual([cap]);
        expect(cap.neighbors[S]).toEqual([top]);
        expect(bottom.neighbors[S]).toEqual([southCap]);
        expect(southCap.neighbors[N]).toEqual([bottom]);
    });

    test("the pole has no neighbour above it", () => {
        const qts = createStrategy(EarthQuadTreeStrategy),
            north = qts.quadTreeList[1],
            nodes = [tile(north, NW, NW), tile(north, NE, NE)];

        link(qts, nodes);

        expect(nodes[0].neighbors[N]).toEqual([]);
        expect(nodes[1].neighbors[N]).toEqual([]);
    });

    test.each([EquiQuadTreeStrategy, EPSG4326QuadTreeStrategy])("two halves of the world close it", (Strategy) => {
        const qts = createStrategy(Strategy),
            [west, east] = qts.quadTreeList,
            a = tile(west, NE, NE),
            b = tile(east, NW, NW),
            c = tile(west, NW, NW),
            d = tile(east, NE, NE);

        link(qts, [a, b, c, d]);

        expect(a.neighbors[E]).toEqual([b]);
        expect(b.neighbors[W]).toEqual([a]);
        expect(d.neighbors[E]).toEqual([c]);
        expect(c.neighbors[W]).toEqual([d]);
    });

    test("nodes missing from the frame are not neighbours", () => {
        const qts = createStrategy(EarthQuadTreeStrategy),
            [merc] = qts.quadTreeList,
            a = tile(merc, NW, SE),
            b = tile(merc, NE, SW);

        link(qts, [a, b]);
        expect(a.neighbors[E]).toEqual([b]);

        link(qts, [a]);
        expect(a.neighbors[E]).toEqual([]);
    });

    test("disableNeighbors leaves the lists empty", () => {
        const qts = createStrategy(EarthQuadTreeStrategy),
            [merc] = qts.quadTreeList,
            a = tile(merc, NW, SE),
            b = tile(merc, NE, SW);

        qts.disableNeighbors = true;
        link(qts, [a, b]);

        expect(a.neighbors[E]).toEqual([]);
    });
});

describe("neighbours while fading", () => {
    function setup() {
        const qts = createStrategy(EarthQuadTreeStrategy),
            [merc] = qts.quadTreeList;

        // Two tiles of zoom 3 side by side, each of them split to zoom 4
        const descend = (node, ...parts) => {
            for (const part of parts) {
                if (!node.ready) {
                    node.createChildNodes();
                }
                node = node.nodes[part];
            }
            return node;
        };

        const left = descend(merc, NW, SE, SE),
            right = descend(merc, NE, SW, SW);

        left.createChildNodes();
        right.createChildNodes();

        for (const node of [left, right, ...left.nodes, ...right.nodes]) {
            node.segment.initialized = true;
            node.segment.gridSize = GRID_SIZE_BY_ZOOM[node.segment.tileZoom];
            node.sideSizeLog2 = new Array(4).fill(Math.log2(node.segment.gridSize));
        }

        // Runs the node collection of the frame around the given result of the tree traversal
        const frame = (rendered, transition = true) => {
            qts._skipPreRender = true;
            qts.transitionOpacityEnabled = transition;
            qts._updateHorizonDist = () => {};
            qts._collectRenderNodes = () => {
                for (const node of rendered) {
                    node.clearNeighbors();
                    node.addToRender(0);
                }
            };
            qts._collectViewCamerasRenderNodes = () => {};
            qts.collectRenderNodes({ slope: 0, _lonLat: { height: 0 }, frustums: [] });
        };

        return { qts, left, right, frame };
    }

    const setStates = (nodes, state, prevState) => {
        for (const node of nodes) {
            node.state = state;
            node.prevState = prevState;
        }
    };

    test("the parent fading out stays the neighbour until the children are opaque", () => {
        const { left, right, frame } = setup();

        // Zoom in on the right tile: its children light up, it is still drawn under them
        setStates([left], RENDERING, RENDERING);
        setStates([right], WALKTHROUGH, RENDERING);
        setStates(right.nodes, RENDERING, NOTRENDERING);

        frame([left, ...right.nodes]);

        expect(right.segment._transitionOpacity).toBeGreaterThan(1);
        expect(left.neighbors[E]).toEqual([right]);
        expect(right.neighbors[W]).toEqual([left]);
        for (const child of right.nodes) {
            expect(child.neighbors.flat()).toEqual([]);
        }
    });

    test("the children fading out are the neighbours until the parent is opaque", () => {
        const { left, right, frame } = setup();

        // Zoom out of the right tile: it lights up, its children are still drawn under it
        setStates([left], RENDERING, RENDERING);
        setStates([right], RENDERING, WALKTHROUGH);
        setStates(right.nodes, RENDERING, RENDERING);

        frame([left, right]);

        expect(right.segment._transitionOpacity).toBeLessThan(1);
        expect(new Set(left.neighbors[E])).toEqual(new Set([right.nodes[NW], right.nodes[SW]]));
        expect(right.neighbors.flat()).toEqual([]);
    });

    test("a parent fading under its four children is linked once", () => {
        const { left, right, frame } = setup();

        setStates([left], RENDERING, RENDERING);
        setStates([right], WALKTHROUGH, RENDERING);
        setStates(right.nodes, RENDERING, NOTRENDERING);

        frame([left, ...right.nodes]);

        expect(left.neighbors[E].length).toBe(1);
        expect(right.neighbors[W].length).toBe(1);
    });

    test("a parent and a child opaque in the same frame are both neighbours, as in the scan of the list", () => {
        const { left, right } = setup(),
            qts = left.quadTreeStrategy,
            child = right.nodes[NW],
            nodes = [right, child, ...left.nodes];

        resetSides(nodes);
        linkLegacy(nodes);
        const legacy = collectPairs(nodes);

        resetSides(nodes);
        linkTree(qts, nodes);

        expect(collectPairs(nodes)).toEqual(legacy);
        expect(new Set(left.nodes[NE].neighbors[E])).toEqual(new Set([right, child]));
    });

    test("without the transition the final list is linked, after the equal zoom pass", () => {
        const { left, right, frame } = setup();

        setStates([left, right], RENDERING, RENDERING);

        frame([left, right], false);

        expect(left.neighbors[E]).toEqual([right]);
        expect(right.neighbors[W]).toEqual([left]);
    });
});

describe("neighbours search speed", () => {
    function median(values) {
        return [...values].sort((a, b) => a - b)[values.length >> 1];
    }

    function measure(fn, nodes) {
        const times = [];
        for (let i = 0; i < 9; i++) {
            resetSides(nodes);
            const start = performance.now();
            fn();
            times.push(performance.now() - start);
        }
        return median(times);
    }

    test.each([
        [1.5, 300],
        [3, 800]
    ])("the tree walk is faster than the scan of the list, detail %i", (detail, minNodes) => {
        const world = STRATEGIES[0],
            qts = createStrategy(world.Strategy),
            nodes = createCut(qts, world, 3, { detail, maxZoom: 18, holes: 0 });

        expect(nodes.length).toBeGreaterThan(minNodes);

        const legacy = measure(() => linkLegacy(nodes), nodes),
            tree = measure(() => linkTree(qts, nodes), nodes);

        expect(tree).toBeLessThan(legacy);
    });
});
