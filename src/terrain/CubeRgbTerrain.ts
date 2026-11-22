import { RgbTerrain } from "./RgbTerrain";
import type { IRgbTerrainParams } from "./RgbTerrain";
import { LonLat } from "../LonLat";
import { Segment } from "../segment/Segment";

/**
 * RGB encoded height tiles of the six cube faces, for CubeQuadTreeStrategy and EquiangularCubeQuadTreeStrategy.
 * @class
 * @extends {RgbTerrain}
 * @param {string} [name="CubeRgbTerrain"] - Terrain provider name.
 * @param {IRgbTerrainParams} options - RgbTerrain options, no geoid by default. The url template has the face index {f}, it is
 * segment.tileGroup, x counts from the west of the face and y from the north, as segment.tileX and segment.tileY.
 *
 * @example
 * new CubeRgbTerrain("Moon", {
 *     url: "./dem/{f}/{z}/{x}/{y}.webp",
 *     maxNativeZoom: 8,
 *     maxZoom: 10,
 *     maxHeight: 10800
 * });
 */
class CubeRgbTerrain extends RgbTerrain {
    constructor(name: string | null, options: IRgbTerrainParams) {
        super(name || "CubeRgbTerrain", { ...options, geoidSrc: options.geoidSrc || "" });
    }

    public override isReadyToLoad(segment: Segment): boolean {
        return this._extent.overlaps(segment.getExtentLonLat());
    }

    public override getHeightAsync(lonLat: LonLat, callback: (h: number) => void, zoom?: number): boolean {
        return super.getHeightAsync(
            lonLat,
            callback,
            Math.min(zoom != undefined ? zoom : this.maxZoom, this.maxNativeZoom)
        );
    }
}

export { CubeRgbTerrain };
