import { fromArrayBuffer, fromBlob, fromUrl, GeoTIFF, GeoTIFFImage, Pool } from "geotiff";
import type { ReadRastersOptions, TypedArray } from "geotiff";
import { Extent } from "../../Extent";
import { LonLat } from "../../LonLat";
import * as mercator from "../../mercator";
import { getFastNoDataChecker, getRasterMinMax, parseNoDataValue } from "./ColorScale";
import { getProjectionHelper, type IProjectionHelper } from "./utm";
import { Proj } from "../../proj/Proj";
import { EPSG3857 } from "../../proj/EPSG3857";
import { EPSG4326 } from "../../proj/EPSG4326";
import type { DecodedTileData, IGeoTIFFLayerParams, IGeoTIFFMetadata, ProjFunc } from "./types";

/**
 * Sampling grid of a tile, source pixel positions are interpolated between its nodes.
 */
interface TileGrid {
    gridU: Float64Array;
    gridV: Float64Array;
    gridSize: number;
    uMin: number;
    uMax: number;
    vMin: number;
    vMax: number;
}

const GRID_MIN_SIZE = 4;

/**
 * Finest grid, reached only by tiles that span a large part of the globe.
 */
const GRID_MAX_SIZE = 64;

/**
 * Allowed interpolation error between the grid nodes, in tile pixels.
 */
const GRID_MAX_ERROR = 0.25;

/**
 * Size of a cached byte range of a remote file.
 */
const BLOCK_SIZE = 65536;

/**
 * Number of cached byte ranges, 512 blocks of 64 KB take about 32 MB.
 */
const BLOCK_CACHE_SIZE = 512;

const OVERVIEW_RESOLUTION_TOLERANCE = 1.4;

export class GeoTIFFReader {
    public source: GeoTIFF | null = null;
    public images: GeoTIFFImage[] = [];
    public workerPool: Pool | null = null;
    public metadata: IGeoTIFFMetadata | null = null;
    public extentWgs84: Extent = new Extent();
    public nativeBBox: [number, number, number, number] = [0, 0, 0, 0];
    public crsCode: number = 4326;
    public projFunc?: ProjFunc;
    public reverseY: boolean = false;
    public requestLevels: number[] = [];
    public isReady: boolean = false;

    private _ownsWorkerPool: boolean = false;
    private _projHelper: IProjectionHelper | null = null;

    constructor(public options: IGeoTIFFLayerParams = {}) {
        this.projFunc = options.projFunc;
    }

    /**
     * Initializes and parses the GeoTIFF source and its overview pyramid.
     */
    public async init(src: string | Blob | File | ArrayBuffer): Promise<IGeoTIFFMetadata> {
        let source: GeoTIFF;

        if (typeof src === "string") {
            source = await fromUrl(src, {
                blockSize: BLOCK_SIZE,
                cacheSize: BLOCK_CACHE_SIZE,
                ...this.options.requestOptions
            });
        } else if (
            src instanceof ArrayBuffer ||
            (typeof ArrayBuffer !== "undefined" && Object.prototype.toString.call(src) === "[object ArrayBuffer]")
        ) {
            source = await fromArrayBuffer(src as ArrayBuffer);
        } else if (ArrayBuffer.isView(src)) {
            const view = src as ArrayBufferView;
            const buf = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
            source = await fromArrayBuffer(buf as ArrayBuffer);
        } else if (
            (typeof Blob !== "undefined" && src instanceof Blob) ||
            (typeof File !== "undefined" && (src as any) instanceof File) ||
            (src && typeof (src as any).slice === "function" && typeof (src as any).size === "number")
        ) {
            source = await fromBlob(src as any);
        } else {
            throw new Error("Invalid GeoTIFF source provided.");
        }

        this.source = source;

        // Initialize Web Worker Pool for decoding if supported
        if (this.options.geotiffWorkerPool) {
            this.workerPool = this.options.geotiffWorkerPool;
            this._ownsWorkerPool = false;
        } else {
            const poolSize =
                this.options.workerPoolSize ??
                (typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2);
            const isWorkerSupported =
                typeof Worker !== "undefined" &&
                typeof Worker.prototype !== "undefined" &&
                typeof Worker.prototype.addEventListener === "function";

            if (poolSize > 0 && isWorkerSupported) {
                try {
                    this.workerPool = new Pool(poolSize);
                    this._ownsWorkerPool = true;
                } catch {
                    this.workerPool = null;
                    this._ownsWorkerPool = false;
                }
            } else {
                this.workerPool = null;
                this._ownsWorkerPool = false;
            }
        }

        const imageCount = await source.getImageCount();
        this.images = [];
        for (let i = 0; i < imageCount; i++) {
            const img = await source.getImage(i);

            // Mask images are skipped, only the full resolution image and its overviews are used
            const subfileType = Number(img.getFileDirectory().getValue("NewSubfileType") ?? 0);

            if (i === 0 || (subfileType & 1) === 1) {
                this.images.push(img);
            }
        }

        const baseImage = this.images[0];
        this.reverseY = this._checkIfReversed(baseImage);

        // Bounding box in native coordinates [minX, minY, maxX, maxY]
        this.nativeBBox = baseImage.getBoundingBox() as [number, number, number, number];
        const [minX, minY, maxX, maxY] = this.nativeBBox;

        // Determine CRS
        const geoKeys = baseImage.getGeoKeys() || {};
        let crsCode = +(geoKeys.ProjectedCSTypeGeoKey || geoKeys.GeographicTypeGeoKey || 0);

        if (crsCode === 32767 || crsCode === 65535 || !crsCode) {
            if (minX >= -180.5 && maxX <= 180.5 && minY >= -90.5 && maxY <= 90.5) {
                crsCode = 4326;
            } else {
                crsCode = 3857;
            }
        }
        this.crsCode = crsCode;
        this._projHelper = getProjectionHelper(crsCode, this.projFunc);

        // Calculate WGS84 Extent
        if (crsCode === 4326) {
            this.extentWgs84 = new Extent(new LonLat(minX, minY), new LonLat(maxX, maxY));
        } else if (crsCode === 3857 || crsCode === 900913) {
            const swLon = mercator.inverse_lon(minX);
            const swLat = mercator.inverse_lat(minY);
            const neLon = mercator.inverse_lon(maxX);
            const neLat = mercator.inverse_lat(maxY);
            this.extentWgs84 = new Extent(new LonLat(swLon, swLat), new LonLat(neLon, neLat));
        } else if (this._projHelper) {
            const sw = this._projHelper.unproject([minX, minY]);
            const se = this._projHelper.unproject([maxX, minY]);
            const nw = this._projHelper.unproject([minX, maxY]);
            const ne = this._projHelper.unproject([maxX, maxY]);
            const lons = [sw[0], se[0], nw[0], ne[0]];
            const lats = [sw[1], se[1], nw[1], ne[1]];
            this.extentWgs84 = new Extent(
                new LonLat(Math.min(...lons), Math.min(...lats)),
                new LonLat(Math.max(...lons), Math.max(...lats))
            );
        } else {
            console.warn(`[GeoTIFFReader] Unrecognized CRS: EPSG:${crsCode}. Assuming bounds are lon/lat.`);
            this.extentWgs84 = new Extent(new LonLat(minX, minY), new LonLat(maxX, maxY));
        }

        const samplesPerPixel = baseImage.getSamplesPerPixel();
        const gdalNoData = parseNoDataValue(baseImage.getGDALNoData());
        let userNoData: number | null | undefined = undefined;
        if (this.options.renderOptions?.nodata !== undefined) {
            userNoData = parseNoDataValue(this.options.renderOptions.nodata);
        } else if (this.options.renderOptions?.noData !== undefined) {
            userNoData = parseNoDataValue(this.options.renderOptions.noData);
        } else if (this.options.nodata !== undefined) {
            userNoData = parseNoDataValue(this.options.nodata);
        } else if (this.options.noData !== undefined) {
            userNoData = parseNoDataValue(this.options.noData);
        }
        const noData = userNoData !== undefined ? userNoData : (gdalNoData ?? null);

        // Sample band min/max statistics from metadata or thumbnail overview
        const bands: Record<number, { min: number; max: number }> = {};
        const previewImage = this.images[this.images.length - 1];

        if (samplesPerPixel >= 3) {
            for (let i = 0; i < samplesPerPixel; i++) {
                const bandNum = i + 1;
                const meta = await baseImage.getGDALMetadata(i);
                if (meta?.STATISTICS_MINIMUM && meta?.STATISTICS_MAXIMUM) {
                    bands[bandNum] = {
                        min: parseFloat(String(meta.STATISTICS_MINIMUM)),
                        max: parseFloat(String(meta.STATISTICS_MAXIMUM))
                    };
                } else {
                    bands[bandNum] = { min: 0, max: 255 };
                }
            }
        } else {
            let needsSampling = false;
            for (let i = 0; i < samplesPerPixel; i++) {
                const bandNum = i + 1;
                const meta = await baseImage.getGDALMetadata(i);
                if (meta?.STATISTICS_MINIMUM && meta?.STATISTICS_MAXIMUM) {
                    bands[bandNum] = {
                        min: parseFloat(String(meta.STATISTICS_MINIMUM)),
                        max: parseFloat(String(meta.STATISTICS_MAXIMUM))
                    };
                } else {
                    needsSampling = true;
                }
            }

            if (needsSampling && previewImage) {
                try {
                    const sampleRasters = await previewImage.readRasters({
                        interleave: false,
                        pool: this.workerPool || undefined
                    });
                    for (let i = 0; i < samplesPerPixel; i++) {
                        const bandNum = i + 1;
                        if (!bands[bandNum]) {
                            bands[bandNum] = getRasterMinMax(sampleRasters[i], noData);
                        }
                    }
                } catch {
                    for (let i = 0; i < samplesPerPixel; i++) {
                        const bandNum = i + 1;
                        if (!bands[bandNum]) {
                            bands[bandNum] = { min: 0, max: 255 };
                        }
                    }
                }
            }
        }

        this.metadata = {
            bbox: this.nativeBBox,
            crsCode: this.crsCode,
            width: baseImage.getWidth(),
            height: baseImage.getHeight(),
            samplesPerPixel,
            noData,
            isTiled: baseImage.isTiled,
            overviewCount: this.images.length,
            bands
        };

        this.isReady = true;
        return this.metadata;
    }

    /**
     * Reads raster data for a tile and warps it into the tile grid.
     *
     * Source pixel coordinates are calculated in the nodes of a coarse grid and interpolated in between,
     * so rotated grids (UTM and other projected systems) land on the tile without seams.
     *
     * @param tileExtentLonLat - Tile extent in degrees.
     * @param _zoomLevel - Tile zoom level, kept for API compatibility.
     * @param tileSize - Output tile size in pixels.
     * @param readSamples - Band indexes to read.
     * @param segmentProj - Projection of the segment the tile belongs to, EPSG:3857 by default.
     */
    public async readTileRasters(
        tileExtentLonLat: Extent,
        _zoomLevel: number,
        tileSize: number = 256,
        readSamples?: number[],
        segmentProj: Proj = EPSG3857
    ): Promise<DecodedTileData | null> {
        if (!this.isReady || !this.source || this.images.length === 0) {
            return null;
        }

        // 1. Check spatial intersection with WGS84 extent
        if (!this.extentWgs84.overlaps(tileExtentLonLat)) {
            return null;
        }

        const [nativeWest, nativeSouth, nativeEast, nativeNorth] = this.nativeBBox;
        const nativeWidth = nativeEast - nativeWest;
        const nativeHeight = nativeNorth - nativeSouth;
        if (nativeWidth <= 0 || nativeHeight <= 0) return null;

        // 2. Sample the tile with a coarse grid: every node gets its position inside the raster,
        // normalized to 0..1, where u grows to the east and v grows down the raster rows.
        const grid = this._createTileGrid(tileExtentLonLat, tileSize, segmentProj);
        if (!grid) return null;

        const { uMin, uMax, vMin, vMax } = grid;

        if (uMax < 0 || uMin > 1 || vMax < 0 || vMin > 1) {
            return null;
        }

        // 3. Select the overview whose resolution matches the tile resolution
        const image = this.images[this._selectOverviewIndex(grid, tileSize)];

        if (!image) return null;

        const imgWidth = image.getWidth();
        const imgHeight = image.getHeight();

        // 4. Source window covers the whole projected tile boundary, with a one pixel margin.
        // A tile may be larger than the raster itself, so the window is clamped to the image.
        const winX0 = Math.max(0, Math.floor(Math.max(0, uMin) * imgWidth) - 1);
        const winY0 = Math.max(0, Math.floor(Math.max(0, vMin) * imgHeight) - 1);
        const winX1 = Math.min(imgWidth, Math.ceil(Math.min(1, uMax) * imgWidth) + 1);
        const winY1 = Math.min(imgHeight, Math.ceil(Math.min(1, vMax) * imgHeight) + 1);

        if (winX1 <= winX0 || winY1 <= winY0) {
            return null;
        }

        const options: ReadRastersOptions & { interleave: false } = {
            window: [winX0, winY0, winX1, winY1],
            pool: this.workerPool || undefined,
            fillValue: this._getFillValue(),
            interleave: false
        };

        if (readSamples && readSamples.length > 0) {
            options.samples = readSamples;
        }

        try {
            const rasters = await image.readRasters(options);

            return {
                rasters: this._warpRasters(rasters, grid, imgWidth, imgHeight, [winX0, winY0, winX1, winY1], tileSize),
                width: tileSize,
                height: tileSize,
                dstX: 0,
                dstY: 0,
                tileSize,
                window: [winX0, winY0, winX1, winY1],
                isRGB: false
            };
        } catch (err) {
            console.error("[GeoTIFFReader] Error reading rasters:", err);
            return null;
        }
    }

    /**
     * Projects a lon/lat point into the raster coordinates, normalized to 0..1.
     */
    protected _projectToRaster(lon: number, lat: number): [number, number] {
        const [nativeWest, nativeSouth, nativeEast, nativeNorth] = this.nativeBBox;

        let x: number, y: number;

        if (this.crsCode === 4326) {
            x = lon;
            y = lat;
        } else if (this.crsCode === 3857 || this.crsCode === 900913) {
            x = mercator.forward_lon(lon);
            y = mercator.forward_lat(lat);
        } else if (this._projHelper) {
            const p = this._projHelper.project([lon, lat]);
            x = p[0];
            y = p[1];
        } else {
            x = lon;
            y = lat;
        }

        const u = (x - nativeWest) / (nativeEast - nativeWest);
        const v = this.reverseY
            ? (y - nativeSouth) / (nativeNorth - nativeSouth)
            : (nativeNorth - y) / (nativeNorth - nativeSouth);

        return [u, v];
    }

    protected _mercatorLatFunc(north: number, south: number): (t: number) => number {
        const top = mercator.forward_lat(north);
        const bottom = mercator.forward_lat(south);
        return (t: number) => mercator.inverse_lat(top + (bottom - top) * t);
    }

    protected _lonLatLatFunc(north: number, south: number): (t: number) => number {
        return (t: number) => north + (south - north) * t;
    }

    protected _createLatFunc(segmentProj: Proj, north: number, south: number): (t: number) => number {
        return segmentProj.equal(EPSG4326) ? this._lonLatLatFunc(north, south) : this._mercatorLatFunc(north, south);
    }

    private _buildGrid(west: number, east: number, latFunc: (t: number) => number, gridSize: number): TileGrid {
        const side = gridSize + 1;
        const gridU = new Float64Array(side * side);
        const gridV = new Float64Array(side * side);

        let uMin = Infinity,
            uMax = -Infinity,
            vMin = Infinity,
            vMax = -Infinity;

        for (let j = 0; j < side; j++) {
            const lat = latFunc(j / gridSize);

            for (let i = 0; i < side; i++) {
                const lon = west + (east - west) * (i / gridSize);
                const [u, v] = this._projectToRaster(lon, lat);
                const n = j * side + i;

                gridU[n] = u;
                gridV[n] = v;

                if (u < uMin) uMin = u;
                if (u > uMax) uMax = u;
                if (v < vMin) vMin = v;
                if (v > vMax) vMax = v;
            }
        }

        return { gridU, gridV, gridSize, uMin, uMax, vMin, vMax };
    }

    /**
     * Interpolation error of the grid, measured in tile pixels.
     * In every cell the interpolated center is compared with the exact projection of that center.
     */
    private _gridError(
        grid: TileGrid,
        west: number,
        east: number,
        latFunc: (t: number) => number,
        tileSize: number
    ): number {
        const baseWidth = this.images[0].getWidth();
        const baseHeight = this.images[0].getHeight();
        const { gridU, gridV, gridSize } = grid;
        const side = gridSize + 1;
        const cellSize = tileSize / gridSize;

        let maxError = 0;

        for (let j = 0; j < gridSize; j++) {
            const lat = latFunc((j + 0.5) / gridSize);

            for (let i = 0; i < gridSize; i++) {
                const lon = west + (east - west) * ((i + 0.5) / gridSize);
                const [u, v] = this._projectToRaster(lon, lat);

                const n00 = j * side + i;
                const n10 = n00 + 1;
                const n01 = n00 + side;
                const n11 = n01 + 1;

                const du = ((gridU[n00] + gridU[n10] + gridU[n01] + gridU[n11]) / 4 - u) * baseWidth;
                const dv = ((gridV[n00] + gridV[n10] + gridV[n01] + gridV[n11]) / 4 - v) * baseHeight;

                const dx = Math.hypot((gridU[n10] - gridU[n00]) * baseWidth, (gridV[n10] - gridV[n00]) * baseHeight);
                const dy = Math.hypot((gridU[n01] - gridU[n00]) * baseWidth, (gridV[n01] - gridV[n00]) * baseHeight);

                const density = Math.min(dx, dy) / cellSize;

                if (density > 0) {
                    maxError = Math.max(maxError, Math.hypot(du, dv) / density);
                }
            }
        }

        return maxError;
    }

    /**
     * Builds the sampling grid, refining it until the interpolation error becomes small enough.
     * Almost affine cases, such as a UTM raster on a zoomed in tile, stay on the coarsest grid.
     */
    private _createTileGrid(tileExtentLonLat: Extent, tileSize: number, segmentProj: Proj): TileGrid | null {
        const west = tileExtentLonLat.southWest.lon;
        const east = tileExtentLonLat.northEast.lon;
        const south = tileExtentLonLat.southWest.lat;
        const north = tileExtentLonLat.northEast.lat;

        if (east <= west || north <= south) return null;

        const latFunc = this._createLatFunc(segmentProj, north, south);

        let grid = this._buildGrid(west, east, latFunc, GRID_MIN_SIZE);

        while (grid.gridSize < GRID_MAX_SIZE && this._gridError(grid, west, east, latFunc, tileSize) > GRID_MAX_ERROR) {
            grid = this._buildGrid(west, east, latFunc, grid.gridSize * 2);
        }

        if (!Number.isFinite(grid.uMin) || !Number.isFinite(grid.vMin)) {
            return null;
        }

        return grid;
    }

    private _selectOverviewIndex(grid: TileGrid, tileSize: number): number {
        if (this.images.length <= 1) {
            return 0;
        }

        const { gridU, gridV, gridSize } = grid;
        const baseWidth = this.images[0].getWidth();
        const baseHeight = this.images[0].getHeight();
        const side = gridSize + 1;
        const cellSize = tileSize / gridSize;

        // How many full resolution source pixels fall into one tile pixel
        let density = 0;
        for (let j = 0; j < side; j++) {
            for (let i = 0; i < gridSize; i++) {
                const n = j * side + i;
                const du = Math.abs(gridU[n + 1] - gridU[n]) * baseWidth;
                const dv = Math.abs(gridV[n + 1] - gridV[n]) * baseHeight;
                density = Math.max(density, Math.hypot(du, dv) / cellSize);
            }
        }
        for (let j = 0; j < gridSize; j++) {
            for (let i = 0; i < side; i++) {
                const n = j * side + i;
                const du = Math.abs(gridU[n + side] - gridU[n]) * baseWidth;
                const dv = Math.abs(gridV[n + side] - gridV[n]) * baseHeight;
                density = Math.max(density, Math.hypot(du, dv) / cellSize);
            }
        }

        if (!(density > 1)) {
            return 0;
        }

        const maxFactor = density * OVERVIEW_RESOLUTION_TOLERANCE;

        for (let i = this.images.length - 1; i > 0; i--) {
            if (baseWidth / this.images[i].getWidth() <= maxFactor) {
                return i;
            }
        }

        return 0;
    }

    private _warpRasters(
        rasters: TypedArray[],
        grid: TileGrid,
        imgWidth: number,
        imgHeight: number,
        window: [number, number, number, number],
        tileSize: number
    ): Float32Array[] {
        const [winX0, winY0, winX1, winY1] = window;
        const winWidth = winX1 - winX0;
        const winHeight = winY1 - winY0;

        const { gridU, gridV, gridSize } = grid;
        const side = gridSize + 1;
        const cellSize = tileSize / gridSize;
        const bilinear = this.options.renderOptions?.resampleMethod === "bilinear";

        const nodata = this._getEffectiveNoData();
        const checkNoData = nodata !== null ? getFastNoDataChecker(nodata) : null;

        const out: Float32Array[] = [];
        for (let b = 0; b < rasters.length; b++) {
            out.push(new Float32Array(tileSize * tileSize).fill(NaN));
        }

        for (let y = 0; y < tileSize; y++) {
            // Grid nodes sit on tile pixel borders, so pixel centers are used here
            const gy = (y + 0.5) / cellSize;
            const j0 = Math.min(gridSize - 1, gy | 0);
            const fy = gy - j0;

            for (let x = 0; x < tileSize; x++) {
                const gx = (x + 0.5) / cellSize;
                const i0 = Math.min(gridSize - 1, gx | 0);
                const fx = gx - i0;

                // Bilinear interpolation of the source position between the grid nodes
                const n00 = j0 * side + i0;
                const n10 = n00 + 1;
                const n01 = n00 + side;
                const n11 = n01 + 1;

                const w00 = (1 - fx) * (1 - fy);
                const w10 = fx * (1 - fy);
                const w01 = (1 - fx) * fy;
                const w11 = fx * fy;

                const u = gridU[n00] * w00 + gridU[n10] * w10 + gridU[n01] * w01 + gridU[n11] * w11;
                const v = gridV[n00] * w00 + gridV[n10] * w10 + gridV[n01] * w01 + gridV[n11] * w11;

                if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;

                // Source position inside the window, in pixel centers
                const sx = u * imgWidth - winX0 - 0.5;
                const sy = v * imgHeight - winY0 - 0.5;

                const outIdx = y * tileSize + x;

                if (bilinear) {
                    const x0 = Math.floor(sx);
                    const y0 = Math.floor(sy);
                    const tx = sx - x0;
                    const ty = sy - y0;
                    const x1 = Math.min(winWidth - 1, x0 + 1);
                    const y1 = Math.min(winHeight - 1, y0 + 1);
                    const cx0 = Math.max(0, Math.min(winWidth - 1, x0));
                    const cy0 = Math.max(0, Math.min(winHeight - 1, y0));

                    const i00 = cy0 * winWidth + cx0;
                    const i10 = cy0 * winWidth + x1;
                    const i01 = y1 * winWidth + cx0;
                    const i11 = y1 * winWidth + x1;

                    for (let b = 0; b < rasters.length; b++) {
                        const src = rasters[b];
                        const v00 = src[i00],
                            v10 = src[i10],
                            v01 = src[i01],
                            v11 = src[i11];

                        if (
                            checkNoData
                                ? checkNoData(v00) || checkNoData(v10) || checkNoData(v01) || checkNoData(v11)
                                : Number.isNaN(v00) || Number.isNaN(v10) || Number.isNaN(v01) || Number.isNaN(v11)
                        ) {
                            continue;
                        }

                        out[b][outIdx] = (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
                    }
                } else {
                    const px = Math.max(0, Math.min(winWidth - 1, Math.round(sx)));
                    const py = Math.max(0, Math.min(winHeight - 1, Math.round(sy)));
                    const srcIdx = py * winWidth + px;

                    for (let b = 0; b < rasters.length; b++) {
                        const val = rasters[b][srcIdx];
                        if (checkNoData ? checkNoData(val) : Number.isNaN(val)) continue;
                        out[b][outIdx] = val;
                    }
                }
            }
        }

        return out;
    }

    /**
     * NoData value that masks pixels, or null when masking is turned off.
     * Layer options take precedence over the file metadata.
     */
    private _getEffectiveNoData(): number | null {
        let userNoData: number | null | undefined = undefined;

        if (this.options.renderOptions?.nodata !== undefined) {
            userNoData = parseNoDataValue(this.options.renderOptions.nodata);
        } else if (this.options.renderOptions?.noData !== undefined) {
            userNoData = parseNoDataValue(this.options.renderOptions.noData);
        } else if (this.options.nodata !== undefined) {
            userNoData = parseNoDataValue(this.options.nodata);
        } else if (this.options.noData !== undefined) {
            userNoData = parseNoDataValue(this.options.noData);
        }

        if (userNoData !== undefined) {
            return userNoData !== null && !Number.isNaN(userNoData) ? userNoData : null;
        }

        const metaNoData = this.metadata?.noData;
        return metaNoData !== null && metaNoData !== undefined && !Number.isNaN(metaNoData) ? metaNoData : null;
    }

    private _getFillValue(): number | undefined {
        return this._getEffectiveNoData() ?? undefined;
    }

    private _checkIfReversed(image: GeoTIFFImage): boolean {
        const fileDirectory = image.getFileDirectory();

        const pixelScale = fileDirectory.getValue("ModelPixelScale");

        if (pixelScale && pixelScale[1] < 0) {
            return true;
        }

        const transform = fileDirectory.getValue("ModelTransformation");

        if (transform && transform[7] > transform[3]) {
            return true;
        }

        return false;
    }

    /**
     * Cleans up worker pool and cached images.
     */
    public destroy(): void {
        if (this._ownsWorkerPool && this.workerPool) {
            this.workerPool.destroy();
            this.workerPool = null;
        }
        this.images = [];
        this.source = null;
        this.isReady = false;
    }
}
