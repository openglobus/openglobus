import {Extent} from "../Extent";
import {Node} from "../quadTree/Node";
import {Planet} from "../scene/Planet";
import {SegmentLonLat} from "./SegmentLonLat";
import {TILEGROUP_COMMON} from "./Segment";

export class SegmentLonLatWgs84 extends SegmentLonLat {
    constructor(node: Node, planet: Planet, tileZoom: number, extent: Extent) {
        super(node, planet, tileZoom, extent);
        this.isPole = false;
        this._tileGroup = TILEGROUP_COMMON;
    }

    protected override _getMaxZoom(): number {
        return 150;
    }

    protected override _assignTileYIndexes(extent: Extent) {
        this.tileY = Math.round((90.0 - extent.northEast.lat) / (extent.northEast.lat - extent.southWest.lat));
        this.tileYN = this.tileY - 1;
        this.tileYS = this.tileY + 1;
    }

    protected override _assignTileXIndexes(extent: Extent) {
        this.tileX = Math.round(
            Math.abs(-180.0 - extent.southWest.lon) / (extent.northEast.lon - extent.southWest.lon)
        );

        let p2 = (1 << this.tileZoom) * 2;
        this.tileXE = (this.tileX + 1) % p2;
        this.tileXW = (p2 + this.tileX - 1) % p2;
    }
}