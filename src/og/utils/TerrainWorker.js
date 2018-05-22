/**
 * @module og/utils/TerrainWorker
 */

'use sctrict';

import { QueueArray } from '../QueueArray.js';

class TerrainWorker {
    constructor(numWorkers = 2) {
        this._id = 0;
        this._segments = {};

        this._workerQueue = new QueueArray(numWorkers);
        var elevationProgramm = new Blob([_programm], { type: 'application/javascript' });

        var that = this;
        for (let i = 0; i < numWorkers; i++) {
            var w = new Worker(URL.createObjectURL(elevationProgramm));
            w.onmessage = function (e) {

                that._segments[e.data.id]._terrainWorkerCallback(e.data);
                that._segments[e.data.id] = null;
                delete that._segments[e.data.id];

                that._workerQueue.unshift(this);
                that.check();
            };

            this._workerQueue.push(w);
        }

        this._pendingQueue = new QueueArray(512);
    }

    check(){
        if (this._pendingQueue.length) {
            var p = this._pendingQueue.pop();
            this.make(p.segment, p.elevations);
        }
    }

    make(segment, elevations) {

        if (segment.ready && segment.terrainIsLoading) {

            var _elevations = new Float32Array(elevations.length);
            _elevations.set(elevations);

            if (this._workerQueue.length) {

                var w = this._workerQueue.pop();

                this._segments[this._id] = segment;

                w.postMessage({
                    'elevations': _elevations,
                    'this_plainVertices': segment.plainVertices,
                    'this_plainNormals': segment.plainNormals,
                    'this_normalMapVertices': segment.normalMapVertices,
                    'this_normalMapNormals': segment.normalMapNormals,
                    'heightFactor': segment.planet._heightFactor,
                    'gridSize': segment.planet.terrain.gridSizeByZoom[segment.tileZoom],
                    'id': this._id++
                }, [
                        _elevations.buffer,
                        segment.plainVertices.buffer,
                        segment.plainNormals.buffer,
                        segment.normalMapVertices.buffer,
                        segment.normalMapNormals.buffer
                    ]);
            } else {
                this._pendingQueue.push({ 'segment': segment, 'elevations': _elevations });
            }
        }
    }
};

const _programm =
    `
    var Vector3 = function(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    };

    Vector3.prototype.sub = function(v) {
        return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
    };

    Vector3.prototype.add = function(v) {
        return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
    };

    Vector3.prototype.cross = function(v) {
        return new Vector3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    };

    Vector3.prototype.normalize = function(v) {
        var x = this.x, y = this.y, z = this.z;
        var length = 1.0 / Math.sqrt(x * x + y * y + z * z);
        this.x = x * length;
        this.y = y * length;
        this.z = z * length;
        return this;
    };
    
    var slice = function (t, h1, h0) {
      return t * (h1 - h0);
    };

    self.onmessage = function (e) {         
        var elevations = e.data.elevations,
            this_plainVertices = e.data.this_plainVertices,
            this_plainNormals = e.data.this_plainNormals,
            this_normalMapVertices = e.data.this_normalMapVertices,
            this_normalMapNormals = e.data.this_normalMapNormals,
            heightFactor =  e.data.heightFactor,
            //fileGridSize = e.data.fileGridSize,
            gridSize = e.data.gridSize;
            id = e.data.id;
        
        var xmin = 549755748352, xmax = -549755748352, 
            ymin = 549755748352, ymax = -549755748352, 
            zmin = 549755748352, zmax = -549755748352;

        var fileGridSize = Math.sqrt(elevations.length) - 1;

        var fileGridSize_one = fileGridSize + 1,
            fileGridSize_one_3 = fileGridSize_one * fileGridSize_one * 3,
            tgs = gridSize,
            dg = fileGridSize / tgs,
            gs = tgs + 1,
            hf = heightFactor;

        var nmvInd = 0;
        var vInd = 0;

        var terrainVertices = new Float32Array(gs * gs * 3);
        var normalMapNormals = new Float32Array(fileGridSize_one_3);
        var normalMapVertices = new Float32Array(fileGridSize_one_3);

        var nv = this_normalMapVertices,
            nn = this_normalMapNormals;

        if (fileGridSize >= tgs) {

                for (var k = 0; k < fileGridSize_one_3; k++) {

                    var j = k % fileGridSize_one,
                        i = ~~(k / fileGridSize_one);

                    var hInd0 = i * fileGridSize_one + j;
                    var vInd0 = hInd0 * 3;
                    var h0 = hf * elevations[hInd0];
                    var v0 = new Vector3(nv[vInd0] + h0 * nn[vInd0], nv[vInd0 + 1] + h0 * nn[vInd0 + 1], nv[vInd0 + 2] + h0 * nn[vInd0 + 2]);
                    normalMapVertices[vInd0] = v0.x;
                    normalMapVertices[vInd0 + 1] = v0.y;
                    normalMapVertices[vInd0 + 2] = v0.z;

                    if (i % dg === 0 && j % dg === 0) {
                        terrainVertices[vInd++] = v0.x;
                        terrainVertices[vInd++] = v0.y;
                        terrainVertices[vInd++] = v0.z;

                        if (v0.x < xmin) xmin = v0.x; if (v0.x > xmax) xmax = v0.x;
                        if (v0.y < ymin) ymin = v0.y; if (v0.y > ymax) ymax = v0.y;
                        if (v0.z < zmin) zmin = v0.z; if (v0.z > zmax) zmax = v0.z;
                    }

                    if (i !== fileGridSize && j !== fileGridSize) {
                        var hInd1 = i * fileGridSize_one + j + 1;
                        var vInd1 = hInd1 * 3;
                        var h1 = hf * elevations[hInd1];
                        var v1 = new Vector3(nv[vInd1] + h1 * nn[vInd1], nv[vInd1 + 1] + h1 * nn[vInd1 + 1], nv[vInd1 + 2] + h1 * nn[vInd1 + 2]);
                        normalMapVertices[vInd1] = v1.x;
                        normalMapVertices[vInd1 + 1] = v1.y;
                        normalMapVertices[vInd1 + 2] = v1.z;

                        var hInd2 = (i + 1) * fileGridSize_one + j;
                        var vInd2 = hInd2 * 3;
                        var h2 = hf * elevations[hInd2];
                        var v2 = new Vector3(
                            nv[vInd2] + h2 * nn[vInd2],
                            nv[vInd2 + 1] + h2 * nn[vInd2 + 1],
                            nv[vInd2 + 2] + h2 * nn[vInd2 + 2]);
                        normalMapVertices[vInd2] = v2.x;
                        normalMapVertices[vInd2 + 1] = v2.y;
                        normalMapVertices[vInd2 + 2] = v2.z;

                        var hInd3 = (i + 1) * fileGridSize_one + (j + 1);
                        var vInd3 = hInd3 * 3;
                        var h3 = hf * elevations[hInd3];
                        var v3 = new Vector3(nv[vInd3] + h3 * nn[vInd3], nv[vInd3 + 1] + h3 * nn[vInd3 + 1], nv[vInd3 + 2] + h3 * nn[vInd3 + 2]);
                        normalMapVertices[vInd3] = v3.x;
                        normalMapVertices[vInd3 + 1] = v3.y;
                        normalMapVertices[vInd3 + 2] = v3.z;

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

            var plain_verts = this_plainVertices;
            var plainNormals = this_plainNormals;

            var oneSize = tgs / fileGridSize;
            var h, inside_i, inside_j, v_i, v_j;

            for (var i = 0; i < gs; i++) 
            {
                if (i == gs - 1) {
                    inside_i = oneSize;
                    v_i = Math.floor(i / oneSize) - 1;
                } else {
                    inside_i = i % oneSize;
                    v_i = Math.floor(i / oneSize);
                }

                for (var j = 0; j < gs; j++) 
                {
                    if (j == gs - 1) {
                        inside_j = oneSize;
                        v_j = Math.floor(j / oneSize) - 1;
                    } else {
                        inside_j = j % oneSize;
                        v_j = Math.floor(j / oneSize);
                    }

                    var hvlt = elevations[v_i * fileGridSize_one + v_j],
                        hvrt = elevations[v_i * fileGridSize_one + v_j + 1],
                        hvlb = elevations[(v_i + 1) * fileGridSize_one + v_j],
                        hvrb = elevations[(v_i + 1) * fileGridSize_one + v_j + 1];

                    if (inside_i + inside_j < oneSize) {
                        h = hf * (hvlt + slice(inside_j / oneSize, hvrt, hvlt) + slice(inside_i / oneSize, hvlb, hvlt));
                    } else {
                        h = hf * (hvrb + slice((oneSize - inside_j) / oneSize, hvlb, hvrb) + slice((oneSize - inside_i) / oneSize, hvrt, hvrb));
                    }

                    var x = plain_verts[vInd] + h * plainNormals[vInd],
                        y = plain_verts[vInd + 1] + h * plainNormals[vInd + 1],
                        z = plain_verts[vInd + 2] + h * plainNormals[vInd + 2];

                    terrainVertices[vInd] = x;
                    terrainVertices[vInd + 1] = y;
                    terrainVertices[vInd + 2] = z;

                    vInd += 3;

                    if (x < xmin) xmin = x; if (x > xmax) xmax = x;
                    if (y < ymin) ymin = y; if (y > ymax) ymax = y;
                    if (z < zmin) zmin = z; if (z > zmax) zmax = z;

                }
            }

            normalMapNormals = this_plainNormals;
        }
        
        self.postMessage({
                id: id,
                normalMapNormals: normalMapNormals,
                normalMapVertices: normalMapVertices,
                terrainVertices: terrainVertices,
                bounds: [xmin, xmax, ymin, ymax, zmin, zmax],
             }, [normalMapNormals.buffer, normalMapVertices.buffer, terrainVertices.buffer]);
    }`;

export { TerrainWorker };