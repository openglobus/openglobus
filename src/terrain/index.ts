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
import type {
    IRgbTerrainParams,
    RgbTerrainEncoding,
    RgbToHeightFunc
} from "./RgbTerrain";
import { GlobusRgbTerrain } from "./GlobusRgbTerrain";
import { MapterhornTerrain } from "./MapterhornTerrain";

export { EmptyTerrain, GlobusTerrain, RgbTerrain, BilTerrain, GlobusRgbTerrain, MapterhornTerrain };
export {
    rgbToHeightByEncoding,
    rgbToHeightRgb,
    rgbToHeightTerrarium,
    resolveRgbToHeightFunc
};
export type {
    IRgbTerrainParams,
    RgbTerrainEncoding,
    RgbToHeightFunc
};
