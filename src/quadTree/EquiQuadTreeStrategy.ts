import * as quadTree from "../quadTree/quadTree";
import {Extent} from "../Extent";
import {EPSG4326} from "../proj/EPSG4326";
import {Node} from "../quadTree/Node";
import {Planet} from "../scene/Planet";
import {SegmentLonLatWgs84} from "../segment/SegmentLonLatWgs84";
import {QuadTreeStrategy} from "./QuadTreeStrategy";
import {LonLat} from "../LonLat";
import {
    getTileCellExtent,
    getTileCellIndex,
    TILEGROUP_COMMON
} from "../segment/Segment";
import * as mercator from "../mercator";


export class EquiQuadTreeStrategy extends QuadTreeStrategy {

    private _westExtent: Extent;
    private _eastExtent: Extent;

    constructor(planet: Planet) {
        super(planet, "Mars", EPSG4326);
        this._westExtent = Extent.createFromArray([-180, -90, 0, 90]);
        this._eastExtent = Extent.createFromArray([0, -90, 180, 90]);
    }

    public override init() {
        this._quadTreeList = [
            new Node(
                SegmentLonLatWgs84,
                this.planet,
                0,
                null,
                0,
                this._westExtent
            ),
            new Node(
                SegmentLonLatWgs84,
                this.planet,
                0,
                null,
                0,
                this._eastExtent
            )
        ];
    }

    public override getTileXY(lonLat: LonLat, zoom: number): [number, number, number, number] {
        let z = zoom,
            x = -1,
            y = -1,
            pz = (1 << z);

        if (lonLat.lon > 0) {
            x = getTileCellIndex(lonLat.lon, 180 / pz, 0) + pz;
        } else {
            x = getTileCellIndex(lonLat.lon, 180 / pz, -180);
        }

        y = getTileCellIndex(lonLat.lat, 180 / pz, 90);

        return [x, y, z, TILEGROUP_COMMON];
    }

    public override getLonLatTileOffset(lonLat: LonLat, x: number, y: number, z: number, gridSize: number): [number, number] {
        let coords = lonLat;
        let extent = new Extent();

        if (lonLat.lon > 0) {
            extent = getTileCellExtent(x - (1 << z), y, z, this._eastExtent);
        } else {
            extent = getTileCellExtent(x, y, z, this._westExtent);
        }

        let sizeImgW = extent.getWidth() / (gridSize - 1),
            sizeImgH = extent.getHeight() / (gridSize - 1);

        let i = gridSize - Math.ceil((coords.lat - extent.southWest.lat) / sizeImgH) - 1,
            j = Math.floor((coords.lon - extent.southWest.lon) / sizeImgW);

        return [i, j];
    }
}