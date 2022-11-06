"use strict";

import { POLE_PIECE_SIZE, SegmentLonLat } from "./SegmentLonLat.js";
import { Segment, TILEGROUP_COMMON } from "./Segment.js";
import * as mercator from "../mercator.js";

export class SegmentLonLatWgs84 extends SegmentLonLat {
    constructor(node, planet, tileZoom, extent) {
        super(node, planet, tileZoom, extent);
        this.isPole = false;
        this._tileGroup = TILEGROUP_COMMON;
    }

    acceptForRendering(camera) {
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
        return super.acceptForRendering(camera) || this.tileZoom >= maxPoleZoom;
    }

    _assignTileYIndexes(extent) {
        this.tileY = Math.round((90.0 - extent.northEast.lat) / (extent.northEast.lat - extent.southWest.lat));
        this.tileYN = this.tileY - 1;
        this.tileYS = this.tileY + 1;
    }

    _assignTileXIndexes(extent) {
        this.tileX = Math.round(
            Math.abs(-180.0 - extent.southWest.lon) / (extent.northEast.lon - extent.southWest.lon)
        );

        let p2 = (1 << this.tileZoom) * 2;
        this.tileXE = (this.tileX + 1) % p2;
        this.tileXW = (p2 + this.tileX - 1) % p2;
    }
}