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

    setGeoid(geoid) {

        let m = geoid.model;

        let model = {
            'scale': m.scale,
            'offset': m.offset,
            'width': m.width,
            'height': m.height,
            'rlonres': m.rlonres,
            'rlatres': m.rlatres,
            'i': m.i
        };

        this._workerQueue.each((w) => {

            let rawfile = new Uint8Array(m.rawfile.length);
            rawfile.set(m.rawfile);

            w.postMessage({
                'model': model,
                'rawfile': rawfile
            }, [
                    rawfile.buffer
                ]);
        });
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

    const c0 = 240;
    const c3 = [
        [9, -18, -88, 0, 96, 90, 0, 0, -60, -20],
        [-9, 18, 8, 0, -96, 30, 0, 0, 60, -20],
        [9, -88, -18, 90, 96, 0, -20, -60, 0, 0],
        [186, -42, -42, -150, -96, -150, 60, 60, 60, 60],
        [54, 162, -78, 30, -24, -90, -60, 60, -60, 60],
        [-9, -32, 18, 30, 24, 0, 20, -60, 0, 0],
        [-9, 8, 18, 30, -96, 0, -20, 60, 0, 0],
        [54, -78, 162, -90, -24, 30, 60, -60, 60, -60],
        [-54, 78, 78, 90, 144, 90, -60, -60, -60, -60],
        [9, -8, -18, -30, -24, 0, 20, 60, 0, 0],
        [-9, 18, -32, 0, 24, 30, 0, 0, -60, 20],
        [9, -18, -8, 0, -24, -30, 0, 0, 60, 20],
    ];

    const c0n = 372;
    const c3n = [
        [0, 0, -131, 0, 138, 144, 0, 0, -102, -31],
        [0, 0, 7, 0, -138, 42, 0, 0, 102, -31],
        [62, 0, -31, 0, 0, -62, 0, 0, 0, 31],
        [124, 0, -62, 0, 0, -124, 0, 0, 0, 62],
        [124, 0, -62, 0, 0, -124, 0, 0, 0, 62],
        [62, 0, -31, 0, 0, -62, 0, 0, 0, 31],
        [0, 0, 45, 0, -183, -9, 0, 93, 18, 0],
        [0, 0, 216, 0, 33, 87, 0, -93, 12, -93],
        [0, 0, 156, 0, 153, 99, 0, -93, -12, -93],
        [0, 0, -45, 0, -3, 9, 0, 93, -18, 0],
        [0, 0, -55, 0, 48, 42, 0, 0, -84, 31],
        [0, 0, -7, 0, -48, -42, 0, 0, 84, 31],
    ];

    const c0s = 372;
    const c3s = [
        [18, -36, -122, 0, 120, 135, 0, 0, -84, -31],
        [-18, 36, -2, 0, -120, 51, 0, 0, 84, -31],
        [36, -165, -27, 93, 147, -9, 0, -93, 18, 0],
        [210, 45, -111, -93, -57, -192, 0, 93, 12, 93],
        [162, 141, -75, -93, -129, -180, 0, 93, -12, 93],
        [-36, -21, 27, 93, 39, 9, 0, -93, -18, 0],
        [0, 0, 62, 0, 0, 31, 0, 0, 0, -31],
        [0, 0, 124, 0, 0, 62, 0, 0, 0, -62],
        [0, 0, 124, 0, 0, 62, 0, 0, 0, -62],
        [0, 0, 62, 0, 0, 31, 0, 0, 0, -31],
        [-18, 36, -64, 0, 66, 51, 0, 0, -102, 31],
        [18, -36, 2, 0, -66, -51, 0, 0, 102, 31],
    ];

    let cached_ix = null;
    let cached_iy = null;
    let v00 = null;
    let v01 = null;
    let v10 = null;
    let v11 = null;
    let t = null;

    function rawval(ix, iy) {

        if (iy < 0) {
            iy = -iy;
            ix += model.width / 2;
        } else if (iy >= model.height) {
            iy = 2 * (model.height - 1) - iy;
            ix += model.width / 2;
        }

        if (ix < 0) {
            ix += model.width;
        } else if (ix >= model.width) {
            ix -= model.width;
        }

        var k = (iy * model.width + ix) * 2 + model.i;

        return (model.rawfile[k] << 8) | model.rawfile[k + 1];
    };

    function getHeight(lon, lat, cubic) {

        if (!model) return 0;

        if (lon < 0) lon += 360.0;

        var fy = (90 - lat) * model.rlatres;
        var fx = lon * model.rlonres;
        var iy = Math.floor(fy);
        var ix = Math.floor(fx);

        fx -= ix;
        fy -= iy;

        if (iy === (model.height - 1)) {
            iy--;
        }

        if ((cached_ix !== ix) || (cached_iy !== iy)) {

            cached_ix = ix;
            cached_iy = iy;

            if (cubic) {

                var c3x = c3;
                var c0x = c0;

                if (iy === 0) {
                    c3x = c3n;
                    c0x = c0n;
                } else if (iy === (model.height - 2)) {
                    c3x = c3s;
                    c0x = c0s;
                }

                var v = [
                    rawval(ix, iy - 1),
                    rawval(ix + 1, iy - 1),
                    rawval(ix - 1, iy),
                    rawval(ix, iy),
                    rawval(ix + 1, iy),
                    rawval(ix + 2, iy),
                    rawval(ix - 1, iy + 1),
                    rawval(ix, iy + 1),
                    rawval(ix + 1, iy + 1),
                    rawval(ix + 2, iy + 1),
                    rawval(ix, iy + 2),
                    rawval(ix + 1, iy + 2)
                ];

                t = Array.apply(null, Array(10)).map(function (_, i, arr) {
                    return v.reduce(function (acc, vj, j, arr) {
                        return acc + vj * c3x[j][i];
                    }) / c0x;
                });

            } else {
                v00 = rawval(ix, iy);
                v01 = rawval(ix + 1, iy);
                v10 = rawval(ix, iy + 1);
                v11 = rawval(ix + 1, iy + 1);
            }
        }

        let h = null;

        if (cubic) {

            let t = t;

            h = t[0] +
                fx * (t[1] + fx * (t[3] + fx * t[6])) +
                fy * (
                    t[2] + fx * (t[4] + fx * t[7]) +
                    fy * (t[5] + fx * t[8] + fy * t[9])
                );

        } else {

            var a = (1 - fx) * v00 + fx * v01;
            var b = (1 - fx) * v10 + fx * v11;

            h = (1 - fy) * a + fy * b;
        }

        return model.offset + model.scale * h;
    };

    let model = null;

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

        let h = getHeight(lon, lat);

        let latrad = RADIANS * lat,
            lonrad = RADIANS * lon;

        let slt = Math.sin(latrad);

        let N = A / Math.sqrt(1.0 - E2 * slt * slt);
        let nc = N * Math.cos(latrad);
        
        let x = nc * Math.sin(lonrad),
            y = N * (1.0 - E2) * slt,
            z = nc * Math.cos(lonrad);

        let length = 1.0 / Math.sqrt(x * x + y * y + z * z);

        let nx = x * length,
            ny = y * length,
            nz = z * length;
        
        return {
            'x': nx * h + x,
            'y': ny * h + y,
            'z': nz * h + z
        }
    };

    var lonLatToCartesianInverse = function (lon, lat){
        return lonLatToCartesian(
            lon * INV_POLE_BY_180,
            INV_PI_BY_360 * Math.atan(Math.exp(lat * PI_BY_POLE)) - INV_PI_BY_180_HALF_PI);
    };

    self.onmessage = function (msg) {
        if(msg.data.model) {
            model = msg.data.model;
            model.rawfile = msg.data.rawfile;
        } else if(msg.data.params) {        

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
        }
    }`;

export { PlainSegmentWorker };