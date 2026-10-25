import { BilTerrain } from "./BilTerrain";
import { EmptyTerrain } from "./EmptyTerrain";
import { GlobusTerrain } from "./GlobusTerrain";
import {
    RgbTerrain,
    rgbToHeightByEncoding,
    rgbToHeightRgb,
    rgbToHeightTerrarium,
    resolveRgbToHeightFunc
} from "./RgbTerrain";
import type { IRgbTerrainParams, RgbTerrainEncoding, RgbToHeightFunc } from "./RgbTerrain";
import { GlobusRgbTerrain } from "./GlobusRgbTerrain";
import { MapterhornTerrain } from "./MapterhornTerrain";
import { ProceduralTerrain } from "./ProceduralTerrain";
import type { GetHeightsFunc, IProceduralTerrainParams, ProceduralHeights } from "./ProceduralTerrain";
import { GeoTiffTerrain } from "./GeoTiffTerrain";
import type { IGeoTiffTerrainParams } from "./GeoTiffTerrain";

export {
    EmptyTerrain,
    GlobusTerrain,
    RgbTerrain,
    BilTerrain,
    GlobusRgbTerrain,
    MapterhornTerrain,
    ProceduralTerrain,
    GeoTiffTerrain
};
export { rgbToHeightByEncoding, rgbToHeightRgb, rgbToHeightTerrarium, resolveRgbToHeightFunc };
export type {
    IRgbTerrainParams,
    RgbTerrainEncoding,
    RgbToHeightFunc,
    GetHeightsFunc,
    IProceduralTerrainParams,
    IGeoTiffTerrainParams
};
