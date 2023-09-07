import * as mercator from "../mercator";
import * as quadTree from "../quadTree/quadTree.js";
import {Extent} from "../Extent";
import {Node} from "../quadTree/Node.js";
import {Planet} from "../scene/Planet";
import {QuadTreeStrategy} from "./QuadTreeStrategy.js";
import {Segment} from "../segment/Segment.js";
import {SegmentLonLat} from "../segment/SegmentLonLat.js";

export class EarthQuadTreeStrategy extends QuadTreeStrategy {
    constructor(planet: Planet) {
        super(planet, "Earth");
    }

    public override init() {
        this._quadTreeList = [
            new Node(Segment, this.planet, quadTree.NW, null, 0, 0,
                Extent.createFromArray([-20037508.34, -20037508.34, 20037508.34, 20037508.34])
            ),
            new Node(SegmentLonLat, this.planet, quadTree.NW, null, 0, 0,
                Extent.createFromArray([-180, mercator.MAX_LAT, 180, 90])
            ),
            new Node(SegmentLonLat, this.planet, quadTree.NW, null, 0, 0,
                Extent.createFromArray([-180, -90, 180, mercator.MIN_LAT])
            )
        ];
    }
}