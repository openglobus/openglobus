import { fromArrayBuffer, fromBlob, fromUrl, GeoTIFF, GeoTIFFImage, Pool } from "geotiff";
import { Extent } from "../../Extent";
import { LonLat } from "../../LonLat";
import * as mercator from "../../mercator";
import { getRasterMinMax, parseNoDataValue } from "./ColorScale";
import { getProjectionHelper, type IProjectionHelper } from "./utm";
import type { DecodedTileData, IGeoTIFFLayerParams, IGeoTIFFMetadata, ProjFunc } from "./types";

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
            source = await fromUrl(src, this.options.requestOptions);
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
            this.images.push(img);
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
                const meta = (await baseImage.getGDALMetadata(i)) as any;
                if (meta?.STATISTICS_MINIMUM && meta?.STATISTICS_MAXIMUM) {
                    bands[bandNum] = {
                        min: parseFloat(meta.STATISTICS_MINIMUM),
                        max: parseFloat(meta.STATISTICS_MAXIMUM)
                    };
                } else {
                    bands[bandNum] = { min: 0, max: 255 };
                }
            }
        } else {
            let needsSampling = false;
            for (let i = 0; i < samplesPerPixel; i++) {
                const bandNum = i + 1;
                const meta = (await baseImage.getGDALMetadata(i)) as any;
                if (meta?.STATISTICS_MINIMUM && meta?.STATISTICS_MAXIMUM) {
                    bands[bandNum] = {
                        min: parseFloat(meta.STATISTICS_MINIMUM),
                        max: parseFloat(meta.STATISTICS_MAXIMUM)
                    };
                } else {
                    needsSampling = true;
                }
            }

            if (needsSampling && previewImage) {
                try {
                    const sampleRasters = (await previewImage.readRasters({
                        pool: this.workerPool || undefined
                    })) as any;
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
     * Reads raster data for a specific geographic/projected extent.
     */
    public async readTileRasters(
        tileExtentLonLat: Extent,
        _zoomLevel: number,
        tileSize: number = 256,
        readSamples?: number[]
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

        // 2. Convert tile bounds to native CRS coordinates
        let tileMinX: number, tileMinY: number, tileMaxX: number, tileMaxY: number;

        if (this.crsCode === 4326) {
            tileMinX = tileExtentLonLat.southWest.lon;
            tileMinY = tileExtentLonLat.southWest.lat;
            tileMaxX = tileExtentLonLat.northEast.lon;
            tileMaxY = tileExtentLonLat.northEast.lat;
        } else if (this.crsCode === 3857 || this.crsCode === 900913) {
            tileMinX = mercator.forward_lon(tileExtentLonLat.southWest.lon);
            tileMinY = mercator.forward_lat(tileExtentLonLat.southWest.lat);
            tileMaxX = mercator.forward_lon(tileExtentLonLat.northEast.lon);
            tileMaxY = mercator.forward_lat(tileExtentLonLat.northEast.lat);
        } else if (this._projHelper) {
            const sw = this._projHelper.project([tileExtentLonLat.southWest.lon, tileExtentLonLat.southWest.lat]);
            const ne = this._projHelper.project([tileExtentLonLat.northEast.lon, tileExtentLonLat.northEast.lat]);
            tileMinX = Math.min(sw[0], ne[0]);
            tileMinY = Math.min(sw[1], ne[1]);
            tileMaxX = Math.max(sw[0], ne[0]);
            tileMaxY = Math.max(sw[1], ne[1]);
        } else {
            tileMinX = tileExtentLonLat.southWest.lon;
            tileMinY = tileExtentLonLat.southWest.lat;
            tileMaxX = tileExtentLonLat.northEast.lon;
            tileMaxY = tileExtentLonLat.northEast.lat;
        }

        const tileW = Math.min(tileMinX, tileMaxX);
        const tileE = Math.max(tileMinX, tileMaxX);
        const tileS = Math.min(tileMinY, tileMaxY);
        const tileN = Math.max(tileMinY, tileMaxY);

        const tileSpanX = tileE - tileW;
        const tileSpanY = tileN - tileS;
        if (tileSpanX <= 0 || tileSpanY <= 0) return null;

        // 3. Compute spatial intersection between tile and GeoTIFF
        const overlapWest = Math.max(tileW, nativeWest);
        const overlapEast = Math.min(tileE, nativeEast);
        const overlapSouth = Math.max(tileS, nativeSouth);
        const overlapNorth = Math.min(tileN, nativeNorth);

        if (overlapEast <= overlapWest || overlapNorth <= overlapSouth) {
            return null;
        }

        // 4. Select appropriate overview level based on ground resolution
        const overviewIdx = this._selectOverviewIndex(tileSpanX, tileSize);
        const image = this.images[overviewIdx];
        if (!image) return null;

        const imgWidth = image.getWidth();
        const imgHeight = image.getHeight();

        // 5. Calculate source pixel window on the overview image
        let srcX0 = Math.round(((overlapWest - nativeWest) / nativeWidth) * imgWidth);
        let srcX1 = Math.round(((overlapEast - nativeWest) / nativeWidth) * imgWidth);
        let srcY0 = Math.round(((nativeNorth - overlapNorth) / nativeHeight) * imgHeight);
        let srcY1 = Math.round(((nativeNorth - overlapSouth) / nativeHeight) * imgHeight);

        if (this.reverseY) {
            const temp = srcY0;
            srcY0 = imgHeight - srcY1;
            srcY1 = imgHeight - temp;
        }

        srcX0 = Math.max(0, Math.min(imgWidth, srcX0));
        srcX1 = Math.max(0, Math.min(imgWidth, srcX1));
        srcY0 = Math.max(0, Math.min(imgHeight, srcY0));
        srcY1 = Math.max(0, Math.min(imgHeight, srcY1));

        const srcWidth = srcX1 - srcX0;
        const srcHeight = srcY1 - srcY0;
        if (srcWidth <= 0 || srcHeight <= 0) {
            return null;
        }

        // 6. Calculate destination sub-rectangle on the [tileSize x tileSize] canvas
        let dstX0 = Math.round(((overlapWest - tileW) / tileSpanX) * tileSize);
        let dstX1 = Math.round(((overlapEast - tileW) / tileSpanX) * tileSize);
        let dstY0 = Math.round(((tileN - overlapNorth) / tileSpanY) * tileSize);
        let dstY1 = Math.round(((tileN - overlapSouth) / tileSpanY) * tileSize);

        dstX0 = Math.max(0, Math.min(tileSize, dstX0));
        dstX1 = Math.max(0, Math.min(tileSize, dstX1));
        dstY0 = Math.max(0, Math.min(tileSize, dstY0));
        dstY1 = Math.max(0, Math.min(tileSize, dstY1));

        const dstWidth = Math.max(1, dstX1 - dstX0);
        const dstHeight = Math.max(1, dstY1 - dstY0);

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

        const effectiveFillValue =
            userNoData !== undefined
                ? userNoData !== null && !Number.isNaN(userNoData)
                    ? userNoData
                    : undefined
                : this.metadata?.noData !== null &&
                    this.metadata?.noData !== undefined &&
                    !Number.isNaN(this.metadata.noData)
                  ? this.metadata.noData
                  : undefined;

        // 7. Read raster chunk resampled to [dstWidth x dstHeight]
        const options: any = {
            window: [srcX0, srcY0, srcX1, srcY1],
            width: dstWidth,
            height: dstHeight,
            pool: this.workerPool || undefined,
            fillValue: effectiveFillValue,
            interleave: false
        };

        if (readSamples && readSamples.length > 0) {
            options.samples = readSamples;
        }

        try {
            const rasters = (await image.readRasters(options)) as any;
            return {
                rasters,
                width: dstWidth,
                height: dstHeight,
                dstX: dstX0,
                dstY: dstY0,
                tileSize,
                window: [srcX0, srcY0, srcX1, srcY1],
                isRGB: false
            };
        } catch (err) {
            console.error("[GeoTIFFReader] Error reading rasters:", err);
            return null;
        }
    }

    private _selectOverviewIndex(tileSpan: number, tileSize: number): number {
        if (this.images.length <= 1) return 0;
        const targetRes = tileSpan / tileSize;
        const [nativeWest, , nativeEast] = this.nativeBBox;
        const nativeWidth = nativeEast - nativeWest;

        // Iterate from coarsest overview (highest index) down to full-resolution base image (index 0)
        for (let i = this.images.length - 1; i >= 0; i--) {
            const imgRes = nativeWidth / this.images[i].getWidth();
            if (imgRes <= targetRes * 1.5) {
                return i;
            }
        }
        return 0;
    }

    private _checkIfReversed(image: GeoTIFFImage): boolean {
        const fileDir = (image as any).fileDirectory;
        if (!fileDir) return false;

        const pixelScale = fileDir.getValue?.("ModelPixelScale") || fileDir.ModelPixelScale;
        if (pixelScale && pixelScale[1] < 0) return true;

        const transform = fileDir.getValue?.("ModelTransformation") || fileDir.ModelTransformation;
        if (transform && transform[7] > transform[3]) return true;

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
