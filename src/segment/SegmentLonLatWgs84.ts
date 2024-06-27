import {Extent} from "../Extent";
import {Node} from "../quadTree/Node";
import {Planet} from "../scene/Planet";
import {SegmentLonLat} from "./SegmentLonLat";
import {getTileCellIndex, TILEGROUP_COMMON, TILEGROUP_NORTH} from "./Segment";

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
        const lat = extent.getCenter().lat;
        this.tileY = getTileCellIndex(lat, extent.getHeight(), 90.0);
        this.tileYN = this.tileY - 1;
        this.tileYS = this.tileY + 1;
    }

    protected override _assignTileXIndexes(extent: Extent) {
        let lon = extent.getCenter().lon;
        this.tileX = getTileCellIndex(lon, extent.getWidth(), -180);
        let p2 = (1 << this.tileZoom) * 2;
        this.tileXE = (this.tileX + 1) % p2;
        this.tileXW = (p2 + this.tileX - 1) % p2;
    }
}