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
        this._quadTreeList = [
            new Node(
                SegmentLonLatWgs84,
                this.planet,
                0, null,
                0,
                Extent.createFromArray([-180, -90, 180, 90])
            )
        ];
    }
}