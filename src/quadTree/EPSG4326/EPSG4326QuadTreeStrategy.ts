import * as quadTree from "../quadTree";
import {Extent} from "../../Extent";
import {EPSG4326} from "../../proj/EPSG4326";
import {Node} from "../Node";
import {Planet} from "../../scene/Planet";
import {QuadTreeStrategy} from "../QuadTreeStrategy";
import {SegmentLonLatEqui} from "../../segment/SegmentLonLatEqui";

export class EPSG4326QuadTreeStrategy extends QuadTreeStrategy {
    constructor(planet: Planet) {
        super(planet, "EPSG4326", EPSG4326);
    }

    public override init() {
        this._quadTreeList = [
            new Node(
                SegmentLonLatEqui,
                this.planet,
                0,
                null,
                0,
                Extent.createFromArray([-180, -90, 0, 90])
            ),
            new Node(
                SegmentLonLatEqui,
                this.planet,
                0,
                null,
                0,
                Extent.createFromArray([0, -90, 180, 90])
            )
        ];
    }
}