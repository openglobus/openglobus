"use strict";

// import { QueueArray } from '../QueueArray.js';
import { EPSG4326 } from "../proj/EPSG4326.js";

class PlainSegmentWorker {
    constructor(numWorkers = 2) {
        this._id = 0;
        this._segments = {};

        this._workerQueue = [];

        let _this = this;

        for (let i = 0; i < numWorkers; i++) {
            let w = new Worker("../../dist/@openglobus/og.PlainSegment.js");
            w.onmessage = function (e) {
                _this._segments[e.data.id]._plainSegmentWorkerCallback(e.data);

                e.data.plainVertices = null;
                e.data.plainVerticesHigh = null;
                e.data.plainVerticesLow = null;
                e.data.plainNormals = null;
                e.data.normalMapNormals = null;
                e.data.normalMapVertices = null;
                e.data.normalMapVerticesHigh = null;
                e.data.normalMapVerticesLow = null;

                _this._segments[e.data.id] = null;
                delete _this._segments[e.data.id];

                _this._workerQueue.unshift(this);
                _this.check();
            };

            this._workerQueue.push(w);
        }

        this._pendingQueue = [];
    }

    check() {
        if (this._pendingQueue.length) {
            this.make(this._pendingQueue.pop());
        }
    }

    setGeoid(geoid) {
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

            w.postMessage(
                {
                    model: model,
                    rawfile: rawfile
                },
                [rawfile.buffer]
            );
        });
    }

    make(segment) {
        if (segment.initialized) {
            if (this._workerQueue.length) {
                let w = this._workerQueue.pop();

                this._segments[this._id] = segment;

                let params = new Float64Array([
                    this._id++,
                    segment._projection.id === EPSG4326.id ? 1.0 : 0.0,
                    segment.planet.terrain.gridSizeByZoom[segment.tileZoom],
                    segment.planet.terrain.plainGridSize,
                    segment._extent.southWest.lon,
                    segment._extent.southWest.lat,
                    segment._extent.northEast.lon,
                    segment._extent.northEast.lat,
                    segment.planet.ellipsoid._e2,
                    segment.planet.ellipsoid._a,
                    segment.planet.ellipsoid._invRadii2.x,
                    segment.planet.ellipsoid._invRadii2.y,
                    segment.planet.ellipsoid._invRadii2.z,
                    segment.planet._heightFactor
                ]);

                w.postMessage(
                    {
                        params: params
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
