import { Polyline } from "../../src/entity/polyline/Polyline";
import { Vector } from "../../src/layer/Vector";
import { createCollection, createScene, checkHandler, expectPointTimes, point, track } from "./polylineArrays";

const T0 = 1_760_000_000_000;

const clonePaths = (paths) => paths.map((seg) => seg.map((p) => p.clone()));
const timesFor = (paths, start = T0, step = 1000) => {
    let t = start;
    return paths.map((seg) => seg.map(() => (t += step)));
};

function setup(bound = true) {
    const { entityCollection, handler } = createCollection(bound);
    const model = new Map();

    const make = (paths, options = {}) => {
        const polyline = new Polyline({ path3v: clonePaths(paths), ...options });
        handler.add(polyline);
        model.set(polyline, clonePaths(paths));
        return polyline;
    };

    const check = () => checkHandler(handler, model);

    return { entityCollection, handler, model, make, check };
}

function setupTimed(options = {}) {
    const ctx = setup();
    ctx.plain = ctx.make([track(0, 0, 3)], { color: "white" });
    const paths = [track(2, 2, 4), track(3, 3, 3), track(4, 4, 5)];
    ctx.times = timesFor(paths);
    ctx.target = ctx.make(paths, { color: "red", pathTimes: ctx.times, ...options });
    ctx.other = ctx.make([track(5, 5, 3)], { pathTimes: timesFor([[0, 0, 0]], T0 + 500_000) });
    ctx.segs = ctx.model.get(ctx.target);
    return ctx;
}

describe("timed batches", () => {
    test("untimed polylines do not create timed renderers", () => {
        const { handler, make, check } = setup();
        make([track(0, 0, 3)]);
        make([track(1, 1, 4)], { opacity: 0.5 });
        expect(handler._timedRenderer).toBeNull();
        expect(handler._timedTexRenderer).toBeNull();
        check();
    });

    test("timed polylines go to the timed renderer", () => {
        const { handler, plain, target, other, times, check } = setupTimed();
        expect(plain._batchRenderer).toBe(handler._opaqueRenderer);
        expect(target._batchRenderer).toBe(handler._timedRenderer);
        expect(other._batchRenderer).toBe(handler._timedRenderer);
        expect(handler._timedRenderer.isTimed).toBe(true);
        check();
        times.forEach((t, s) => expectPointTimes(target, s, t));
    });

    test("timed polylines added before the scene", () => {
        const { handler, make, check } = setup(false);
        const paths = [track(0, 0, 3), track(1, 1, 2)];
        const times = timesFor(paths);
        const polyline = make(paths, { pathTimes: times });
        handler.bindScene(createScene());
        check();
        times.forEach((t, s) => expectPointTimes(polyline, s, t));
    });

    test("epoch milliseconds keep millisecond precision", () => {
        const { make, check } = setup();
        const paths = [track(0, 0, 4)];
        const times = [[T0, T0 + 1, T0 + 7, T0 + 3_600_000]];
        const polyline = make(paths, { pathTimes: times });
        check();
        expectPointTimes(polyline, 0, times[0]);
        expect(polyline._batchRenderer.getTimeCut(T0 + 7) - polyline._batchRenderer.getTimeCut(T0 + 1)).toBe(6);
    });

    test("missing times repeat the previous one", () => {
        const { make, check } = setup();
        const polyline = make([track(0, 0, 5)], { pathTimes: [[undefined, T0 + 10, undefined, T0 + 30]] });
        check();
        expectPointTimes(polyline, 0, [T0 + 10, T0 + 10, T0 + 10, T0 + 30, T0 + 30]);
    });

    test("time cut is relative to the batch origin", () => {
        const { target } = setupTimed();
        const r = target._batchRenderer;
        expect(r.getTimeCut(T0 + 1000)).toBe(0);
        expect(r.getTimeCut(T0 + 2500)).toBe(1500);
        expect(r.getTimeCut(T0 - 1e15)).toBe(-0x3fffffff);
    });
});

describe("timed edits", () => {
    test.each([0, 1, 2])("addPoint3v with time to segment %i", (s) => {
        const { target, segs, times, check } = setupTimed();
        const p = point(10, 10);
        target.addPoint3v(p.clone(), s, undefined, T0 + 99_000);
        segs[s].push(p);
        times[s].push(T0 + 99_000);
        check();
        expectPointTimes(target, s, times[s]);
    });

    test("addPoint3v without time repeats the last one", () => {
        const { target, segs, times, check } = setupTimed();
        const p = point(10, 10);
        target.addPoint3v(p.clone(), 1);
        segs[1].push(p);
        check();
        expectPointTimes(target, 1, [...times[1], times[1][times[1].length - 1]]);
    });

    test("addPoint3v to a new segment", () => {
        const { target, segs, check } = setupTimed();
        const p0 = point(10, 10),
            p1 = point(10.01, 10);
        target.addPoint3v(p0.clone(), 3, undefined, T0 + 50_000);
        target.addPoint3v(p1.clone(), 3, undefined, T0 + 51_000);
        segs.push([p0, p1]);
        check();
        expectPointTimes(target, 3, [T0 + 50_000, T0 + 51_000]);
    });

    test.each([0, 2, 4])("insertPoint3v with time at %i", (i) => {
        const { target, segs, times, check } = setupTimed();
        const p = point(10, 10);
        target.insertPoint3v(p.clone(), i, undefined, 0, T0 + 77_000);
        segs[0].splice(i, 0, p);
        times[0].splice(i, 0, T0 + 77_000);
        check();
        expectPointTimes(target, 0, times[0]);
    });

    test("insertPoint3v without time takes the previous point time", () => {
        const { target, segs, times, check } = setupTimed();
        const p = point(10, 10);
        target.insertPoint3v(p.clone(), 2, undefined, 0);
        segs[0].splice(2, 0, p);
        times[0].splice(2, 0, times[0][1]);
        check();
        expectPointTimes(target, 0, times[0]);
    });

    test.each([
        [0, 0],
        [0, 3],
        [2, 2]
    ])("removePoint segment %i at %i", (s, i) => {
        const { target, segs, times, check } = setupTimed();
        target.removePoint(i, s);
        segs[s].splice(i, 1);
        times[s].splice(i, 1);
        check();
        expectPointTimes(target, s, times[s]);
    });

    test.each([0, 1, 2])("removePath %i", (s) => {
        const { target, segs, times, check } = setupTimed();
        target.removePath(s);
        segs.splice(s, 1);
        times.splice(s, 1);
        check();
        times.forEach((t, k) => expectPointTimes(target, k, t));
    });

    test("appendPath3v with times", () => {
        const { target, segs, check } = setupTimed();
        const next = track(20, 20, 3);
        const t = [T0 + 1, T0 + 2, T0 + 3];
        target.appendPath3v(
            next.map((p) => p.clone()),
            undefined,
            t
        );
        segs.push(next);
        check();
        expectPointTimes(target, 3, t);
    });

    test("setPathTimes of one segment", () => {
        const { target, check } = setupTimed();
        const t = [T0 + 5, T0 + 6, T0 + 7];
        target.setPathTimes(t, 1);
        check();
        expectPointTimes(target, 1, t);
    });

    test("setPathTimes of all segments", () => {
        const { target, segs, check } = setupTimed();
        const next = timesFor(segs, T0 + 1_000_000, 10);
        target.setPathTimes(next);
        check();
        next.forEach((t, s) => expectPointTimes(target, s, t));
    });

    test("setPathTimes(null) moves the polyline out of the timed batch", () => {
        const { handler, target, check } = setupTimed();
        target.setPathTimes(null);
        expect(target._batchRenderer).toBe(handler._opaqueRenderer);
        check();
    });

    test("setPathTimes on an untimed polyline moves it to the timed batch", () => {
        const { handler, plain, check } = setupTimed();
        plain.setPathTimes([[T0, T0 + 1, T0 + 2]]);
        expect(plain._batchRenderer).toBe(handler._timedRenderer);
        check();
        expectPointTimes(plain, 0, [T0, T0 + 1, T0 + 2]);
    });

    test("setPath3v keeps the times of the segments", () => {
        const { target, model, times, check } = setupTimed();
        const next = [track(20, 20, 4), track(21, 21, 3), track(22, 22, 5)];
        target.setPath3v(clonePaths(next));
        model.set(target, next);
        check();
        times.forEach((t, s) => expectPointTimes(target, s, t));
    });

    test("setOpacity keeps the timed batch", () => {
        const { handler, target, times, check } = setupTimed();
        target.setOpacity(0.5);
        expect(target._batchRenderer).toBe(handler._timedRenderer);
        check();
        expectPointTimes(target, 2, times[2]);
    });

    test("setVisibility", () => {
        const { target, times, check } = setupTimed();
        target.setVisibility(false);
        check();
        target.setVisibility(true);
        check();
        times.forEach((t, s) => expectPointTimes(target, s, t));
    });

    test("removing timed polylines", () => {
        const { handler, target, other, model, check } = setupTimed();
        handler.remove(target);
        model.delete(target);
        check();
        handler.remove(other);
        model.delete(other);
        check();
    });

    test("entity collection passes time to its polyline and strip handlers", () => {
        const { entityCollection } = setupTimed();
        entityCollection.setTime(T0 + 1234);
        entityCollection.setTimeOpacity(0.7, 0.2);
        for (const handler of [entityCollection.polylineHandler, entityCollection.stripHandler]) {
            expect(handler.time).toBe(T0 + 1234);
            expect(Array.from(handler.timeOpacity)).toEqual([0.699999988079071, 0.20000000298023224]);
        }
        expect(entityCollection.time).toBeUndefined();
    });

    test("vector layer passes time to its polyline and strip collections", () => {
        const layer = new Vector("times");
        layer.setTime(T0 + 5);
        layer.setTimeOpacity(1, 0.3);
        for (const ec of [layer._polylineEntityCollection, layer._stripEntityCollection]) {
            expect(ec.polylineHandler.time).toBe(T0 + 5);
            expect(ec.stripHandler.timeOpacity[1]).toBeCloseTo(0.3);
        }
        expect(layer.time).toBeUndefined();
    });
});

function random(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

describe("random timed edits", () => {
    test.each(Array.from({ length: 20 }, (_, i) => i + 1))("seed %i", (seed) => {
        const rnd = random(seed);
        const int = (n) => Math.floor(rnd() * n);
        const ctx = setup();
        const timesModel = new Map();
        const make = (paths, options) => {
            const times = timesFor(paths, T0 + int(1e6));
            const pl = ctx.make(paths, { ...options, pathTimes: times });
            timesModel.set(pl, times);
            return pl;
        };
        const polylines = [
            make([track(0, 0, 3), track(1, 1, 4)], { color: "white" }),
            make([track(2, 2, 5)], { color: "red", opacity: 0.5 }),
            make([track(3, 3, 3), track(4, 4, 2)], { color: "green", isClosed: true })
        ];
        ctx.make([track(6, 6, 3)]);
        const log = [];
        const newTime = () => T0 + int(1e7);

        const ops = [
            (pl, segs, times) => {
                const s = int(segs.length);
                const p = point(rnd() * 10, rnd() * 10);
                const t = newTime();
                log.push(`addPoint3v seg ${s}`);
                pl.addPoint3v(p.clone(), s, undefined, t);
                segs[s].push(p);
                times[s].push(t);
            },
            (pl, segs, times) => {
                const s = int(segs.length);
                const i = int(segs[s].length + 1);
                const p = point(rnd() * 10, rnd() * 10);
                const t = newTime();
                log.push(`insertPoint3v seg ${s} at ${i}`);
                pl.insertPoint3v(p.clone(), i, undefined, s, t);
                segs[s].splice(i, 0, p);
                times[s].splice(i, 0, t);
            },
            (pl, segs, times) => {
                if (segs.length <= 1 && segs[0].length <= 1) return;
                const s = int(segs.length);
                const i = int(segs[s].length);
                log.push(`removePoint seg ${s} at ${i}`);
                pl.removePoint(i, s);
                segs[s].splice(i, 1);
                times[s].splice(i, 1);
                if (segs[s].length === 0) {
                    segs.splice(s, 1);
                    times.splice(s, 1);
                }
            },
            (pl, segs) => {
                const s = int(segs.length);
                const i = int(segs[s].length);
                const p = point(rnd() * 10, rnd() * 10);
                log.push(`setPoint3v seg ${s} at ${i}`);
                pl.setPoint3v(p.clone(), i, s);
                segs[s][i] = p;
            },
            (pl, segs, times) => {
                const p = track(rnd() * 10, rnd() * 10, 2 + int(4));
                const t = p.map(() => newTime());
                log.push(`appendPath3v ${p.length}`);
                pl.appendPath3v(
                    p.map((v) => v.clone()),
                    undefined,
                    t
                );
                segs.push(p);
                times.push(t);
            },
            (pl, segs, times) => {
                if (segs.length <= 1) return;
                const s = int(segs.length);
                log.push(`removePath ${s}`);
                pl.removePath(s);
                segs.splice(s, 1);
                times.splice(s, 1);
            },
            (pl, segs, times) => {
                const s = int(segs.length);
                const t = segs[s].map(() => newTime());
                log.push(`setPathTimes seg ${s}`);
                pl.setPathTimes(t, s);
                times[s] = t;
            },
            (pl, segs) => {
                const next = segs.map((seg) => track(rnd() * 10, rnd() * 10, seg.length));
                log.push(`setPath3v forceEqual`);
                pl.setPath3v(clonePaths(next), undefined, true);
                segs.splice(0, segs.length, ...next);
            },
            (pl) => {
                log.push(`setVisibility toggle`);
                pl.setVisibility(!pl.getVisibility());
            },
            (pl) => {
                const opacity = [1, 0.5][int(2)];
                log.push(`setOpacity ${opacity}`);
                pl.setOpacity(opacity);
            }
        ];

        for (let step = 0; step < 300; step++) {
            const pl = polylines[int(polylines.length)];
            const segs = ctx.model.get(pl);
            const times = timesModel.get(pl);
            const op = ops[int(ops.length)];
            try {
                op(pl, segs, times);
                ctx.check();
                if (pl.getVisibility()) {
                    times.forEach((t, s) => expectPointTimes(pl, s, t));
                }
            } catch (e) {
                throw new Error(`step ${step}: ${log.slice(-5).join(" | ")}\n${e.message}`);
            }
        }
    });
});
