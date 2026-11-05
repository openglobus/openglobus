import { Entity } from "../../src/entity/Entity";
import { GeometryHandler } from "../../src/entity/geometry/GeometryHandler";

// More vertices than a JS engine accepts as function arguments (~125,000 values).
const VERTICES = 70000;

const makeRing = (n) => {
    const ring = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * 2 * Math.PI;
        ring.push([10 * Math.cos(a), 10 * Math.sin(a)]);
    }
    return ring;
};

const makeEntity = (type, coordinates) => new Entity({ geometry: { type, coordinates } });

test("GeometryHandler adds a polygon with more vertices than the engine's argument limit", () => {
    const handler = new GeometryHandler({});
    const entity = makeEntity("POLYGON", [makeRing(VERTICES)]);

    expect(() => handler.add(entity.geometry)).not.toThrow();
    expect(handler._polyVerticesHighMerc.length).toBe(VERTICES * 2);
    expect(handler._polyVerticesLowMerc.length).toBe(VERTICES * 2);
});

test("GeometryHandler adds a large multipolygon and brings it to front", () => {
    const handler = new GeometryHandler({});
    const small = makeEntity("POLYGON", [makeRing(8)]);
    const large = makeEntity("MULTIPOLYGON", [[makeRing(VERTICES)], [makeRing(8)]]);
    handler.add(large.geometry);
    handler.add(small.geometry);

    const polyIndexes = handler._polyIndexes.slice();
    expect(handler._polyVerticesHighMerc.length).toBe((VERTICES + 8 + 8) * 2);

    expect(() => handler.bringToFront(large.geometry)).not.toThrow();
    expect(handler._polyIndexes.length).toBe(polyIndexes.length);
    expect(handler._polyIndexes.slice(-large.geometry._polyIndexesLength)).toEqual(
        polyIndexes.slice(0, large.geometry._polyIndexesLength)
    );
});
