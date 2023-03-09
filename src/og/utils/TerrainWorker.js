'use strict';

// import { QueueArray } from '../QueueArray.js';

import { BaseWorker } from "./BaseWorker.js";

class TerrainWorker extends BaseWorker {
    constructor(numWorkers = 2) {
        super(numWorkers, _programm);
        this._segments = new Map();
    }

    _onMessage(e) {
        this._segments.get(e.data.id)._terrainWorkerCallback(e.data);
        this._segments.delete(e.data.id);

        e.data.normalMapNormals = null;
        e.data.normalMapVertices = null;
        e.data.normalMapVerticesHigh = null;
        e.data.normalMapVerticesLow = null;
        e.data.terrainVertices = null;
        e.data.terrainVerticesHigh = null;
        e.data.terrainVerticesLow = null;
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

                this._segments.set(this._id, segment);

                w.postMessage({
                    'elevations': _elevations,
                    'this_plainVertices': segment.plainVertices,
                    'this_plainNormals': segment.plainNormals,
                    'this_normalMapVertices': segment.normalMapVertices,
                    'this_normalMapNormals': segment.normalMapNormals,
                    'heightFactor': segment.planet._heightFactor,
                    'gridSize': segment.planet.terrain.gridSizeByZoom[segment.tileZoom],
                    'noDataValues': segment.planet.terrain.noDataValues,
                    'id': this._id++
                }, [
                    _elevations.buffer,
                    segment.plainVertices.buffer,
                    segment.plainNormals.buffer,
                    segment.normalMapVertices.buffer,
                    segment.normalMapNormals.buffer
                ]);

            } else {
                this._pendingQueue.push({ segment: segment, elevations: _elevations });
            }
        } else {
            this.check();
        }
    }
}

const _programm =
    `'use strict';
    //
    //Terrain worker
    //

    function binarySearchFast(arr, x) {
        let start = 0,
            end = arr.length - 1;
        while (start <= end) {
            let k = Math.floor((start + end) * 0.5); 
            if (arr[k] === x)
                return k;
            else if (arr[k] < x)
                start = k + 1;
            else
                end = k - 1;
        }
        return -1;
    };

    function checkNoDataValue(noDataValues, value) {
        return binarySearchFast(noDataValues, value) !== -1;
    };


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
        
        var xmin = 549755748352.0, xmax = -549755748352.0, 
            ymin = 549755748352.0, ymax = -549755748352.0, 
            zmin = 549755748352.0, zmax = -549755748352.0;

        const fileGridSize = Math.sqrt(elevations.length) - 1;

        const fileGridSize_one = fileGridSize + 1;
        const fileGridSize_one_x2 = fileGridSize_one * fileGridSize_one;
        const tgs = gridSize;
        const dg = fileGridSize / tgs;
        const gs = tgs + 1;
        const hf = heightFactor;

        var nmvInd = 0,
            vInd = 0,
            noDataInd = 0;

        var gsgs3 = gs * gs * 3;

        var terrainVertices = new Float64Array(gsgs3),
            terrainVerticesHigh = new Float32Array(gsgs3),
            terrainVerticesLow = new Float32Array(gsgs3),
            noDataVertices = new Uint8Array(gs * gs);

        var normalMapNormals,
            normalMapVertices,
            normalMapVerticesHigh,
            normalMapVerticesLow;

        var nv = this_normalMapVertices,
            nn = this_normalMapNormals;

        if (fileGridSize >= tgs) {

            normalMapNormals = new Float32Array(fileGridSize_one_x2 * 3);
            normalMapVertices = new Float64Array(fileGridSize_one_x2 * 3);
            normalMapVerticesHigh = new Float32Array(fileGridSize_one_x2 * 3);
            normalMapVerticesLow = new Float32Array(fileGridSize_one_x2 * 3);

            for (var k = 0; k < fileGridSize_one_x2; k++) {

                var j = k % fileGridSize_one,
                    i = ~~(k / fileGridSize_one);

                //
                // V0
                //
                var hInd0 = k;
                var vInd0 = hInd0 * 3;
                var currElv = elevations[hInd0];
                if(checkNoDataValue(noDataValues, currElv)) {
                    currElv = 0.0;
                }
                var h0 = hf * currElv;
                var v0 = new Vec3(nv[vInd0] + h0 * nn[vInd0], nv[vInd0 + 1] + h0 * nn[vInd0 + 1], nv[vInd0 + 2] + h0 * nn[vInd0 + 2]);
                                
                doubleToTwoFloats(v0, _tempHigh, _tempLow);

                normalMapVertices[vInd0] = v0.x;
                normalMapVertices[vInd0 + 1] = v0.y;
                normalMapVertices[vInd0 + 2] = v0.z;

                normalMapVerticesHigh[vInd0] = _tempHigh.x;
                normalMapVerticesHigh[vInd0 + 1] = _tempHigh.y;
                normalMapVerticesHigh[vInd0 + 2] = _tempHigh.z;

                normalMapVerticesLow[vInd0] = _tempLow.x;
                normalMapVerticesLow[vInd0 + 1] = _tempLow.y;
                normalMapVerticesLow[vInd0 + 2] = _tempLow.z;

                //
                // The vertex goes into screen buffer
                if (i % dg === 0 && j % dg === 0) {

                    let currVert = new Vec3(nv[vInd0], nv[vInd0 + 1], nv[vInd0 + 2]);
                    let nextVert = new Vec3(nv[vInd0 + 3], nv[vInd0 + 4], nv[vInd0 + 5]);

                    let nextElv =  elevations[hInd0 + 1];
                    if(checkNoDataValue(noDataValues, nextElv)) {
                        nextElv = 0.0;
                    }
                    
                    let eps = false;
                    if(noDataValues.length === 0){
                        let step = currVert.distance(nextVert);
                        let deltaElv = Math.abs(currElv - nextElv);
                        eps = ((deltaElv / step) > 10.0) || (currElv < -5000);
                    }

                    if(eps){
                        noDataVertices[noDataInd] = 1;
                    } else {
                        noDataVertices[noDataInd] = 0;
                        if (v0.x < xmin) xmin = v0.x; if (v0.x > xmax) xmax = v0.x;
                        if (v0.y < ymin) ymin = v0.y; if (v0.y > ymax) ymax = v0.y;
                        if (v0.z < zmin) zmin = v0.z; if (v0.z > zmax) zmax = v0.z;
                    }

                    terrainVerticesHigh[vInd] = _tempHigh.x;
                    terrainVerticesLow[vInd] = _tempLow.x;
                    terrainVertices[vInd++] = v0.x;

                    terrainVerticesHigh[vInd] = _tempHigh.y;
                    terrainVerticesLow[vInd] = _tempLow.y;
                    terrainVertices[vInd++] = v0.y;

                    terrainVerticesHigh[vInd] = _tempHigh.z;
                    terrainVerticesLow[vInd] = _tempLow.z;
                    terrainVertices[vInd++] = v0.z;

                    noDataInd++;
                }

                if (i !== fileGridSize && j !== fileGridSize) {

                    //
                    //  V1
                    //
                    var hInd1 = k + 1;
                    var vInd1 = hInd1 * 3;
                    var elv = elevations[hInd1];
                    if(checkNoDataValue(noDataValues, elv)) {
                        elv = 0.0;
                    }
                    var h1 = hf * elv;
                    var v1 = new Vec3(nv[vInd1] + h1 * nn[vInd1], nv[vInd1 + 1] + h1 * nn[vInd1 + 1], nv[vInd1 + 2] + h1 * nn[vInd1 + 2]);

                    doubleToTwoFloats(v1, _tempHigh, _tempLow);

                    normalMapVertices[vInd1] = v1.x;
                    normalMapVertices[vInd1 + 1] = v1.y;
                    normalMapVertices[vInd1 + 2] = v1.z;

                    normalMapVerticesHigh[vInd1] = _tempHigh.x;
                    normalMapVerticesHigh[vInd1 + 1] = _tempHigh.y;
                    normalMapVerticesHigh[vInd1 + 2] = _tempHigh.z;

                    normalMapVerticesLow[vInd1] = _tempLow.x;
                    normalMapVerticesLow[vInd1 + 1] = _tempLow.y;
                    normalMapVerticesLow[vInd1 + 2] = _tempLow.z;

                    //
                    //  V2
                    //
                    var hInd2 = k + fileGridSize_one;
                    var vInd2 = hInd2 * 3;
                    var elv = elevations[hInd2];
                    if(checkNoDataValue(noDataValues, elv)) {
                        elv = 0.0;
                    }
                    var h2 = hf * elv;
                    var v2 = new Vec3(nv[vInd2] + h2 * nn[vInd2], nv[vInd2 + 1] + h2 * nn[vInd2 + 1], nv[vInd2 + 2] + h2 * nn[vInd2 + 2]);

                    doubleToTwoFloats(v2, _tempHigh, _tempLow);

                    normalMapVertices[vInd2] = v2.x;
                    normalMapVertices[vInd2 + 1] = v2.y;
                    normalMapVertices[vInd2 + 2] = v2.z;

                    normalMapVerticesHigh[vInd2] = _tempHigh.x;
                    normalMapVerticesHigh[vInd2 + 1] = _tempHigh.y;
                    normalMapVerticesHigh[vInd2 + 2] = _tempHigh.z;

                    normalMapVerticesLow[vInd2] = _tempLow.x;
                    normalMapVerticesLow[vInd2 + 1] = _tempLow.y;
                    normalMapVerticesLow[vInd2 + 2] = _tempLow.z;

                    //
                    //  V3
                    //
                    var hInd3 = k + fileGridSize_one + 1;
                    var vInd3 = hInd3 * 3;
                    var elv = elevations[hInd3];
                    if(checkNoDataValue(noDataValues, elv)) {
                        elv = 0.0;
                    }
                    var h3 = hf * elv;
                    var v3 = new Vec3(nv[vInd3] + h3 * nn[vInd3], nv[vInd3 + 1] + h3 * nn[vInd3 + 1], nv[vInd3 + 2] + h3 * nn[vInd3 + 2]);

                    doubleToTwoFloats(v3, _tempHigh, _tempLow);

                    normalMapVertices[vInd3] = v3.x;
                    normalMapVertices[vInd3 + 1] = v3.y;
                    normalMapVertices[vInd3 + 2] = v3.z;

                    normalMapVerticesHigh[vInd3] = _tempHigh.x;
                    normalMapVerticesHigh[vInd3 + 1] = _tempHigh.y;
                    normalMapVerticesHigh[vInd3 + 2] = _tempHigh.z;

                    normalMapVerticesLow[vInd3] = _tempLow.x;
                    normalMapVerticesLow[vInd3 + 1] = _tempLow.y;
                    normalMapVerticesLow[vInd3 + 2] = _tempLow.z;

                    //
                    // Normal
                    //
                    var e10 = v1.sub(v0),
                        e20 = v2.sub(v0),
                        e30 = v3.sub(v0);
                    var sw = e20.cross(e30).normalize();
                    var ne = e30.cross(e10).normalize();
                    var n0 = ne.add(sw).normalize();

                    normalMapNormals[vInd0] += n0.x;
                    normalMapNormals[vInd0 + 1] += n0.y;
                    normalMapNormals[vInd0 + 2] += n0.z;

                    normalMapNormals[vInd1] += ne.x;
                    normalMapNormals[vInd1 + 1] += ne.y;
                    normalMapNormals[vInd1 + 2] += ne.z;

                    normalMapNormals[vInd2] += sw.x;
                    normalMapNormals[vInd2 + 1] += sw.y;
                    normalMapNormals[vInd2 + 2] += sw.z;

                    normalMapNormals[vInd3] += n0.x;
                    normalMapNormals[vInd3 + 1] += n0.y;
                    normalMapNormals[vInd3 + 2] += n0.z;
                }
            }

        } else {

            normalMapNormals = new Float32Array(gsgs3);
            normalMapVertices = new Float64Array(gsgs3);
            normalMapVerticesHigh = new Float32Array(gsgs3);
            normalMapVerticesLow = new Float32Array(gsgs3);
            normalMapNormals = new Float32Array(gsgs3);

            var oneSize = tgs / fileGridSize;
            var h, inside_i, inside_j, v_i, v_j;
            var gsgs = gsgs3 / 3;
            var fgsOne = fileGridSize + 1;

            for(let i = 0; i < gsgs; i++) {
                let ii = Math.floor(i / gs),
                    ij = i % gs;
              
                let qii = ii % oneSize,
                    qij = ij % oneSize;

                let hlt_ind = Math.floor(ii / oneSize) * fgsOne + Math.floor(ij / oneSize);

                if (ij === tgs) {
                    hlt_ind -= 1;
                    qij = oneSize;
                }

                if (ii === tgs) {
                    hlt_ind -= fgsOne;
                    qii = oneSize;
                }

                let hrt_ind = hlt_ind + 1,
                    hlb_ind = hlt_ind + fgsOne,
                    hrb_ind = hlb_ind + 1;

                let h_lt = elevations[hlt_ind],
                    h_rt = elevations[hrt_ind],
                    h_lb = elevations[hlb_ind],
                    h_rb = elevations[hrb_ind];

                if(checkNoDataValue(noDataValues, h_lt)) {
                    h_lt = 0.0;
                }

                if(checkNoDataValue(noDataValues, h_rt)) {
                    h_rt = 0.0;
                }

                if(checkNoDataValue(noDataValues, h_lb)) {
                    h_lb = 0.0;
                }

                if(checkNoDataValue(noDataValues, h_rb)) {
                    h_rb = 0.0;
                }

                let hi = blerp(qij / oneSize, qii / oneSize, h_lt, h_rt, h_lb, h_rb);

                let i3 = i * 3;

                _tempVec.x = this_plainVertices[i3] + hi * this_plainNormals[i3],
                _tempVec.y = this_plainVertices[i3 + 1] + hi * this_plainNormals[i3 + 1],
                _tempVec.z = this_plainVertices[i3 + 2] + hi * this_plainNormals[i3 + 2];

                doubleToTwoFloats(_tempVec, _tempHigh, _tempLow);

                terrainVertices[i3] = _tempVec.x;
                terrainVertices[i3 + 1] = _tempVec.y;
                terrainVertices[i3 + 2] = _tempVec.z;

                terrainVerticesHigh[i3] = _tempHigh.x;
                terrainVerticesHigh[i3 + 1] = _tempHigh.y;
                terrainVerticesHigh[i3 + 2] = _tempHigh.z;

                terrainVerticesLow[i3] = _tempLow.x;
                terrainVerticesLow[i3 + 1] = _tempLow.y;
                terrainVerticesLow[i3 + 2] = _tempLow.z;

                if (_tempVec.x < xmin) xmin = _tempVec.x; if (_tempVec.x > xmax) xmax = _tempVec.x;
                if (_tempVec.y < ymin) ymin = _tempVec.y; if (_tempVec.y > ymax) ymax = _tempVec.y;
                if (_tempVec.z < zmin) zmin = _tempVec.z; if (_tempVec.z > zmax) zmax = _tempVec.z;
            }

            normalMapVertices.set(terrainVertices);
            normalMapVerticesHigh.set(terrainVerticesHigh);
            normalMapVerticesLow.set(terrainVerticesLow);

            for(var k=0;k < gsgs; k++) {

                var j = k % gs,
                    i = ~~(k / gs);

                if (i !== tgs && j !== tgs) {
                    var v0ind = k * 3,
                        v1ind = v0ind + 3,
                        v2ind = v0ind + gs * 3,
                        v3ind = v2ind + 3;


                    var v0 = new Vec3(terrainVertices[v0ind], terrainVertices[v0ind + 1], terrainVertices[v0ind + 2]),
                        v1 = new Vec3(terrainVertices[v1ind], terrainVertices[v1ind + 1], terrainVertices[v1ind + 2]),
                        v2 = new Vec3(terrainVertices[v2ind], terrainVertices[v2ind + 1], terrainVertices[v2ind + 2]),
                        v3 = new Vec3(terrainVertices[v3ind], terrainVertices[v3ind + 1], terrainVertices[v3ind + 2]);

                    var e10 = v1.sub(v0).normalize(),
                        e20 = v2.sub(v0).normalize(),
                        e30 = v3.sub(v0).normalize();

                    var sw = e20.cross(e30).normalize();
                    var ne = e30.cross(e10).normalize();
                    var n0 = ne.add(sw).normalize();

                    normalMapNormals[v0ind] += n0.x;
                    normalMapNormals[v0ind + 1] += n0.y;
                    normalMapNormals[v0ind + 2] += n0.z;

                    normalMapNormals[v1ind] += ne.x;
                    normalMapNormals[v1ind + 1] += ne.y;
                    normalMapNormals[v1ind + 2] += ne.z;

                    normalMapNormals[v2ind] += sw.x;
                    normalMapNormals[v2ind + 1] += sw.y;
                    normalMapNormals[v2ind + 2] += sw.z;

                    normalMapNormals[v3ind] += n0.x;
                    normalMapNormals[v3ind + 1] += n0.y;
                    normalMapNormals[v3ind + 2] += n0.z;
                }
            }
        }

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

export { TerrainWorker };
