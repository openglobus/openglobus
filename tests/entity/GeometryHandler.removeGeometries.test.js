import { Entity } from "../../src/entity/Entity";
import { GeometryHandler } from "../../src/entity/geometry/GeometryHandler";

const ARRAYS = [
    "_polyVerticesHighMerc",
    "_polyVerticesLowMerc",
    "_polyColors",
    "_polyPickingColors",
    "_polyIndexes",
    "_lineVerticesHighMerc",
    "_lineVerticesLowMerc",
    "_lineOrders",
    "_lineIndexes",
    "_lineColors",
    "_linePickingColors",
    "_lineThickness",
    "_lineStrokes",
    "_lineStrokeColors"
];

const OFFSETS = [
    "_handlerIndex",
    "_polyVerticesHandlerIndex",
    "_polyIndexesHandlerIndex",
    "_lineVerticesHandlerIndex",
    "_lineOrdersHandlerIndex",
    "_lineColorsHandlerIndex",
    "_lineThicknessHandlerIndex",
    "_lineIndexesHandlerIndex"
];

const ring = (x, y, n) => {
    const r = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * 2 * Math.PI;
        r.push([x + Math.cos(a), y + Math.sin(a)]);
    }
    return r;
};

// Polygons and multipolygons of different sizes, so every removal shifts by a different amount.
const makeEntities = (count) => {
    const entities = [];
    for (let i = 0; i < count; i++) {
        const geometry =
            i % 3 === 2
                ? { type: "MULTIPOLYGON", coordinates: [[ring(i, 0, 4 + (i % 5))], [ring(i, 5, 3)]] }
                : { type: "POLYGON", coordinates: [ring(i, 0, 3 + (i % 7))] };
        entities.push(new Entity({ geometry }));
    }
    return entities;
};

const setup = () => {
    const handler = new GeometryHandler({});
    const entities = makeEntities(40);
    for (const e of entities) handler.add(e.geometry);
    return { handler, entities };
};

const snapshot = ({ handler, entities }, kept) => ({
    arrays: ARRAYS.map((name) => handler[name].slice()),
    offsets: kept.map((i) => OFFSETS.map((name) => entities[i].geometry[name]))
});

test("removeGeometries gives the same arrays and offsets as removing one by one", () => {
    const removedIndexes = [0, 3, 4, 9, 17, 18, 25, 39];
    const kept = [...Array(40).keys()].filter((i) => !removedIndexes.includes(i));

    const one = setup();
    for (let i = removedIndexes.length - 1; i >= 0; i--) one.handler.remove(one.entities[removedIndexes[i]].geometry);

    const batch = setup();
    batch.handler.removeGeometries(removedIndexes.map((i) => batch.entities[i].geometry));

    expect(snapshot(batch, kept)).toEqual(snapshot(one, kept));
    for (const i of removedIndexes) {
        expect(batch.entities[i].geometry._handler).toBe(null);
        expect(batch.entities[i].geometry._handlerIndex).toBe(-1);
    }
});

test("removeGeometries ignores geometries of another handler", () => {
    const own = setup();
    const other = setup();
    const before = snapshot(other, [...Array(40).keys()]);

    own.handler.removeGeometries([other.entities[1].geometry, own.entities[2].geometry]);

    expect(snapshot(other, [...Array(40).keys()])).toEqual(before);
    expect(own.entities[2].geometry._handlerIndex).toBe(-1);
});

test("removeGeometries falls back to remove() after bringToFront()", () => {
    const removedIndexes = [2, 5];
    const kept = [...Array(40).keys()].filter((i) => !removedIndexes.includes(i));

    const one = setup();
    one.handler.bringToFront(one.entities[10].geometry);
    for (let i = removedIndexes.length - 1; i >= 0; i--) one.handler.remove(one.entities[removedIndexes[i]].geometry);

    const batch = setup();
    batch.handler.bringToFront(batch.entities[10].geometry);
    batch.handler.removeGeometries(removedIndexes.map((i) => batch.entities[i].geometry));

    expect(snapshot(batch, kept)).toEqual(snapshot(one, kept));
});

// remove() mishandles geometries without polygon data, so lines are checked against
// a handler built from the surviving geometries only.
test("removeGeometries handles line strings and mixed layers", () => {
    const makeMixed = (indexes) =>
        indexes.map((i) => {
            const kind = i % 4;
            const geometry =
                kind === 0
                    ? { type: "POLYGON", coordinates: [ring(i, 0, 3 + (i % 5))] }
                    : kind === 1
                      ? { type: "LINESTRING", coordinates: ring(i, 2, 2 + (i % 4)) }
                      : kind === 2
                        ? { type: "MULTILINESTRING", coordinates: [ring(i, 4, 3), ring(i, 6, 2 + (i % 3))] }
                        : { type: "MULTIPOLYGON", coordinates: [[ring(i, 8, 4)], [ring(i, 10, 3 + (i % 2))]] };
            return new Entity({ geometry });
        });

    const all = [...Array(32).keys()];
    const removedIndexes = [0, 1, 2, 6, 7, 13, 21, 22, 30, 31];
    const kept = all.filter((i) => !removedIndexes.includes(i));

    const batch = new GeometryHandler({});
    const entities = makeMixed(all);
    for (const e of entities) batch.add(e.geometry);
    batch.removeGeometries(removedIndexes.map((i) => entities[i].geometry));

    const reference = new GeometryHandler({});
    const survivors = makeMixed(kept);
    for (const e of survivors) reference.add(e.geometry);

    expect(ARRAYS.map((name) => batch[name])).toEqual(ARRAYS.map((name) => reference[name]));
    expect(kept.map((i) => OFFSETS.map((name) => entities[i].geometry[name]))).toEqual(
        survivors.map((e) => OFFSETS.map((name) => e.geometry[name]))
    );
    expect(batch._lineIndexes.length).toBeGreaterThan(0);
});
