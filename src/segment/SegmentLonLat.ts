import * as mercator from "../mercator";
import * as quadTree from "../quadTree/quadTree";
import {EPSG4326} from "../proj/EPSG4326";
import {Extent} from "../Extent";
import {Layer} from "../layer/Layer";
import {Node} from "../quadTree/Node";
import {Planet} from "../scene/Planet";
import {Segment, TILEGROUP_NORTH, TILEGROUP_SOUTH} from "./Segment";
import {LonLat} from "../LonLat";
import {Entity} from "../entity/Entity";
import {PlanetCamera} from "../camera/PlanetCamera";
import {WebGLTextureExt} from "../webgl/Handler";

const MAX_POLE_ZOOM = 7;
export const POLE_PIECE_SIZE = (90.0 - mercator.MAX_LAT) / Math.pow(2, MAX_POLE_ZOOM);

/**
 * Planet segment Web Mercator tile class that stored and rendered with quad tree.
 * @class
 * @extends {Segment}
 */
class SegmentLonLat extends Segment {
    constructor(node: Node, planet: Planet, tileZoom: number, extent: Extent) {
        super(node, planet, tileZoom, extent);

        this._projection = EPSG4326;

        this._extentLonLat = this._extent;

        this._extentMerc = new Extent(
            extent.southWest.forwardMercatorEPS01(),
            extent.northEast.forwardMercatorEPS01()
        );

        this._isNorth = this._extent.northEast.lat > 0;

        if (this._isNorth) {
            this.groupName = "north";
        } else {
            this.groupName = "south";
        }

        this.isPole = true;
    }

    public override _setExtentLonLat() {
        this._extentLonLat = this._extent;
    }

    public override projectNative(coords: LonLat): LonLat {
        return coords;
    }

    public override getInsideLonLat(obj: Entity | PlanetCamera): LonLat {
        return obj._lonLat;
    }

    protected _getMaxZoom() {
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

    public override checkZoom() {
        return super.checkZoom() && this.tileZoom <= this._getMaxZoom();
    }

    protected override _assignTileIndexes() {
        this._assignTileXIndexes(this._extent);
        this._assignTileYIndexes(this._extent);
        this.tileIndex = Layer.getTileIndex(this.tileX, this.tileY, this.tileZoom);
    }

    protected _assignTileXIndexes(extent: Extent) {
        this.tileX = Math.round(
            Math.abs(-180.0 - extent.southWest.lon) / (extent.northEast.lon - extent.southWest.lon)
        );

        let p2 = 1 << this.tileZoom;
        this.tileXE = (this.tileX + 1) % p2;
        this.tileXW = (p2 + this.tileX - 1) % p2;
    }

    protected _assignTileYIndexes(extent: Extent) {
        const lat = extent.northEast.lat;
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

    protected override _projToDeg(lon: number, lat: number): LonLat {
        return new LonLat(lon, lat);
    }

    protected override _assignGlobalTextureCoordinates() {
        const e = this._extent;
        this._globalTextureCoordinates[0] = (e.southWest.lon + 180.0) / 360.0;
        this._globalTextureCoordinates[1] = (90 - e.northEast.lat) / 180.0;
        this._globalTextureCoordinates[2] = (e.northEast.lon + 180.0) / 360.0;
        this._globalTextureCoordinates[3] = (90 - e.southWest.lat) / 180.0;
    }

    /**
     * @todo: replace to the strategy
     */
    public override _collectVisibleNodes() {
        if (this._isNorth) {
            this.planet._visibleNodesNorth[this.node.nodeId] = this.node;
        } else {
            this.planet._visibleNodesSouth[this.node.nodeId] = this.node;
        }
    }

    /**
     * @param layer
     * @protected
     *
     * @todo simplify layer._extentMerc in layer.getNativeExtent(this)
     *
     */
    protected override _getLayerExtentOffset(layer: Layer): [number, number, number, number] {
        const v0s = layer._extent;
        const v0t = this._extent;
        const sSize_x = v0s.northEast.lon - v0s.southWest.lon;
        const sSize_y = v0s.northEast.lat - v0s.southWest.lat;
        const dV0s_x = (v0t.southWest.lon - v0s.southWest.lon) / sSize_x;
        const dV0s_y = (v0s.northEast.lat - v0t.northEast.lat) / sSize_y;
        const dSize_x = (v0t.northEast.lon - v0t.southWest.lon) / sSize_x;
        const dSize_y = (v0t.northEast.lat - v0t.southWest.lat) / sSize_y;
        return [dV0s_x, dV0s_y, dSize_x, dSize_y];
    }

    public override layerOverlap(layer: Layer): boolean {
        return this._extent.overlaps(layer._extent);
    }

    public override getDefaultTexture(): WebGLTextureExt | null {
        return this._isNorth ? this.planet.solidTextureOne : this.planet.solidTextureTwo;
    }

    public override getExtentLonLat(): Extent {
        return this._extent;
    }

    /**
     * @todo: replace to the strategy
     */
    public override getNodeState(): number {
        let vn;
        if (this._isNorth) {
            vn = this.planet._visibleNodesNorth[this.node.nodeId];
        } else {
            vn = this.planet._visibleNodesSouth[this.node.nodeId];
        }
        return (vn && vn.state) || quadTree.NOTRENDERING;
    }
}

export {SegmentLonLat};
