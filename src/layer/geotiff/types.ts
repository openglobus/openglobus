import type { IBaseTileMaterialLayerParams } from "../BaseTileMaterialLayer";
import type { Pool, TypedArray } from "geotiff";
import type { Extent } from "../../Extent";
import type { Proj } from "../../proj/Proj";

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

/**
 * GeoTIFF data source: a remote URL or a local binary.
 */
export type GeoTIFFSource = string | Blob | File | ArrayBuffer;

export type NoDataValue = number | null | "nan" | "NaN";

export interface IBandStats {
    min: number;
    max: number;
}

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
    nodata?: NoDataValue;

    /** Alias for nodata */
    noData?: NoDataValue;

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

    /** Size of a cached byte range, 256 KB by default. */
    blockSize?: number;

    /** Number of cached byte ranges, by default as many as fit in 32 MB. */
    cacheSize?: number;

    [key: string]: any;
}

export type ProjFunc = (code: number) =>
    | {
          project: (pos: number[]) => number[];
          unproject: (pos: number[]) => number[];
      }
    | undefined;

/**
 * Options shared by a single GeoTIFF source and by the reader that opens it.
 */
export interface IGeoTIFFSourceCommon {
    /** Remote URL or local Blob/File/ArrayBuffer */
    src?: GeoTIFFSource;

    /** Custom NoData value. Set to null or NaN to disable nodata masking. */
    nodata?: NoDataValue;

    /** Alias for nodata */
    noData?: NoDataValue;

    /** Optional CRS code or definition, e.g. 2193 or "EPSG:2193" */
    crs?: number | string;

    /** HTTP request options for geotiff.js range requests */
    requestOptions?: IGeoTIFFRequestOptions;
}

export interface IGeoTIFFSourceItem extends IGeoTIFFSourceCommon {
    /** Specific band indexes to read from this source (1-indexed). Defaults to all bands. */
    bands?: number[];

    /** Min value for this source's bands (used for contrast stretching) */
    min?: number;

    /** Max value for this source's bands (used for contrast stretching) */
    max?: number;
}

/**
 * Options used by a GeoTIFF reader.
 */
export interface IGeoTIFFReaderParams extends IGeoTIFFSourceCommon {
    /** Multiple GeoTIFF/COG sources (like OpenLayers) */
    sources?: IGeoTIFFSourceItem[];

    /** When true, merges multiple sources spatially as a mosaic instead of stacking bands */
    mosaic?: boolean;

    /** Rendering and band options */
    renderOptions?: IGeoTIFFRenderOptions;

    /** Custom geotiff Worker Pool instance. It belongs to the caller and is never destroyed by a reader. */
    geotiffWorkerPool?: Pool;

    /** Number of decompression workers. Uses a shared pool if not set. */
    workerPoolSize?: number;

    /** Custom projection mapping function for non-standard CRS */
    projFunc?: ProjFunc;
}

export interface IGeoTIFFLayerParams extends IBaseTileMaterialLayerParams, IGeoTIFFReaderParams {
    /** Output tile size (default: 256) */
    tileSize?: number;

    /** Maximum tile cache size (default: 500) */
    cacheSize?: number;

    /** Auto-calculate maximumLevel from COG overview count */
    useImageCountAsMaximumLevel?: boolean;
}

/**
 * Index or coordinate label of an extra GeoZarr dimension, a list of them makes the samples of the variable.
 */
export type GeoZarrDimensionValue = number | string | (number | string)[];

/**
 * Options used by a GeoZarr reader.
 */
export interface IGeoZarrReaderParams extends Omit<
    IGeoTIFFReaderParams,
    "src" | "sources" | "mosaic" | "requestOptions"
> {
    /** URL of the Zarr store, v2 or v3. */
    url?: string;

    /** Path of the multiscales group inside the store, e.g. "measurements/reflectance". */
    group?: string;

    /** Names of the band arrays of every pyramid level, e.g. ["b04", "b03", "b02"], every band is a sample. */
    bands?: string[];

    /** Name of one n-D array of every pyramid level, instead of bands. "" is the level array itself. */
    variable?: string;

    /**
     * Index (number) or coordinate label (string) of every extra dimension, such as time, band or depth, the
     * first index when not set. In the variable mode one dimension may take a list, its entries are the samples.
     */
    dimensions?: Record<string, GeoZarrDimensionValue>;

    /** HTTP request options of the Zarr store, such as headers or credentials. */
    storeOptions?: RequestInit;

    /**
     * Reads the end of a file, the shard index, by a suffix range request "bytes=-n" instead of a HEAD request
     * and a range. True by default, some S3 servers do not send CORS headers for HEAD requests. Servers without
     * suffix ranges, such as Azure Blob Storage, need false.
     */
    useSuffixRequest?: boolean;

    /** Bounding box [minX, minY, maxX, maxY] in the CRS units, when the store has no georeference. */
    bbox?: [number, number, number, number];
}

/**
 * Extra (not spatial) dimension of a GeoZarr variable.
 */
export interface IGeoZarrDimension {
    name: string;
    /** Axis of the dimension in the array. */
    axisIndex: number;
    size: number;
    /** Coordinate labels, ISO dates for a CF time axis. */
    values?: (number | string)[];
    units?: string;
}

export interface IGeoTIFFReader {
    options: IGeoTIFFReaderParams;
    metadata: IGeoTIFFMetadata | null;
    extentWgs84: Extent;
    crsCode: number;
    isReady: boolean;
    workerPool: Pool | null;

    /**
     * Opens the source: a GeoTIFF source or sources, or a GeoZarr store, by the reader.
     */
    init(src?: unknown): Promise<IGeoTIFFMetadata>;

    /**
     * Applies rendering options that affect decoding, such as nodata masking and the resampling method.
     */
    setRenderOptions(renderOptions: IGeoTIFFRenderOptions): void;

    readTileRasters(
        tileExtentLonLat: Extent,
        zoomLevel: number,
        tileSize?: number,
        readSamples?: number[],
        segmentProj?: Proj
    ): Promise<DecodedTileData | null>;

    destroy(): void;
}

export interface IGeoTIFFMetadata {
    bbox: [number, number, number, number];
    crsCode: number;
    crsResolved: boolean;
    width: number;
    height: number;
    samplesPerPixel: number;
    noData: number | null;
    isTiled: boolean;
    overviewCount: number;
    bands: Record<number, IBandStats | undefined>;
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
