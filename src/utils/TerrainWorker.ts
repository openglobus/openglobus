// import { QueueArray } from '../QueueArray.js';

import { BaseWorker } from "./BaseWorker";
import { createPlainSegmentParams, isGeoidOf, postGeoidModel } from "./PlainSegmentWorker";
import { Geoid } from "../terrain/Geoid";
import { Segment } from "../segment/Segment";
import type { NumberArray6 } from "../bv/Sphere";
import type { NormalsArray } from "./normalsArray";

//@ts-ignore
import TerrainWorkerImpl from "./TerrainWorker.worker.js?worker&inline";
import { NumberArray3 } from "../math/Vec3";

interface TerrainInfo {
    segment: Segment;
    elevations: Float32Array;
}

export interface ITerrainWorkerData {
    id: number;
    normalMapNormals: NormalsArray | null;
    normalMapVertices: Float64Array | null;
    terrainVertices: Float64Array | null;
    terrainVerticesHigh: Float32Array | null;
    terrainVerticesLow: Float32Array | null;
    bounds: NumberArray6;
    radiusRange: number[] | null;
    /** Median geocentric radius of the vertices. */
    lodRadius: number;
    relativeCenter: NumberArray3;
    /** Geoid the data are made with. */
    geoidId: number;
}

type MessageEventExt = MessageEvent & {
    data: ITerrainWorkerData;
};

class TerrainWorker extends BaseWorker<TerrainInfo> {
    protected _geoid: Geoid | null = null;

    constructor(numWorkers: number = 2) {
        super(numWorkers, TerrainWorkerImpl);
    }

    protected override _onMessage(e: MessageEventExt) {
        const segment = this._source.get(e.data.id)!.segment;
        this._source.delete(e.data.id);

        if (isGeoidOf(e.data.geoidId, this._geoid)) {
            segment._terrainWorkerCallback(e.data);
        } else {
            // The worker was busy when the terrain changed and has not got the geoid, the segment loads it again
            postGeoidModel([e.target as Worker], this._geoid!);
            segment.terrainIsLoading = false;
        }

        e.data.normalMapNormals = null;
        e.data.normalMapVertices = null;
        e.data.terrainVertices = null;
        e.data.terrainVerticesHigh = null;
        e.data.terrainVerticesLow = null;
        e.data.bounds = null;
        e.data.relativeCenter = null;
    }

    public setGeoid(geoid: Geoid) {
        this._geoid = geoid;
        postGeoidModel(this._workerQueue, geoid);
    }

    /**
     * Removes the waiting tasks of the segments that do not load the terrain any more, e.g. destroyed by a terrain change.
     * @public
     */
    public clearPendingQueue() {
        this._pendingQueue = this._pendingQueue.filter((info) => this._isLoading(info));
    }

    protected _isLoading(info: TerrainInfo): boolean {
        return info.segment.plainReady && info.segment.terrainIsLoading;
    }

    public override make(info: TerrainInfo) {
        if (this._isLoading(info)) {
            if (this._workerQueue.length) {
                const w = this._workerQueue.pop()!;

                this._source.set(this._sourceId, info);

                let segment = info.segment,
                    // The worker makes the plain grid the elevations are added to
                    params = createPlainSegmentParams(segment, this._sourceId);

                w.postMessage(
                    {
                        elevations: info.elevations,
                        params: params,
                        heightFactor: segment.planet._heightFactor,
                        gridSize: segment.planet.terrain!.gridSizeByZoom[segment.tileZoom],
                        noDataValues: segment.planet.terrain!.noDataValues,
                        id: this._sourceId
                    },
                    [info.elevations.buffer, params.buffer]
                );

                this._sourceId++;
            } else {
                this._pendingQueue.push(info);
            }
        } else {
            this.check();
        }
    }
}

export { TerrainWorker };
