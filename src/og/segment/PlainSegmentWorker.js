/**
 * @module og/segment/PlainSegmentWorker
 */

'use sctrict';

import { QueueArray } from '../QueueArray.js';
import { EPSG4326 } from '../proj/EPSG4326.js';

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
                    this._id++,
                    segment._projection.id === EPSG4326.id ? 1.0 : 0.0,
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

    let E2 = 0.0, A = 0.0;

    let _projFunc = null;

    var lonLatToCartesian = function (lon, lat) {
        let latrad = RADIANS * lat,
            lonrad = RADIANS * lon;

        let slt = Math.sin(latrad);

        let N = A / Math.sqrt(1.0 - E2 * slt * slt);
        let nc = N * Math.cos(latrad);

        return {
            'x': nc * Math.sin(lonrad),
            'y': N * (1.0 - E2) * slt,
            'z': nc * Math.cos(lonrad)
        }
    };

    var lonLatToCartesianInverse = function (lon, lat){
        return lonLatToCartesian(
            lon * INV_POLE_BY_180,
            INV_PI_BY_360 * Math.atan(Math.exp(lat * PI_BY_POLE)) - INV_PI_BY_180_HALF_PI);
    };

    self.onmessage = function (msg) {
        
        E2 = msg.data.params[8];
        A = msg.data.params[9];

        let gridSize = msg.data.params[2],
            fgs = msg.data.params[3],
            r2_x = msg.data.params[10],
            r2_y = msg.data.params[11],
            r2_z = msg.data.params[12];
        
        if(msg.data.params[1] === 0.0){
            _projFunc = lonLatToCartesianInverse;
        }else{
            _projFunc = lonLatToCartesian;
        }

        let maxFgs = Math.max(fgs, gridSize);
        let llStep = (msg.data.params[6] - msg.data.params[4]) / maxFgs;
        let ltStep = (msg.data.params[7] - msg.data.params[5]) / maxFgs;

        let esw_lon = msg.data.params[4],
            ene_lat = msg.data.params[7];

        let dg = Math.max(fgs / gridSize, 1.0),
            gs = maxFgs + 1;
            
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

            let v =_projFunc(esw_lon + j * llStep, ene_lat - i * ltStep);

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

        let normalMapNormalsRaw = new Float32Array(normalMapNormals.length);
        normalMapNormalsRaw.set(normalMapNormals);

        self.postMessage({
            id: msg.data.params[0],
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