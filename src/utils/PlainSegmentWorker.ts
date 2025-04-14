// import { QueueArray } from '../QueueArray.js';
import {EPSG4326} from "../proj/EPSG4326";
import {equi} from "../proj/equi";
import {BaseWorker} from "./BaseWorker";
import {Segment} from "../segment/Segment";
import {Geoid} from "../terrain/Geoid";
//@ts-ignore
import PlainSegmentWorkerImpl from './PlainSegmentWorker.worker.js?worker&inline';

export interface IPlainSegmentWorkerData {
    plainVertices: Float64Array | null;
    plainVerticesHigh: Float32Array | null;
    plainVerticesLow: Float32Array | null;
    plainNormals: Float32Array | null;
    plainRadius: number;

    normalMapNormals: Float32Array | null;
    normalMapVertices: Float64Array | null;
    normalMapVerticesHigh: Float32Array | null;
    normalMapVerticesLow: Float32Array | null;
}

type MessageEventExt = MessageEvent & {
    data: IPlainSegmentWorkerData
}

class PlainSegmentWorker extends BaseWorker<Segment> {
    constructor(numWorkers: number = 2) {
        super(numWorkers, PlainSegmentWorkerImpl);
    }

    protected override _onMessage(e: MessageEventExt) {
        this._source.get(e.data.id)!._plainSegmentWorkerCallback(e.data);

        e.data.plainVertices = null;
        e.data.plainVerticesHigh = null;
        e.data.plainVerticesLow = null;
        e.data.plainNormals = null;
        e.data.normalMapNormals = null;
        e.data.normalMapVertices = null;
        e.data.normalMapVerticesHigh = null;
        e.data.normalMapVerticesLow = null;

        this._source.delete(e.data.id)
    }

    public setGeoid(geoid: Geoid) {

        if (geoid.model) {
            let m = geoid.model;
            let model = {
                scale: m.scale,
                offset: m.offset,
                width: m.width,
                height: m.height,
                rlonres: m.rlonres,
                rlatres: m.rlatres,
                i: m.i
            };

            this._workerQueue.forEach((w) => {
                let rawfile = new Uint8Array(m.rawfile.length);
                rawfile.set(m.rawfile);

                w.postMessage({
                        model: model,
                        rawfile: rawfile
                    }, [
                        rawfile.buffer
                    ]
                );
            });
        } else {
            this._workerQueue.forEach((w) => {
                w.postMessage({
                    model: null
                });
            });
        }
    }

    public override make(segment: Segment) {
        if (segment.initialized) {
            if (this._workerQueue.length) {
                let w = this._workerQueue.pop()!;

                this._source.set(this._sourceId, segment);

                let isLonLat = (segment._projection.id === EPSG4326.id || segment._projection.id === equi.id) ? 1.0 : 0.0;

                let params = new Float64Array([
                    this._sourceId,
                    isLonLat,
                    segment.planet.terrain!.gridSizeByZoom[segment.tileZoom],
                    segment.planet.terrain!.plainGridSize,
                    segment._extent.southWest.lon,
                    segment._extent.southWest.lat,
                    segment._extent.northEast.lon,
                    segment._extent.northEast.lat,
                    // @ts-ignore
                    segment.planet.ellipsoid._e2,
                    segment.planet.ellipsoid.equatorialSize,
                    segment.planet.ellipsoid._invRadii2.x,
                    segment.planet.ellipsoid._invRadii2.y,
                    segment.planet.ellipsoid._invRadii2.z,
                    segment.planet._heightFactor
                ]);

                this._sourceId++;

                w.postMessage({
                    params: params
                }, [
                    params.buffer
                ]);
            } else {
                this._pendingQueue.push(segment);
            }
        } else {
            this.check();
        }
    }
}

export {PlainSegmentWorker};
