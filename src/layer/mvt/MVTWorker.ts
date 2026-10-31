import { BaseWorker } from "../../utils/BaseWorker";
import type { IMVTDecodedTile, IMVTDecodeRequest } from "./decodeMVTFeatures";
//@ts-ignore
import MVTWorkerImpl from "./MVTWorker.worker.js?worker&inline";

interface IMVTTask {
    data: ArrayBuffer;
    request: IMVTDecodeRequest;
    callback: (result: IMVTDecodedTile | null) => void;
}

type MessageEventExt = MessageEvent & {
    data: {
        id: number;
        result: IMVTDecodedTile | null;
    };
};

/**
 * Decodes vector tiles out of the main thread, as decodeMVTFeatures does.
 */
class MVTWorker extends BaseWorker<IMVTTask> {
    constructor(numWorkers: number = 2) {
        super(numWorkers, MVTWorkerImpl);
    }

    /**
     * Returns the promise of the decoded tile, null if decoding failed. The tile data is moved to the worker.
     */
    public decode(data: ArrayBuffer, request: IMVTDecodeRequest): Promise<IMVTDecodedTile | null> {
        return new Promise((resolve) => this.make({ data, request, callback: resolve }));
    }

    protected override _onMessage(e: MessageEventExt) {
        let task = this._source.get(e.data.id)!;
        this._source.delete(e.data.id);
        task.callback(e.data.result);
    }

    public override make(task: IMVTTask) {
        if (this._workerQueue.length) {
            let w = this._workerQueue.pop()!;
            this._source.set(this._sourceId, task);
            w.postMessage({ id: this._sourceId, data: task.data, request: task.request }, [task.data]);
            this._sourceId++;
        } else {
            this._pendingQueue.push(task);
        }
    }
}

let _mvtWorker: MVTWorker | null = null;

/**
 * Returns the vector tiles worker shared by the layers, null out of a browser.
 */
function getMVTWorker(): MVTWorker | null {
    if (!_mvtWorker && typeof Worker !== "undefined") {
        _mvtWorker = new MVTWorker(2);
    }
    return _mvtWorker;
}

export { MVTWorker, getMVTWorker };
