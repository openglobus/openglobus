import { BaseWorker } from "./BaseWorker";
//@ts-ignore
import HeightsGridWorkerImpl from "./HeightsGridWorker.worker.js?worker&inline";

export interface IHeightsGridTask {
    /** Pixel heights, they are moved to the worker. */
    pixels: Float32Array;
    size: number;
    gridSize: number;
    levels: number;
    noDataHeight: number;
    callback: (heights: Float32Array | null) => void;
}

type MessageEventExt = MessageEvent & {
    data: {
        id: number;
        heights: Float32Array | null;
    };
};

/**
 * Makes the terrain grid heights of the tile pixels, the same as createTileHeights does.
 */
class HeightsGridWorker extends BaseWorker<IHeightsGridTask> {
    constructor(numWorkers: number = 2) {
        super(numWorkers, HeightsGridWorkerImpl);
    }

    protected override _onMessage(e: MessageEventExt) {
        let task = this._source.get(e.data.id)!;
        this._source.delete(e.data.id);
        task.callback(e.data.heights);
    }

    public override make(task: IHeightsGridTask) {
        if (this._workerQueue.length) {
            let w = this._workerQueue.pop()!;

            this._source.set(this._sourceId, task);

            w.postMessage(
                {
                    id: this._sourceId,
                    pixels: task.pixels,
                    size: task.size,
                    gridSize: task.gridSize,
                    levels: task.levels,
                    noDataHeight: task.noDataHeight
                },
                [task.pixels.buffer]
            );

            this._sourceId++;
        } else {
            this._pendingQueue.push(task);
        }
    }
}

export { HeightsGridWorker };
