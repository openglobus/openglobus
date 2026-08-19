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
