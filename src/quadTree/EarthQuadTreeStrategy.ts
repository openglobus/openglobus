import * as mercator from "../mercator";
import {Extent} from "../Extent";
import {Node} from "../quadTree/Node";
import {Planet} from "../scene/Planet";
import {QuadTreeStrategy} from "./QuadTreeStrategy";
import {Segment, TILEGROUP_NORTH, TILEGROUP_SOUTH, getTileGroupByLat} from "../segment/Segment";
import {SegmentLonLat} from "../segment/SegmentLonLat";
import {LonLat} from "../LonLat";

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
            return this.getTerrainUrl(segment.tileX, segment.tileY, segment.tileZoom, segment._tileGroup);
        });
    }

    public override getTerrainUrl(tileX: number, tileY: number, tileZoom: number, tileGroup: number): string | undefined {
        let urlPref: Record<number, string> = {
            [TILEGROUP_NORTH]: "north",
            [TILEGROUP_SOUTH]: "south"
        }

        let g = urlPref[tileGroup];

        if (g) return `./${g}/${tileZoom}/${tileX}/${tileY}.png`;
    }

    public override getTileXY(lonLat: LonLat, zoom: number): [number, number, number, number] {
        let tileGroup = getTileGroupByLat(lonLat.lat, mercator.MAX_LAT);

        let z = zoom,
            size = mercator.POLE2 / (1 << z)/*Math.pow(2, z)*/,
            merc = mercator.forward(lonLat),
            x = Math.floor((mercator.POLE + merc.lon) / size),
            y = Math.floor((mercator.POLE - merc.lat) / size);

        return [x, y, z, tileGroup];
    }

    public override getLonLatTileOffset(lonLat: LonLat, x: number, y: number, z: number, gridSize: number): [number, number] {
        let merc = mercator.forward(lonLat);
        let extent = mercator.getTileExtent(x, y, z);

        let sizeImgW = extent.getWidth() / (gridSize - 1),
            sizeImgH = extent.getHeight() / (gridSize - 1);

        let i = gridSize - Math.ceil((merc.lat - extent.southWest.lat) / sizeImgH) - 1,
            j = Math.floor((merc.lon - extent.southWest.lon) / sizeImgW);

        return [i, j];
    }
}