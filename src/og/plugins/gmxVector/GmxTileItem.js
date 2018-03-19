/**
 * @module og/gmx/GmxTileItem
 */

'use strict';

import * as math from '../../math.js';
import { Extent } from '../../Extent.js';
import { earcut, flatten } from '../../utils/earcut.js';
import { GmxVectorTileCreator } from './GmxVectorTileCreator.js';
import { LonLat } from '../../LonLat.js';

function chkOnEdge(p1, p2, ext) {
    if (p1[0] === p2[0] && (Math.abs(p1[0] - ext.northEast.lon) < 0.05 || Math.abs(p1[0] - ext.southWest.lon) < 0.05) ||
        p1[1] === p2[1] && (Math.abs(p1[1] - ext.northEast.lat) < 0.05 || Math.abs(p1[1] - ext.southWest.lat) < 0.05)) {
        return true;
    }
    return false;
};

const GmxTileItem = function (item, geometry) {

    this.tileData = null;
    this.tileDataIndex = -1;

    this.item = item;
    this.geometry = geometry;

    //Polygon arrays
    this._polyVerticesMerc = [];
    this._polyIndexes = [];

    //Line arrays
    this._lineVerticesMerc = [];
    this._lineOrders = [];
    this._lineIndexes = [];

    //Point array
    //...

    //Label array
    //...

    //Buffers
    this._polyVerticesBufferMerc = null;
    this._polyIndexesBuffer = null;

    this._lineVerticesBufferMerc = null;
    this._lineOrdersBuffer = null;
    this._lineIndexesBuffer = null;

    this._ready = false;
};

GmxTileItem.prototype.createBuffers = function (handler, extent) {
    if (!this._ready) {
        this._createVertices(extent);
        this._createBuffers(handler);
        this._ready = true;
    }
};

GmxTileItem.prototype._createVertices = function (extent) {

    var geometry = this.geometry;

    this._polyVerticesMerc = [];
    this._lineVerticesMerc = [];

    if (!this.item._extent) {
        this.item._extent = new Extent(new LonLat(math.MAX_FLOAT, math.MAX_FLOAT), new LonLat(-math.MAX_FLOAT, -math.MAX_FLOAT));
    }

    var ne = this.item._extent.northEast,
        sw = this.item._extent.southWest;

    if (geometry.type.toLowerCase() === "polygon") {
        var coordinates = geometry.coordinates;

        var data = flatten(coordinates);
        var indexes = earcut(data.vertices, data.holes, 2);

        this._polyVerticesMerc = data.vertices;

        this._polyIndexes = indexes;

        for (var i = 0; i < coordinates.length; i++) {
            var ci = coordinates[i];
            var path = [];
            var startLine = false;
            var isClosed = true;
            for (var j = 0; j < ci.length; j++) {
                var p = ci[j];
                if (p[0] < sw.lon) sw.lon = p[0];
                if (p[0] > ne.lon) ne.lon = p[0];
                if (p[1] < sw.lat) sw.lat = p[1];
                if (p[1] > sw.lat) ne.lat = p[1];
                if (!chkOnEdge(p, j < ci.length - 1 ? ci[j + 1] : ci[0], extent)) {
                    startLine = true;
                    path.push(p);
                } else if (startLine) {
                    isClosed = false;
                    startLine = false;
                    path.push(p);
                    GmxVectorTileCreator.appendLineData([path], false, this._lineVerticesMerc, this._lineOrders, this._lineIndexes);
                    path = [];
                }
            }
            if (path.length) {
                GmxVectorTileCreator.appendLineData([path], isClosed, this._lineVerticesMerc, this._lineOrders, this._lineIndexes);
            }
        }

    } else if (geometry.type.toLowerCase() === "multipolygon") {

        var coordinates = geometry.coordinates;
        var vertices = [],
            indexes = [];

        for (var i = 0; i < coordinates.length; i++) {
            var cci = coordinates[i];
            var data = flatten(cci);
            var dataIndexes = earcut(data.vertices, data.holes, 2);

            for (var j = 0; j < dataIndexes.length; j++) {
                indexes.push(dataIndexes[j] + vertices.length * 0.5);
            }

            vertices.push.apply(vertices, data.vertices);

            for (var ii = 0; ii < cci.length; ii++) {
                var ci = cci[ii];
                var path = [];
                var startLine = false;
                var isClosed = true;
                for (var j = 0; j < ci.length; j++) {
                    var p = ci[j];
                    if (p[0] < sw.lon) sw.lon = p[0];
                    if (p[0] > ne.lon) ne.lon = p[0];
                    if (p[1] < sw.lat) sw.lat = p[1];
                    if (p[1] > sw.lat) ne.lat = p[1];
                    if (!chkOnEdge(p, j < ci.length - 1 ? ci[j + 1] : ci[0], extent)) {
                        startLine = true;
                        path.push(p);
                    } else if (startLine) {
                        isClosed = false;
                        startLine = false;
                        path.push(p);
                        GmxVectorTileCreator.appendLineData([path], false, this._lineVerticesMerc, this._lineOrders, this._lineIndexes);
                        path = [];
                    }
                }
                if (path.length) {
                    GmxVectorTileCreator.appendLineData([path], isClosed, this._lineVerticesMerc, this._lineOrders, this._lineIndexes);
                }
            }
        }

        this._polyVerticesMerc = vertices;
        this._polyIndexes = indexes;

    } else if (geometry.type.toLowerCase() === "linestring") {
        //
        //TODO:extent
        //
        GmxVectorTileCreator.appendLineData([geometry._coordinates], false, this._lineVerticesMerc, this._lineOrders, this._lineIndexes);
    } else if (geometry.type.toLowerCase() === "multilinestring") {
        //
        //TODO:extent
        //
        GmxVectorTileCreator.appendLineData(geometry._coordinates, false, this._lineVerticesMerc, this._lineOrders, this._lineIndexes);
    }
};

GmxTileItem.prototype._createBuffers = function (h) {
    this._polyVerticesBufferMerc = h.createArrayBuffer(new Float32Array(this._polyVerticesMerc), 2, this._polyVerticesMerc.length / 2);
    this._polyIndexesBuffer = h.createElementArrayBuffer(new Uint32Array(this._polyIndexes), 1, this._polyIndexes.length);

    this._lineVerticesBufferMerc = h.createArrayBuffer(new Float32Array(this._lineVerticesMerc), 2, this._lineVerticesMerc.length / 2);
    this._lineIndexesBuffer = h.createElementArrayBuffer(new Uint32Array(this._lineIndexes), 1, this._lineIndexes.length);
    this._lineOrdersBuffer = h.createArrayBuffer(new Float32Array(this._lineOrders), 1, this._lineOrders.length / 2);
};

export { GmxTileItem };