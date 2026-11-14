// import { QueueArray } from '../QueueArray.js';
import { EPSG4326 } from "../proj/EPSG4326";
import { equi } from "../proj/equi";
import { CUBE_FACES, CubeProj, isCubeProj } from "../proj/cube";
import { BaseWorker } from "./BaseWorker";
import { Segment } from "../segment/Segment";
import { Geoid } from "../terrain/Geoid";
//@ts-ignore
import PlainSegmentWorkerImpl from "./PlainSegmentWorker.worker.js?worker&inline";
import type { NumberArray3 } from "../math/Vec3";

export interface IPlainSegmentWorkerData {
    plainVertices: Float64Array | null;
    plainVerticesHigh: Float32Array | null;
    plainVerticesLow: Float32Array | null;
    plainNormals: Float32Array | null;
    normalMapNormals?: Float32Array | null;
    geoidId: number;
    relativeCenter: NumberArray3;
}

type MessageEventExt = MessageEvent & {
    data: IPlainSegmentWorkerData;
};

/**
 * Packs the segment parameters the workers make its plain grid with, see utils/plainGrid.
 * @param {Segment} segment - Segment.
 * @param {number} id - Worker task id.
 * @returns {Float64Array} -
 */
export function createPlainSegmentParams(segment: Segment, id: number): Float64Array {
    const proj = segment._projection,
        isCube = isCubeProj(proj);

    // 0 is the Web Mercator extent, 1 is the degrees one, 2 is the equiangular cube, 3 is the gnomonic one
    let projType = 0.0;

    if (isCube) {
        projType = (proj as CubeProj).equiangular ? 2.0 : 3.0;
    } else if (proj.id === EPSG4326.id || proj.id === equi.id) {
        projType = 1.0;
    }

    return new Float64Array([
        id,

        projType,

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

        segment.planet._heightFactor,

        segment._relativeCenter.x,
        segment._relativeCenter.y,
        segment._relativeCenter.z,

        ...(isCube ? CUBE_FACES[segment.tileGroup] : [])
    ]);
}

/**
 * Returns true when the data of a worker are made with the geoid, or no geoid is set.
 * @param {number} geoidId - Geoid identifier the worker has returned.
 * @param {Geoid | null} geoid - Geoid of the terrain.
 * @returns {boolean} -
 */
export function isGeoidOf(geoidId: number, geoid: Geoid | null): boolean {
    return !geoid || geoidId === geoid.id;
}

/**
 * Sends the geoid model to the workers that make plain grids.
 * @param {Worker[]} workers - Workers.
 * @param {Geoid} geoid - Geoid.
 */
export function postGeoidModel(workers: Worker[], geoid: Geoid) {
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

        workers.forEach((w) => {
            let rawfile = new Uint8Array(m.rawfile.length);
            rawfile.set(m.rawfile);

            w.postMessage(
                {
                    geoidId: geoid.id,
                    model: model,
                    rawfile: rawfile
                },
                [rawfile.buffer]
            );
        });
    } else {
        workers.forEach((w) => {
            w.postMessage({
                geoidId: geoid.id,
                model: null
            });
        });
    }
}

class PlainSegmentWorker extends BaseWorker<Segment> {
    /**
     * The geoid of the terrain, data made with another one are dropped.
     */
    protected _geoid: Geoid | null = null;

    constructor(numWorkers: number = 2) {
        super(numWorkers, PlainSegmentWorkerImpl);
    }

    protected override _onMessage(e: MessageEventExt) {
        const segment = this._source.get(e.data.id)!;

        if (!isGeoidOf(e.data.geoidId, this._geoid)) {
            // The worker was busy when the terrain changed and has not got the geoid
            postGeoidModel([e.target as Worker], this._geoid!);
            if (e.data.normalMapNormals) {
                this._pendingQueue.push(segment);
            } else {
                segment.plainProcessing = false;
            }
        } else if (e.data.normalMapNormals) {
            segment._plainNormalsWorkerCallback(e.data.normalMapNormals);
        } else {
            segment._plainSegmentWorkerCallback(e.data);
        }

        e.data.normalMapNormals = null;

        e.data.plainVertices = null;
        e.data.plainVerticesHigh = null;
        e.data.plainVerticesLow = null;
        e.data.plainNormals = null;
        e.data.relativeCenter = null;

        this._source.delete(e.data.id);
    }

    public setGeoid(geoid: Geoid) {
        this._geoid = geoid;
        postGeoidModel(this._workerQueue, geoid);
    }

    /**
     * Removes the waiting tasks of the segments that are not initialized any more, e.g. destroyed by a terrain change.
     * @public
     */
    public clearPendingQueue() {
        this._pendingQueue = this._pendingQueue.filter((segment) => segment.initialized);
    }

    /**
     * Makes the plain mesh of the segment. For a segment that has it already, makes the normals of the plain
     * surface in the elevation grid, see Segment.elevationsNotExists.
     * @public
     * @param {Segment} segment - Segment.
     */
    public override make(segment: Segment) {
        if (segment.initialized) {
            if (this._workerQueue.length) {
                let w = this._workerQueue.pop()!;

                this._source.set(this._sourceId, segment);

                let params = createPlainSegmentParams(segment, this._sourceId);

                this._sourceId++;

                w.postMessage(
                    {
                        params: params,
                        normalsGridSize: segment.plainReady ? segment.planet.terrain!.plainGridSize : 0
                    },
                    [params.buffer]
                );
            } else {
                this._pendingQueue.push(segment);
            }
        } else {
            this.check();
        }
    }
}

export { PlainSegmentWorker };
