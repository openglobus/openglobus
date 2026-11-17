"use strict";
//
// Plain grid of a segment: the ellipsoid surface raised by the geoid, with no elevations.
// The plain segment worker makes the mesh of it, the terrain worker makes the grid the elevations are added to.
//

let model = null;

let cached_ix = null;
let cached_iy = null;
let v00 = null;
let v01 = null;
let v10 = null;
let v11 = null;

/**
 * Sets the geoid model of the worker.
 */
export function setGeoidModel(geoidModel, rawfile) {
    model = geoidModel;
    model.rawfile = rawfile;
    cached_ix = cached_iy = null;
}

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
}

function getHeightMSL(lon, lat) {
    if (!model) return 0;

    if (lon < 0) lon += 360.0;

    var fy = (90 - lat) * model.rlatres;
    var fx = lon * model.rlonres;
    var iy = Math.floor(fy);
    var ix = Math.floor(fx);

    fx -= ix;
    fy -= iy;

    if (iy === model.height - 1) {
        iy--;
    }

    if (cached_ix !== ix || cached_iy !== iy) {
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
}

const HALF_PI = Math.PI * 0.5;
const POLE = 20037508.34;
const PI_BY_POLE = Math.PI / POLE;
const INV_POLE_BY_180 = 180.0 / POLE;
const INV_PI_BY_180 = 180.0 / Math.PI;
const INV_PI_BY_180_HALF_PI = INV_PI_BY_180 * HALF_PI;
const RADIANS = Math.PI / 180.0;
const INV_PI_BY_360 = INV_PI_BY_180 * 2.0;

// A position on a cube face, from 0 to 1, as a coordinate on the plane of the face, from -1 to 1
const toEquiangularPlane = (position) => Math.tan(HALF_PI * (position - 0.5));
const toGnomonicPlane = (position) => 2.0 * position - 1.0;

// Longitude terms of the grid columns, the latitude ones are made once per row
let _lon = new Float64Array(0),
    _cosLon = new Float64Array(0),
    _sinLon = new Float64Array(0);

/**
 * Writes the (gridSize + 1) x (gridSize + 1) plain vertices of the segment, relative to its center,
 * and their ellipsoid normals, rows from north to south.
 * @param {Float64Array} params - Segment parameters, see createPlainSegmentParams.
 * @param {number} gridSize - Grid size.
 * @param {Float64Array} outVertices - Vertices.
 * @param {Float32Array} outNormals - Normals.
 */
export function createPlainGrid(params, gridSize, outVertices, outNormals) {
    const rtc_x = params[14],
        rtc_y = params[15],
        rtc_z = params[16];

    const E2 = params[8],
        A = params[9];

    const r2_x = params[10],
        r2_y = params[11],
        r2_z = params[12];

    const heightFactor = params[13];

    // Mercator extent, its coordinates are converted to degrees
    const isMerc = params[1] === 0.0;

    // Cube extent, the longitude is the face index and the position on it, see proj/cube
    const isCube = params[1] >= 2.0,
        toCubePlane = params[1] === 2.0 ? toEquiangularPlane : toGnomonicPlane,
        face = params.subarray(17, 26);

    const llStep = (params[6] - params[4]) / gridSize,
        ltStep = (params[7] - params[5]) / gridSize;

    const esw_lon = params[4],
        ene_lat = params[7];

    const gs = gridSize + 1;

    let ind = 0;

    if (_lon.length < gs) {
        _lon = new Float64Array(gs);
        _cosLon = new Float64Array(gs);
        _sinLon = new Float64Array(gs);
    }

    for (let j = 0; j < gs; j++) {
        let lon = esw_lon + j * llStep;
        if (isCube) {
            _lon[j] = toCubePlane(lon - Math.floor(esw_lon));
            continue;
        }
        if (isMerc) {
            lon = lon * INV_POLE_BY_180;
        }
        let lonrad = RADIANS * lon;
        _lon[j] = lon;
        _cosLon[j] = Math.cos(lonrad);
        _sinLon[j] = Math.sin(lonrad);
    }

    for (let i = 0; i < gs; i++) {
        let lat = ene_lat - i * ltStep;
        if (isMerc) {
            lat = INV_PI_BY_360 * Math.atan(Math.exp(lat * PI_BY_POLE)) - INV_PI_BY_180_HALF_PI;
        }

        let b = 0.0,
            slt = 0.0,
            clt = 0.0,
            N = 0.0,
            Nb = 0.0;

        if (isCube) {
            b = toCubePlane(lat);
        } else {
            let latrad = RADIANS * lat;
            slt = Math.sin(latrad);
            clt = Math.cos(latrad);
            N = A / Math.sqrt(1.0 - E2 * slt * slt);
            Nb = N * (1 - E2);
        }

        for (let j = 0; j < gs; j++) {
            let wx, wy, wz;

            if (isCube) {
                let a = _lon[j],
                    dx = face[0] + a * face[3] + b * face[6],
                    dy = face[1] + a * face[4] + b * face[7],
                    dz = face[2] + a * face[5] + b * face[8],
                    dl = 1.0 / Math.sqrt(dx * dx + dy * dy + dz * dz);

                dx *= dl;
                dy *= dl;
                dz *= dl;

                let h = model
                    ? getHeightMSL(Math.atan2(dy, dx) * INV_PI_BY_180, Math.asin(dz) * INV_PI_BY_180) * heightFactor
                    : 0.0;

                let Nc = A / Math.sqrt(1.0 - E2 * dz * dz);

                wx = (Nc + h) * dx;
                wy = (Nc + h) * dy;
                wz = (Nc * (1 - E2) + h) * dz;
            } else {
                let h = getHeightMSL(_lon[j], lat) * heightFactor;

                let nc = (N + h) * clt;
                wx = nc * _cosLon[j];
                wy = nc * _sinLon[j];
                wz = (Nb + h) * slt;
            }

            let nx = wx * r2_x,
                ny = wy * r2_y,
                nz = wz * r2_z;
            let l = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);

            outVertices[ind] = wx - rtc_x;
            outNormals[ind++] = nx * l;

            outVertices[ind] = wy - rtc_y;
            outNormals[ind++] = ny * l;

            outVertices[ind] = wz - rtc_z;
            outNormals[ind++] = nz * l;
        }
    }
}
