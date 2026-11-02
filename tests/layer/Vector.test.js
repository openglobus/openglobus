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

    test("removes the geometries in one pass when nobody listens to entityremove", () => {
        const { vector, entities, batch, removeEntity } = setup();

        vector.removeEntities(entities);

        expect(batch).toHaveBeenCalledWith([entities[0].geometry]);
        expect(removeEntity.mock.calls.map((c) => c[0])).toEqual([entities[1], entities[0]]);
    });

    test("keeps removing one by one when entityremove has listeners", () => {
        const { vector, entities, batch, removeEntity } = setup();
        vector.events.on("entityremove", () => {});

        vector.removeEntities(entities);

        expect(batch).not.toHaveBeenCalled();
        expect(removeEntity).toHaveBeenCalledTimes(2);
    });
});

test("Vector.clear removes every geometry from the shared buffers in one pass", () => {
    const square = (x) => ({
        type: "POLYGON",
        coordinates: [
            [
                [x, 0],
                [x + 1, 0],
                [x + 1, 1],
                [x, 1]
            ]
        ]
    });
    const vector = new Vector("name", {});
    const entities = [0, 2, 4, 6].map((x) => new Entity({ geometry: square(x) }));
    vector.addEntities(entities);
    vector._planet = {
        _clearLayerMaterial: () => {},
        renderer: { clearPickingColor: () => {}, requestRedraw: () => {} }
    };
    for (const e of entities) vector._geometryHandler.add(e.geometry);
    // No WebGL context in tests
    vi.spyOn(vector._geometryHandler, "_deleteBuffers").mockImplementation(() => {});
    const batch = vi.spyOn(vector._geometryHandler, "removeGeometries");
    const single = vi.spyOn(vector._geometryHandler, "remove");

    vector.clear();

    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch).toHaveBeenCalledWith(entities.map((e) => e.geometry));
    // The removals that follow find the geometries already detached.
    for (const e of entities) expect(e.geometry._handler).toBe(null);
    expect(single.mock.calls.length).toBe(entities.length);
    expect(vector._geometryHandler._geometries).toEqual([]);
});
