import * as quadTree from "../quadTree/quadTree";
import {Extent} from "../Extent";
import {EPSG4326} from "../proj/EPSG4326";
import {Node} from "../quadTree/Node";
import {Planet} from "../scene/Planet";
import {SegmentLonLatWgs84} from "../segment/SegmentLonLatWgs84";
import {QuadTreeStrategy} from "./QuadTreeStrategy";

export class Wgs84QuadTreeStrategy extends QuadTreeStrategy {
    constructor(planet: Planet) {
        super(planet, "wgs84", EPSG4326);
    }

    public override init() {

        let wgs84QuadTree = new Node(SegmentLonLatWgs84, this.planet, quadTree.NW, null, 0, 0,
            Extent.createFromArray([-180, -90, 180, 90])
        );

        this._quadTreeList.push(wgs84QuadTree);
    }
}