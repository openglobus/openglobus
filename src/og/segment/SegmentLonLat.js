"use strict";

import { Extent } from "../Extent.js";
import { Layer } from "../layer/Layer.js";
import { LonLat } from "../LonLat.js";
import { Vec3 } from "../math/Vec3.js";
import * as mercator from "../mercator.js";
import { EPSG4326 } from "../proj/EPSG4326.js";
import * as quadTree from "../quadTree/quadTree.js";
import { Segment, TILEGROUP_NORTH, TILEGROUP_SOUTH } from "./Segment.js";

const MAX_POLE_ZOOM = 7;
export const POLE_PIECE_SIZE = (90.0 - mercator.MAX_LAT) / Math.pow(2, MAX_POLE_ZOOM);

let _tempHigh = new Vec3(),
    _tempLow = new Vec3();

/**
 * Planet segment Web Mercator tile class that stored and rendered with quad tree.
 * @class
 * @extends {Segment}
 * @param {quadNode.Node} node - Quad tree segment node.
 * @param {Planet} planet - Scene planet.
 * @param {Number} tileZoom - Segment tile zoom index.
 * @param {Extent} extent - Segment WGS84 extent.
 */
class SegmentLonLat extends Segment {
    /**
     * @param {quadTree.Node} node - Segment node.
     * @param {Planet} planet - Current planet scene.
     * @param {number} tileZoom - Zoom index.
     * @param {Extent} extent - Segment extent.
     */
    constructor(node, planet, tileZoom, extent) {
        super(node, planet, tileZoom, extent);

        this._projection = EPSG4326;

        this._extentMerc = new Extent(
            extent.southWest.forwardMercatorEPS01(),
            extent.northEast.forwardMercatorEPS01()
        );

        if (this._extent.northEast.lat > 0) {
            this._isNorth = true;
        } else {
            this._isNorth = false;
        }

        this.isPole = true;
    }

    _setExtentLonLat() {
        this._extentLonLat = this._extent;
    }

    projectNative(coords) {
        return coords;
    }

    getInsideLonLat(obj) {
        return obj._lonLat;
    }

    _getMaxZoom() {
        let maxPoleZoom = 0;
        if (this._isNorth) {
            //north pole limits
            let Yz = Math.floor((90.0 - this._extent.northEast.lat) / POLE_PIECE_SIZE);
            maxPoleZoom = Math.floor(Yz / 16) + 7;
        } else {
            //south pole limits
            let Yz = Math.floor((mercator.MIN_LAT - this._extent.northEast.lat) / POLE_PIECE_SIZE);
            maxPoleZoom = 12 - Math.floor(Yz / 16);
        }
        return maxPoleZoom;
    }

    checkZoom() {
        return super.checkZoom() && this.tileZoom <= this._getMaxZoom();
    }

    _assignTileIndexes() {
        this._assignTileXIndexes(this._extent);
        this._assignTileYIndexes(this._extent);
        this.tileIndex = Layer.getTileIndex(this.tileX, this.tileY, this.tileZoom);
    }

    _assignTileXIndexes(extent) {
        this.tileX = Math.round(
            Math.abs(-180.0 - extent.southWest.lon) / (extent.northEast.lon - extent.southWest.lon)
        );

        let p2 = 1 << this.tileZoom;
        this.tileXE = (this.tileX + 1) % p2;
        this.tileXW = (p2 + this.tileX - 1) % p2;
    }

    _assignTileYIndexes(extent) {
        var lat = extent.northEast.lat;
        if (lat > 0) {
            this._tileGroup = TILEGROUP_NORTH;
            this.tileY = Math.round((90.0 - lat) / (extent.northEast.lat - extent.southWest.lat));
        } else {
            this._tileGroup = TILEGROUP_SOUTH;
            this.tileY = Math.round(
                (mercator.MIN_LAT - lat) / (extent.northEast.lat - extent.southWest.lat)
            );
        }
        this.tileYN = this.tileY - 1;
        this.tileYS = this.tileY + 1;
    }


    _createPlainVertices() {
        var gridSize = this.planet.terrain.gridSizeByZoom[this.tileZoom];

        var e = this._extent,
            fgs = this.planet.terrain.plainGridSize;
        var lonSize = e.getWidth();
        var latSize = e.getHeight();
        var llStep = lonSize / Math.max(fgs, gridSize);
        var ltStep = latSize / gridSize;
        var esw_lon = e.southWest.lon,
            ene_lat = e.northEast.lat;
        var dg = Math.max(fgs / gridSize, 1),
            gs = Math.max(fgs, gridSize) + 1;
        var r2 = this.planet.ellipsoid._invRadii2;
        var ind = 0,
            nmInd = 0;
        const gsgs = gs * gs;

        var gridSize3 = (gridSize + 1) * (gridSize + 1) * 3;

        this.plainNormals = new Float32Array(gridSize3);
        this.plainVertices = new Float64Array(gridSize3);
        this.plainVerticesHigh = new Float32Array(gridSize3);
        this.plainVerticesLow = new Float32Array(gridSize3);

        this.normalMapNormals = new Float32Array(gsgs * 3);
        this.normalMapVertices = new Float64Array(gsgs * 3);
        this.normalMapVerticesHigh = new Float32Array(gsgs * 3);
        this.normalMapVerticesLow = new Float32Array(gsgs * 3);

        let xmin = 549755748352.0,
            xmax = -549755748352.0,
            ymin = 549755748352.0,
            ymax = -549755748352.0,
            zmin = 549755748352.0,
            zmax = -549755748352.0;

        var verts = this.plainVertices,
            vertsHigh = this.plainVerticesHigh,
            vertsLow = this.plainVerticesLow,
            norms = this.plainNormals,
            nmVerts = this.normalMapVertices,
            nmVertsHigh = this.normalMapVerticesHigh,
            nmVertsLow = this.normalMapVerticesLow,
            nmNorms = this.normalMapNormals;

        for (let k = 0; k < gsgs; k++) {
            var j = k % gs,
                i = ~~(k / gs);

            var v = this.planet.ellipsoid.lonLatToCartesian(
                new LonLat(esw_lon + j * llStep, ene_lat - i * ltStep)
            );
            var nx = v.x * r2.x,
                ny = v.y * r2.y,
                nz = v.z * r2.z;
            var l = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
            var nxl = nx * l,
                nyl = ny * l,
                nzl = nz * l;

            Vec3.doubleToTwoFloats(v, _tempHigh, _tempLow);

            nmVerts[nmInd] = v.x;
            nmVertsHigh[nmInd] = _tempHigh.x;
            nmVertsLow[nmInd] = _tempLow.x;
            nmNorms[nmInd++] = nxl;

            nmVerts[nmInd] = v.y;
            nmVertsHigh[nmInd] = _tempHigh.y;
            nmVertsLow[nmInd] = _tempLow.y;
            nmNorms[nmInd++] = nyl;

            nmVerts[nmInd] = v.z;
            nmVertsHigh[nmInd] = _tempHigh.z;
            nmVertsLow[nmInd] = _tempLow.z;
            nmNorms[nmInd++] = nzl;

            if (i % dg === 0 && j % dg === 0) {
                verts[ind] = v.x;
                vertsHigh[ind] = _tempHigh.x;
                vertsLow[ind] = _tempLow.x;
                norms[ind++] = nxl;

                verts[ind] = v.y;
                vertsHigh[ind] = _tempHigh.y;
                vertsLow[ind] = _tempLow.y;
                norms[ind++] = nyl;

                verts[ind] = v.z;
                vertsHigh[ind] = _tempHigh.z;
                vertsLow[ind] = _tempLow.z;
                norms[ind++] = nzl;

                if (v.x < xmin) xmin = v.x;
                if (v.x > xmax) xmax = v.x;
                if (v.y < ymin) ymin = v.y;
                if (v.y > ymax) ymax = v.y;
                if (v.z < zmin) zmin = v.z;
                if (v.z > zmax) zmax = v.z;
            }
        }

        this.terrainVertices = verts;
        this.terrainVerticesHigh = vertsHigh;
        this.terrainVerticesLow = vertsLow;

        //store raw normals
        this.normalMapNormalsRaw = new Float32Array(nmNorms.length);
        this.normalMapNormalsRaw.set(nmNorms);

        let x = (xmax - xmin) * 0.5,
            y = (ymax - ymin) * 0.5,
            z = (zmax - zmin) * 0.5;

        this._plainRadius = Math.sqrt(x * x + y * y + z * z);

        this.plainReady = true;
    }

    _assignGlobalTextureCoordinates() {
        var e = this._extent;
        this._globalTextureCoordinates[0] = (e.southWest.lon + 180.0) / 360.0;
        this._globalTextureCoordinates[1] = (90 - e.northEast.lat) / 180.0;
        this._globalTextureCoordinates[2] = (e.northEast.lon + 180.0) / 360.0;
        this._globalTextureCoordinates[3] = (90 - e.southWest.lat) / 180.0;
    }

    _collectVisibleNodes() {
        if (this._isNorth) {
            this.planet._visibleNodesNorth[this.node.nodeId] = this.node;
        } else {
            this.planet._visibleNodesSouth[this.node.nodeId] = this.node;
        }
    }

    _getLayerExtentOffset(layer) {
        var v0s = layer._extent;
        var v0t = this._extent;
        var sSize_x = v0s.northEast.lon - v0s.southWest.lon;
        var sSize_y = v0s.northEast.lat - v0s.southWest.lat;
        var dV0s_x = (v0t.southWest.lon - v0s.southWest.lon) / sSize_x;
        var dV0s_y = (v0s.northEast.lat - v0t.northEast.lat) / sSize_y;
        var dSize_x = (v0t.northEast.lon - v0t.southWest.lon) / sSize_x;
        var dSize_y = (v0t.northEast.lat - v0t.southWest.lat) / sSize_y;
        return [dV0s_x, dV0s_y, dSize_x, dSize_y];
    }

    layerOverlap(layer) {
        return this._extent.overlaps(layer._extent);
    }

    getDefaultTexture() {
        return this._isNorth ? this.planet.solidTextureOne : this.planet.solidTextureTwo;
    }

    getExtentLonLat() {
        return this._extent;
    }

    getExtentMerc() {
        return this._extentMerc;
    }

    getNodeState() {
        var vn;
        if (this._isNorth) {
            vn = this.planet._visibleNodesNorth[this.node.nodeId];
        } else {
            vn = this.planet._visibleNodesSouth[this.node.nodeId];
        }
        return (vn && vn.state) || quadTree.NOTRENDERING;
    }

    _freeCache() {
        //empty for a time
    }
}

export { SegmentLonLat };
