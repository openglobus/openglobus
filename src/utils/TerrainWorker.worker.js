"use strict";
//
//Terrain worker
//
import { getMedian, getMeshHeights } from "../terrain/terrainUtils";
import { doubleToTwoFloatsV3 } from "../math/doubleToTwoFloats";
import { createPlainGrid, setGeoidModel } from "./plainGrid";
import { NormalsArray } from "./normalsArray";

function binarySearchFast(arr, x) {
    let start = 0,
        end = arr.length - 1;
    while (start <= end) {
        let k = Math.floor((start + end) * 0.5);
        if (Math.abs(arr[k] - x) < 1e-3) return k;
        else if (arr[k] < x) start = k + 1;
        else end = k - 1;
    }
    return -1;
}

function checkNoDataValue(noDataValues, value) {
    return binarySearchFast(noDataValues, value) !== -1;
}

var Vec3 = function (x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
};

var blerp = function (x, y, fQ11, fQ21, fQ12, fQ22) {
    return fQ11 * (1.0 - x) * (1.0 - y) + fQ21 * x * (1.0 - y) + fQ12 * (1.0 - x) * y + fQ22 * x * y;
};

var _tempVec = new Vec3(0.0, 0.0, 0.0);
var _rtcTempVec = new Vec3(0.0, 0.0, 0.0);

var _tempHigh = new Vec3(0.0, 0.0, 0.0),
    _tempLow = new Vec3(0.0, 0.0, 0.0);

var _meshHeights = new Float32Array(0);

// Squared vertex radii, their median is the LOD radius
var _r2 = new Float64Array(0);

// Geocentric file grid vertices, the quad normals are made from them
var _world = new Float64Array(0);

// Plain grid the elevations are added to, see utils/plainGrid
var _plainVertices = new Float64Array(0),
    _plainNormals = new Float32Array(0);

// Sums of the quad normals at the vertices, they are sent in NormalsArray
var _normalSums = new Float32Array(0);

function getNormalSums(length) {
    if (_normalSums.length < length) {
        _normalSums = new Float32Array(length);
    } else {
        _normalSums.fill(0, 0, length);
    }
    return _normalSums;
}

// A tile with a mesh grid less than that gives its file grid vertices to the children, see Node.whileTerrainLoading
const MIN_GRID_SIZE_WITHOUT_FILE_VERTICES = 4;

// Geoid the data are made with, see Geoid.id
var _geoidId = -1;

self.onmessage = function (e) {
    if (e.data.geoidId !== undefined) {
        _geoidId = e.data.geoidId;
        if (e.data.model) {
            setGeoidModel(e.data.model, e.data.rawfile);
        }
        return;
    }

    var elevations = e.data.elevations,
        params = e.data.params,
        heightFactor = e.data.heightFactor,
        gridSize = e.data.gridSize,
        noDataValues = e.data.noDataValues,
        id = e.data.id;

    let rtc_x = params[14],
        rtc_y = params[15],
        rtc_z = params[16];

    var xmin = 549755748352.0,
        xmax = -549755748352.0,
        ymin = 549755748352.0,
        ymax = -549755748352.0,
        zmin = 549755748352.0,
        zmax = -549755748352.0;

    // Squared geocentric distance of the same vertices. The axis aligned bounds above cannot tell
    // relief from segment size, because the box of a tilted patch is far larger than the patch, so
    // the radius range is accumulated here instead. Kept squared to avoid a root per vertex.
    var r2min = Infinity,
        r2max = -Infinity;

    const fileGridSize = Math.sqrt(elevations.length) - 1;

    const fileGridSize_one = fileGridSize + 1;
    const fileGridSize_one_x2 = fileGridSize_one * fileGridSize_one;
    const tgs = gridSize;
    const dg = fileGridSize / tgs;
    const gs = tgs + 1;
    const hf = heightFactor;

    var vInd = 0;

    var gsgs3 = gs * gs * 3;

    if (_r2.length !== gs * gs) {
        _r2 = new Float64Array(gs * gs);
    }

    var terrainVertices = new Float64Array(gsgs3),
        terrainVerticesHigh = new Float32Array(gsgs3),
        terrainVerticesLow = new Float32Array(gsgs3);

    var normalSums,
        normalsLength,
        normalMapVertices = null;

    const plainGridSize = Math.max(fileGridSize, tgs),
        plainLength = (plainGridSize + 1) * (plainGridSize + 1) * 3;

    if (_plainVertices.length < plainLength) {
        _plainVertices = new Float64Array(plainLength);
        _plainNormals = new Float32Array(plainLength);
    }

    createPlainGrid(params, plainGridSize, _plainVertices, _plainNormals);

    var nv = _plainVertices,
        nn = _plainNormals,
        this_plainVertices = _plainVertices,
        this_plainNormals = _plainNormals;

    if (fileGridSize >= tgs) {
        normalsLength = plainLength;
        normalSums = getNormalSums(normalsLength);

        if (tgs < MIN_GRID_SIZE_WITHOUT_FILE_VERTICES) {
            normalMapVertices = new Float64Array(plainLength);
        }

        // Mesh heights keep the elevations peaks and pits, moved to the nearest mesh vertices
        let meshHeights = null;
        if (dg > 1) {
            if (_meshHeights.length !== gs * gs) {
                _meshHeights = new Float32Array(gs * gs);
            }
            meshHeights = getMeshHeights(
                elevations,
                fileGridSize,
                tgs,
                noDataValues.length ? noDataValues[0] : NaN,
                _meshHeights
            );
        }

        if (_world.length < fileGridSize_one_x2 * 3) {
            _world = new Float64Array(fileGridSize_one_x2 * 3);
        }

        //
        // Vertices, each one once
        //
        for (let k = 0; k < fileGridSize_one_x2; k++) {
            var j = k % fileGridSize_one,
                i = ~~(k / fileGridSize_one);

            var vInd0 = k * 3;
            var currElv = elevations[k];
            if (checkNoDataValue(noDataValues, currElv)) {
                currElv = 0.0;
            }
            var h0 = hf * currElv;
            var v0x = rtc_x + nv[vInd0] + h0 * nn[vInd0],
                v0y = rtc_y + nv[vInd0 + 1] + h0 * nn[vInd0 + 1],
                v0z = rtc_z + nv[vInd0 + 2] + h0 * nn[vInd0 + 2];

            _world[vInd0] = v0x;
            _world[vInd0 + 1] = v0y;
            _world[vInd0 + 2] = v0z;

            if (normalMapVertices) {
                normalMapVertices[vInd0] = v0x - rtc_x;
                normalMapVertices[vInd0 + 1] = v0y - rtc_y;
                normalMapVertices[vInd0 + 2] = v0z - rtc_z;
            }

            //
            // The vertex goes into screen buffer
            if (i % dg === 0 && j % dg === 0) {
                let mx = v0x,
                    my = v0y,
                    mz = v0z;
                if (meshHeights) {
                    let meshElv = meshHeights[(i / dg) * gs + j / dg];
                    // Only the vertices a peak or pit is moved to
                    if (meshElv !== elevations[k] && !checkNoDataValue(noDataValues, meshElv)) {
                        let mh = hf * meshElv;
                        mx = rtc_x + nv[vInd0] + mh * nn[vInd0];
                        my = rtc_y + nv[vInd0 + 1] + mh * nn[vInd0 + 1];
                        mz = rtc_z + nv[vInd0 + 2] + mh * nn[vInd0 + 2];
                    }
                }

                if (mx < xmin) xmin = mx;
                if (mx > xmax) xmax = mx;
                if (my < ymin) ymin = my;
                if (my > ymax) ymax = my;
                if (mz < zmin) zmin = mz;
                if (mz > zmax) zmax = mz;

                let r2_v0 = mx * mx + my * my + mz * mz;
                if (r2_v0 < r2min) r2min = r2_v0;
                if (r2_v0 > r2max) r2max = r2_v0;
                _r2[vInd / 3] = r2_v0;

                _rtcTempVec.x = mx - rtc_x;
                _rtcTempVec.y = my - rtc_y;
                _rtcTempVec.z = mz - rtc_z;
                doubleToTwoFloatsV3(_rtcTempVec, _tempHigh, _tempLow);

                terrainVerticesHigh[vInd] = _tempHigh.x;
                terrainVerticesLow[vInd] = _tempLow.x;
                terrainVertices[vInd++] = _rtcTempVec.x;

                terrainVerticesHigh[vInd] = _tempHigh.y;
                terrainVerticesLow[vInd] = _tempLow.y;
                terrainVertices[vInd++] = _rtcTempVec.y;

                terrainVerticesHigh[vInd] = _tempHigh.z;
                terrainVerticesLow[vInd] = _tempLow.z;
                terrainVertices[vInd++] = _rtcTempVec.z;
            }
        }

        //
        // Normals of the quads V0 V1 / V2 V3, added to their vertices in the quads order
        //
        for (let i = 0; i < fileGridSize; i++) {
            for (let j = 0; j < fileGridSize; j++) {
                let vInd0 = (i * fileGridSize_one + j) * 3,
                    vInd1 = vInd0 + 3,
                    vInd2 = vInd0 + fileGridSize_one * 3,
                    vInd3 = vInd2 + 3;

                let x0 = _world[vInd0],
                    y0 = _world[vInd0 + 1],
                    z0 = _world[vInd0 + 2];

                let e10x = _world[vInd1] - x0,
                    e10y = _world[vInd1 + 1] - y0,
                    e10z = _world[vInd1 + 2] - z0;

                let e20x = _world[vInd2] - x0,
                    e20y = _world[vInd2 + 1] - y0,
                    e20z = _world[vInd2 + 2] - z0;

                let e30x = _world[vInd3] - x0,
                    e30y = _world[vInd3 + 1] - y0,
                    e30z = _world[vInd3 + 2] - z0;

                // sw = e20 x e30, ne = e30 x e10, n0 = ne + sw, normalized
                let swx = e20y * e30z - e20z * e30y,
                    swy = e20z * e30x - e20x * e30z,
                    swz = e20x * e30y - e20y * e30x;
                let l = 1.0 / Math.sqrt(swx * swx + swy * swy + swz * swz);
                swx *= l;
                swy *= l;
                swz *= l;

                let nex = e30y * e10z - e30z * e10y,
                    ney = e30z * e10x - e30x * e10z,
                    nez = e30x * e10y - e30y * e10x;
                l = 1.0 / Math.sqrt(nex * nex + ney * ney + nez * nez);
                nex *= l;
                ney *= l;
                nez *= l;

                let n0x = nex + swx,
                    n0y = ney + swy,
                    n0z = nez + swz;
                l = 1.0 / Math.sqrt(n0x * n0x + n0y * n0y + n0z * n0z);
                n0x *= l;
                n0y *= l;
                n0z *= l;

                normalSums[vInd0] += n0x;
                normalSums[vInd0 + 1] += n0y;
                normalSums[vInd0 + 2] += n0z;

                normalSums[vInd1] += nex;
                normalSums[vInd1 + 1] += ney;
                normalSums[vInd1 + 2] += nez;

                normalSums[vInd2] += swx;
                normalSums[vInd2 + 1] += swy;
                normalSums[vInd2 + 2] += swz;

                normalSums[vInd3] += n0x;
                normalSums[vInd3 + 1] += n0y;
                normalSums[vInd3 + 2] += n0z;
            }
        }
    } else {
        normalsLength = gsgs3;
        normalSums = getNormalSums(normalsLength);

        var oneSize = tgs / fileGridSize;
        var gsgs = gsgs3 / 3;
        var fgsOne = fileGridSize + 1;

        for (let i = 0; i < gsgs; i++) {
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

            if (checkNoDataValue(noDataValues, h_lt)) {
                h_lt = 0.0;
            }

            if (checkNoDataValue(noDataValues, h_rt)) {
                h_rt = 0.0;
            }

            if (checkNoDataValue(noDataValues, h_lb)) {
                h_lb = 0.0;
            }

            if (checkNoDataValue(noDataValues, h_rb)) {
                h_rb = 0.0;
            }

            let hi = blerp(qij / oneSize, qii / oneSize, h_lt, h_rt, h_lb, h_rb);

            let i3 = i * 3;

            _rtcTempVec.x = this_plainVertices[i3] + hi * this_plainNormals[i3];
            _rtcTempVec.y = this_plainVertices[i3 + 1] + hi * this_plainNormals[i3 + 1];
            _rtcTempVec.z = this_plainVertices[i3 + 2] + hi * this_plainNormals[i3 + 2];

            doubleToTwoFloatsV3(_rtcTempVec, _tempHigh, _tempLow);

            terrainVertices[i3] = _rtcTempVec.x;
            terrainVertices[i3 + 1] = _rtcTempVec.y;
            terrainVertices[i3 + 2] = _rtcTempVec.z;

            terrainVerticesHigh[i3] = _tempHigh.x;
            terrainVerticesHigh[i3 + 1] = _tempHigh.y;
            terrainVerticesHigh[i3 + 2] = _tempHigh.z;

            terrainVerticesLow[i3] = _tempLow.x;
            terrainVerticesLow[i3 + 1] = _tempLow.y;
            terrainVerticesLow[i3 + 2] = _tempLow.z;

            _tempVec.x = _rtcTempVec.x + rtc_x;
            _tempVec.y = _rtcTempVec.y + rtc_y;
            _tempVec.z = _rtcTempVec.z + rtc_z;

            if (_tempVec.x < xmin) xmin = _tempVec.x;
            if (_tempVec.x > xmax) xmax = _tempVec.x;
            if (_tempVec.y < ymin) ymin = _tempVec.y;
            if (_tempVec.y > ymax) ymax = _tempVec.y;
            if (_tempVec.z < zmin) zmin = _tempVec.z;
            if (_tempVec.z > zmax) zmax = _tempVec.z;

            let r2_tmp = _tempVec.x * _tempVec.x + _tempVec.y * _tempVec.y + _tempVec.z * _tempVec.z;
            if (r2_tmp < r2min) r2min = r2_tmp;
            if (r2_tmp > r2max) r2max = r2_tmp;
            _r2[i] = r2_tmp;
        }

        for (let k = 0; k < gsgs; k++) {
            let j = k % gs,
                i = ~~(k / gs);

            if (i !== tgs && j !== tgs) {
                let v0ind = k * 3,
                    v1ind = v0ind + 3,
                    v2ind = v0ind + gs * 3,
                    v3ind = v2ind + 3;

                let x0 = terrainVertices[v0ind] + rtc_x,
                    y0 = terrainVertices[v0ind + 1] + rtc_y,
                    z0 = terrainVertices[v0ind + 2] + rtc_z;

                // Edges are normalized here before the cross products
                let e10x = terrainVertices[v1ind] + rtc_x - x0,
                    e10y = terrainVertices[v1ind + 1] + rtc_y - y0,
                    e10z = terrainVertices[v1ind + 2] + rtc_z - z0;
                let l = 1.0 / Math.sqrt(e10x * e10x + e10y * e10y + e10z * e10z);
                e10x *= l;
                e10y *= l;
                e10z *= l;

                let e20x = terrainVertices[v2ind] + rtc_x - x0,
                    e20y = terrainVertices[v2ind + 1] + rtc_y - y0,
                    e20z = terrainVertices[v2ind + 2] + rtc_z - z0;
                l = 1.0 / Math.sqrt(e20x * e20x + e20y * e20y + e20z * e20z);
                e20x *= l;
                e20y *= l;
                e20z *= l;

                let e30x = terrainVertices[v3ind] + rtc_x - x0,
                    e30y = terrainVertices[v3ind + 1] + rtc_y - y0,
                    e30z = terrainVertices[v3ind + 2] + rtc_z - z0;
                l = 1.0 / Math.sqrt(e30x * e30x + e30y * e30y + e30z * e30z);
                e30x *= l;
                e30y *= l;
                e30z *= l;

                // sw = e20 x e30, ne = e30 x e10, n0 = ne + sw, normalized
                let swx = e20y * e30z - e20z * e30y,
                    swy = e20z * e30x - e20x * e30z,
                    swz = e20x * e30y - e20y * e30x;
                l = 1.0 / Math.sqrt(swx * swx + swy * swy + swz * swz);
                swx *= l;
                swy *= l;
                swz *= l;

                let nex = e30y * e10z - e30z * e10y,
                    ney = e30z * e10x - e30x * e10z,
                    nez = e30x * e10y - e30y * e10x;
                l = 1.0 / Math.sqrt(nex * nex + ney * ney + nez * nez);
                nex *= l;
                ney *= l;
                nez *= l;

                let n0x = nex + swx,
                    n0y = ney + swy,
                    n0z = nez + swz;
                l = 1.0 / Math.sqrt(n0x * n0x + n0y * n0y + n0z * n0z);
                n0x *= l;
                n0y *= l;
                n0z *= l;

                normalSums[v0ind] += n0x;
                normalSums[v0ind + 1] += n0y;
                normalSums[v0ind + 2] += n0z;

                normalSums[v1ind] += nex;
                normalSums[v1ind + 1] += ney;
                normalSums[v1ind + 2] += nez;

                normalSums[v2ind] += swx;
                normalSums[v2ind + 1] += swy;
                normalSums[v2ind + 2] += swz;

                normalSums[v3ind] += n0x;
                normalSums[v3ind + 1] += n0y;
                normalSums[v3ind + 2] += n0z;
            }
        }
    }

    const normalMapNormals = new NormalsArray(normalSums.subarray(0, normalsLength));

    const transfer = [
        normalMapNormals.buffer,
        terrainVertices.buffer,
        terrainVerticesHigh.buffer,
        terrainVerticesLow.buffer
    ];

    if (normalMapVertices) {
        transfer.push(normalMapVertices.buffer);
    }

    self.postMessage(
        {
            id: id,
            geoidId: _geoidId,
            normalMapNormals: normalMapNormals,
            normalMapVertices: normalMapVertices,
            terrainVertices: terrainVertices,
            terrainVerticesHigh: terrainVerticesHigh,
            terrainVerticesLow: terrainVerticesLow,
            bounds: [xmin, ymin, zmin, xmax, ymax, zmax],
            radiusRange: r2max >= r2min ? [Math.sqrt(r2min), Math.sqrt(r2max)] : null,
            lodRadius: Math.sqrt(getMedian(_r2, gs * gs)),
            relativeCenter: [rtc_x, rtc_y, rtc_z]
        },
        transfer
    );
};
