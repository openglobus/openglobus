import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Sphere } from "../../src/bv/Sphere";
import { wgs84 } from "../../src/ellipsoid/wgs84";
import { Entity } from "../../src/entity/Entity";
import { EntityCollectionNode } from "../../src/quadTree/EntityCollectionNode";
import { CubeQuadTreeStrategy, EquiangularCubeQuadTreeStrategy } from "../../src/quadTree/cube/CubeQuadTreeStrategy";
import { CubeEntityCollectionsTreeStrategy } from "../../src/quadTree/cube/CubeEntityCollectionsTreeStrategy";
import { createRandom, createStrategy } from "./quadTreeScene";

// A leaf keeps its entities in a list instead of an entity collection on the planet
function fakeCollection() {
    return {
        entities: [],
        getEntities() {
            return this.entities.slice();
        },
        _removeEntitySilent(entity) {
            this.entities.splice(this.entities.indexOf(entity), 1);
        },
        addEntities(entities) {
            this.entities.push(...entities);
        },
        remove() {},
        isEmpty() {
            return this.entities.length === 0;
        }
    };
}

function createTree(Strategy, nodeCapacity) {
    const qts = createStrategy(Strategy);
    const layer = {
        _planet: { ellipsoid: wgs84, quadTreeStrategy: qts },
        _nodeCapacity: nodeCapacity,
        async: false,
        clampToGround: false,
        relativeToGround: false,
        getVisibility: () => true
    };
    return { qts, tree: qts.createEntityCollectionsTreeStrategy(layer, nodeCapacity) };
}

function randomEntities(count, seed) {
    const random = createRandom(seed);
    return Array.from(
        { length: count },
        () => new Entity({ lonlat: [random() * 360 - 180, (Math.asin(random() * 2 - 1) * 180) / Math.PI] })
    );
}

// The planet node at the place of the entity tree node: the same parts down from the same face
function planetNodeOf(qts, node) {
    const parts = [];
    let root = node;
    while (root.parentNode) {
        parts.unshift(root.partId);
        root = root.parentNode;
    }
    let planetNode = qts.quadTreeList[Math.floor(root.extent.southWest.lon)];
    for (const part of parts) {
        if (!planetNode.nodes.length) {
            planetNode.createChildNodes();
        }
        planetNode = planetNode.nodes[part];
    }
    return planetNode;
}

function leaves(tree) {
    const res = [];
    tree._traverse((node) => res.push(node));
    return res;
}

beforeEach(() => {
    vi.spyOn(EntityCollectionNode.prototype, "_addEntitiesToCollection").mockImplementation(function (entities) {
        this.entityCollection = this.entityCollection || fakeCollection();
        for (const entity of entities) {
            entity._nodePtr = this;
        }
        this.entityCollection.addEntities(entities);
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe.each([
    ["gnomonic", CubeQuadTreeStrategy],
    ["equiangular", EquiangularCubeQuadTreeStrategy]
])("entity collections tree of the %s cube", (_, Strategy) => {
    test("the cube strategy makes the cube tree", () => {
        expect(createTree(Strategy, 4).tree).toBeInstanceOf(CubeEntityCollectionsTreeStrategy);
    });

    test("an entity is in the node of the planet tile around it", () => {
        const { qts, tree } = createTree(Strategy, 4);
        const entities = randomEntities(1000, 7);

        tree.insertEntities(entities);

        for (const entity of entities) {
            const node = entity._nodePtr,
                planetNode = planetNodeOf(qts, node);

            expect(node.entityCollection.entities).toContain(entity);
            expect(node.nodeId).toBe(planetNode.nodeId);
            expect(node.extent.equals(planetNode.segment.getExtent())).toBe(true);
            expect(planetNode.segment.isLonLatInside(entity._lonLat)).toBe(true);
        }
    });

    test("an entity added later goes the same way", () => {
        const { qts, tree } = createTree(Strategy, 4);

        tree.insertEntities(randomEntities(200, 3));

        for (const entity of randomEntities(200, 11)) {
            tree.insertEntity(entity);
            expect(planetNodeOf(qts, entity._nodePtr).segment.isLonLatInside(entity._lonLat)).toBe(true);
        }
    });

    test("the bounding sphere of a node takes all of its tile", () => {
        const { qts, tree } = createTree(Strategy, 4);

        tree.insertEntities(randomEntities(1000, 5));

        const nodes = [...tree._faceTrees];
        for (const leaf of leaves(tree)) {
            for (let n = leaf; n; n = n.parentNode) {
                nodes.push(n);
            }
        }

        for (const node of new Set(nodes)) {
            const segment = planetNodeOf(qts, node).segment,
                { southWest: sw, northEast: ne } = segment.getExtent();

            for (let j = 0; j <= 8; j++) {
                for (let i = 0; i <= 8; i++) {
                    const p = wgs84.lonLatToCartesian(
                        segment.getLonLat(sw.lon + ((ne.lon - sw.lon) * i) / 8, sw.lat + ((ne.lat - sw.lat) * j) / 8)
                    );
                    expect(p.distance(node.bsphere.center)).toBeLessThanOrEqual(node.bsphere.radius * (1 + 1e-9));
                }
            }
        }
    });

    test("the collections of the visible tiles are drawn", () => {
        const { qts, tree } = createTree(Strategy, 4);

        tree.insertEntities(randomEntities(500, 9));

        const [visible, hidden] = leaves(tree);

        // The planet marks the visible tile and the tiles above it
        qts._visibleNodes = {};
        for (let n = visible; n; n = n.parentNode) {
            qts._visibleNodes[n.nodeId] = { state: 0 };
        }
        Object.assign(tree._layer, { _fadingOpacity: 1, scaleByDistance: [1, 1, 1], pickingScale: [1, 1] });

        const outArr = [];
        tree.collectVisibleEntityCollections(outArr);

        expect(outArr).toContain(visible.entityCollection);
        expect(outArr).not.toContain(hidden.entityCollection);
        expect(visible.isVisible()).toBe(true);
        expect(hidden.isVisible()).toBeFalsy();
    });
});

test("a sphere around bounds is centered on them", () => {
    const sphere = new Sphere();
    sphere.setFromBounds([0, 10, 20, 2, 14, 26]);

    expect([sphere.center.x, sphere.center.y, sphere.center.z]).toEqual([1, 12, 23]);
    expect(sphere.radius).toBeCloseTo(Math.hypot(1, 2, 3), 12);
});
