// import { QueueArray } from '../QueueArray.js';

import {BaseWorker} from "./BaseWorker";
import {Segment} from "../segment/Segment";
import type {NumberArray6} from "../bv/Sphere";

//@ts-ignore
import TerrainWorkerImpl from './TerrainWorker.worker.js?worker&inline';

interface TerrainInfo {
    segment: Segment;
    elevations: Float32Array;
}

export interface ITerrainWorkerData {
    id: number;
    normalMapNormals: Float32Array | null;
    normalMapVertices: Float64Array | null;
    normalMapVerticesHigh: Float32Array | null;
    normalMapVerticesLow: Float32Array | null;
    terrainVertices: Float64Array | null;
    terrainVerticesHigh: Float32Array | null;
    terrainVerticesLow: Float32Array | null;
    noDataVertices: Uint8Array | null;
    bounds: NumberArray6;
}

type MessageEventExt = MessageEvent & {
    data: ITerrainWorkerData
}

class TerrainWorker extends BaseWorker<TerrainInfo> {
    constructor(numWorkers: number = 2) {
        super(numWorkers, TerrainWorkerImpl);
    }

    protected override _onMessage(e: MessageEventExt) {
        this._source.get(e.data.id)!.segment._terrainWorkerCallback(e.data);
        this._source.delete(e.data.id);

        e.data.normalMapNormals = null;
        e.data.normalMapVertices = null;
        e.data.normalMapVerticesHigh = null;
        e.data.normalMapVerticesLow = null;
        e.data.terrainVertices = null;
        e.data.terrainVerticesHigh = null;
        e.data.terrainVerticesLow = null;
    }

    public override make(info: TerrainInfo) {
        if (info.segment.plainReady && info.segment.terrainIsLoading) {

            if (this._workerQueue.length) {

                const w = this._workerQueue.pop()!;

                this._source.set(this._sourceId, info);

                let segment = info.segment;

                w.postMessage({
                    'elevations': info.elevations,
                    'this_plainVertices': segment.plainVertices,
                    'this_plainNormals': segment.plainNormals,
                    'this_normalMapVertices': segment.normalMapVertices,
                    'this_normalMapNormals': segment.normalMapNormals,
                    'heightFactor': segment.planet._heightFactor,
                    'gridSize': segment.planet.terrain!.gridSizeByZoom[segment.tileZoom],
                    'noDataValues': segment.planet.terrain!.noDataValues,
                    'id': this._sourceId
                }, [
                    info.elevations.buffer,
                    segment.plainVertices!.buffer,
                    segment.plainNormals!.buffer,
                    segment.normalMapVertices!.buffer,
                    segment.normalMapNormals!.buffer
                ]);

                this._sourceId++;

            } else {
                this._pendingQueue.push(info);
            }
        } else {
            this.check();
        }
    }
}

export {TerrainWorker};
