/**
 * @module og/segment/SegmentLonLat
 */

'use sctrict';

import * as math from '../math.js';
import * as mercator from '../mercator.js';
import * as quadTree from '../quadTree/quadTree.js';
import { EPSG4326 } from '../proj/EPSG4326.js';
import { Extent } from '../Extent.js';
import { inherits } from '../inherits.js';
import { Layer } from '../layer/Layer.js';
import { LonLat } from '../LonLat.js';
import { Segment } from './Segment.js';


const _heightLat = 90.0 - mercator.MAX_LAT;
const _maxPoleZoom = 7;
const _pieceSize = _heightLat / Math.pow(2, _maxPoleZoom);


/**
 * Planet segment Web Mercator tile class that stored and rendered with quad tree.
 * @class
 * @extends {og.planetSegment.Segment}
 * @param {og.quadNode.Node} node - Quad tree segment node.
 * @param {og.scene.Planet} planet - Scene planet.
 * @param {Number} tileZoom - Segment tile zoom index.
 * @param {og.Extent} extent - Segment WGS84 extent.
 */
const SegmentLonLat = function (node, planet, tileZoom, extent) {
    this._isNorth = false;
    Segment.call(this, node, planet, tileZoom, extent);
    this._projection = EPSG4326;
    this._extentMerc = new Extent(extent.southWest.forwardMercatorEPS01(), extent.northEast.forwardMercatorEPS01());
};

inherits(SegmentLonLat, Segment);

SegmentLonLat.prototype._setExtentLonLat = function(){
    this._extentLonLat = this._extent;
};

SegmentLonLat.prototype.projectNative = function (coords) {
    return coords;
};

SegmentLonLat.prototype.getTerrainPoint = function (res, xyz) {
    res.copy(this.planet.ellipsoid.hitRay(xyz, xyz.negateTo().normalize()));
    return xyz.distance(res);
};

SegmentLonLat.prototype.acceptForRendering = function (camera) {
    var maxPoleZoom;
    var lat = this._extent.northEast.lat;
    if (this._isNorth) {
        //north pole limits
        var Yz = Math.floor((90.0 - lat) / _pieceSize);
        maxPoleZoom = Math.floor(Yz / 16) + 7;
    } else {
        //south pole limits
        var Yz = Math.floor((mercator.MIN_LAT - lat) / _pieceSize);
        maxPoleZoom = 12 - Math.floor(Yz / 16);
    }
    return Segment.prototype.acceptForRendering.call(this, camera) || this.tileZoom >= maxPoleZoom;
};

SegmentLonLat.prototype._assignTileIndexes = function () {
    var tileZoom = this.tileZoom;
    var extent = this._extent;

    this.tileX = Math.round(Math.abs(-180.0 - extent.southWest.lon) / (extent.northEast.lon - extent.southWest.lon));

    var lat = extent.northEast.lat;
    if (lat > 0) {
        //north pole
        this._isNorth = true;
        this.tileY = Math.round((90.0 - lat) / (extent.northEast.lat - extent.southWest.lat));
    } else {
        //south pole
        this.tileY = Math.round((mercator.MIN_LAT - lat) / (extent.northEast.lat - extent.southWest.lat));
    }

    this.tileIndex = Layer.getTileIndex(this.tileX, this.tileY, tileZoom);
};

SegmentLonLat.prototype.createPlainVertices = function (gridSize) {
    var ind = 0;
    var e = this._extent;
    var lonSize = e.getWidth();
    var latSize = e.getHeight();
    var llStep = lonSize / gridSize;
    var ltStep = latSize / gridSize;
    var esw_lon = e.southWest.lon,
        ene_lat = e.northEast.lat;

    var r2 = this.planet.ellipsoid._invRadii2;

    this.plainNormals = new Float32Array((gridSize + 1) * (gridSize + 1) * 3);
    this.plainVertices = new Float32Array((gridSize + 1) * (gridSize + 1) * 3);

    var norms = this.plainNormals;
    var verts = this.plainVertices;

    for (var i = 0; i <= gridSize; i++) {
        for (var j = 0; j <= gridSize; j++) {
            var v = this.planet.ellipsoid.lonLatToCartesian(new LonLat(esw_lon + j * llStep, ene_lat - i * ltStep));
            var nx = v.x * r2.x,
                ny = v.y * r2.y,
                nz = v.z * r2.z;
            var l = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
            verts[ind] = v.x;
            norms[ind++] = nx * l;

            verts[ind] = v.y;
            norms[ind++] = ny * l;

            verts[ind] = v.z;
            norms[ind++] = nz * l;
        }
    }
    this.normalMapVertices = verts;
    this.normalMapNormals = norms;
    this.terrainVertices = verts;
    this.tempVertices = verts;

    this.normalMapTexture = this.planet.transparentTexture;

    this._globalTextureCoordinates[0] = (e.southWest.lon + 180.0) / 360.0;
    this._globalTextureCoordinates[1] = (90 - e.northEast.lat) / 180.0;
    this._globalTextureCoordinates[2] = (e.northEast.lon + 180.0) / 360.0;
    this._globalTextureCoordinates[3] = (90 - e.southWest.lat) / 180.0;
};

SegmentLonLat.prototype._collectRenderNodes = function () {
    if (this._isNorth) {
        this.planet._visibleNodesNorth[this.node.nodeId] = this.node;
    } else {
        this.planet._visibleNodesSouth[this.node.nodeId] = this.node;
    }
};

SegmentLonLat.prototype.isEntityInside = function (e) {
    return this._extent.isInside(e._lonlat);
};

SegmentLonLat.prototype._getLayerExtentOffset = function (layer) {
    var v0s = layer._extent;
    var v0t = this._extent;
    var sSize_x = v0s.northEast.lon - v0s.southWest.lon;
    var sSize_y = v0s.northEast.lat - v0s.southWest.lat;
    var dV0s_x = (v0t.southWest.lon - v0s.southWest.lon) / sSize_x;
    var dV0s_y = (v0s.northEast.lat - v0t.northEast.lat) / sSize_y;
    var dSize_x = (v0t.northEast.lon - v0t.southWest.lon) / sSize_x;
    var dSize_y = (v0t.northEast.lat - v0t.southWest.lat) / sSize_y;
    return [dV0s_x, dV0s_y, dSize_x, dSize_y];
};

SegmentLonLat.prototype.layerOverlap = function (layer) {
    return this._extent.overlaps(layer._extent);
};

SegmentLonLat.prototype._getDefaultTexture = function () {
    return this.planet.solidTextureTwo;
};

SegmentLonLat.prototype.getExtentLonLat = function () {
    return this._extent;
};

SegmentLonLat.prototype.getExtentMerc = function () {
    return this._extentMerc;
};

SegmentLonLat.prototype.getNodeState = function () {
    var vn;
    if (this._isNorth) {
        vn = this.planet._visibleNodesNorth[this.node.nodeId];
    } else {
        vn = this.planet._visibleNodesSouth[this.node.nodeId];
    }
    return vn && vn.state || quadTree.NOTRENDERING;
};


SegmentLonLat.prototype._freeCache = function () {
    //empty for a time
};

export { SegmentLonLat };