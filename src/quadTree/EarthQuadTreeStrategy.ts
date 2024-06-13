import * as mercator from "../mercator";
import * as quadTree from "../quadTree/quadTree";
import {Extent} from "../Extent";
import {Node} from "../quadTree/Node";
import {Planet} from "../scene/Planet";
import {QuadTreeStrategy} from "./QuadTreeStrategy";
import {Segment} from "../segment/Segment";
import {SegmentLonLat} from "../segment/SegmentLonLat";

export class EarthQuadTreeStrategy extends QuadTreeStrategy {
    constructor(planet: Planet) {
        super(planet, "Earth");
    }

    public override init() {
        this._quadTreeList = [
            new Node(Segment, this.planet, 0, null, 0,
                Extent.createFromArray([-20037508.34, -20037508.34, 20037508.34, 20037508.34])
            ),
            new Node(SegmentLonLat, this.planet, 0, null, 0,
                Extent.createFromArray([-180, mercator.MAX_LAT, 180, 90])
            ),
            new Node(SegmentLonLat, this.planet, 0, null, 0,
                Extent.createFromArray([-180, -90, 180, mercator.MIN_LAT])
            )
        ];

        this._planet.terrain!.setUrlRewriteCallback((segment: Segment): string | undefined => {
            if (segment.isPole) {
                return `../../dest/${segment.tileZoom}/${segment.tileX}/${segment.tileY}.png`;
            }
        });
    }
}