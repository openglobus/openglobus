import * as quadTree from "../quadTree/quadTree";
import {Extent} from "../Extent";
import {EPSG4326} from "../proj/EPSG4326";
import {Node} from "../quadTree/Node";
import {Planet} from "../scene/Planet";
import {QuadTreeStrategy} from "./QuadTreeStrategy";
import {SegmentLonLatWgs84} from "../segment/SegmentLonLatWgs84";

export class EPSG4326QuadTreeStrategy extends QuadTreeStrategy {
    constructor(planet: Planet) {
        super(planet, "EPSG4326", EPSG4326);
    }

    public override init() {
        this._quadTreeList = [
            new Node(
                SegmentLonLatWgs84,
                this.planet,
                0,
                null,
                0,
                Extent.createFromArray([-180, -90, 0, 90])
            ),
            new Node(
                SegmentLonLatWgs84,
                this.planet,
                0,
                null,
                0,
                Extent.createFromArray([0, -90, 180, 90])
            )
        ];
    }
}