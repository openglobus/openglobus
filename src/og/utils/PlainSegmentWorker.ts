// import { QueueArray } from '../QueueArray.js';
import {EPSG4326} from "../proj/EPSG4326";
import {BaseWorker} from "./BaseWorker";
import {Segment} from "../segment/Segment";
import {Geoid} from "../terrain/Geoid";
import {NumberArray6} from "../bv/Sphere";

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
        super(numWorkers, PLAIN_SEGMENT_PROGRAM);
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
            let model: any = {
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

                let params = new Float64Array([
                    this._sourceId,
                    segment._projection.id === EPSG4326.id ? 1.0 : 0.0,
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

const PLAIN_SEGMENT_PROGRAM = `
    'use strict';
    
    let model = null;

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

    function getHeightMSL(lon, lat) {

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

            v00 = rawval(ix, iy);
            v01 = rawval(ix + 1, iy);
            v10 = rawval(ix, iy + 1);
            v11 = rawval(ix + 1, iy + 1);
        }

        let h = null;

        var a = (1 - fx) * v00 + fx * v01;
        var b = (1 - fx) * v10 + fx * v11;

        h = (1 - fy) * a + fy * b;

        return model.offset + model.scale * h;
    };

    const HALF_PI = Math.PI * 0.5;
    const POLE = 20037508.34;
    const PI_BY_POLE = Math.PI / POLE;
    const INV_POLE_BY_180 = 180.0 / POLE;
    const INV_PI_BY_180 = 180.0 / Math.PI;
    const INV_PI_BY_180_HALF_PI = INV_PI_BY_180 * HALF_PI;
    const RADIANS = Math.PI / 180.0;
    const INV_PI_BY_360 = INV_PI_BY_180 * 2.0;

    let E2 = 0.0,
        A = 0.0;

    let _projFunc = null;

    const Vec3 = function (x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    };

    var geodeticToCartesian = function (lon, lat, heightFactor, res) {

        let h = getHeightMSL(lon, lat) * heightFactor;

        let latrad = RADIANS * lat,
            lonrad = RADIANS * lon;

        let slt = Math.sin(latrad);

        let N = A / Math.sqrt(1.0 - E2 * slt * slt);
        let nc = (N + h) * Math.cos(latrad);       
           
        res.x = nc * Math.cos(lonrad);
        res.y = nc * Math.sin(lonrad);
        res.z = (N * (1 - E2) + h) * slt;
    };

    var geodeticToCartesianInverse = function (lon, lat, heightFactor, res){
        geodeticToCartesian(
            lon * INV_POLE_BY_180,
            INV_PI_BY_360 * Math.atan(Math.exp(lat * PI_BY_POLE)) - INV_PI_BY_180_HALF_PI,
            heightFactor,
            res);
    };

    var v = new Vec3(0.0, 0.0, 0.0);
    var _tempHigh = new Vec3(0.0, 0.0, 0.0);
    var _tempLow = new Vec3(0.0, 0.0, 0.0);

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

    self.onmessage = function (msg) {
        if(msg.data.model) {
            model = msg.data.model;
            model.rawfile = msg.data.rawfile;
        } else if(msg.data.params) {

            let xmin = 549755748352.0, xmax = -549755748352.0, 
                ymin = 549755748352.0, ymax = -549755748352.0, 
                zmin = 549755748352.0, zmax = -549755748352.0;

            E2 = msg.data.params[8];
            A = msg.data.params[9];

            let gridSize = msg.data.params[2],
                fgs = msg.data.params[3],
                r2_x = msg.data.params[10],
                r2_y = msg.data.params[11],
                r2_z = msg.data.params[12];

            let heightFactor =  msg.data.params[13];
        
            if(msg.data.params[1] === 0.0){
                _projFunc = geodeticToCartesianInverse;
            }else{
                _projFunc = geodeticToCartesian;
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

            let plainVertices = new Float64Array(gridSize3);
            let plainVerticesHigh = new Float32Array(gridSize3);
            let plainVerticesLow = new Float32Array(gridSize3);

            let normalMapNormals = new Float32Array(gsgs * 3);

            let normalMapVertices = new Float64Array(gsgs * 3);
            let normalMapVerticesHigh = new Float32Array(gsgs * 3);
            let normalMapVerticesLow = new Float32Array(gsgs * 3);

            let ind = 0,
                nmInd = 0;

            for (let k = 0; k < gsgs; k++) {

                let j = k % gs,
                    i = ~~(k / gs);

                _projFunc(esw_lon + j * llStep, ene_lat - i * ltStep, heightFactor, v);

                let nx = v.x * r2_x, ny = v.y * r2_y, nz = v.z * r2_z;
                let l = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);            
                let nxl = nx * l,
                    nyl = ny * l,
                    nzl = nz * l;

                doubleToTwoFloats(v, _tempHigh, _tempLow);

                normalMapVertices[nmInd] = v.x;
                normalMapVerticesHigh[nmInd] = _tempHigh.x;
                normalMapVerticesLow[nmInd] = _tempLow.x;
                normalMapNormals[nmInd++] = nxl;

                normalMapVertices[nmInd] = v.y;
                normalMapVerticesHigh[nmInd] = _tempHigh.y;
                normalMapVerticesLow[nmInd] = _tempLow.y;
                normalMapNormals[nmInd++] = nyl;

                normalMapVertices[nmInd] = v.z;
                normalMapVerticesHigh[nmInd] = _tempHigh.z;
                normalMapVerticesLow[nmInd] = _tempLow.z;
                normalMapNormals[nmInd++] = nzl;

                if (i % dg === 0 && j % dg === 0) {
                    plainVertices[ind] = v.x;
                    plainVerticesHigh[ind] = _tempHigh.x;
                    plainVerticesLow[ind] = _tempLow.x;
                    plainNormals[ind++] = nxl;

                    plainVertices[ind] = v.y;
                    plainVerticesHigh[ind] = _tempHigh.y;
                    plainVerticesLow[ind] = _tempLow.y;
                    plainNormals[ind++] = nyl;

                    plainVertices[ind] = v.z;
                    plainVerticesHigh[ind] = _tempHigh.z;
                    plainVerticesLow[ind] = _tempLow.z;
                    plainNormals[ind++] = nzl;

                    if (v.x < xmin) xmin = v.x; if (v.x > xmax) xmax = v.x;
                    if (v.y < ymin) ymin = v.y; if (v.y > ymax) ymax = v.y;
                    if (v.z < zmin) zmin = v.z; if (v.z > zmax) zmax = v.z;
                }
            }

            let x = (xmax - xmin) * 0.5,
                y = (ymax - ymin) * 0.5,
                z = (zmax - zmin) * 0.5;

            let plainRadius = Math.sqrt(x * x + y * y + z * z);

            self.postMessage({
                id: msg.data.params[0],
                plainVertices: plainVertices,
                plainVerticesHigh: plainVerticesHigh,
                plainVerticesLow: plainVerticesLow,
                plainNormals: plainNormals,
                normalMapNormals: normalMapNormals,
                normalMapVertices: normalMapVertices,
                normalMapVerticesHigh: normalMapVerticesHigh,
                normalMapVerticesLow: normalMapVerticesLow,
                plainRadius: plainRadius
             }, [
                plainVertices.buffer,
                plainVerticesHigh.buffer,
                plainVerticesLow.buffer,
                plainNormals.buffer,
                normalMapNormals.buffer,
                normalMapVertices.buffer,
                normalMapVerticesHigh.buffer,
                normalMapVerticesLow.buffer
            ]);
        }
    }`;

export {PlainSegmentWorker};
