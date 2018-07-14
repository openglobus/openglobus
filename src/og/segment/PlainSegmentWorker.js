/**
 * @module og/segment/PlainSegmentWorker
 */

'use sctrict';

import { QueueArray } from '../QueueArray.js';

class PlainSegmentWorker {
    constructor(numWorkers = 2) {
        this._id = 0;
        this._segments = {};

        this._workerQueue = new QueueArray(numWorkers);
        var elevationProgramm = new Blob([_programm], { type: 'application/javascript' });

        var _this = this;
        for (let i = 0; i < numWorkers; i++) {

            var w = new Worker(URL.createObjectURL(elevationProgramm));

            w.onmessage = function (e) {

                _this._segments[e.data.id]._plainSegmentWorkerCallback(e.data);
                _this._segments[e.data.id] = null;
                delete _this._segments[e.data.id];

                _this._workerQueue.unshift(this);
                _this.check();
            };

            this._workerQueue.push(w);
        }

        this._pendingQueue = new QueueArray(512);
    }

    check() {
        if (this._pendingQueue.length) {
            this.make(this._pendingQueue.pop());
        }
    }

    make(segment) {

        if (segment.initialized) {

            if (this._workerQueue.length) {

                var w = this._workerQueue.pop();

                this._segments[this._id] = segment;

                let params = new Float64Array([
                    segment.planet.terrain.gridSizeByZoom[segment.tileZoom],
                    segment.planet.terrain.fileGridSize,
                    segment._extent.southWest.lon,
                    segment._extent.southWest.lat,
                    segment._extent.northEast.lon,
                    segment._extent.northEast.lat,
                    segment.planet.ellipsoid._e2,
                    segment.planet.ellipsoid._a,
                    segment.planet.ellipsoid._invRadii2.x,
                    segment.planet.ellipsoid._invRadii2.y,
                    segment.planet.ellipsoid._invRadii2.z
                ]);

                w.postMessage({
                    'id': this._id++,
                    'params': params
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
};

const _programm =
    `
    'use strict';

    const HALF_PI = Math.PI * 0.5;
    const POLE = 20037508.34;
    const PI_BY_POLE = Math.PI / POLE;
    const INV_POLE_BY_180 = 180.0 / POLE;
    const INV_PI_BY_180 = 180.0 / Math.PI;
    const INV_PI_BY_180_HALF_PI = INV_PI_BY_180 * HALF_PI;
    const RADIANS = Math.PI / 180.0;
    const INV_PI_BY_360 = INV_PI_BY_180 * 2.0;

    function inverseMercator(x, y){
        return {
            lon: x * INV_POLE_BY_180,
            lat: INV_PI_BY_360 * Math.atan(Math.exp(y * PI_BY_POLE)) - INV_PI_BY_180_HALF_PI
        };
    };

    function lonLatToCartesian(lonlat, e2, a) {
        let latrad = RADIANS * lonlat.lat,
            lonrad = RADIANS * lonlat.lon;

        let slt = Math.sin(latrad);

        let N = a / Math.sqrt(1.0 - e2 * slt * slt);
        let nc = N * Math.cos(latrad);

        return {
            'x': nc * Math.sin(lonrad),
            'y': N * (1.0 - e2) * slt,
            'z': nc * Math.cos(lonrad)
        }
    };

    self.onmessage = function (msg) {
        
        let gridSize = msg.data.params[0],
            fgs = msg.data.params[1],
            //e = [msg.data.params[2], msg.data.params[3], msg.data.params[4], msg.data.params[5]],
            e2 = msg.data.params[6],
            a = msg.data.params[7],
            r2_x = msg.data.params[8],
            r2_y = msg.data.params[9],
            r2_z = msg.data.params[10];


        let lonSize = msg.data.params[4] - msg.data.params[2];
        let llStep = lonSize / Math.max(fgs, gridSize);

        let esw_lon = msg.data.params[2],
            ene_lat = msg.data.params[5];

        let dg = Math.max(fgs / gridSize, 1),
            gs = Math.max(fgs, gridSize) + 1;
            
        const gsgs = gs * gs;

        const gridSize3 = (gridSize + 1) * (gridSize + 1) * 3;

        let plainNormals = new Float32Array(gridSize3);
        let plainVertices = new Float32Array(gridSize3);
        let normalMapNormals = new Float32Array(gsgs * 3);
        let normalMapVertices = new Float32Array(gsgs * 3);

        let ind = 0,
            nmInd = 0;

        for (let k = 0; k < gsgs; k++) {

            let j = k % gs,
                i = ~~(k / gs);

            let v = lonLatToCartesian(inverseMercator(esw_lon + j * llStep, ene_lat - i * llStep), e2, a);
            let nx = v.x * r2_x, ny = v.y * r2_y, nz = v.z * r2_z;
            let l = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);            
            let nxl = nx * l,
                nyl = ny * l,
                nzl = nz * l;

            normalMapVertices[nmInd] = v.x;
            normalMapNormals[nmInd++] = nxl;

            normalMapVertices[nmInd] = v.y;
            normalMapNormals[nmInd++] = nyl;

            normalMapVertices[nmInd] = v.z;
            normalMapNormals[nmInd++] = nzl;

            if (i % dg === 0 && j % dg === 0) {
                plainVertices[ind] = v.x;
                plainNormals[ind++] = nxl;

                plainVertices[ind] = v.y;
                plainNormals[ind++] = nyl;

                plainVertices[ind] = v.z;
                plainNormals[ind++] = nzl;
            }
        }

        //store raw normals
        let normalMapNormalsRaw = new Float32Array(normalMapNormals.length);
        normalMapNormalsRaw.set(normalMapNormals);

        self.postMessage({
            id: msg.data.id,
            plainVertices: plainVertices,
            plainNormals: plainNormals,
            normalMapNormals: normalMapNormals,
            normalMapVertices: normalMapVertices,
            normalMapNormalsRaw: normalMapNormalsRaw
         }, [
            plainVertices.buffer,
            plainNormals.buffer,
            normalMapNormals.buffer,
            normalMapVertices.buffer,
            normalMapNormalsRaw.buffer
        ]);
    }`;

export { PlainSegmentWorker };