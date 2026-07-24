import { RgbTerrain } from "./RgbTerrain";
import type { IRgbTerrainParams } from "./RgbTerrain";

/**
 * Mapterhorn Web Mercator RGB terrain (512px WebP tiles, Terrarium encoding).
 * @class
 * @extends {RgbTerrain}
 */
export class MapterhornTerrain extends RgbTerrain {
    constructor(name?: string | null, options?: IRgbTerrainParams) {
        super(name || "Mapterhorn", {
            url: "https://tiles.mapterhorn.com/{z}/{x}/{y}.webp",
            encoding: "terrarium",
            imageSize: 512,
            plainGridSize: 256,
            maxNativeZoom: 12,
            maxZoom: 17,
            ...options
        });
    }
}
