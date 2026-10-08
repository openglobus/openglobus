import { Pool } from "geotiff";
import type { IGeoTIFFReaderParams } from "./types";

export const MAX_WORKER_POOL_SIZE = 4;

/**
 * A shared worker pool.
 * Call release() when done.
 * The pool is destroyed when no one uses it anymore.
 */
export interface IWorkerPoolHandle {
    pool: Pool | null;
    release(): void;
}

const NO_WORKER_POOL: IWorkerPoolHandle = {
    pool: null,
    release: () => {}
};

let _sharedPool: Pool | null = null;
let _sharedPoolRefs: number = 0;
let _workerSupport: boolean | undefined = undefined;

function detectWorkerSupport(): boolean {
    if (typeof Worker === "undefined" || typeof Worker.prototype === "undefined") {
        return false;
    }

    if (typeof Worker.prototype.addEventListener !== "function" || typeof Worker.prototype.terminate !== "function") {
        return false;
    }

    if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
        return false;
    }

    try {
        const url = URL.createObjectURL(new Blob([""], { type: "application/javascript" }));
        const probe = new Worker(url);
        probe.terminate();
        URL.revokeObjectURL(url);
        return true;
    } catch {
        return false;
    }
}

function isWorkerSupported(): boolean {
    if (_workerSupport === undefined) {
        _workerSupport = detectWorkerSupport();
    }
    return _workerSupport;
}

export function defaultWorkerPoolSize(): number {
    const concurrency = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2;
    return Math.min(concurrency, MAX_WORKER_POOL_SIZE);
}

function destroyPool(pool: Pool): void {
    // Pool.destroy() is async and rejects if worker creation failed
    Promise.resolve(pool.destroy()).catch(() => {
        //empty
    });
}

function acquireSharedPool(): IWorkerPoolHandle {
    if (!_sharedPool) {
        _sharedPool = new Pool(defaultWorkerPoolSize());
    }

    const pool = _sharedPool;
    _sharedPoolRefs++;

    let released = false;

    return {
        pool,
        release: () => {
            if (released) {
                return;
            }
            released = true;
            _sharedPoolRefs--;

            if (_sharedPoolRefs === 0 && _sharedPool === pool) {
                _sharedPool = null;
                destroyPool(pool);
            }
        }
    };
}

/**
 * Gets a worker pool for a GeoTIFF reader.
 *
 * Uses the provided geotiffWorkerPool without destroying it.
 * Creates a dedicated pool if workerPoolSize is set.
 * Otherwise, shares a pool between readers.
 *
 * Returns null if workers are unavailable (decoding runs on the main thread).
 */
export function acquireWorkerPool(options: IGeoTIFFReaderParams): IWorkerPoolHandle {
    if (options.geotiffWorkerPool) {
        return {
            pool: options.geotiffWorkerPool,
            release: () => {}
        };
    }

    if (!isWorkerSupported()) {
        return NO_WORKER_POOL;
    }

    if (options.workerPoolSize === undefined) {
        return acquireSharedPool();
    }

    // Zero disables workers, the same contract geotiff Pool follows
    if (options.workerPoolSize <= 0) {
        return NO_WORKER_POOL;
    }

    const pool = new Pool(options.workerPoolSize);

    return {
        pool,
        release: () => destroyPool(pool)
    };
}
