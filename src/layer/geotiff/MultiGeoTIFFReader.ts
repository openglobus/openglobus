import { Extent } from "../../Extent";
import { EPSG3857 } from "../../proj/EPSG3857";
import type { Proj } from "../../proj/Proj";
import { Pool } from "geotiff";
import { GeoTIFFReader } from "./GeoTIFFReader";
import { parseNoDataValue } from "./ColorScale";
import type {
    DecodedTileData,
    IGeoTIFFLayerParams,
    IGeoTIFFMetadata,
    IGeoTIFFReader,
    IGeoTIFFSourceItem
} from "./types";

interface IBandMapping {
    globalBand: number; // 1-indexed
    sourceIndex: number;
    sourceBand: number; // 1-indexed
    min: number;
    max: number;
}

/**
 * MultiGeoTIFFReader manages multiple Cloud-Optimized GeoTIFF (COG) sources,
 * enabling multi-band compositing (e.g. RGB or NDVI across separate band files)
 * and spatial mosaics (merging adjacent COG tiles into a unified layer).
 */
export class MultiGeoTIFFReader implements IGeoTIFFReader {
    public options: IGeoTIFFLayerParams;
    public childReaders: GeoTIFFReader[] = [];
    public sources: IGeoTIFFSourceItem[] = [];
    public metadata: IGeoTIFFMetadata | null = null;
    public extentWgs84: Extent = new Extent();
    public isReady: boolean = false;
    public crsCode: number = 4326;
    public workerPool: Pool | null = null;

    private _ownsWorkerPool: boolean = false;
    private _bandMappings: IBandMapping[] = [];

    constructor(options: IGeoTIFFLayerParams = {}) {
        this.options = options;

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
    }

    /**
     * Initializes all GeoTIFF sources and builds unified extent and band mappings.
     */
    public async init(sources?: IGeoTIFFSourceItem[]): Promise<IGeoTIFFMetadata> {
        const srcList = sources || this.options.sources;
        if (!srcList || srcList.length === 0) {
            throw new Error("[MultiGeoTIFFReader] No sources provided.");
        }
        this.sources = srcList;

        // Create child readers sharing the worker pool
        this.childReaders = srcList.map((s) => {
            const nodata =
                s.nodata !== undefined
                    ? parseNoDataValue(s.nodata)
                    : s.noData !== undefined
                      ? parseNoDataValue(s.noData)
                      : this.options.nodata !== undefined
                        ? parseNoDataValue(this.options.nodata)
                        : this.options.noData !== undefined
                          ? parseNoDataValue(this.options.noData)
                          : undefined;

            return new GeoTIFFReader({
                ...this.options,
                crs: s.crs ?? this.options.crs,
                src: s.src || s.url,
                url: s.url,
                nodata,
                requestOptions: {
                    ...this.options.requestOptions,
                    ...s.requestOptions
                },
                geotiffWorkerPool: this.workerPool || undefined,
                workerPoolSize: 0
            });
        });

        // Initialize all child readers in parallel
        const metas = await Promise.all(
            this.childReaders.map((reader, i) => {
                const s = srcList[i];
                const src = s.src || s.url;
                if (!src) {
                    throw new Error(`[MultiGeoTIFFReader] Source at index ${i} has no src or url.`);
                }
                return reader.init(src);
            })
        );

        // Compute unified extentWgs84
        let unionExtent: Extent | null = null;
        for (let i = 0; i < this.childReaders.length; i++) {
            const ext = this.childReaders[i].extentWgs84;
            if (ext) {
                unionExtent = unionExtent ? unionExtent.createUnion(ext) : ext.clone();
            }
        }
        if (!unionExtent) {
            unionExtent = new Extent();
        }
        this.extentWgs84 = unionExtent;
        this.crsCode = this.childReaders[0]?.crsCode ?? 4326;

        const isMosaic = Boolean(this.options.mosaic);
        const bandsMeta: Record<number, { min: number; max: number }> = {};

        if (isMosaic) {
            // Mosaic mode: all sources contribute to the same bands spatially
            const baseSamples = metas[0].samplesPerPixel || 1;
            for (let b = 1; b <= baseSamples; b++) {
                let bMin = Infinity;
                let bMax = -Infinity;
                for (let i = 0; i < metas.length; i++) {
                    const s = srcList[i];
                    const meta = metas[i];
                    const min = s.min !== undefined ? s.min : meta.bands[b]?.min ?? 0;
                    const max = s.max !== undefined ? s.max : meta.bands[b]?.max ?? 255;
                    if (min < bMin) bMin = min;
                    if (max > bMax) bMax = max;
                }
                bandsMeta[b] = {
                    min: Number.isFinite(bMin) ? bMin : 0,
                    max: Number.isFinite(bMax) ? bMax : 255
                };
            }

            this.metadata = {
                bbox: [
                    unionExtent.southWest.lon,
                    unionExtent.southWest.lat,
                    unionExtent.northEast.lon,
                    unionExtent.northEast.lat
                ],
                crsCode: this.crsCode,
                width: Math.max(...metas.map((m) => m.width)),
                height: Math.max(...metas.map((m) => m.height)),
                samplesPerPixel: baseSamples,
                noData: metas[0].noData,
                isTiled: metas.every((m) => m.isTiled),
                overviewCount: Math.max(...metas.map((m) => m.overviewCount)),
                bands: bandsMeta
            };
        } else {
            // Multi-band mode (default): stack selected bands sequentially across sources
            this._bandMappings = [];
            let globalBand = 1;

            for (let i = 0; i < srcList.length; i++) {
                const s = srcList[i];
                const meta = metas[i];
                const childSamples = meta.samplesPerPixel || 1;
                const requestedBands =
                    s.bands && s.bands.length > 0
                        ? s.bands
                        : Array.from({ length: childSamples }, (_, idx) => idx + 1);

                for (const b of requestedBands) {
                    const min = s.min !== undefined ? s.min : meta.bands[b]?.min ?? 0;
                    const max = s.max !== undefined ? s.max : meta.bands[b]?.max ?? 255;

                    this._bandMappings.push({
                        globalBand,
                        sourceIndex: i,
                        sourceBand: b,
                        min,
                        max
                    });

                    bandsMeta[globalBand] = { min, max };
                    globalBand++;
                }
            }

            this.metadata = {
                bbox: [
                    unionExtent.southWest.lon,
                    unionExtent.southWest.lat,
                    unionExtent.northEast.lon,
                    unionExtent.northEast.lat
                ],
                crsCode: this.crsCode,
                width: Math.max(...metas.map((m) => m.width)),
                height: Math.max(...metas.map((m) => m.height)),
                samplesPerPixel: this._bandMappings.length,
                noData: metas[0].noData,
                isTiled: metas.every((m) => m.isTiled),
                overviewCount: Math.max(...metas.map((m) => m.overviewCount)),
                bands: bandsMeta
            };
        }

        this.isReady = true;
        return this.metadata;
    }

    /**
     * Reads rasters for a tile from the underlying GeoTIFF sources.
     */
    public async readTileRasters(
        tileExtentLonLat: Extent,
        zoomLevel: number,
        tileSize: number = 256,
        readSamples?: number[],
        segmentProj: Proj = EPSG3857
    ): Promise<DecodedTileData | null> {
        if (!this.isReady || this.childReaders.length === 0) {
            return null;
        }

        if (!this.extentWgs84.overlaps(tileExtentLonLat)) {
            return null;
        }

        const isMosaic = Boolean(this.options.mosaic);

        if (isMosaic) {
            return this._readMosaicTileRasters(tileExtentLonLat, zoomLevel, tileSize, readSamples, segmentProj);
        } else {
            return this._readMultiBandTileRasters(tileExtentLonLat, zoomLevel, tileSize, readSamples, segmentProj);
        }
    }

    private async _readMultiBandTileRasters(
        tileExtentLonLat: Extent,
        zoomLevel: number,
        tileSize: number,
        readSamples?: number[],
        segmentProj: Proj = EPSG3857
    ): Promise<DecodedTileData | null> {
        const samplesToRead =
            readSamples && readSamples.length > 0
                ? readSamples
                : this._bandMappings.map((_, idx) => idx);

        // Group requested global bands by child reader
        const sourceSamplesMap = new Map<number, number[]>();
        for (const sampleIdx of samplesToRead) {
            const mapping = this._bandMappings[sampleIdx];
            if (mapping) {
                const localSample = mapping.sourceBand - 1;
                let list = sourceSamplesMap.get(mapping.sourceIndex);
                if (!list) {
                    list = [];
                    sourceSamplesMap.set(mapping.sourceIndex, list);
                }
                if (!list.includes(localSample)) {
                    list.push(localSample);
                }
            }
        }

        // Query only sources that overlap the requested tile extent
        const sourceResults = new Map<number, { localSamples: number[]; tileData: DecodedTileData | null }>();

        const readPromises: Promise<void>[] = [];
        for (const [sourceIndex, localSamples] of sourceSamplesMap.entries()) {
            const reader = this.childReaders[sourceIndex];
            if (!reader.extentWgs84.overlaps(tileExtentLonLat)) {
                sourceResults.set(sourceIndex, { localSamples, tileData: null });
                continue;
            }

            readPromises.push(
                reader
                    .readTileRasters(tileExtentLonLat, zoomLevel, tileSize, localSamples, segmentProj)
                    .then((tileData) => {
                        sourceResults.set(sourceIndex, { localSamples, tileData });
                    })
                    .catch((err) => {
                        console.error(`[MultiGeoTIFFReader] Error reading source ${sourceIndex}:`, err);
                        sourceResults.set(sourceIndex, { localSamples, tileData: null });
                    })
            );
        }

        await Promise.all(readPromises);

        // Check if at least one source produced valid raster data
        let anyValid = false;
        for (const res of sourceResults.values()) {
            if (res.tileData && res.tileData.rasters && res.tileData.rasters.length > 0) {
                anyValid = true;
                break;
            }
        }

        if (!anyValid) {
            return null;
        }

        // Stack output rasters in the exact requested order
        const pixelCount = tileSize * tileSize;
        const outRasters: Float32Array[] = [];

        for (const sampleIdx of samplesToRead) {
            const mapping = this._bandMappings[sampleIdx];
            if (!mapping) {
                outRasters.push(new Float32Array(pixelCount).fill(NaN));
                continue;
            }

            const res = sourceResults.get(mapping.sourceIndex);
            if (res && res.tileData && res.tileData.rasters) {
                const localSample = mapping.sourceBand - 1;
                const localOrderIdx = res.localSamples.indexOf(localSample);
                const r = localOrderIdx !== -1 ? res.tileData.rasters[localOrderIdx] : null;
                if (r) {
                    outRasters.push(r as Float32Array);
                } else {
                    outRasters.push(new Float32Array(pixelCount).fill(NaN));
                }
            } else {
                outRasters.push(new Float32Array(pixelCount).fill(NaN));
            }
        }

        return {
            rasters: outRasters,
            width: tileSize,
            height: tileSize,
            dstX: 0,
            dstY: 0,
            tileSize,
            window: [0, 0, tileSize, tileSize],
            isRGB: false
        };
    }

    private async _readMosaicTileRasters(
        tileExtentLonLat: Extent,
        zoomLevel: number,
        tileSize: number,
        readSamples?: number[],
        segmentProj: Proj = EPSG3857
    ): Promise<DecodedTileData | null> {
        const overlappingIndices: number[] = [];
        for (let i = 0; i < this.childReaders.length; i++) {
            if (this.childReaders[i].extentWgs84.overlaps(tileExtentLonLat)) {
                overlappingIndices.push(i);
            }
        }

        if (overlappingIndices.length === 0) {
            return null;
        }

        const results = await Promise.all(
            overlappingIndices.map((idx) =>
                this.childReaders[idx]
                    .readTileRasters(tileExtentLonLat, zoomLevel, tileSize, readSamples, segmentProj)
                    .catch(() => null)
            )
        );

        const validResults: DecodedTileData[] = results.filter(
            (r): r is DecodedTileData => r !== null && Boolean(r.rasters && r.rasters.length > 0)
        );

        if (validResults.length === 0) {
            return null;
        }

        const numBands = validResults[0].rasters.length;
        const pixelCount = tileSize * tileSize;
        const outRasters: Float32Array[] = [];

        for (let b = 0; b < numBands; b++) {
            const merged = new Float32Array(pixelCount).fill(NaN);
            for (const res of validResults) {
                const r = res.rasters[b];
                if (!r) continue;
                for (let p = 0; p < pixelCount; p++) {
                    const val = r[p];
                    if (!Number.isNaN(val) && Number.isNaN(merged[p])) {
                        merged[p] = val;
                    }
                }
            }
            outRasters.push(merged);
        }

        return {
            rasters: outRasters,
            width: tileSize,
            height: tileSize,
            dstX: 0,
            dstY: 0,
            tileSize,
            window: [0, 0, tileSize, tileSize],
            isRGB: false
        };
    }

    /**
     * Cleans up child readers and shared worker pool.
     */
    public destroy(): void {
        for (const reader of this.childReaders) {
            reader.destroy();
        }
        this.childReaders = [];
        if (this._ownsWorkerPool && this.workerPool) {
            this.workerPool.destroy();
            this.workerPool = null;
        }
        this.isReady = false;
        this.metadata = null;
    }
}
