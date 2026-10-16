import { Extent } from "../../src/Extent";
import { Entity } from "../../src/entity/Entity";
import { Vector } from "../../src/layer/Vector";
import { EntityCollectionNode } from "../../src/quadTree/EntityCollectionNode";

function createRoot(async) {
    const layer = new Vector("vector", { async });

    layer._planet = { addEntityCollection() {} };

    const node = new EntityCollectionNode({ _layer: layer }, 0, null, Extent.createFromArray([-1, -1, 1, 1]), null, 0);

    return { layer, node };
}

function addTo(layer, node, entity) {
    entity._layer = layer;
    entity._layerIndex = layer._entities.length;
    layer._entities.push(entity);
    node.insertEntity(entity);
}

describe("Vector.removeEntity on a tree node", () => {
    test("drops an entity of an async layer that is still waiting for its frame", () => {
        const { layer, node } = createRoot(true);
        const entity = new Entity();

        addTo(layer, node, entity);

        expect(node.deferredEntities).toEqual([entity]);
        expect(node.count).toBe(1);

        layer.removeEntity(entity);
        node.applyCollection();

        expect(node.deferredEntities).toHaveLength(0);
        expect(node.count).toBe(0);
        expect(node.entityCollection.getEntities()).toHaveLength(0);
    });

    test("counts the removal of an entity kept in an unsplit node", () => {
        const { layer, node } = createRoot(false);
        const entity = new Entity();

        addTo(layer, node, entity);

        expect(node.entityCollection.getEntities()).toEqual([entity]);

        layer.removeEntity(entity);

        expect(node.count).toBe(0);
        expect(entity._entityCollection).toBeNull();
    });
});
