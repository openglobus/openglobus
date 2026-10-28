import { Extent } from "../Extent";
import { getTileExtent } from "../mercator";
import type { IGlobusTerrainParams } from "./GlobusTerrain";
import { GlobusTerrain } from "./GlobusTerrain";
import { isPowerOfTwo } from "../math";
import { Layer } from "../layer/Layer";
import { LonLat } from "../LonLat";
import { Segment } from "../segment/Segment";
import type { TypedArray } from "../utils/shared";
import { binarySearchFast } from "../utils/shared";
import type { IResponse } from "../utils/Loader";
import type { DecodeHeightsRowFunc, IRgbDecodeParams, IRgbHeightsParams } from "./terrainUtils";
import {
    createHeightsLevels,
    decodeRgbHeightsRow,
    getGridCells,
    getParentHeight,
    getSubdivisionLevels,
    RGB_ENCODING_CUSTOM,
    RGB_ENCODING_RGB,
    RGB_ENCODING_TERRARIUM,
    TERRAIN_GRID_SIZE_BY_ZOOM
} from "./terrainUtils";
import { RgbTerrainWorker } from "../utils/RgbTerrainWorker";
import { LRUCache } from "../utils/LRUCache";

export type RgbTerrainEncoding = "rgb" | "terrarium";

function normalizeRgbTerrainEncoding(encoding?: string | null): RgbTerrainEncoding {
    return encoding === "terrarium" ? "terrarium" : "rgb";
}

export type RgbToHeightFunc = (r: number, g: number, b: number, minHeight: number, resolution: number) => number;

export function rgbToHeightRgb(r: number, g: number, b: number, minHeight: number, resolution: number): number {
    if (r === 255) {
        return minHeight;
    }
    return minHeight + resolution * (r * 256 * 256 + g * 256 + b);
}

export function rgbToHeightTerrarium(r: number, g: number, b: number, _minHeight: number, _resolution: number): number {
    // minHeight = - 32768, resolution = 1 /256
    return r * 256 + g + b / 256 - 32768;
}

export const rgbToHeightByEncoding: Record<RgbTerrainEncoding, RgbToHeightFunc> = {
    rgb: rgbToHeightRgb,
    terrarium: rgbToHeightTerrarium
};

export function resolveRgbToHeightFunc(
    options: Pick<IRgbTerrainParams, "encoding" | "rgbToHeightFunc">
): RgbToHeightFunc {
    if (options.rgbToHeightFunc) {
        return options.rgbToHeightFunc;
    }
    const encoding = normalizeRgbTerrainEncoding(options.encoding);
    return rgbToHeightByEncoding[encoding];
}

let _rgbTerrainWorker: RgbTerrainWorker | null = null;

function getRgbTerrainWorker(): RgbTerrainWorker {
    if (!_rgbTerrainWorker) {
        _rgbTerrainWorker = new RgbTerrainWorker(3);
    }
    return _rgbTerrainWorker;
}

export interface IRgbTerrainParams extends IGlobusTerrainParams {
    equalizeNormals?: boolean;
    key?: string;
    imageSize?: number;
    imageDataCacheSize?: number;
    minHeight?: number;
    resolution?: number;
    encoding?: RgbTerrainEncoding;
    rgbToHeightFunc?: RgbToHeightFunc;
}

/**
 * @class
 * @extends {GlobusTerrain}
 * @param {string} [name="RgbTerrain"] - Terrain provider name.
 * @param {IRgbTerrainParams} [options] - Provider options:
 * @param {boolean} [options.equalizeNormals=true] - Enables normal equalization on tile edges.
 * @param {string} [options.key=""] - API key.
 * @param {number} [options.imageSize=256] - Source image size.
 * @param {number} [options.imageDataCacheSize=50] - Number of images which pixels are kept for getHeightAsync,
 * the least recently used are loaded again.
 * @param {number} [options.minHeight=-10000] - Minimal height for RGB-to-height conversion.
 * @param {number} [options.resolution=0.1] - RGB-to-height conversion resolution.
 * @param {RgbTerrainEncoding} [options.encoding="rgb"] - RGB elevation encoding: `"rgb"` (default) or `"terrarium"`. Ignored when `options.rgbToHeightFunc` is set.
 * @param {RgbToHeightFunc} [options.rgbToHeightFunc] - Custom RGB-to-height decoder with signature `(r, g, b, minHeight, resolution) => number`. Defaults to `rgbToHeightByEncoding[options.encoding]`.
 */
class RgbTerrain extends GlobusTerrain {
    protected _imageSize: number;

    protected _ctx: CanvasRenderingContext2D;

    protected _imageDataCache: LRUCache<string, Uint8ClampedArray>;

    protected _minHeight: number;

    protected _resolution: number;

    protected _rgbToHeight: RgbToHeightFunc;

    protected _encoding: number;

    constructor(name: string | null, options: IRgbTerrainParams = {}) {
        super(name || "RgbTerrain", {
            equalizeVertices: options.equalizeVertices != undefined ? options.equalizeVertices : true,
            maxZoom: options.maxZoom || 17,
            noDataValues: options.noDataValues || [options.minHeight != undefined ? options.minHeight : -10000],
            plainGridSize: options.plainGridSize || 128,
            url:
                options.url != undefined
                    ? options.url
                    : `//api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.pngraw?access_token=${options.key || "<key>"}`,
            gridSizeByZoom: options.gridSizeByZoom || TERRAIN_GRID_SIZE_BY_ZOOM.slice(),
            ...options
        });

        this.equalizeNormals = options.equalizeNormals != undefined ? options.equalizeNormals : true;

        this._dataType = "imageBitmap";

        this._imageSize = options.imageSize || 256;

        this._ctx = this._createTemporalCanvas(this._imageSize);

        this._imageDataCache = new LRUCache(options.imageDataCacheSize || 50);

        this._minHeight = options.minHeight || -10000.0;
        this._resolution = options.resolution || 0.1;
        this._rgbToHeight = resolveRgbToHeightFunc(options);
        this._encoding = options.rgbToHeightFunc
            ? RGB_ENCODING_CUSTOM
            : normalizeRgbTerrainEncoding(options.encoding) === "terrarium"
              ? RGB_ENCODING_TERRARIUM
              : RGB_ENCODING_RGB;
    }

    public override clearCache() {
        this._imageDataCache.clear();
        super.clearCache();
    }

    static override checkNoDataValue(noDataValues: number[] | TypedArray, value: number): boolean {
        if (value > 50000) {
            return true;
        }
        return binarySearchFast(noDataValues, value) !== -1;
    }

    public rgb2Height(r: number, g: number, b: number): number {
        return this._rgbToHeight(r, g, b, this._minHeight, this._resolution);
    }

    public override isBlur(segment: Segment): boolean {
        return segment.tileZoom >= 16;
    }

    protected _createTemporalCanvas(size: number): CanvasRenderingContext2D {
        let canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        return canvas.getContext("2d", {
            willReadFrequently: true
        })!;
    }

    /**
     * Returns true when "rgb" or "terrarium" heights are decoded without rgb2Height calls.
     * @protected
     * @returns {boolean} -
     */
    protected _isBuiltInDecoding(): boolean {
        return this._encoding !== RGB_ENCODING_CUSTOM && this.rgb2Height === RgbTerrain.prototype.rgb2Height;
    }

    /**
     * Returns true when the loaded image heights are created in the worker.
     * @protected
     * @param {HTMLImageElement | ImageBitmap} data - Loaded image.
     * @returns {boolean} -
     */
    protected _isWorkerDecoding(data: HTMLImageElement | ImageBitmap): boolean {
        return (
            typeof OffscreenCanvas !== "undefined" &&
            data instanceof ImageBitmap &&
            data.width === this._imageSize &&
            isPowerOfTwo(getGridCells(this._imageSize)) &&
            this._isBuiltInDecoding()
        );
    }

    protected _getHeightsParams(
        segment: Segment | null,
        tileZoom: number,
        preventChildren: boolean
    ): IRgbHeightsParams {
        const size = this._imageSize,
            gridSize = this.plainGridSize;

        let decode: IRgbDecodeParams = {
            encoding: this._encoding,
            minHeight: this._minHeight,
            resolution: this._resolution,
            heightFactor: this._heightFactor,
            noDataValues: this.noDataValues,
            parentData: null,
            parentOffsetX: 0,
            parentOffsetY: 0,
            parentZoomDiff: 0,
            skipPositiveHeights: false
        };

        //
        // Getting parent segment terrain data, for zero and nodata values for the current segment
        //
        if (segment && segment.tileZoom > this.maxNativeZoom) {
            let pn = segment.node;
            while (pn && !pn.segment.terrainExists) {
                pn = pn.parentNode!;
            }
            if (pn && pn.segment.elevationData) {
                let ps = pn.segment;
                decode.parentData = ps.elevationData;
                [decode.parentOffsetX, decode.parentOffsetY, decode.parentZoomDiff] = getTileOffset(
                    segment.tileX,
                    segment.tileY,
                    segment.tileZoom,
                    ps.tileX,
                    ps.tileY,
                    ps.tileZoom
                );
                // in this case maxNativeZoom means sea level
                decode.skipPositiveHeights = ps.tileZoom <= 8;
            }
        }

        return {
            decode: decode,
            size: size,
            gridSize: gridSize,
            levels: preventChildren
                ? 0
                : getSubdivisionLevels(size, gridSize, tileZoom, this.maxZoom, this.maxNativeZoom),
            // Vertices with no data around them get the first no data value, the terrain worker recognizes it
            noDataHeight: this.noDataValues.length ? this.noDataValues[0] : 0
        };
    }

    protected _createDecodeRow(rgbaData: number[] | TypedArray, p: IRgbHeightsParams): DecodeHeightsRowFunc {
        const parentScale = p.gridSize / getGridCells(p.size),
            d = p.decode;

        if (this._isBuiltInDecoding()) {
            return (row: number, outHeights: Float32Array) =>
                decodeRgbHeightsRow(rgbaData, row, p.size, parentScale, d, outHeights, NaN);
        }

        return (row: number, outHeights: Float32Array) =>
            this.extractHeightsRgbRow(
                rgbaData,
                row,
                d.heightFactor,
                d.noDataValues,
                d.parentData,
                d.parentOffsetX,
                d.parentOffsetY,
                d.parentZoomDiff,
                d.skipPositiveHeights,
                p.size,
                parentScale,
                outHeights,
                NaN
            );
    }

    /**
     * Saves the tile and its subdivision levels heights to cache.
     * @protected
     * @returns {Float32Array} - Tile heights.
     */
    protected _cacheHeightsLevels(
        heights: Float32Array,
        p: IRgbHeightsParams,
        tileGroup: number,
        tileX: number,
        tileY: number,
        tileZoom: number,
        extent: Extent
    ): Float32Array {
        let tileLength = (p.gridSize + 1) * (p.gridSize + 1);

        let outCurrenElevations = heights.subarray(0, tileLength);

        for (let k = 1, offset = tileLength; k <= p.levels; k++) {
            let d = 1 << k;
            for (let i = 0; i < d; i++) {
                for (let j = 0; j < d; j++, offset += tileLength) {
                    let x = tileX * d + j,
                        y = tileY * d + i,
                        z = tileZoom + k;
                    let tileIndex = Layer.getTileIndex(x, y, z, tileGroup);
                    let cache = this.getElevationCache(tileIndex);
                    // Don't replace data the child tile got from its own image
                    if (!cache || !cache.heights) {
                        this.setElevationCache(tileIndex, {
                            heights: heights.subarray(offset, offset + tileLength),
                            //
                            // @todo: must work for any grids
                            //
                            extent: getTileExtent(x, y, z)
                        });
                    }
                }
            }
        }

        let tileIndex = Layer.getTileIndex(tileX, tileY, tileZoom, tileGroup);

        // Save current data to cache
        this.setElevationCache(tileIndex, {
            heights: outCurrenElevations,
            extent: extent
        });

        return outCurrenElevations;
    }

    protected override _onTerrainLoaded(segment: Segment, data: HTMLImageElement | ImageBitmap) {
        if (!this._isWorkerDecoding(data)) {
            super._onTerrainLoaded(segment, data);
            return;
        }

        let p = this._getHeightsParams(segment, segment.tileZoom, segment.tileZoom === this.maxZoom);

        getRgbTerrainWorker().make({
            segment: segment,
            bitmap: data as ImageBitmap,
            params: p,
            callback: (heights: Float32Array | null) => {
                // Terrain has been changed
                if (!this._planet) {
                    return;
                }

                let elevations = heights
                    ? this._cacheHeightsLevels(
                          heights,
                          p,
                          segment._tileGroup,
                          segment.tileX,
                          segment.tileY,
                          segment.tileZoom,
                          segment.getExtent()
                      )
                    : null;

                if (segment.plainReady && segment.terrainIsLoading) {
                    this._applyElevationsData(segment, elevations);
                }
            }
        });
    }

    protected override _createHeights(
        data: HTMLImageElement | ImageBitmap,
        segment: Segment | null,
        tileGroup: number,
        tileX: number,
        tileY: number,
        tileZoom: number,
        extent: Extent,
        preventChildren: boolean
    ): TypedArray | number[] {
        this._ctx.clearRect(0, 0, this._imageSize, this._imageSize);
        this._ctx.drawImage(data, 0, 0);
        let rgbaData = this._ctx.getImageData(0, 0, this._imageSize, this._imageSize).data;

        const SIZE = data.width;

        //
        // Neither 2^n nor (2^n + 1) images
        //
        if (!isPowerOfTwo(getGridCells(this._imageSize)) && SIZE === this._imageSize) {
            let outCurrenElevations = new Float32Array(SIZE * SIZE);
            this.extractElevationTilesRgbNonPowerOfTwo(rgbaData, outCurrenElevations, this._heightFactor);
            return outCurrenElevations;
        }

        let p = this._getHeightsParams(segment, tileZoom, preventChildren);

        let heights = createHeightsLevels(
            p.size,
            p.gridSize,
            p.levels,
            this._createDecodeRow(rgbaData, p),
            p.noDataHeight
        );

        return this._cacheHeightsLevels(heights, p, tileGroup, tileX, tileY, tileZoom, extent);
    }

    public override getHeightAsync(lonLat: LonLat, callback: (h: number) => void, zoom?: number): boolean {
        zoom = zoom != undefined ? zoom : this.maxZoom;

        if (zoom === 0) {
            callback(0);
            return true;
        }

        const qts = this._planet!.quadTreeStrategy;
        const [x, y, z, tileGroup] = qts.getTileXY(lonLat, zoom);
        const [i, j] = qts.getLonLatTileOffset(lonLat, x, y, z, this._imageSize);
        const index = (i * this._imageSize + j) * 4;
        const tileIndex = Layer.getTileIndex(x, y, z, tileGroup);

        let data = this._imageDataCache.get(tileIndex);

        if (data) {
            let height = this._heightFactor * this.rgb2Height(data[index], data[index + 1], data[index + 2]);
            let isNoData = RgbTerrain.checkNoDataValue(this.noDataValues, height);
            if (isNoData) {
                return this.getHeightAsync(lonLat, callback, zoom - 1);
            } else {
                callback(this._heightFactor * this.rgb2Height(data[index], data[index + 1], data[index + 2]));
                return true;
            }
        }

        let def = this._fetchCache[tileIndex];
        if (!def) {
            def = this._loader.fetch({
                src:
                    (this._urlRewriteCallback && this._urlRewriteCallback(x, y, z, tileGroup)) ||
                    this.buildURL(x, y, z, tileGroup),
                type: this._dataType,
                options: {
                    cache: this._cache
                }
            });
            this._fetchCache[tileIndex] = def;
        }

        def!.then((response: IResponse) => {
            if (response.status === "ready") {
                delete this._fetchCache[tileIndex];

                this._ctx.clearRect(0, 0, this._imageSize, this._imageSize);
                this._ctx.drawImage(response.data, 0, 0);
                let data = this._ctx.getImageData(0, 0, this._imageSize, this._imageSize).data;
                this._imageDataCache.set(tileIndex, data);

                let height = this._heightFactor * this.rgb2Height(data[index], data[index + 1], data[index + 2]);
                let isNoData = RgbTerrain.checkNoDataValue(this.noDataValues, height);
                if (isNoData) {
                    return this.getHeightAsync(lonLat, callback, zoom! - 1);
                } else {
                    callback(this._heightFactor * this.rgb2Height(data[index], data[index + 1], data[index + 2]));
                }
            } else if (response.status === "error") {
                return this.getHeightAsync(lonLat, callback, zoom! - 1);
            } else {
                //@ts-ignore
                this._fetchCache[tileIndex] = null;
                delete this._fetchCache[tileIndex];
            }
        });

        return false;
    }

    public extractHeightsRgbRow(
        rgbaData: number[] | TypedArray,
        row: number,
        heightFactor: number,
        noDataValues: number[] | TypedArray,
        availableParentData: TypedArray | number[] | null,
        availableParentOffsetX: number,
        availableParentOffsetY: number,
        availableZoomDiff: number,
        skipPositiveHeights: boolean,
        size: number,
        parentScale: number,
        outHeights: Float32Array,
        noDataHeight: number
    ) {
        let pi = Math.floor(row * parentScale);
        for (let j = 0, k4 = row * size * 4; j < size; j++, k4 += 4) {
            let height = heightFactor * this.rgb2Height(rgbaData[k4], rgbaData[k4 + 1], rgbaData[k4 + 2]);
            let isNoData = RgbTerrain.checkNoDataValue(noDataValues, height);
            if ((isNoData || height === 0) && availableParentData) {
                height = getParentHeight(
                    availableZoomDiff,
                    availableParentOffsetX,
                    availableParentOffsetY,
                    availableParentData,
                    pi,
                    Math.floor(j * parentScale),
                    skipPositiveHeights
                );
                isNoData = RgbTerrain.checkNoDataValue(noDataValues, height);
            }
            outHeights[j] = isNoData ? noDataHeight : height;
        }
    }

    public extractElevationTilesRgbNonPowerOfTwo(
        rgbaData: number[] | TypedArray,
        outCurrenElevations: number[] | TypedArray,
        heightFactor: number = 1
    ) {
        for (let i = 0, len = outCurrenElevations.length; i < len; i++) {
            let i4 = i * 4;
            outCurrenElevations[i] = heightFactor * this.rgb2Height(rgbaData[i4], rgbaData[i4 + 1], rgbaData[i4 + 2]);
        }
    }
}

function getTileOffset(
    currentTileX: number,
    currentTileY: number,
    currentTileZoom: number,
    parentTileX: number,
    parentTileY: number,
    parentTileZoom: number
): [number, number, number] {
    let dz2 = 2 << (currentTileZoom - parentTileZoom - 1);
    return [currentTileX - dz2 * parentTileX, currentTileY - dz2 * parentTileY, 1.0 / dz2];
}

export { RgbTerrain };
