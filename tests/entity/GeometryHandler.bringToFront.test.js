import { expect, test } from "vitest";
import { Entity } from "../../src/entity/Entity";
import { GeometryHandler } from "../../src/entity/geometry/GeometryHandler";

const ring = (x, y, n) => {
    const r = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * 2 * Math.PI;
        r.push([x + Math.cos(a), y + Math.sin(a)]);
    }
    return r;
};

// i % 4 gives 0 polygon, 1 line string, 2 multi line string, 3 multipolygon.
const makeGeometry = (i) => {
    const kind = i % 4;
    return kind === 0
        ? { type: "POLYGON", coordinates: [ring(i, 0, 3 + (i % 5))] }
        : kind === 1
          ? { type: "LINESTRING", coordinates: ring(i, 2, 2 + (i % 4)) }
          : kind === 2
            ? { type: "MULTILINESTRING", coordinates: [ring(i, 4, 3), ring(i, 6, 2 + (i % 3))] }
            : { type: "MULTIPOLYGON", coordinates: [[ring(i, 8, 4)], [ring(i, 10, 3 + (i % 2))]] };
};

// A geometry's indexes relative to its own first vertex.
const ownIndexes = (handler, g) => [
    g._polyIndexesLength < 0
        ? []
        : handler._polyIndexes
              .slice(g._polyIndexesHandlerIndex, g._polyIndexesHandlerIndex + g._polyIndexesLength)
              .map((v) => v - g._polyVerticesHandlerIndex * 0.5),
    g._lineIndexesLength < 0
        ? []
        : handler._lineIndexes
              .slice(g._lineIndexesHandlerIndex, g._lineIndexesHandlerIndex + g._lineIndexesLength)
              .map((v) => v - g._lineVerticesHandlerIndex * 0.5)
];

// Each geometry must index its own vertices the same way it does alone in a handler.
const expectOwnIndexes = (handler, indexes) => {
    for (const i of indexes) {
        const g = handler._geometries.find((x) => x._entity.properties.i === i);
        const alone = new GeometryHandler({});
        const e = new Entity({ geometry: makeGeometry(i) });
        alone.add(e.geometry);
        expect(ownIndexes(handler, g), `geometry ${i}`).toEqual(ownIndexes(alone, e.geometry));
    }
};

const add = (handler, i) => {
    const e = new Entity({ geometry: makeGeometry(i), properties: { i } });
    handler.add(e.geometry);
    return e;
};

test("add() after bringToFront() indexes the new geometry's own vertices", () => {
    const handler = new GeometryHandler({});
    const entities = [...Array(12).keys()].map((i) => add(handler, i));

    handler.bringToFront(entities[1].geometry);
    handler.bringToFront(entities[6].geometry);
    for (let i = 12; i < 20; i++) add(handler, i);

    expectOwnIndexes(handler, [...Array(20).keys()]);
});

test("add() after bringToFront() and removal", () => {
    const handler = new GeometryHandler({});
    const entities = [...Array(12).keys()].map((i) => add(handler, i));

    handler.bringToFront(entities[5].geometry);
    handler.removeGeometries([entities[2].geometry, entities[9].geometry]);
    handler.bringToFront(entities[3].geometry);
    for (let i = 12; i < 16; i++) add(handler, i);

    expectOwnIndexes(handler, [0, 1, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15]);
});

test("setGeometry() after bringToFront() indexes the edited geometry's own vertices", () => {
    const handler = new GeometryHandler({});
    const entities = [...Array(12).keys()].map((i) => add(handler, i));

    handler.bringToFront(entities[7].geometry);
    entities[2].geometry.setGeometry(makeGeometry(2));
    entities[3].geometry.setGeometry(makeGeometry(3));

    expectOwnIndexes(handler, [...Array(12).keys()]);
});
