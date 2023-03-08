"use strict";
import { Extent } from "../Extent.js";
import * as mercator from "../mercator.js";
import { Node } from "../quadTree/Node.js";
import * as quadTree from "../quadTree/quadTree.js";
import { Segment } from "../segment/Segment.js";
import { SegmentLonLat } from "../segment/SegmentLonLat.js";
import { QuadTreeStrategy } from "./QuadTreeStrategy.js";

export class EarthQuadTreeStrategy extends QuadTreeStrategy {
    constructor(options = {}) {
        super(options);
        this.name = "earth";
    }

    init() {
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