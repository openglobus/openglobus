import { BaseWorker } from "./BaseWorker";
import type { IWarpParams } from "../layer/geotiff/warp";
//@ts-ignore
import RasterWorkerImpl from "./RasterWorker.worker.js?worker&inline";

interface IRasterTask {
    /** Task data with its type, the transferable buffers are moved to the worker. */
    data: Record<string, any>;
    transfer: Transferable[];
    callback: (result: any) => void;
}

type MessageEventExt = MessageEvent & {
    data: {
        id: number;
        result: any;
    };
};

/**
 * Raster pixels work out of the main thread: the terrain grid heights of the tile pixels, as createTileHeights
 * makes them, and the GeoTIFF tile resampling, as warpRasters does.
 */
class RasterWorker extends BaseWorker<IRasterTask> {
    constructor(numWorkers: number = 2) {
        super(numWorkers, RasterWorkerImpl);
    }

    /**
     * Returns the promise of the tile grid heights of the pixels, the pixels are moved to the worker.
     */
    public heights(
        pixels: Float32Array,
        size: number,
        gridSize: number,
        levels: number,
        noDataHeight: number
    ): Promise<Float32Array | null> {
        return new Promise((resolve) =>
            this.make({
                data: { type: "heights", pixels, size, gridSize, levels, noDataHeight },
                transfer: [pixels.buffer],
                callback: resolve
            })
        );
    }

    /**
     * Returns the promise of the resampled tile rasters, the window rasters and mask are moved to the worker.
     */
    public warp(p: IWarpParams): Promise<Float32Array[] | null> {
        let transfer: Transferable[] = p.rasters.map((r) => r.buffer);
        if (p.maskRaster) {
            transfer.push(p.maskRaster.buffer);
        }
        return new Promise((resolve) =>
            this.make({
                data: { type: "warp", ...p },
                transfer: Array.from(new Set(transfer)),
                callback: resolve
            })
        );
    }

    protected override _onMessage(e: MessageEventExt) {
        let task = this._source.get(e.data.id)!;
        this._source.delete(e.data.id);
        task.callback(e.data.result);
    }

    public override make(task: IRasterTask) {
        if (this._workerQueue.length) {
            let w = this._workerQueue.pop()!;
            this._source.set(this._sourceId, task);
            w.postMessage({ id: this._sourceId, ...task.data }, task.transfer);
            this._sourceId++;
        } else {
            this._pendingQueue.push(task);
        }
    }
}

let _rasterWorker: RasterWorker | null = null;

/**
 * Returns the raster worker shared by the terrains and layers, null out of a browser.
 */
function getRasterWorker(): RasterWorker | null {
    if (!_rasterWorker && typeof Worker !== "undefined") {
        _rasterWorker = new RasterWorker(2);
    }
    return _rasterWorker;
}

export { RasterWorker, getRasterWorker };
