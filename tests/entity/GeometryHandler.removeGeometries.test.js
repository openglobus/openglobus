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

const REMOVERS = [
    ["removeGeometries", (handler, geometries) => handler.removeGeometries(geometries)],
    ["remove", (handler, geometries) => geometries.forEach((g) => handler.remove(g))]
];

// Runs bringToFront() and removal steps on a mixed layer and compares the result with a handler
// built from the surviving geometries only, with the same bringToFront() calls.
const expectSameAsSurvivors = (removeAll, steps) => {
    const all = [...Array(32).keys()];
    const handler = new GeometryHandler({});
    const entities = makeMixed(all);
    for (const e of entities) handler.add(e.geometry);

    const removedIndexes = [];
    for (const step of steps) {
        for (const i of step.front || []) handler.bringToFront(entities[i].geometry);
        if (step.remove) {
            removeAll(
                handler,
                step.remove.map((i) => entities[i].geometry)
            );
            removedIndexes.push(...step.remove);
        }
    }
    const kept = all.filter((i) => !removedIndexes.includes(i));

    const reference = new GeometryHandler({});
    const survivors = makeMixed(kept);
    for (const e of survivors) reference.add(e.geometry);
    for (const step of steps) {
        for (const i of step.front || []) {
            kept.includes(i) && reference.bringToFront(survivors[kept.indexOf(i)].geometry);
        }
    }

    expect(ARRAYS.map((name) => handler[name])).toEqual(ARRAYS.map((name) => reference[name]));
    expect(kept.map((i) => OFFSETS.map((name) => entities[i].geometry[name]))).toEqual(
        survivors.map((e) => OFFSETS.map((name) => e.geometry[name]))
    );
    expect(handler._lineIndexes.length).toBeGreaterThan(0);
    for (const i of removedIndexes) {
        expect(entities[i].geometry._handler).toBe(null);
        expect(entities[i].geometry._handlerIndex).toBe(-1);
    }
};

// In makeMixed(), i % 4 gives 0 polygon, 1 line string, 2 multi line string, 3 multipolygon.

test.each(REMOVERS)("%s handles line strings and mixed layers", (_, removeAll) => {
    expectSameAsSurvivors(removeAll, [{ remove: [0, 1, 2, 6, 7, 13, 21, 22, 30, 31] }]);
});

test.each(REMOVERS)("%s after bringToFront()", (_, removeAll) => {
    expectSameAsSurvivors(removeAll, [{ front: [3, 5, 8, 10, 24] }, { remove: [0, 2, 6, 7, 13, 21, 22, 31] }]);
});

// Hover brings a geometry to front, then a click removes it.
test.each(REMOVERS)("%s of the geometry just brought to front", (_, removeAll) => {
    expectSameAsSurvivors(removeAll, [
        { front: [8] },
        { remove: [8] },
        { front: [5] },
        { remove: [5] },
        { front: [3] },
        { remove: [3] }
    ]);
});

test.each(REMOVERS)("%s after repeated bringToFront() and removals", (_, removeAll) => {
    expectSameAsSurvivors(removeAll, [
        { front: [3, 9, 8] },
        { remove: [1, 6, 13] },
        { front: [3, 15, 24, 9, 8, 10] },
        { remove: [0, 7, 21, 22] },
        { front: [12, 15, 17] },
        { remove: [3, 9, 30] }
    ]);
});

test("bringToFront() of line strings keeps every geometry's indexes", () => {
    const handler = new GeometryHandler({});
    const entities = makeMixed([...Array(16).keys()]);
    for (const e of entities) handler.add(e.geometry);

    const indexesOf = (g) => [
        g._polyIndexesLength < 0
            ? null
            : handler._polyIndexes.slice(g._polyIndexesHandlerIndex, g._polyIndexesHandlerIndex + g._polyIndexesLength),
        handler._lineIndexes.slice(g._lineIndexesHandlerIndex, g._lineIndexesHandlerIndex + g._lineIndexesLength)
    ];
    const before = entities.map((e) => indexesOf(e.geometry));

    for (const i of [1, 2, 5, 0, 9]) handler.bringToFront(entities[i].geometry);

    expect(entities.map((e) => indexesOf(e.geometry))).toEqual(before);
    expect(entities[1].geometry._polyIndexesHandlerIndex).toBe(-1);
});

test("removeGeometries does not fall back to remove() after bringToFront()", () => {
    const handler = new GeometryHandler({});
    const entities = makeMixed([...Array(8).keys()]);
    for (const e of entities) handler.add(e.geometry);
    handler.bringToFront(entities[0].geometry);
    const remove = vi.spyOn(handler, "remove");

    handler.removeGeometries([entities[1].geometry, entities[4].geometry]);

    expect(remove).not.toHaveBeenCalled();
});
