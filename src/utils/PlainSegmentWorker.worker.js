"use strict";

import { doubleToTwoFloatsV3 } from "../math/doubleToTwoFloats";
import { createPlainGrid, setGeoidModel } from "./plainGrid";

const Vec3 = function (x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
};

// Geoid the data are made with, see Geoid.id
var _geoidId = -1;

// Vertices of the normals task, only the normals are sent
var _vertices = new Float64Array(0);

var rtcPos = new Vec3(0.0, 0.0, 0.0);
var _tempHigh = new Vec3(0.0, 0.0, 0.0);
var _tempLow = new Vec3(0.0, 0.0, 0.0);

self.onmessage = function (msg) {
    if (msg.data.geoidId !== undefined) {
        _geoidId = msg.data.geoidId;
        if (msg.data.model) {
            setGeoidModel(msg.data.model, msg.data.rawfile);
        }
    } else if (msg.data.normalsGridSize) {
        // Normals for the normal map of a segment with no elevations, in the grid the elevations would have
        const gridSize = msg.data.normalsGridSize,
            length = (gridSize + 1) * (gridSize + 1) * 3;

        if (_vertices.length < length) {
            _vertices = new Float64Array(length);
        }

        let normalMapNormals = new Float32Array(length);

        createPlainGrid(msg.data.params, gridSize, _vertices, normalMapNormals);

        self.postMessage({ id: msg.data.params[0], geoidId: _geoidId, normalMapNormals: normalMapNormals }, [
            normalMapNormals.buffer
        ]);
    } else if (msg.data.params) {
        const params = msg.data.params,
            gridSize = params[2],
            gridSize3 = (gridSize + 1) * (gridSize + 1) * 3;

        let plainNormals = new Float32Array(gridSize3);

        let plainVertices = new Float64Array(gridSize3);
        let plainVerticesHigh = new Float32Array(gridSize3);
        let plainVerticesLow = new Float32Array(gridSize3);

        createPlainGrid(params, gridSize, plainVertices, plainNormals);

        for (let ind = 0; ind < gridSize3; ind += 3) {
            rtcPos.x = plainVertices[ind];
            rtcPos.y = plainVertices[ind + 1];
            rtcPos.z = plainVertices[ind + 2];

            doubleToTwoFloatsV3(rtcPos, _tempHigh, _tempLow);

            plainVerticesHigh[ind] = _tempHigh.x;
            plainVerticesLow[ind] = _tempLow.x;

            plainVerticesHigh[ind + 1] = _tempHigh.y;
            plainVerticesLow[ind + 1] = _tempLow.y;

            plainVerticesHigh[ind + 2] = _tempHigh.z;
            plainVerticesLow[ind + 2] = _tempLow.z;
        }

        self.postMessage(
            {
                id: params[0],
                geoidId: _geoidId,
                plainVertices: plainVertices,
                plainVerticesHigh: plainVerticesHigh,
                plainVerticesLow: plainVerticesLow,
                plainNormals: plainNormals,
                relativeCenter: [params[14], params[15], params[16]]
            },
            [plainVertices.buffer, plainVerticesHigh.buffer, plainVerticesLow.buffer, plainNormals.buffer]
        );
    }
};
