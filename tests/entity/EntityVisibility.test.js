import { Entity } from "../../src/entity/Entity";
import { EntityCollection } from "../../src/entity/EntityCollection";
import { Vec3 } from "../../src/math/Vec3";

function polylineEntity() {
    return new Entity({
        polyline: {
            path3v: [
                [new Vec3(0, 0, 0), new Vec3(1000, 0, 0)],
                [new Vec3(0, 1000, 0), new Vec3(1000, 1000, 0)]
            ],
            thickness: 3
        }
    });
}

describe("Entity visibility", () => {
    test("takes the polyline segments out of the batch and puts them back", () => {
        const collection = new EntityCollection();
        const entity = polylineEntity();

        collection.add(entity);
        expect(entity.polyline._batchRendererIndexes).toHaveLength(2);

        entity.setVisibility(false);
        expect(entity.polyline.getVisibility()).toBe(false);
        expect(entity.polyline._batchRendererIndexes).toHaveLength(0);

        entity.setVisibility(true);
        expect(entity.polyline.getVisibility()).toBe(true);
        expect(entity.polyline._batchRendererIndexes).toHaveLength(2);
    });

    test("keeps a hidden polyline out of the batch when it joins a collection", () => {
        const collection = new EntityCollection();
        const entity = polylineEntity();

        entity.setVisibility(false);
        collection.add(entity);

        expect(entity.polyline._batchRendererIndexes).toHaveLength(0);

        entity.setVisibility(true);
        expect(entity.polyline._batchRendererIndexes).toHaveLength(2);
    });

    test("carries visibility to the strip", () => {
        const entity = new Entity({
            strip: {
                path: [
                    [new Vec3(0, 0, 0), new Vec3(0, 0, 100)],
                    [new Vec3(100, 0, 0), new Vec3(100, 0, 100)]
                ]
            }
        });

        expect(entity.strip.getVisibility()).toBe(true);

        entity.setVisibility(false);
        expect(entity.strip.getVisibility()).toBe(false);

        entity.setVisibility(true);
        expect(entity.strip.getVisibility()).toBe(true);
    });
});
