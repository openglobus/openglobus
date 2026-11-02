import { Vector } from "../../src/layer/Vector";
import { Entity } from "../../src/entity/Entity";

test("Testing Vector", () => {
    const vector = new Vector("name", {});
    expect(vector).toBeTruthy();
});

test("Vector.addEntities preserves entity order", () => {
    const vector = new Vector("name", {});
    const entities = [new Entity(), new Entity(), new Entity()];

    expect(vector.addEntities(entities)).toBe(vector);
    expect(vector.getEntities()).toEqual(entities);
    expect(entities.map((entity) => entity._layerIndex)).toEqual([0, 1, 2]);
});

describe("Vector.removeEntities", () => {
    const setup = () => {
        const vector = new Vector("name", {});
        const entities = [new Entity({ geometry: { type: "POINT", coordinates: [0, 0] } }), new Entity()];
        vector.addEntities(entities);
        vector._planet = {};
        const batch = vi.spyOn(vector._geometryHandler, "removeGeometries").mockImplementation(() => {});
        const removeEntity = vi.spyOn(vector, "removeEntity").mockImplementation(() => vector);
        return { vector, entities, batch, removeEntity };
    };

    test("removes the geometries in one pass", () => {
        const { vector, entities, batch, removeEntity } = setup();

        vector.removeEntities(entities);

        expect(batch).toHaveBeenCalledWith([entities[0].geometry]);
        expect(removeEntity.mock.calls.map((c) => c[0])).toEqual([entities[1], entities[0]]);
    });

    test("removes polygons and lines correctly with an entityremove listener", () => {
        const makeEntities = (indexes) =>
            indexes.map((i) => {
                const coordinates = [
                    [i, 0],
                    [i + 1, 0],
                    [i + 1, 1 + (i % 3)]
                ];
                const geometry =
                    i % 2 ? { type: "LINESTRING", coordinates } : { type: "POLYGON", coordinates: [coordinates] };
                return new Entity({ geometry });
            });
        const ARRAYS = [
            "_polyVerticesHighMerc",
            "_polyIndexes",
            "_lineVerticesHighMerc",
            "_lineIndexes",
            "_lineOrders"
        ];

        const all = [...Array(12).keys()];
        const removedIndexes = [1, 2, 5, 8, 11];
        const kept = all.filter((i) => !removedIndexes.includes(i));

        const vector = new Vector("name", {});
        const entities = makeEntities(all);
        vector.addEntities(entities);
        vector._planet = { renderer: { clearPickingColor: () => {} } };
        for (const e of entities) vector._geometryHandler.add(e.geometry);

        const removed = removedIndexes.map((i) => entities[i]);
        const notified = [];
        vector.events.on("entityremove", (e) => {
            expect(e._layer).toBe(null);
            expect(e.geometry._handler).toBe(null);
            notified.push(e);
        });
        const batch = vi.spyOn(vector._geometryHandler, "removeGeometries");

        vector.removeEntities(removed);

        expect(batch).toHaveBeenCalledWith(removed.map((e) => e.geometry));

        const reference = new Vector("ref", {});
        const survivors = makeEntities(kept);
        reference.addEntities(survivors);
        for (const e of survivors) reference._geometryHandler.add(e.geometry);

        expect(notified).toEqual([...removed].reverse());
        expect(vector.getEntities()).toEqual(kept.map((i) => entities[i]));
        expect(ARRAYS.map((name) => vector._geometryHandler[name])).toEqual(
            ARRAYS.map((name) => reference._geometryHandler[name])
        );
    });
});
