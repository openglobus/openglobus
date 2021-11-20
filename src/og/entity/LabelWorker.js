"use strict";

// import { QueueArray } from '../QueueArray.js';

class LabelWorker {
    constructor(numWorkers = 4) {
        this._id = 0;
        this._labelHandler = {};

        this._workerQueue = []; //new QueueArray(numWorkers);
        var labelBufferProgramm = new Blob([_programm], { type: "application/javascript" });

        var that = this;

        for (let i = 0; i < numWorkers; i++) {
            var w = new Worker(URL.createObjectURL(labelBufferProgramm));
            w.onmessage = function (e) {
                that._labelHandler[e.data.id]._terrainWorkerCallback(e.data);
                that._labelHandler[e.data.id] = null;

                e.data.normalMapNormals = null;
                e.data.normalMapVertices = null;
                e.data.normalMapVerticesHigh = null;
                e.data.normalMapVerticesLow = null;
                e.data.terrainVertices = null;
                e.data.terrainVerticesHigh = null;
                e.data.terrainVerticesLow = null;

                delete that._labelHandler[e.data.id];

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
            this.make(p.handler, p.data);
        }
    }

    make(handler, data) {
        if (true) {
            if (this._workerQueue.length) {
                var w = this._workerQueue.pop();

                this._labelHandler[this._id] = handler;

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
                this._pendingQueue.push({ handler: handler, data: data });
            }
        } else {
            this.check();
        }
    }
}

const _programm = `'use strict';

    var Vec3 = function(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    };

    var doubleToTwoFloats = function(v, high, low) {

        let x = v.x, y = v.y, z = v.z;
    
        if (x >= 0.0) {
            var doubleHigh = Math.floor(x / 65536.0) * 65536.0;
            high.x = Math.fround(doubleHigh);
            low.x = Math.fround(x - doubleHigh);
        } else {
            var doubleHigh = Math.floor(-x / 65536.0) * 65536.0;
            high.x = Math.fround(-doubleHigh);
            low.x = Math.fround(x + doubleHigh);
        }

        if (y >= 0.0) {
            var doubleHigh = Math.floor(y / 65536.0) * 65536.0;
            high.y = Math.fround(doubleHigh);
            low.y = Math.fround(y - doubleHigh);
        } else {
            var doubleHigh = Math.floor(-y / 65536.0) * 65536.0;
            high.y = Math.fround(-doubleHigh);
            low.y = Math.fround(y + doubleHigh);
        }

        if (z >= 0.0) {
            var doubleHigh = Math.floor(z / 65536.0) * 65536.0;
            high.z = Math.fround(doubleHigh);
            low.z = Math.fround(z - doubleHigh);
        } else {
            var doubleHigh = Math.floor(-z / 65536.0) * 65536.0;
            high.z = Math.fround(-doubleHigh);
            low.z = Math.fround(z + doubleHigh);
        }
    };

    Vec3.prototype.sub = function(v) {
        return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    };

    Vec3.prototype.add = function(v) {
        return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    };

    Vec3.prototype.cross = function(v) {
        return new Vec3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    };

    Vec3.prototype.normalize = function(v) {
        var x = this.x, y = this.y, z = this.z;
        var length = 1.0 / Math.sqrt(x * x + y * y + z * z);
        this.x = x * length;
        this.y = y * length;
        this.z = z * length;
        return this;
    };

    Vec3.prototype.distance = function(v) {
        return this.sub(v).length();
    };

    Vec3.prototype.length = function () {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    };

    var blerp = function(x, y, fQ11, fQ21, fQ12, fQ22) {
        return (fQ11 * (1.0 - x) * (1.0 - y) + fQ21 * x * (1.0 - y) + fQ12 * (1.0 - x) * y + fQ22 * x * y);
    };
    
    var slice = function (t, h1, h0) {
      return t * (h1 - h0);
    };

    var _tempVec = new Vec3(0.0, 0.0, 0.0);

    var _tempHigh = new Vec3(0.0, 0.0, 0.0),
        _tempLow = new Vec3(0.0, 0.0, 0.0);

    self.onmessage = function (e) {
        var elevations = e.data.elevations,
            this_plainVertices = e.data.this_plainVertices,
            this_plainNormals = e.data.this_plainNormals,
            this_normalMapVertices = e.data.this_normalMapVertices,
            this_normalMapNormals = e.data.this_normalMapNormals,
            heightFactor =  e.data.heightFactor,
            gridSize = e.data.gridSize,
            noDataValues = e.data.noDataValues,
            id = e.data.id;
        
//...
        self.postMessage({
                id: id,
                normalMapNormals: normalMapNormals,
                normalMapVertices: normalMapVertices,
                normalMapVerticesHigh: normalMapVerticesHigh,
                normalMapVerticesLow: normalMapVerticesLow,
                terrainVertices: terrainVertices,
                terrainVerticesHigh: terrainVerticesHigh,
                terrainVerticesLow: terrainVerticesLow,
                noDataVertices: noDataVertices,
                //bounds: [xmin, xmax, ymin, ymax, zmin, zmax]
                bounds: [xmin, ymin, zmin, xmax, ymax, zmax]
             }, [
                    normalMapNormals.buffer, 
                    normalMapVertices.buffer, 
                    normalMapVerticesHigh.buffer, 
                    normalMapVerticesLow.buffer, 
                    terrainVertices.buffer,
                    terrainVerticesHigh.buffer,
                    terrainVerticesLow.buffer,
                    noDataVertices.buffer
            ]);
    }`;

export { LabelWorker };
