import { describe, test, expect, vi } from "vitest";
import { TerrainWorker } from "../../src/utils/TerrainWorker";
import { PlainSegmentWorker } from "../../src/utils/PlainSegmentWorker";
import { Geoid } from "../../src/terrain/Geoid";

// The terrain is changed while a worker computes a task: the worker has not got the new geoid,
// the data it returns are dropped, it gets the geoid then, and the segment asks for the data again.

const createGeoid = () =>
    new Geoid({
        model: {
            scale: 0.003,
            offset: -108,
            width: 4,
            height: 3,
            rlonres: 0.01,
            rlatres: 0.01,
            i: 0,
            rawfile: new Uint8Array(24)
        }
    });

const createWorker = () => ({ postMessage: vi.fn() });

function createPool(WorkerPool) {
    const pool = new WorkerPool(1);
    pool._workerQueue = [createWorker()];
    return pool;
}

// The pool gets the result of the task id from the worker
const reply = (pool, worker, data) => pool._onMessage({ target: worker, data });

describe("TerrainWorker", () => {
    const createSegment = () => ({ terrainIsLoading: true, _terrainWorkerCallback: vi.fn() });

    test("takes the data made with the geoid of the terrain", () => {
        const pool = createPool(TerrainWorker),
            geoid = createGeoid(),
            segment = createSegment(),
            busy = createWorker();

        pool.setGeoid(geoid);
        pool._source.set(4, { segment });

        reply(pool, busy, { id: 4, geoidId: geoid.id });

        expect(segment._terrainWorkerCallback).toHaveBeenCalledTimes(1);
        expect(busy.postMessage).not.toHaveBeenCalled();
        expect(pool._source.has(4)).toBe(false);
    });

    test("drops the data made with another geoid, sends the geoid to the worker, the segment loads again", () => {
        const pool = createPool(TerrainWorker),
            old = createGeoid(),
            geoid = createGeoid(),
            segment = createSegment(),
            busy = createWorker();

        pool.setGeoid(old);
        pool._source.set(4, { segment });

        // The terrain is changed while the busy worker computes the task 4
        pool.setGeoid(geoid);
        reply(pool, busy, { id: 4, geoidId: old.id });

        expect(segment._terrainWorkerCallback).not.toHaveBeenCalled();
        expect(segment.terrainIsLoading).toBe(false);
        expect(busy.postMessage).toHaveBeenCalledTimes(1);
        expect(busy.postMessage.mock.calls[0][0].geoidId).toBe(geoid.id);
        expect(pool._source.has(4)).toBe(false);
    });

    test("takes all the data when no geoid is set", () => {
        const pool = createPool(TerrainWorker),
            segment = createSegment();

        pool._source.set(4, { segment });
        reply(pool, createWorker(), { id: 4, geoidId: -1 });

        expect(segment._terrainWorkerCallback).toHaveBeenCalledTimes(1);
    });
});

describe("PlainSegmentWorker", () => {
    const createSegment = () => ({
        plainProcessing: true,
        _plainSegmentWorkerCallback: vi.fn(),
        _plainNormalsWorkerCallback: vi.fn()
    });

    test("takes the mesh and the normals made with the geoid of the terrain", () => {
        const pool = createPool(PlainSegmentWorker),
            geoid = createGeoid(),
            segment = createSegment(),
            normals = new Float32Array(3);

        pool.setGeoid(geoid);
        pool._source.set(1, segment);
        pool._source.set(2, segment);

        reply(pool, createWorker(), { id: 1, geoidId: geoid.id });
        reply(pool, createWorker(), { id: 2, geoidId: geoid.id, normalMapNormals: normals });

        expect(segment._plainSegmentWorkerCallback).toHaveBeenCalledTimes(1);
        expect(segment._plainNormalsWorkerCallback).toHaveBeenCalledWith(normals);
    });

    test("drops the mesh made with another geoid, the segment asks again", () => {
        const pool = createPool(PlainSegmentWorker),
            old = createGeoid(),
            geoid = createGeoid(),
            segment = createSegment(),
            busy = createWorker();

        pool.setGeoid(old);
        pool._source.set(1, segment);
        pool.setGeoid(geoid);

        reply(pool, busy, { id: 1, geoidId: old.id });

        expect(segment._plainSegmentWorkerCallback).not.toHaveBeenCalled();
        // Node.renderNode asks for the plain segment again when it is not processed
        expect(segment.plainProcessing).toBe(false);
        expect(busy.postMessage.mock.calls[0][0].geoidId).toBe(geoid.id);
        expect(pool._source.has(1)).toBe(false);
    });

    test("drops the normals made with another geoid, they are asked again", () => {
        const pool = createPool(PlainSegmentWorker),
            old = createGeoid(),
            geoid = createGeoid(),
            segment = createSegment(),
            busy = createWorker();

        pool.setGeoid(old);
        pool._source.set(2, segment);
        pool.setGeoid(geoid);

        reply(pool, busy, { id: 2, geoidId: old.id, normalMapNormals: new Float32Array(3) });

        expect(segment._plainNormalsWorkerCallback).not.toHaveBeenCalled();
        // The task goes again when a worker is free, BaseWorker.check
        expect(pool.pendingQueue).toEqual([segment]);
        expect(busy.postMessage.mock.calls[0][0].geoidId).toBe(geoid.id);
    });
});

describe("terrain change", () => {
    test("the waiting tasks of the destroyed segments are removed, the others stay", () => {
        const terrainPool = createPool(TerrainWorker),
            plainPool = createPool(PlainSegmentWorker);

        const loading = { segment: { plainReady: true, terrainIsLoading: true } },
            destroyed = { segment: { plainReady: false, terrainIsLoading: true } };
        terrainPool._pendingQueue.push(destroyed, loading);

        const root = { initialized: true },
            cleared = { initialized: false };
        plainPool._pendingQueue.push(cleared, root);

        terrainPool.clearPendingQueue();
        plainPool.clearPendingQueue();

        expect(terrainPool.pendingQueue).toEqual([loading]);
        expect(plainPool.pendingQueue).toEqual([root]);
    });
});

describe("worker modules", () => {
    test("return the id of the geoid they have", async () => {
        const post = vi.spyOn(self, "postMessage").mockImplementation(() => {});

        await import("../../src/utils/TerrainWorker.worker.js");
        const terrainWorker = self.onmessage;

        terrainWorker({ data: { geoidId: 9, model: null } });
        terrainWorker({
            data: {
                elevations: new Float32Array(9),
                params: new Float64Array([
                    3, 1, 2, 2, -1e-3, -1e-3, 1e-3, 1e-3, 0, 1e6, 1e-12, 1e-12, 1e-12, 1, 1e6, 0, 0
                ]),
                heightFactor: 1,
                gridSize: 2,
                noDataValues: [],
                id: 3
            }
        });

        expect(post.mock.calls[0][0]).toMatchObject({ id: 3, geoidId: 9 });
        post.mockRestore();
    });
});
