import {IRgbTerrainParams, RgbTerrain} from "./RgbTerrain";
import {Segment, TILEGROUP_NORTH, TILEGROUP_SOUTH} from "../segment/Segment";

const urlPref: Record<number, string> = {
    [TILEGROUP_NORTH]: "north",
    [TILEGROUP_SOUTH]: "south"
}

const urlRewriteFunc = (tileX: number, tileY: number, tileZoom: number, tileGroup: number): string | undefined => {
    let g = urlPref[tileGroup];
    if (g) return `https://terrain.openglobus.org/public/poles/${g}/${tileZoom}/${tileX}/${tileY}.png`;
}

export class GlobusRgbTerrain extends RgbTerrain {
    constructor(name?: string | null, options?: IRgbTerrainParams) {
        super(name || "GlobusEarthRgb", {
            maxNativeZoom: 6,
            maxZoom: 17,
            url: "https://{s}.terrain.openglobus.org/public/all/{z}/{x}/{y}.png",
            urlRewrite: urlRewriteFunc,
            ...options
        });
    }

    public override isReadyToLoad(segment: Segment): boolean {
        return this._extent.overlaps(segment.getExtentLonLat());
    }
}