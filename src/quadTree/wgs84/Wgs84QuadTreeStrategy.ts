import { Extent } from "../../Extent";
import { EPSG4326 } from "../../proj/EPSG4326";
import { Node } from "../Node";
import { SegmentLonLatEqui } from "../../segment/SegmentLonLatEqui";
import { QuadTreeStrategy, QuadTreeStrategyParams } from "../QuadTreeStrategy";
import { PlanetCamera } from "../../camera";

export class Wgs84QuadTreeStrategy extends QuadTreeStrategy {
    constructor(params: QuadTreeStrategyParams) {
        super({ name: "wgs84", proj: EPSG4326, ...params });
    }

    public override init(camera: PlanetCamera) {
        const root = new Node(SegmentLonLatEqui, this, 0, null, 0, Extent.createFromArray([-180, -90, 180, 90]));

        root.rootNeighbors = [null, root, null, root];

        this._quadTreeList = [root];

        super.init(camera);
    }
}
