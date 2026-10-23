import { BaseWorker } from "./BaseWorker";
import { Segment } from "../segment/Segment";
import type { IRgbHeightsParams } from "../terrain/terrainUtils";
import { packRgbHeightsParams } from "./RgbTerrainWorkerParams";
//@ts-ignore
import RgbTerrainWorkerImpl from "./RgbTerrainWorker.worker.js?worker&inline";

export interface IRgbTerrainWorkerTask {
    segment: Segment;
    bitmap: ImageBitmap;
    params: IRgbHeightsParams;
    callback: (heights: Float32Array | null) => void;
}

type MessageEventExt = MessageEvent & {
    data: {
        id: number;
        heights: Float32Array | null;
    };
};

class RgbTerrainWorker extends BaseWorker<IRgbTerrainWorkerTask> {
    constructor(numWorkers: number = 2) {
        super(numWorkers, RgbTerrainWorkerImpl);
    }

    protected override _onMessage(e: MessageEventExt) {
        let task = this._source.get(e.data.id)!;
        this._source.delete(e.data.id);
        task.callback(e.data.heights);
    }

    public override make(task: IRgbTerrainWorkerTask) {
        if (task.segment.plainReady && task.segment.terrainIsLoading) {
            if (this._workerQueue.length) {
                let w = this._workerQueue.pop()!;

                this._source.set(this._sourceId, task);

                let params = packRgbHeightsParams(this._sourceId, task.params),
                    parentData = task.params.decode.parentData;

                // Parent elevations are still used by the parent segment, so they are copied
                let parentCopy = parentData ? new Float32Array(parentData) : null;

                let transfer: Transferable[] = [params.buffer, task.bitmap];
                if (parentCopy) {
                    transfer.push(parentCopy.buffer);
                }

                w.postMessage(
                    {
                        params: params,
                        parentData: parentCopy,
                        bitmap: task.bitmap
                    },
                    transfer
                );

                this._sourceId++;
            } else {
                this._pendingQueue.push(task);
            }
        } else {
            task.bitmap.close();
            this.check();
        }
    }
}

export { RgbTerrainWorker };
