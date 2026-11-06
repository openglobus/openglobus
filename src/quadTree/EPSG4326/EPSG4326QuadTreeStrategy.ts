import { Extent } from "../../Extent";
import { EPSG4326 } from "../../proj/EPSG4326";
import { Node } from "../Node";
import { QuadTreeStrategy, QuadTreeStrategyParams } from "../QuadTreeStrategy";
import { SegmentLonLatEqui } from "../../segment/SegmentLonLatEqui";
import { PlanetCamera } from "../../camera";

export class EPSG4326QuadTreeStrategy extends QuadTreeStrategy {
    constructor(params: QuadTreeStrategyParams) {
        super({ name: "EPSG4326", proj: EPSG4326, ...params });
    }

    public override init(camera: PlanetCamera) {
        const west = new Node(SegmentLonLatEqui, this, 0, null, 0, Extent.createFromArray([-180, -90, 0, 90]));
        const east = new Node(SegmentLonLatEqui, this, 0, null, 0, Extent.createFromArray([0, -90, 180, 90]));

        west.rootNeighbors = [null, east, null, east];
        east.rootNeighbors = [null, west, null, west];

        this._quadTreeList = [west, east];

        super.init(camera);
    }
}
