import {Extent} from "../Extent";
import {Node} from "../quadTree/Node";
import {Planet} from "../scene/Planet";
import {SegmentLonLat} from "./SegmentLonLat";
import {getTileCellIndex, TILEGROUP_COMMON, TILEGROUP_NORTH} from "./Segment";
import {equi} from "../proj/equi";
import * as mercator from "../mercator";
import {WebGLTextureExt} from "../webgl/Handler";

const MAX_POLE_ZOOM = 5;
export const POLE_PIECE_SIZE = 5 / Math.pow(2, MAX_POLE_ZOOM);

export class SegmentLonLatEqui extends SegmentLonLat {
    constructor(node: Node, planet: Planet, tileZoom: number, extent: Extent) {
        super(node, planet, tileZoom, extent);
        this._projection = equi;
        this.isPole = false;
        this._tileGroup = TILEGROUP_COMMON;
    }

    protected override _getMaxZoom(): number {
        let maxPoleZoom = 0;
        if (this._extent.northEast.lat > 85) {
            //north pole limits
            let Yz = Math.floor((90.0 - this._extent.northEast.lat) / POLE_PIECE_SIZE);
            maxPoleZoom = Math.floor(Yz / 16) + MAX_POLE_ZOOM;
        } else if (this._extent.southWest.lat < -85) {
            //south pole limits
            let Yz = Math.floor((90 + this._extent.southWest.lat) / POLE_PIECE_SIZE);
            maxPoleZoom = Math.floor(Yz / 16) + MAX_POLE_ZOOM;
        } else {
            maxPoleZoom = 50;
        }
        return maxPoleZoom;
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

    public override getDefaultTexture(): WebGLTextureExt | null {
        return this.planet.solidTextureOne;
    }
}