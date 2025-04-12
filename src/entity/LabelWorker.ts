import {BaseWorker} from "../utils/BaseWorker";
import {Label} from "../entity/Label";
import {LabelHandler} from "../entity/LabelHandler";

//@ts-ignore
import LabelWorkerImpl from './LabelWorker.worker.js?worker&inline';

export const LOCK_UPDATE = -2;
export const LOCK_FREE = -1;

interface LabelInfo {
    label: Label;
    handler: LabelHandler;
}

class LabelWorker extends BaseWorker<LabelInfo> {

    constructor(numWorkers: number = 4) {
        super(numWorkers, LabelWorkerImpl);
    }

    protected override _onMessage(e: MessageEvent) {
        let s = this._source.get(e.data.id)!;

        if (s.label._lockId === LOCK_UPDATE) {
            requestAnimationFrame(() => {
                this.make({handler: s.handler, label: s.label});
            });
        } else {
            s.handler.workerCallback(e.data, s.label);
        }

        this._source.delete(e.data.id);
    }


    public override make(data: LabelInfo) {
        let label = data.label,
            handler = data.handler;

        if (handler._entityCollection) {
            let labelData = label.serializeWorkerData(this._sourceId);
            if (labelData) {
                if (this._workerQueue.length) {
                    let w = this._workerQueue.pop()!;
                    this._source.set(this._sourceId, data);
                    label._lockId = this._sourceId;
                    this._sourceId++;
                    w.postMessage({
                        labelData: labelData
                    }, [
                        labelData.buffer,
                    ]);
                } else {
                    this._pendingQueue.push(data);
                }
            }
        }
    }
}

export {LabelWorker};