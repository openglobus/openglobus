import {Extent} from "../../Extent";
import {equi} from "../../proj/equi";
import {Node} from "../Node";
import {Planet} from "../../scene/Planet";
import {SegmentLonLatEqui} from "../../segment/SegmentLonLatEqui";
import {QuadTreeStrategy, QuadTreeStrategyParams} from "../QuadTreeStrategy";
import {LonLat} from "../../LonLat";
import {
    getTileCellExtent,
    getTileCellIndex,
    TILEGROUP_COMMON
} from "../../segment/Segment";
import {Vector} from "../../layer/Vector";
import {EntityCollectionsTreeStrategy} from "../EntityCollectionsTreeStrategy";
import {EquiEntityCollectionsTreeStrategy} from "./EquiEntityCollectionsTreeStrategy";
import {PlanetCamera} from "../../camera";

export class EquiQuadTreeStrategy extends QuadTreeStrategy {

    private readonly _westExtent: Extent;
    private readonly _eastExtent: Extent;

    public _visibleNodesWest: Record<number, Node>;
    public _visibleNodesEast: Record<number, Node>;

    constructor(params: QuadTreeStrategyParams) {
        super({name: "Mars", proj: equi, ...params});
        this._westExtent = Extent.createFromArray([-180, -90, 0, 90]);
        this._eastExtent = Extent.createFromArray([0, -90, 180, 90]);

        this._visibleNodesWest = {};
        this._visibleNodesEast = {};
    }

    public override init(camera: PlanetCamera) {

        this._quadTreeList = [
            new Node(
                SegmentLonLatEqui,
                this,
                0,
                null,
                0,
                this._westExtent
            ),
            new Node(
                SegmentLonLatEqui,
                this,
                0,
                null,
                0,
                this._eastExtent
            )
        ];

        super.init(camera);
    }

    public override getTileXY(lonLat: LonLat, zoom: number): [number, number, number, number] {
        let z = zoom,
            x: number,
            y: number,
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
        let extent: Extent;

        if (lonLat.lon > 0) {
            extent = getTileCellExtent(x - (1 << z), y, z, this._eastExtent);
        } else {
            extent = getTileCellExtent(x, y, z, this._westExtent);
        }

        let sizeImgW = extent.getWidth() / (gridSize - 1),
            sizeImgH = extent.getHeight() / (gridSize - 1);

        let i = gridSize - Math.ceil((lonLat.lat - extent.southWest.lat) / sizeImgH) - 1,
            j = Math.floor((lonLat.lon - extent.southWest.lon) / sizeImgW);

        return [i, j];
    }

    public override createEntityCollectionsTreeStrategy(layer: Vector, nodeCapacity: number): EntityCollectionsTreeStrategy {
        return new EquiEntityCollectionsTreeStrategy(this, layer, nodeCapacity);
    }

    public override collectVisibleNode(node: Node) {
        let ext = node.segment.getExtent();
        if (ext.southWest.lon < 0) {
            this._visibleNodesWest[node.nodeId] = node;
        } else {
            this._visibleNodesEast[node.nodeId] = node;
        }
    }

    protected override _clearVisibleNodes() {
        this._visibleNodesWest = {};
        this._visibleNodesEast = {};
    }
}