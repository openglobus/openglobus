import type { IBaseTileMaterialLayerParams } from "../BaseTileMaterialLayer";
import type { Pool, TypedArray } from "geotiff";

export type ColorScaleName =
    | "viridis"
    | "inferno"
    | "turbo"
    | "magma"
    | "plasma"
    | "rainbow"
    | "jet"
    | "hsv"
    | "hot"
    | "cool"
    | "spring"
    | "summer"
    | "autumn"
    | "winter"
    | "bone"
    | "copper"
    | "greys"
    | "ylgnbu"
    | "greens"
    | "ylorrd"
    | "bluered"
    | "rdbu"
    | "picnic"
    | "portland"
    | "blackbody"
    | "earth"
    | "electric"
    | "redblue"
    | "coolwarm";

export type ColorStop = [stopValue: number, color: string];

export interface ISingleBandRenderOptions {
    /** Band index (1-indexed), defaults to 1 */
    band?: number;

    /** Built-in colormap name */
    colorScale?: ColorScaleName;

    /** Custom color stops: [[0, '#0000ff'], [0.5, '#00ff00'], [1, '#ff0000']] or ['#000', '#fff'] */
    colors?: ColorStop[] | string[];

    /** Value domain [min, max] used to scale colors */
    domain?: [number, number];

    /** Range of values that will be rendered; values outside become transparent */
    displayRange?: [number, number];

    /** Whether to clamp values below the domain */
    clampLow?: boolean;

    /** Whether to clamp values above the domain */
    clampHigh?: boolean;

    /** If true, custom colors use true data domain values instead of normalized 0..1 */
    useRealValue?: boolean;

    /** Math expression evaluated across bands, e.g. '(b4 - b3) / (b4 + b3)' */
    expression?: string;
}

export interface IBandChannelOptions {
    band: number;
    min?: number;
    max?: number;
}

export interface IMultiBandRenderOptions {
    r?: IBandChannelOptions;
    g?: IBandChannelOptions;
    b?: IBandChannelOptions;
}

export interface IGeoTIFFRenderOptions {
    /** NoData value (if not set, read from TIFF metadata). Set to null or NaN to disable nodata masking. */
    nodata?: number | null | "nan" | "NaN";

    /** Alias for nodata */
    noData?: number | null | "nan" | "NaN";

    /** Treat 3-band/multi-band TIFF directly as RGB */
    convertToRGB?: boolean;

    /** Multi-band channel configuration */
    multi?: IMultiBandRenderOptions;

    /** Single-band rendering configuration */
    single?: ISingleBandRenderOptions;

    /** Resampling method */
    resampleMethod?: "nearest" | "bilinear";
}

export interface IGeoTIFFRequestOptions {
    forceXHR?: boolean;
    headers?: Record<string, string>;
    credentials?: boolean;
    maxRanges?: number;
    allowFullFile?: boolean;

    /** Size of a cached byte range, 64 KB by default. Fetched ranges are cached only when it is set. */
    blockSize?: number;

    /** Number of cached byte ranges, 512 by default. */
    cacheSize?: number;

    [key: string]: any;
}

export type ProjFunc = (code: number) =>
    | {
          project: (pos: number[]) => number[];
          unproject: (pos: number[]) => number[];
      }
    | undefined;

export interface IGeoTIFFLayerParams extends IBaseTileMaterialLayerParams {
    /** Remote URL or local Blob/File/ArrayBuffer */
    src?: string | Blob | File | ArrayBuffer;

    /** Alias for src when passing a URL */
    url?: string;

    /** Custom NoData value. Set to null or NaN to disable nodata masking. */
    nodata?: number | null | "nan" | "NaN";

    /** Alias for nodata */
    noData?: number | null | "nan" | "NaN";

    /** Rendering and band options */
    renderOptions?: IGeoTIFFRenderOptions;

    /** HTTP request options for geotiff.js range requests */
    requestOptions?: IGeoTIFFRequestOptions;

    /** Custom geotiff Worker Pool instance */
    geotiffWorkerPool?: Pool;

    /** Number of Web Workers for decompression (default: navigator.hardwareConcurrency || 2) */
    workerPoolSize?: number;

    /** Custom projection mapping function for non-standard CRS */
    projFunc?: ProjFunc;

    /** Output tile size (default: 256) */
    tileSize?: number;

    /** Maximum tile cache size (default: 500) */
    cacheSize?: number;

    /** Auto-calculate maximumLevel from COG overview count */
    useImageCountAsMaximumLevel?: boolean;
}

export interface IGeoTIFFMetadata {
    bbox: [number, number, number, number];
    crsCode: number;
    width: number;
    height: number;
    samplesPerPixel: number;
    noData: number | null;
    isTiled: boolean;
    overviewCount: number;
    bands: Record<number, { min: number; max: number }>;
}

export interface DecodedTileData {
    rasters: TypedArray[];
    width: number;
    height: number;
    dstX: number;
    dstY: number;
    tileSize: number;
    window: [number, number, number, number];
    isRGB: boolean;
}
