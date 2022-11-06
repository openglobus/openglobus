"use strict";
import { QuadTreeStrategy } from "./QuadTreeStrategy.js"
import { SegmentLonLatWgs84 } from "../segment/SegmentLonLatWgs84.js";
import * as quadTree from "../quadTree/quadTree.js";
import { Extent } from "../Extent.js";
import { Node } from "../quadTree/Node.js";
import { EPSG4326 } from "../proj/EPSG4326.js";

export class Wgs84QuadTreeStrategy extends QuadTreeStrategy {
    constructor(options = {}) {
        super(options);
        this.name = "wgs84";
        this.projection = EPSG4326;
    }

    init() {

        let wgs84QuadTree = new Node(SegmentLonLatWgs84, this.planet, quadTree.NW, null, 0, 0,
            Extent.createFromArray([-180, -90, 180, 90])
        );



        this._quadTreeList.push(wgs84QuadTree);
    }
}