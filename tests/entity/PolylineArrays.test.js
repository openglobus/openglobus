import { Polyline } from "../../src/entity/polyline/Polyline";
import { LonLat } from "../../src/LonLat";
import { wgs84 } from "../../src/ellipsoid/wgs84";
import {
    createCollection,
    createScene,
    checkHandler,
    checkRenderer,
    expectPointColors,
    lonLatTrack,
    point,
    track
} from "./polylineArrays";

const RED = Object.freeze([1, 0, 0, 1]);
const GREEN = Object.freeze([0, 1, 0, 1]);
const BLUE = Object.freeze([0, 0, 1, 1]);

const clonePaths = (paths) => paths.map((seg) => seg.map((p) => p.clone()));

function setup(bound = true) {
    const { handler } = createCollection(bound);
    const model = new Map();

    const make = (paths, options = {}) => {
        const polyline = new Polyline({ path3v: clonePaths(paths), ...options });
        handler.add(polyline);
        model.set(polyline, clonePaths(paths));
        return polyline;
    };

    const makeLonLat = (paths, options = {}) => {
        const polyline = new Polyline({ pathLonLat: paths.map((seg) => seg.map((ll) => ll.clone())), ...options });
        handler.add(polyline);
        model.set(
            polyline,
            paths.map((seg) => seg.map((ll) => wgs84.lonLatToCartesian(ll)))
        );
        return polyline;
    };

    const check = () => checkHandler(handler, model);

    return { handler, model, make, makeLonLat, check };
}

// Target polyline sits between two neighbours so offset mistakes show up in them too.
function setupBatch(bound = true, options = {}) {
    const ctx = setup(bound);
    ctx.before = ctx.make([track(0, 0, 3), track(1, 1, 2)], { color: "white" });
    ctx.target = ctx.make([track(2, 2, 4), track(3, 3, 3), track(4, 4, 5)], { color: "red", thickness: 4, ...options });
    ctx.after = ctx.make([track(5, 5, 3)], { color: "white" });
    ctx.segs = ctx.model.get(ctx.target);
    return ctx;
}

describe("checker", () => {
    test("detects a corrupted array", () => {
        const { handler, make } = setup();
        make([track(0, 0, 3)]);
        handler._opaqueRenderer._colors[5] = 0.123;
        expect(() => checkRenderer(handler._opaqueRenderer)).toThrow(/color/);
    });

    test("detects a stale vertex", () => {
        const { handler, make } = setup();
        make([track(0, 0, 3)]);
        handler._opaqueRenderer._verticesLow[20] += 10;
        expect(() => checkRenderer(handler._opaqueRenderer)).toThrow(/vertex/);
    });
});

describe("construction", () => {
    test.each([
        ["one segment", [[4]]],
        ["several segments", [[4, 3, 5]]],
        ["two-point segments", [[2, 2]]],
        ["one-point segment", [[1, 3]]]
    ])("%s", (_name, [counts]) => {
        const { make, check } = setup();
        make(
            counts.map((n, i) => track(i, i, n)),
            { color: "red" }
        );
        check();
    });

    test("closed segments", () => {
        const { make, check } = setup();
        make([track(0, 0, 4), track(1, 1, 3)], { isClosed: true });
        check();
    });

    test("geodetic paths", () => {
        const { makeLonLat, check } = setup();
        makeLonLat([lonLatTrack(0, 0, 4), lonLatTrack(1, 1, 3)]);
        check();
    });

    test("several polylines in opaque and transparent batches", () => {
        const { make, check } = setup();
        make([track(0, 0, 3)], { color: "red" });
        make([track(1, 1, 4)], { color: "green", opacity: 0.5 });
        make([track(2, 2, 2), track(3, 3, 3)], { color: "blue" });
        make([track(4, 4, 5)], { color: "white", opacity: 0.3 });
        check();
    });

    test("scene bound after polylines were added", () => {
        const { handler, make, check } = setup(false);
        make([track(0, 0, 3)]);
        make([track(1, 1, 4), track(2, 2, 2)], { opacity: 0.5 });
        handler.bindScene(createScene());
        check();
    });

    test("path colors and opacity", () => {
        const { make, check } = setup();
        const polyline = make([track(0, 0, 3)], { pathColors: [[RED, GREEN, BLUE]], opacity: 0.5 });
        check();
        expectPointColors(polyline, 0, [RED, GREEN, BLUE], 0.5);
    });
});

describe("points", () => {
    test.each([0, 1, 2])("addPoint3v to segment %i", (s) => {
        const { target, segs, check } = setupBatch();
        const p = point(10, 10);
        target.addPoint3v(p.clone(), s);
        segs[s].push(p);
        check();
    });

    test("addPoint3v with color", () => {
        const { target, segs, check } = setupBatch(true, { pathColors: [[RED, RED, RED, RED]] });
        const p = point(10, 10);
        target.addPoint3v(p.clone(), 0, GREEN);
        segs[0].push(p);
        check();
        expectPointColors(target, 0, [RED, RED, RED, RED, GREEN]);
    });

    test("addPoint3v to a new segment", () => {
        const { target, segs, check } = setupBatch();
        const p0 = point(10, 10),
            p1 = point(10.01, 10);
        target.addPoint3v(p0.clone(), 3);
        target.addPoint3v(p1.clone(), 3);
        segs.push([p0, p1]);
        check();
    });

    test.each([0, 1, 2])("addPoint3v to a closed segment %i", (s) => {
        const { target, segs, check } = setupBatch(true, { isClosed: true });
        const p = point(10, 10);
        target.addPoint3v(p.clone(), s);
        segs[s].push(p);
        check();
    });

    test("addPoint3v to a one-point segment", () => {
        const { target, segs, check } = setupBatch();
        target.removePoint(0, 1);
        target.removePoint(0, 1);
        segs[1].splice(0, 2);
        check();
        const p = point(10, 10);
        target.addPoint3v(p.clone(), 1);
        segs[1].push(p);
        check();
    });

    test("addPoint3v with color to a segment with one color", () => {
        const { target, segs, check } = setupBatch(true, { pathColors: [[RED]] });
        const p = point(10, 10);
        target.addPoint3v(p.clone(), 0, GREEN);
        segs[0].push(p);
        check();
        expectPointColors(target, 0, [RED, RED, RED, RED, GREEN]);
    });

    test("addPoint3v repeatedly", () => {
        const { target, segs, check } = setupBatch();
        for (let i = 0; i < 20; i++) {
            const p = point(10 + i * 0.01, 10);
            target.addPoint3v(p.clone(), 1);
            segs[1].push(p);
            check();
        }
    });

    test("addPointLonLat", () => {
        const { makeLonLat, model, check } = setup();
        const polyline = makeLonLat([lonLatTrack(0, 0, 3), lonLatTrack(1, 1, 2)]);
        const ll = new LonLat(5, 5, 100);
        polyline.addPointLonLat(ll.clone(), 0);
        model.get(polyline)[0].push(wgs84.lonLatToCartesian(ll));
        check();
    });

    test.each([
        [0, 0],
        [0, 2],
        [0, 4],
        [1, 1],
        [2, 5]
    ])("insertPoint3v into segment %i at %i", (s, i) => {
        const { target, segs, check } = setupBatch();
        const p = point(10, 10);
        target.insertPoint3v(p.clone(), i, undefined, s);
        segs[s].splice(i, 0, p);
        check();
    });

    test("insertPoint3v with color", () => {
        const { target, segs, check } = setupBatch(true, { pathColors: [[RED, RED, RED, RED]] });
        const p = point(10, 10);
        target.insertPoint3v(p.clone(), 1, GREEN, 0);
        segs[0].splice(1, 0, p);
        check();
        expectPointColors(target, 0, [RED, GREEN, RED, RED, RED]);
    });

    test.each([
        [0, 0],
        [0, 1],
        [0, 3],
        [1, 1],
        [2, 4]
    ])("removePoint from segment %i at %i", (s, i) => {
        const { target, segs, check } = setupBatch();
        target.removePoint(i, s);
        segs[s].splice(i, 1);
        check();
    });

    test("insertPoint3v without color into a colored segment", () => {
        const { target, segs, check } = setupBatch(true, { pathColors: [[RED, GREEN, BLUE, RED]] });
        const p = point(10, 10);
        target.insertPoint3v(p.clone(), 2, undefined, 0);
        segs[0].splice(2, 0, p);
        check();
        expectPointColors(target, 0, [RED, GREEN, GREEN, BLUE, RED]);
        target.setVisibility(false);
        target.setVisibility(true);
        check();
        expectPointColors(target, 0, [RED, GREEN, GREEN, BLUE, RED]);
    });

    test("removePoint with colors", () => {
        const { target, segs, check } = setupBatch(true, { pathColors: [[RED, GREEN, BLUE, RED]] });
        target.removePoint(1, 0);
        segs[0].splice(1, 1);
        check();
        expectPointColors(target, 0, [RED, BLUE, RED]);
    });

    test("removePoint down to an empty segment", () => {
        const { target, segs, check } = setupBatch();
        while (segs[1].length) {
            target.removePoint(0, 1);
            segs[1].splice(0, 1);
            check();
        }
    });

    test("segment index stays bound to its segment after one segment shrinks to one point", () => {
        const { target, segs, check } = setupBatch();
        target.removePoint(0, 0);
        target.removePoint(0, 0);
        target.removePoint(0, 0);
        segs[0].splice(0, 3);
        check();

        const p = point(10, 10);
        target.setPoint3v(p.clone(), 0, 1);
        segs[1][0] = p;
        check();
    });

    test.each([
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
        [1, 2],
        [2, 4]
    ])("setPoint3v segment %i point %i", (s, i) => {
        const { target, segs, check } = setupBatch();
        const p = point(10, 10);
        target.setPoint3v(p.clone(), i, s);
        segs[s][i] = p;
        check();
    });

    test.each([0, 1, 3])("setPoint3v on a closed segment point %i", (i) => {
        const { target, segs, check } = setupBatch(true, { isClosed: true });
        const p = point(10, 10);
        target.setPoint3v(p.clone(), i, 0);
        segs[0][i] = p;
        check();
    });

    test.each([0, 1, 2])("setPointLonLat point %i", (i) => {
        const { makeLonLat, model, check } = setup();
        makeLonLat([lonLatTrack(0, 0, 2)]);
        const polyline = makeLonLat([lonLatTrack(1, 1, 3), lonLatTrack(2, 2, 3)]);
        const ll = new LonLat(5, 5, 100);
        polyline.setPointLonLat(ll.clone(), i, 1);
        model.get(polyline)[1][i] = wgs84.lonLatToCartesian(ll);
        check();
    });

    test("setPointColor in a segment with one color", () => {
        const { target, check } = setupBatch(true, { pathColors: [[RED]] });
        target.setPointColor(GREEN, 2, 0);
        check();
        expectPointColors(target, 0, [RED, RED, GREEN, RED]);
    });

    test("setPointColor keeps transparent alpha", () => {
        const { target, check } = setupBatch(true, { pathColors: [[RED, RED, RED, RED]] });
        target.setPointColor([0, 1, 0, 0], 1, 0);
        check();
        expectPointColors(target, 0, [RED, [0, 1, 0, 0], RED, RED]);
    });

    test("setPointColor", () => {
        const { target, check } = setupBatch(true, { pathColors: [[RED, RED, RED, RED]] });
        target.setPointColor(GREEN, 2, 0);
        check();
        expectPointColors(target, 0, [RED, RED, GREEN, RED]);
    });
});

describe("paths", () => {
    test("setPath3v with the same sizes", () => {
        const { target, model, check } = setupBatch();
        const next = [track(20, 20, 4), track(21, 21, 3), track(22, 22, 5)];
        target.setPath3v(clonePaths(next));
        model.set(target, next);
        check();
    });

    test("setPath3v with different sizes", () => {
        const { target, model, check } = setupBatch();
        const next = [track(20, 20, 6), track(21, 21, 2)];
        target.setPath3v(clonePaths(next));
        model.set(target, next);
        check();
    });

    test("setPath3v forceEqual with the same sizes", () => {
        const { target, model, check } = setupBatch();
        const next = [track(20, 20, 4), track(21, 21, 3), track(22, 22, 5)];
        target.setPath3v(clonePaths(next), undefined, true);
        model.set(target, next);
        check();
    });

    test("setPath3v forceEqual with different sizes", () => {
        const { target, model, check } = setupBatch();
        const next = [track(20, 20, 7), track(21, 21, 2), track(22, 22, 3)];
        target.setPath3v(clonePaths(next), undefined, true);
        model.set(target, next);
        check();
    });

    test.each([
        ["same size", 3],
        ["longer", 6],
        ["shorter", 2]
    ])("setPath3v of one segment, %s", (_name, n) => {
        const { target, segs, check } = setupBatch();
        const next = track(20, 20, n);
        target.setPath3v(
            next.map((p) => p.clone()),
            undefined,
            false,
            1
        );
        segs[1] = next;
        check();
    });

    test.each([
        ["same size", 3],
        ["longer", 6]
    ])("setPath3v of one segment forceEqual, %s", (_name, n) => {
        const { target, segs, check } = setupBatch();
        const next = track(20, 20, n);
        target.setPath3v(
            next.map((p) => p.clone()),
            undefined,
            true,
            1
        );
        segs[1] = next;
        check();
    });

    test("setPath3vFast", () => {
        const { target, model, check } = setupBatch();
        const next = [track(20, 20, 4), track(21, 21, 3), track(22, 22, 5)];
        target.setPath3vFast(clonePaths(next));
        model.set(target, next);
        check();
    });

    test("setPath3vFast with colors", () => {
        const { target, model, check } = setupBatch();
        const next = [track(20, 20, 4), track(21, 21, 3), track(22, 22, 5)];
        target.setPath3vFast(clonePaths(next), [[GREEN, GREEN, GREEN, GREEN], [BLUE, BLUE, BLUE], [RED]]);
        model.set(target, next);
        check();
        expectPointColors(target, 0, [GREEN, GREEN, GREEN, GREEN]);
        expectPointColors(target, 1, [BLUE, BLUE, BLUE]);
    });

    test.each([
        ["same sizes", [3, 2]],
        ["different sizes", [5, 4]]
    ])("setPathLonLat, %s", (_name, counts) => {
        const { makeLonLat, model, check } = setup();
        makeLonLat([lonLatTrack(0, 0, 2)]);
        const polyline = makeLonLat([lonLatTrack(1, 1, 3), lonLatTrack(2, 2, 2)]);
        makeLonLat([lonLatTrack(3, 3, 4)]);
        const next = counts.map((n, i) => lonLatTrack(10 + i, 10, n));
        polyline.setPathLonLat(next.map((seg) => seg.map((ll) => ll.clone())));
        model.set(
            polyline,
            next.map((seg) => seg.map((ll) => wgs84.lonLatToCartesian(ll)))
        );
        check();
    });

    test("setPathLonLatFast", () => {
        const { makeLonLat, model, check } = setup();
        const polyline = makeLonLat([lonLatTrack(1, 1, 3), lonLatTrack(2, 2, 2)]);
        makeLonLat([lonLatTrack(3, 3, 4)]);
        const next = [lonLatTrack(10, 10, 3), lonLatTrack(11, 10, 2)];
        polyline.setPathLonLatFast(next.map((seg) => seg.map((ll) => ll.clone())));
        model.set(
            polyline,
            next.map((seg) => seg.map((ll) => wgs84.lonLatToCartesian(ll)))
        );
        check();
    });

    test("appendPath3v", () => {
        const { target, segs, check } = setupBatch();
        const next = track(20, 20, 4);
        target.appendPath3v(next.map((p) => p.clone()));
        segs.push(next);
        check();
    });

    test("appendPathLonLat", () => {
        const { makeLonLat, model, check } = setup();
        const polyline = makeLonLat([lonLatTrack(1, 1, 3)]);
        makeLonLat([lonLatTrack(3, 3, 4)]);
        const next = lonLatTrack(10, 10, 3);
        polyline.appendPathLonLat(next.map((ll) => ll.clone()));
        model.get(polyline).push(next.map((ll) => wgs84.lonLatToCartesian(ll)));
        check();
    });

    test.each([0, 1, 2])("removePath %i", (s) => {
        const { target, segs, check } = setupBatch();
        target.removePath(s);
        segs.splice(s, 1);
        check();
    });

    test("removePath until empty", () => {
        const { target, segs, check } = setupBatch();
        while (segs.length) {
            target.removePath(0);
            segs.splice(0, 1);
            check();
        }
    });

    test("clear", () => {
        const { target, model, check } = setupBatch();
        target.clear();
        model.set(target, []);
        check();
    });
});

describe("properties", () => {
    test("setColor", () => {
        const { target, check } = setupBatch();
        target.setColor("blue");
        check();
        expectPointColors(target, 1, [BLUE, BLUE, BLUE]);
    });

    test("setPathColors for one segment", () => {
        const { target, check } = setupBatch();
        target.setPathColors([GREEN, BLUE, RED], 1);
        check();
        expectPointColors(target, 1, [GREEN, BLUE, RED]);
    });

    test("setPathColors for all segments", () => {
        const { target, check } = setupBatch();
        target.setPathColors([[GREEN], [BLUE, RED, GREEN], [RED]]);
        check();
        expectPointColors(target, 0, [GREEN, GREEN, GREEN, GREEN]);
        expectPointColors(target, 1, [BLUE, RED, GREEN]);
    });

    test("setThickness", () => {
        const { target, check } = setupBatch();
        target.setThickness(9);
        check();
    });

    test.each([0.5, 0.25])("setOpacity %f moves the polyline between batches", (opacity) => {
        const { target, check } = setupBatch();
        target.setOpacity(opacity);
        check();
        expectPointColors(target, 1, [RED, RED, RED], opacity);
        target.setOpacity(1);
        check();
        expectPointColors(target, 1, [RED, RED, RED]);
    });

    test("setOpacity inside the transparent batch", () => {
        const { target, check } = setupBatch(true, { opacity: 0.5 });
        target.setOpacity(0.25);
        check();
        expectPointColors(target, 1, [RED, RED, RED], 0.25);
    });

    test("isClosed", () => {
        const { target, check } = setupBatch();
        target.isClosed = true;
        check();
        target.isClosed = false;
        check();
    });

    test("setVisibility", () => {
        const { target, check } = setupBatch();
        target.setVisibility(false);
        check();
        target.setVisibility(true);
        check();
    });
});

describe("handler", () => {
    test.each(["before", "target", "after"])("remove the %s polyline", (name) => {
        const ctx = setupBatch();
        ctx.handler.remove(ctx[name]);
        ctx.model.delete(ctx[name]);
        ctx.check();
    });

    test("remove all polylines and add again", () => {
        const ctx = setupBatch();
        for (const name of ["target", "before", "after"]) {
            ctx.handler.remove(ctx[name]);
            ctx.model.delete(ctx[name]);
            ctx.check();
        }
        ctx.make([track(9, 9, 3)]);
        ctx.check();
    });
});

describe("geodetic segments", () => {
    test.each([
        ["same size", 3, false],
        ["longer", 5, false],
        ["same size forceEqual", 3, true],
        ["longer forceEqual", 5, true]
    ])("setPathLonLat of one segment, %s", (_name, n, forceEqual) => {
        const { makeLonLat, model, check } = setup();
        makeLonLat([lonLatTrack(0, 0, 2)]);
        const polyline = makeLonLat([lonLatTrack(1, 1, 3), lonLatTrack(2, 2, 3)]);
        makeLonLat([lonLatTrack(3, 3, 4)]);
        const next = lonLatTrack(10, 10, n);
        polyline.setPathLonLat(
            next.map((ll) => ll.clone()),
            undefined,
            forceEqual,
            0
        );
        model.get(polyline)[0] = next.map((ll) => wgs84.lonLatToCartesian(ll));
        check();
    });
});

function random(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

describe("random edit sequences", () => {
    test.each(Array.from({ length: 30 }, (_, i) => i + 1))("seed %i", (seed) => {
        const rnd = random(seed);
        const int = (n) => Math.floor(rnd() * n);
        const ctx = setup();
        const polylines = [
            ctx.make([track(0, 0, 3), track(1, 1, 4)], { color: "white" }),
            ctx.make([track(2, 2, 5)], { color: "red", opacity: 0.5 }),
            ctx.make([track(3, 3, 3), track(4, 4, 3), track(5, 5, 2)], { color: "green" }),
            ctx.make([track(6, 6, 4), track(7, 7, 3)], { color: "blue", isClosed: true })
        ];
        const log = [];

        const ops = [
            (pl, segs) => {
                const s = int(segs.length);
                const p = point(rnd() * 10, rnd() * 10);
                log.push(`addPoint3v seg ${s}`);
                pl.addPoint3v(p.clone(), s);
                segs[s].push(p);
            },
            (pl, segs) => {
                const s = int(segs.length);
                const i = int(segs[s].length + 1);
                const p = point(rnd() * 10, rnd() * 10);
                log.push(`insertPoint3v seg ${s} at ${i}`);
                pl.insertPoint3v(p.clone(), i, undefined, s);
                segs[s].splice(i, 0, p);
            },
            (pl, segs) => {
                if (segs.length <= 1 && segs[0].length <= 1) return;
                const s = int(segs.length);
                const i = int(segs[s].length);
                log.push(`removePoint seg ${s} at ${i}`);
                pl.removePoint(i, s);
                segs[s].splice(i, 1);
                if (segs[s].length === 0) segs.splice(s, 1);
            },
            (pl, segs) => {
                const s = int(segs.length);
                const p = point(rnd() * 10, rnd() * 10);
                const color = [RED, GREEN, BLUE][int(3)];
                log.push(`addPoint3v with color seg ${s}`);
                pl.addPoint3v(p.clone(), s, color);
                segs[s].push(p);
            },
            (pl, segs) => {
                const s = int(segs.length);
                const i = int(segs[s].length);
                log.push(`setPointColor seg ${s} at ${i}`);
                pl.setPointColor([RED, GREEN, BLUE][int(3)], i, s);
            },
            (pl, segs) => {
                const s = int(segs.length);
                log.push(`setPathColors seg ${s}`);
                pl.setPathColors(
                    segs[s].slice(0, 1 + int(segs[s].length)).map(() => [RED, GREEN, BLUE][int(3)]),
                    s
                );
            },
            (pl) => {
                log.push(`isClosed toggle`);
                pl.isClosed = !pl.isClosed;
            },
            (pl, segs) => {
                const s = int(segs.length);
                const i = int(segs[s].length);
                const p = point(rnd() * 10, rnd() * 10);
                log.push(`setPoint3v seg ${s} at ${i}`);
                pl.setPoint3v(p.clone(), i, s);
                segs[s][i] = p;
            },
            (pl, segs) => {
                const p = track(rnd() * 10, rnd() * 10, 2 + int(4));
                log.push(`appendPath3v ${p.length}`);
                pl.appendPath3v(p.map((v) => v.clone()));
                segs.push(p);
            },
            (pl, segs) => {
                if (segs.length <= 1) return;
                const s = int(segs.length);
                log.push(`removePath ${s}`);
                pl.removePath(s);
                segs.splice(s, 1);
            },
            (pl, segs) => {
                const next = segs.map((seg) => track(rnd() * 10, rnd() * 10, seg.length));
                log.push(`setPath3v forceEqual`);
                pl.setPath3v(clonePaths(next), undefined, true);
                segs.splice(0, segs.length, ...next);
            },
            (pl, segs) => {
                const next = segs.map(() => track(rnd() * 10, rnd() * 10, 2 + int(4)));
                log.push(`setPath3v`);
                pl.setPath3v(clonePaths(next));
                segs.splice(0, segs.length, ...next);
            },
            (pl) => {
                const opacity = [1, 0.5, 0.25][int(3)];
                log.push(`setOpacity ${opacity}`);
                pl.setOpacity(opacity);
            },
            (pl) => {
                log.push(`setVisibility toggle`);
                pl.setVisibility(!pl.getVisibility());
            },
            (pl) => {
                log.push(`setColor`);
                pl.setColor(["red", "blue", "white"][int(3)]);
            },
            (pl) => {
                log.push(`setThickness`);
                pl.setThickness(1 + int(5));
            }
        ];

        for (let step = 0; step < 300; step++) {
            const pl = polylines[int(polylines.length)];
            const segs = ctx.model.get(pl);
            const op = ops[int(ops.length)];
            try {
                op(pl, segs);
                ctx.check();
            } catch (e) {
                throw new Error(`step ${step}: ${log.slice(-5).join(" | ")}\n${e.message}`);
            }
        }
    });
});

describe("found by random sequences", () => {
    test.each([
        ["setPath3v", (pl) => pl.setPath3v([track(20, 20, 3)])],
        ["appendPath3v", (pl) => pl.appendPath3v(track(20, 20, 3))]
    ])("%s keeps a hidden polyline out of the batch", (_name, edit) => {
        const { target, check } = setupBatch();
        target.setVisibility(false);
        edit(target);
        expect(target._batchRendererIndexes).toEqual([]);
        check();
    });

    test("setPath3v forceEqual keeps polyline opacity", () => {
        const { target, model, check } = setupBatch(true, { opacity: 0.5 });
        const next = [track(20, 20, 4), track(21, 21, 3), track(22, 22, 5)];
        target.setPath3v(clonePaths(next), undefined, true);
        model.set(target, next);
        check();
        expectPointColors(target, 1, [RED, RED, RED], 0.5);
    });

    test.each([
        [
            "addPoint3v",
            (pl, seg) => {
                const p = point(30, 30);
                pl.addPoint3v(p.clone(), 3);
                seg.push(p);
            }
        ],
        [
            "insertPoint3v",
            (pl, seg) => {
                const p = point(30, 30);
                pl.insertPoint3v(p.clone(), 1, undefined, 3);
                seg.splice(1, 0, p);
            }
        ],
        [
            "removePoint",
            (pl, seg) => {
                pl.removePoint(1, 3);
                seg.splice(1, 1);
            }
        ]
    ])("%s on a segment added by appendPath3v", (_name, edit) => {
        const { target, segs, check } = setupBatch();
        const next = track(20, 20, 4);
        target.appendPath3v(next.map((p) => p.clone()));
        segs.push(next);
        edit(target, segs[3]);
        check();
    });
});

describe("plain array coordinates", () => {
    const toArrays = (seg) => seg.map((p) => [p.x, p.y, p.z]);

    test.each([false, true])("setPath3v with arrays, forceEqual %s", (forceEqual) => {
        const { target, model, check } = setupBatch();
        const next = [track(20, 20, 4), track(21, 21, 3), track(22, 22, 5)];
        target.setPath3v(next.map(toArrays), undefined, forceEqual);
        model.set(target, next);
        check();
    });

    test.each([false, true])("setPath3v of one segment with arrays, forceEqual %s", (forceEqual) => {
        const { target, segs, check } = setupBatch();
        const next = track(20, 20, 3);
        target.setPath3v(toArrays(next), undefined, forceEqual, 1);
        segs[1] = next;
        check();
    });

    test.each([false, true])("setPathLonLat with arrays, forceEqual %s", (forceEqual) => {
        const { makeLonLat, model, check } = setup();
        const polyline = makeLonLat([lonLatTrack(1, 1, 3), lonLatTrack(2, 2, 2)]);
        const next = [lonLatTrack(10, 10, 3), lonLatTrack(11, 10, 2)];
        polyline.setPathLonLat(
            next.map((seg) => seg.map((ll) => [ll.lon, ll.lat, ll.height])),
            undefined,
            forceEqual
        );
        model.set(
            polyline,
            next.map((seg) => seg.map((ll) => wgs84.lonLatToCartesian(ll)))
        );
        check();
    });

    test.each([false, true])("setPathLonLat of one segment with arrays, forceEqual %s", (forceEqual) => {
        const { makeLonLat, model, check } = setup();
        const polyline = makeLonLat([lonLatTrack(1, 1, 3), lonLatTrack(2, 2, 2)]);
        const next = lonLatTrack(10, 10, 3);
        polyline.setPathLonLat(
            next.map((ll) => [ll.lon, ll.lat, ll.height]),
            undefined,
            forceEqual,
            0
        );
        model.get(polyline)[0] = next.map((ll) => wgs84.lonLatToCartesian(ll));
        check();
    });
});
