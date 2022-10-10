"use strict";
import { QuadTreeStrategy } from "./QuadTreeStrategy.js"
import * as mercator from "../mercator.js";
import { Segment } from "../segment/Segment.js";
import { SegmentLonLat } from "../segment/SegmentLonLat.js";
import * as quadTree from "../quadTree/quadTree.js";
import { Extent } from "../Extent.js";
import { Node } from "../quadTree/Node.js";

export class EarthQuadTreeStrategy extends QuadTreeStrategy {
    constructor(options = {}) {
        super(options);
        this.name = "earth";
    }

    init() {
        let earthQuadTree = new Node(Segment, this.planet, quadTree.NW, null, 0, 0,
            Extent.createFromArray([-20037508.34, -20037508.34, 20037508.34, 20037508.34])
        );
        let earthQuadTreeNorth = new Node(SegmentLonLat, this.planet, quadTree.NW, null, 0, 0,
            Extent.createFromArray([-180, mercator.MAX_LAT, 180, 90])
        );
        let earthQuadTreeSouth = new Node(SegmentLonLat, this.planet, quadTree.NW, null, 0, 0,
            Extent.createFromArray([-180, -90, 180, mercator.MIN_LAT])
        );

        this._quadTreeList.push(earthQuadTree);
        this._quadTreeList.push(earthQuadTreeNorth);
        this._quadTreeList.push(earthQuadTreeSouth);
    }
}