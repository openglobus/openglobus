"use strict";

// import { QueueArray } from '../QueueArray.js';

class TerrainWorker {
    constructor(numWorkers = 2) {
        this._id = 0;
        this._segments = {};

        this._workerQueue = []; //new QueueArray(numWorkers);
        var that = this;

        for (let i = 0; i < numWorkers; i++) {
            var w = new Worker("../../dist/@openglobus/og.Terrain.js");
            w.onmessage = function (e) {
                that._segments[e.data.id]._terrainWorkerCallback(e.data);
                that._segments[e.data.id] = null;

                e.data.normalMapNormals = null;
                e.data.normalMapVertices = null;
                e.data.normalMapVerticesHigh = null;
                e.data.normalMapVerticesLow = null;
                e.data.terrainVertices = null;
                e.data.terrainVerticesHigh = null;
                e.data.terrainVerticesLow = null;

                delete that._segments[e.data.id];

                that._workerQueue.unshift(this);
                that.check();
            };

            this._workerQueue.push(w);
        }

        this._pendingQueue = []; //new QueueArray(512);
    }

    check() {
        if (this._pendingQueue.length) {
            var p = this._pendingQueue.pop();
            this.make(p.segment, p.elevations);
        }
    }

    make(segment, elevations) {
        if (segment.plainReady && segment.terrainIsLoading) {
            var _elevations = new Float32Array(elevations.length);
            _elevations.set(elevations);

            if (this._workerQueue.length) {
                var w = this._workerQueue.pop();

                this._segments[this._id] = segment;

                w.postMessage(
                    {
                        elevations: _elevations,
                        this_plainVertices: segment.plainVertices,
                        this_plainNormals: segment.plainNormals,
                        this_normalMapVertices: segment.normalMapVertices,
                        this_normalMapNormals: segment.normalMapNormals,
                        heightFactor: segment.planet._heightFactor,
                        gridSize: segment.planet.terrain.gridSizeByZoom[segment.tileZoom],
                        noDataValues: segment.planet.terrain.noDataValues,
                        id: this._id++
                    },
                    [
                        _elevations.buffer,
                        segment.plainVertices.buffer,
                        segment.plainNormals.buffer,
                        segment.normalMapVertices.buffer,
                        segment.normalMapNormals.buffer
                    ]
                );
            } else {
                this._pendingQueue.push({ segment: segment, elevations: _elevations });
            }
        } else {
            this.check();
        }
    }
}
export { TerrainWorker };
