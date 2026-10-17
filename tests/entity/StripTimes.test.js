import { Strip } from "../../src/entity/strip/Strip";
import { EntityCollection } from "../../src/entity/EntityCollection";
import { Entity } from "../../src/entity/Entity";
import { Vec3 } from "../../src/math/Vec3";

const T0 = 1_760_000_000_000;

const edge = (x) => [new Vec3(6378137 + x, 0, 0), new Vec3(6378137 + x, 100, 0)];
const path = (n) => Array.from({ length: n }, (_, i) => edge(i * 10));

// Absolute time of every vertex row along the strip: one value per (quad, row) pair.
function rows(strip) {
    const gs1 = strip._gridSize + 1;
    const arr = strip._timesArr;
    const res = [];
    for (let k = 0; k < arr.length; k += gs1) {
        for (let j = 1; j < gs1; j++) {
            expect(arr[k + j]).toBe(arr[k]);
        }
        res.push(arr[k] + strip._timeOrigin);
    }
    return res;
}

function expectRows(strip, times) {
    const gs = strip._gridSize;
    const expected = [];
    for (let k = 0; k + 1 < times.length; k++) {
        for (let i = 0; i <= gs; i++) {
            expected.push(Math.round(times[k] + ((times[k + 1] - times[k]) * i) / gs));
        }
    }
    expect(rows(strip)).toEqual(expected);
    expect(strip._timesArr.length).toBe(strip._verticesHigh.length / 3);
}

test("untimed strip keeps no times", () => {
    const strip = new Strip({ path: path(3) });
    expect(strip.isTimed()).toBe(false);
    expect(strip._timesArr.length).toBe(0);
});

test("timed strip gets a time per vertex", () => {
    const times = [T0, T0 + 1000, T0 + 1500];
    const strip = new Strip({ path: path(3), pathTimes: times });
    expect(strip.isTimed()).toBe(true);
    expect(strip.isOpaque()).toBe(false);
    expectRows(strip, times);
});

test("grid rows interpolate the edge times", () => {
    const times = [T0, T0 + 1000, T0 + 4000];
    const strip = new Strip({ path: path(3), pathTimes: times });
    strip.setGridSize(4);
    expectRows(strip, times);
});

test("addEdge3v with time", () => {
    const times = [T0, T0 + 1000];
    const strip = new Strip({ path: path(2), pathTimes: times });
    const [a, b] = edge(50);
    strip.addEdge3v(a, b, T0 + 2500);
    expectRows(strip, [...times, T0 + 2500]);
});

test("removeEdge and insertEdge3v keep times aligned", () => {
    const times = [T0, T0 + 1000, T0 + 2000, T0 + 3000];
    const strip = new Strip({ path: path(4), pathTimes: times });
    strip.removeEdge(1);
    expectRows(strip, [T0, T0 + 2000, T0 + 3000]);
    const [a, b] = edge(5);
    strip.insertEdge3v(a, b, 1, T0 + 500);
    expectRows(strip, [T0, T0 + 500, T0 + 2000, T0 + 3000]);
});

test("setEdge3v with time", () => {
    const strip = new Strip({ path: path(3), pathTimes: [T0, T0 + 1000, T0 + 2000] });
    const [a, b] = edge(15);
    strip.setEdge3v(a, b, 1, T0 + 1200);
    strip.setPath(strip.getPath());
    expectRows(strip, [T0, T0 + 1200, T0 + 2000]);
});

test("missing times repeat the previous one", () => {
    const strip = new Strip({ path: path(4), pathTimes: [undefined, T0 + 10, undefined, T0 + 30] });
    expectRows(strip, [T0 + 10, T0 + 10, T0 + 10, T0 + 30]);
});

test("setPathTimes switches the strip between timed and untimed", () => {
    const ec = new EntityCollection();
    const entity = new Entity({ strip: { path: path(3), color: "red" } });
    ec.add(entity);
    const handler = ec.stripHandler;
    const strip = entity.strip;
    expect(strip.isOpaque()).toBe(true);
    expect(handler._opaqueCount).toBe(1);

    strip.setPathTimes([T0, T0 + 1, T0 + 2]);
    expect(handler._opaqueCount).toBe(0);
    expectRows(strip, [T0, T0 + 1, T0 + 2]);

    strip.setPathTimes(null);
    expect(handler._opaqueCount).toBe(1);
    expect(strip.isTimed()).toBe(false);
});

test("time cut is relative to the strip origin", () => {
    const strip = new Strip({ path: path(2), pathTimes: [T0 + 100, T0 + 200] });
    expect(strip.getTimeCut(T0 + 150)).toBe(50);
});

test("repeated edges build zero-width quads that carry the hover time", () => {
    const times = [T0, T0 + 1000, T0 + 5000, T0 + 6000];
    const strip = new Strip({ path: [edge(0), edge(10), edge(10), edge(20)], pathTimes: times });
    strip.setGridSize(2);
    expect(Array.from(strip._verticesHigh).every(Number.isFinite)).toBe(true);
    expect(Array.from(strip._verticesLow).every(Number.isFinite)).toBe(true);
    expectRows(strip, times);
});
