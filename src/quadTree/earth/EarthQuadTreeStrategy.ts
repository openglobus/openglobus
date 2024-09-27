import * as mercator from "../../mercator";
import {Extent} from "../../Extent";
import {Node} from "../Node";
import {Planet} from "../../scene/Planet";
import {QuadTreeStrategy} from "../QuadTreeStrategy";
import {
    Segment,
    TILEGROUP_NORTH,
    TILEGROUP_SOUTH,
    getTileGroupByLat,
    getTileCellExtent,
    getTileCellIndex
} from "../../segment/Segment";
import {SegmentLonLat} from "../../segment/SegmentLonLat";
import {LonLat} from "../../LonLat";
import {Vector} from "../../layer/Vector";
import {EarthEntityCollectionsTreeStrategy} from "./EarthEntityCollectionsTreeStrategy";

export class EarthQuadTreeStrategy extends QuadTreeStrategy {

    /**
     * Current visible north pole nodes tree nodes array.
     * @public
     * @type {Node}
     * @todo
     */
    public _visibleNodesNorth: Record<number, Node>;

    /**
     * Current visible south pole nodes tree nodes array.
     * @public
     * @type {Node}
     * @todo
     */
    public _visibleNodesSouth: Record<number, Node>;

    constructor(planet: Planet) {
        super(planet, "Earth");

        this._visibleNodesNorth = {};
        this._visibleNodesSouth = {};
    }

    public override collectVisibleNode(node: Node) {
        let tg = node.segment._tileGroup;
        if (tg === TILEGROUP_NORTH) {
            this._visibleNodesNorth[node.nodeId] = node;
        } else if (tg === TILEGROUP_SOUTH) {
            this._visibleNodesSouth[node.nodeId] = node;
        } else {
            this._visibleNodes[node.nodeId] = node;
        }
    }

    protected override _clearVisibleNodes() {
        super._clearVisibleNodes();
        this._visibleNodesNorth = {};
        this._visibleNodesSouth = {};
    }

    public override createEntitiCollectionsTreeStrategy(layer: Vector, nodeCapacity: number): EarthEntityCollectionsTreeStrategy {
        return new EarthEntityCollectionsTreeStrategy(layer, nodeCapacity);
    }

    public override init() {
        this._quadTreeList = [
            new Node(Segment, this.planet, 0, null, 0,
                Extent.createFromArray([-20037508.34, -20037508.34, 20037508.34, 20037508.34])
            ),
            new Node(SegmentLonLat, this.planet, 0, null, 0,
                Extent.createFromArray([-180, mercator.MAX_LAT, 180, 90])
            ),
            new Node(SegmentLonLat, this.planet, 0, null, 0,
                Extent.createFromArray([-180, -90, 180, mercator.MIN_LAT])
            )
        ];
    }

    public override getTileXY(lonLat: LonLat, zoom: number): [number, number, number, number] {
        let tileGroup = getTileGroupByLat(lonLat.lat, mercator.MAX_LAT),
            z = zoom,
            x = -1,
            y = -1,
            pz = (1 << z)/*Math.pow(2, z)*/;

        if (tileGroup === TILEGROUP_NORTH) {
            x = getTileCellIndex(lonLat.lon, 360 / pz, -180);
            y = getTileCellIndex(lonLat.lat, (90 - mercator.MAX_LAT) / pz, 90);
        } else if (tileGroup === TILEGROUP_SOUTH) {
            x = getTileCellIndex(lonLat.lon, 360 / pz, -180);
            y = getTileCellIndex(lonLat.lat, (90 - mercator.MAX_LAT) / pz, mercator.MIN_LAT);
        } else {
            let merc = mercator.forward(lonLat);
            x = getTileCellIndex(merc.lon, mercator.POLE2 / pz, -mercator.POLE);
            y = getTileCellIndex(merc.lat, mercator.POLE2 / pz, mercator.POLE);
        }

        return [x, y, z, tileGroup];
    }

    public override getLonLatTileOffset(lonLat: LonLat, x: number, y: number, z: number, gridSize: number): [number, number] {
        let coords = lonLat;
        let extent = new Extent();

        if (lonLat.lat > mercator.MAX_LAT) {
            let worldExtent = Extent.createFromArray([-180, mercator.MAX_LAT, 180, 90]);
            extent = getTileCellExtent(x, y, z, worldExtent);
        } else if (lonLat.lat < mercator.MIN_LAT) {
            let worldExtent = Extent.createFromArray([-180, -90, 180, mercator.MIN_LAT]);
            extent = getTileCellExtent(x, y, z, worldExtent);
        } else {
            coords = mercator.forward(lonLat);
            extent = mercator.getTileExtent(x, y, z);
        }

        let sizeImgW = extent.getWidth() / (gridSize - 1),
            sizeImgH = extent.getHeight() / (gridSize - 1);

        let i = gridSize - Math.ceil((coords.lat - extent.southWest.lat) / sizeImgH) - 1,
            j = Math.floor((coords.lon - extent.southWest.lon) / sizeImgW);

        return [i, j];
    }
}