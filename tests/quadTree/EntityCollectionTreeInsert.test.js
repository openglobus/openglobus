import { Entity } from "../../src/entity/Entity";
import { Vector } from "../../src/layer/Vector";
import { wgs84 } from "../../src/ellipsoid/wgs84";
import { Vec3 } from "../../src/math/Vec3";
import { RENDERING, SW, WALKTHROUGH } from "../../src/quadTree/quadTree";
import { EarthEntityCollectionsTreeStrategy } from "../../src/quadTree/earth/EarthEntityCollectionsTreeStrategy";

// Every node of the planet quadtree is visible in the given state
function visibleNodes(state) {
    return new Proxy({}, { get: () => ({ state }) });
}

function createLayer({ async = false, state = WALKTHROUGH } = {}) {
    const quadTreeStrategy = {
        _visibleNodes: visibleNodes(state),
        _visibleNodesNorth: visibleNodes(state),
        _visibleNodesSouth: visibleNodes(state),
        _renderedNodes: [],
        createEntityCollectionsTreeStrategy(layer, nodeCapacity) {
            return new EarthEntityCollectionsTreeStrategy(quadTreeStrategy, layer, nodeCapacity);
        }
    };

    const layer = new Vector("labels", { async });

    layer._planet = {
        ellipsoid: wgs84,
        quadTreeStrategy,
        camera: { eye: new Vec3(), _lonLat: { height: 20000 }, containsSphere: () => true },
        addEntityCollection() {},
        _clearLayerMaterial() {}
    };

    return layer;
}

function createLabel(lon, lat) {
    return new Entity({ lonlat: [lon, lat], label: { text: "label" } });
}

function createLabels(n, lon0, lat0, size) {
    const res = [];
    for (let i = 0; i < n; i++) {
        res.push(createLabel(lon0 + Math.random() * size, lat0 + Math.random() * size));
    }
    return res;
}

function trees(layer) {
    const s = layer._entityCollectionsTreeStrategy;
    return [s._entityCollectionsTree, s._entityCollectionsTreeNorth, s._entityCollectionsTreeSouth];
}

function collectRendered(layer) {
    const out = [];
    layer._entityCollectionsTreeStrategy.collectVisibleEntityCollections(out);
    const rendered = new Map();
    for (const ec of out) {
        for (const e of ec._entities) {
            rendered.set(e, (rendered.get(e) || 0) + 1);
        }
    }
    return rendered;
}

function checkNode(node) {
    expect(node.entityCollection && node.childNodes.length).toBeFalsy();

    if (node.childNodes.length) {
        expect(node.deferredEntities).toHaveLength(0);
        expect(node.count).toBe(node.childNodes.reduce((sum, n) => sum + n.count, 0));
        node.childNodes.forEach(checkNode);
    } else {
        const entities = node.deferredEntities.concat(node.entityCollection ? node.entityCollection._entities : []);
        expect(node.count).toBe(entities.length);
        for (const e of entities) {
            expect(e._nodePtr).toBe(node);
        }
    }
}

function expectAllRendered(layer) {
    trees(layer).forEach(checkNode);

    const rendered = collectRendered(layer);
    const entities = layer.getEntities();

    expect(rendered.size).toBe(entities.length);
    for (const e of entities) {
        expect(rendered.get(e)).toBe(1);
    }
}

function replace(layer, entity, newEntity = entity) {
    const index = entity._layerIndex;
    entity.remove();
    layer.insert(newEntity, index);
}

describe.each([
    ["first pass", WALKTHROUGH],
    ["second pass", RENDERING]
])("Vector entity collections tree, %s", (_, state) => {
    test("renders every entity after replacing one", () => {
        const layer = createLayer({ state });
        const entities = createLabels(3000, 10, 50, 1);
        layer.setEntities(entities);

        expect(trees(layer)[0].childNodes.length).toBeGreaterThan(0);
        expectAllRendered(layer);

        replace(layer, entities[123]);
        expectAllRendered(layer);

        replace(layer, entities[7], createLabel(10.5, 50.5));
        expectAllRendered(layer);

        layer.add(createLabel(-70, -30));
        expectAllRendered(layer);
    });

    test("inserts into an empty leaf", () => {
        const layer = createLayer({ state });
        layer.setEntities(createLabels(500, 10, 50, 1));

        const root = trees(layer)[0];
        const emptyLeaf = root.childNodes[SW];
        expect(emptyLeaf.count).toBe(0);
        expect(emptyLeaf.entityCollection).toBeNull();

        const entity = createLabel(-100, -40);
        layer.add(entity);

        expect(entity._nodePtr).toBe(emptyLeaf);
        expect(emptyLeaf.entityCollection._entities).toEqual([entity]);
        expectAllRendered(layer);
    });

    test("survives repeated remove and insert cycles", () => {
        const layer = createLayer({ state });
        layer.setEntities(createLabels(1000, 10, 50, 1));

        for (let i = 0; i < 100; i++) {
            const entities = layer.getEntities();
            const entity = entities[Math.floor(Math.random() * entities.length)];
            if (i % 2) {
                replace(layer, entity);
            } else {
                replace(layer, entity, createLabel(10 + Math.random(), 50 + Math.random()));
            }
        }

        expectAllRendered(layer);
    });

    test("splits a leaf that grows past the node capacity", () => {
        const layer = createLayer({ state });
        layer.setEntities(createLabels(500, 10, 50, 1));

        const leaf = layer.getEntities()[0]._nodePtr;
        const { southWest, northEast } = leaf.extent.inverseMercator();

        for (let i = 0; i < layer._nodeCapacity * 3; i++) {
            layer.add(
                createLabel(
                    southWest.lon + Math.random() * (northEast.lon - southWest.lon),
                    southWest.lat + Math.random() * (northEast.lat - southWest.lat)
                )
            );
        }

        expect(leaf.entityCollection).toBeNull();
        expect(leaf.childNodes).toHaveLength(4);
        expectAllRendered(layer);
    });

    test("splits the root of a small layer grown by single inserts", () => {
        const layer = createLayer({ state });
        layer.setEntities([]);

        for (let i = 0; i < layer._nodeCapacity; i++) {
            layer.add(createLabel(10 + Math.random(), 50 + Math.random()));
        }

        expect(trees(layer)[0].childNodes).toHaveLength(0);
        expectAllRendered(layer);

        layer.add(createLabel(10.5, 50.5));

        expect(trees(layer)[0].childNodes).toHaveLength(4);
        expectAllRendered(layer);
    });

    test("keeps entities at the same point in a single deep leaf", () => {
        const layer = createLayer({ state });
        layer.setEntities([]);

        for (let i = 0; i < layer._nodeCapacity * 2; i++) {
            layer.add(createLabel(10.5, 50.5));
        }

        expectAllRendered(layer);
    });

    test("renders polar entities after replacing one", () => {
        const layer = createLayer({ state });
        const north = createLabels(1000, 0, 86, 3);
        const south = createLabels(1000, 0, -89, 3);
        layer.setEntities(north.concat(south));

        expect(trees(layer)[1].childNodes.length).toBeGreaterThan(0);
        expect(trees(layer)[2].childNodes.length).toBeGreaterThan(0);

        replace(layer, north[10]);
        replace(layer, south[10]);
        replace(layer, north[20], createLabel(1, 87));
        replace(layer, south[20], createLabel(1, -87));
        expectAllRendered(layer);

        for (let i = 0; i < layer._nodeCapacity * 2; i++) {
            layer.add(createLabel(1 + Math.random() * 0.01, 87 + Math.random() * 0.01));
        }
        expectAllRendered(layer);
    });
});

describe("Vector entity collections tree, async layer", () => {
    beforeEach(() => {
        vi.stubGlobal("requestAnimationFrame", (cb) => cb());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test("renders every entity after replacing one", () => {
        const layer = createLayer({ async: true });
        const entities = createLabels(3000, 10, 50, 1);
        layer.setEntities(entities);

        // Deferred entities are applied while collecting the visible collections
        collectRendered(layer);
        expectAllRendered(layer);

        replace(layer, entities[123]);
        expect(entities[123]._nodePtr.deferredEntities).toContain(entities[123]);
        trees(layer).forEach(checkNode);

        collectRendered(layer);
        expectAllRendered(layer);

        const entity = createLabel(10.5, 50.5);
        entity._layer = layer;
        entity._layerIndex = layer._entities.length;
        layer._entities.push(entity);
        layer._entityCollectionsTreeStrategy.insertEntity(entity, true);
        expect(entity._entityCollection).toBe(entity._nodePtr.entityCollection);
        expectAllRendered(layer);
    });

    test("moves deferred entities into the children of a split leaf", () => {
        const layer = createLayer({ async: true });
        layer.setEntities([]);

        const root = trees(layer)[0];

        for (let i = 0; i < layer._nodeCapacity + 1; i++) {
            layer.add(createLabel(10 + Math.random(), 50 + Math.random()));
        }

        expect(root.childNodes).toHaveLength(4);
        expect(root.deferredEntities).toHaveLength(0);
        trees(layer).forEach(checkNode);

        // A queued node split before its frame must not fail
        root.applyCollection();

        collectRendered(layer);
        expectAllRendered(layer);

        const entity = layer.getEntities()[0];
        entity.remove();
        expect(layer.getEntities()).not.toContain(entity);
        trees(layer).forEach(checkNode);
        expectAllRendered(layer);
    });
});
