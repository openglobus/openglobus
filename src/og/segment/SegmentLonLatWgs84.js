"use strict";

import { Extent } from "../Extent.js";
import { SegmentLonLat } from "./SegmentLonLat.js";

export class SegmentLonLatWgs84 extends SegmentLonLat {
    constructor(node, planet, tileZoom, extent) {
        super(node, planet, tileZoom, extent);
        this.isPole = false;
    }

    _assignTileYIndexes(extent) {
        var lat = extent.northEast.lat;
        this.tileY = Math.round((90.0 - lat) / (extent.northEast.lat - extent.southWest.lat));

        if (lat > 0) {
            //north pole
            this._isNorth = true;
            this._tileGroup = 1;
        } else {
            //south pole
            this._tileGroup = 2;
        }

    }

}