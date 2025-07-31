import {Extent} from "../../Extent";
import {EPSG4326} from "../../proj/EPSG4326";
import {Node} from "../Node";
import {Planet} from "../../scene/Planet";
import {QuadTreeStrategy, QuadTreeStrategyParams} from "../QuadTreeStrategy";
import {SegmentLonLatEqui} from "../../segment/SegmentLonLatEqui";
import {PlanetCamera} from "../../camera";

export class EPSG4326QuadTreeStrategy extends QuadTreeStrategy {
    constructor(params: QuadTreeStrategyParams) {
        super({name: "EPSG4326", proj: EPSG4326, ...params});
    }

    public override init(camera: PlanetCamera) {

        this._quadTreeList = [
            new Node(
                SegmentLonLatEqui,
                this,
                0,
                null,
                0,
                Extent.createFromArray([-180, -90, 0, 90])
            ),
            new Node(
                SegmentLonLatEqui,
                this,
                0,
                null,
                0,
                Extent.createFromArray([0, -90, 180, 90])
            )
        ];

        super.init(camera);
    }
}