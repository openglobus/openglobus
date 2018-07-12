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

                _this._segments[e.data.id]._terrainWorkerCallback(e.data);
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
            var p = this._pendingQueue.pop();
            this.make(p.segment, p.elevations);
        }
    }

    make(segment) {

        if (segment.initialized) {

            if (this._workerQueue.length) {

                var w = this._workerQueue.pop();

                this._segments[this._id] = segment;

                w.postMessage({
                    'id': this._id++
                }, []);

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

    function inverseMercator(lon,lat){
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
            'z': nc * Math.cos(lonrad));
        }
    };

    self.onmessage = function (msg) {

        let id = e.data.id;
        
        let gridSize = e.data.params[GRIDSIZE],//this.planet.terrain.gridSizeByZoom[this.tileZoom];
            fgs = e.data.params[FILEGRIDSIZE],//this.planet.terrain.fileGridSize
            e = e.data.params[SWLON, SWLAT, NELON, NELAT],
            r2 = e.data.params[INVRADII2],//this.planet.ellipsoid._invRadii2,
            e2 = e.data.params[E2],//this.planet.ellipsoid._e2
            a = e.data.params[A];//this.planet.ellipsoid._a

        let lonSize = e.getWidth();
        let llStep = lonSize / Math.max(fgs, gridSize);
        let esw_lon = e.southWest.lon,
            ene_lat = e.northEast.lat;
        let dg = Math.max(fgs / gridSize, 1),
            gs = Math.max(fgs, gridSize) + 1;

        let ind = 0,
            nmInd = 0;
            
        const gsgs = gs * gs;

        let gridSize3 = (gridSize + 1) * (gridSize + 1) * 3;

        let plainNormals = new Float32Array(gridSize3);
        let plainVertices = new Float32Array(gridSize3);

        let normalMapNormals = new Float32Array(gsgs * 3);
        let normalMapVertices = new Float32Array(gsgs * 3);

        let verts = plainVertices,
            norms = plainNormals,
            nmVerts = normalMapVertices,
            nmNorms = normalMapNormals;

        for (let k = 0; k < gsgs; k++) {

            let j = k % gs,
                i = ~~(k / gs);

            let v = lonLatToCartesian(inverseMercator(esw_lon + j * llStep, ene_lat - i * llStep), e2, a);
            let nx = v.x * r2.x, ny = v.y * r2.y, nz = v.z * r2.z;
            let l = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
            let nxl = nx * l, nyl = ny * l, nzl = nz * l;

            nmVerts[nmInd] = v.x;
            nmNorms[nmInd++] = nxl;

            nmVerts[nmInd] = v.y;
            nmNorms[nmInd++] = nyl;

            nmVerts[nmInd] = v.z;
            nmNorms[nmInd++] = nzl;

            if (i % dg === 0 && j % dg === 0) {
                verts[ind] = v.x;
                norms[ind++] = nxl;

                verts[ind] = v.y;
                norms[ind++] = nyl;

                verts[ind] = v.z;
                norms[ind++] = nzl;
            }
        }

        let terrainVertices = verts;

        //store raw normals
        let normalMapNormalsRaw = new Float32Array(nmNorms.length);
        normalMapNormalsRaw.set(nmNorms);

        self.postMessage({
            'id': id
        });
    }`;

export { PlainSegmentWorker };