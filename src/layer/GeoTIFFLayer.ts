import type { EventsHandler } from "../Events";
import { Material } from "./Material";
import { BaseTileMaterialLayer } from "./BaseTileMaterialLayer";
import type { LayerEventsList } from "./Layer";
import type { Segment } from "../segment/Segment";
import type { TypedArray } from "geotiff";
import { RENDERING } from "../quadTree/quadTree";
import {
    createImageData,
    getFastNoDataChecker,
    GeoTIFFReader,
    parseNoDataValue,
    renderMultiBandToImageData,
    renderRgbRastersToImageData,
    renderSingleBandToImageData,
    type IGeoTIFFLayerParams,
    type IGeoTIFFMetadata,
    type IGeoTIFFRenderOptions,
    type DecodedTileData
} from "./geotiff";

interface ICachedTile {
    image: ImageData;
    renderOptionsVersion: number;
}

interface IPendingTile {
    material: Material;
    forceLoading: boolean;
}

type GeoTIFFEventsList = ["load", "loadend", "ready", "error"];
type GeoTIFFEventsType = EventsHandler<GeoTIFFEventsList> & EventsHandler<LayerEventsList>;

const GEOTIFF_EVENTS: GeoTIFFEventsList = [
    /** Triggered when a tile image is loaded and applied */
    "load",
    /** Triggered when pending tile requests finish */
    "loadend",
    /** Triggered when GeoTIFF metadata and overviews are ready */
    "ready",
    /** Triggered on any load error */
    "error"
];

/**
 * GeoTIFFLayer renders Cloud Optimized GeoTIFF (COG) and standard GeoTIFF rasters
 * onto the OpenGlobus 3D globe using progressive overview pyramid tiles.
 */
export class GeoTIFFLayer extends BaseTileMaterialLayer {
    public override events: GeoTIFFEventsType;

    protected _reader: GeoTIFFReader;
    protected _renderOptions: IGeoTIFFRenderOptions;
    protected _tileSize: number;
    protected _tileCache: Map<string, ICachedTile>;
    protected _rasterCache: Map<string, DecodedTileData>;
    protected _maxCacheSize: number;
    protected _activeRequestsCount: number;
    protected _readSamples: number[];
    protected _readyPromise: Promise<IGeoTIFFMetadata>;
    protected _activeMaterials: Set<Material>;
    protected _renderOptionsVersion: number;
    protected _debounceUpdateTimer: any;
    protected _pendingsQueue: IPendingTile[];

    static MAX_REQUESTS: number = 8;

    constructor(name: string | null, options: IGeoTIFFLayerParams = {}) {
        super(name, { waitForParentMaterial: false, ...options });

        // @ts-ignore
        this.events = this.events.registerNames(GEOTIFF_EVENTS);

        this._reader = new GeoTIFFReader(options);
        const initialNodata =
            options.renderOptions?.nodata !== undefined
                ? parseNoDataValue(options.renderOptions.nodata)
                : options.renderOptions?.noData !== undefined
                  ? parseNoDataValue(options.renderOptions.noData)
                  : options.nodata !== undefined
                    ? parseNoDataValue(options.nodata)
                    : options.noData !== undefined
                      ? parseNoDataValue(options.noData)
                      : undefined;

        this._renderOptions = options.renderOptions ? { ...options.renderOptions } : {};

        if (initialNodata !== undefined) {
            this._renderOptions.nodata = initialNodata;
        }

        this._tileSize = options.tileSize || 256;
        this._tileCache = new Map();
        this._rasterCache = new Map();
        this._maxCacheSize = options.cacheSize || 500;
        this._activeRequestsCount = 0;
        this._readSamples = [];
        this._activeMaterials = new Set();
        this._renderOptionsVersion = 0;
        this._debounceUpdateTimer = null;
        this._pendingsQueue = [];
        this._updateReadSamples();

        const src = options.src || options.url;
        if (src) {
            this._readyPromise = this._initSource(src, options);
            this._readyPromise.catch(() => {
                //empty
            });
        } else {
            this._readyPromise = Promise.reject(new Error("No GeoTIFF source provided."));
            this._readyPromise.catch(() => {
                //empty
            });
        }
    }

    public static async fromUrl(name: string, url: string, options: IGeoTIFFLayerParams = {}): Promise<GeoTIFFLayer> {
        const layer = new GeoTIFFLayer(name, { ...options, url });
        await layer.whenReady();
        return layer;
    }

    public static async fromBlob(
        name: string,
        blob: Blob | File,
        options: IGeoTIFFLayerParams = {}
    ): Promise<GeoTIFFLayer> {
        const layer = new GeoTIFFLayer(name, { ...options, src: blob });
        await layer.whenReady();
        return layer;
    }

    public override get instanceName(): string {
        return "GeoTIFFLayer";
    }

    public override get isIdle(): boolean {
        return super.isIdle && this._activeRequestsCount === 0 && this._pendingsQueue.length === 0;
    }

    public get reader(): GeoTIFFReader {
        return this._reader;
    }

    public get metadata(): IGeoTIFFMetadata | null {
        return this._reader.metadata;
    }

    public get nodata(): number | null | undefined {
        if (this._renderOptions.nodata !== undefined) {
            return parseNoDataValue(this._renderOptions.nodata);
        }
        return this._reader.metadata?.noData ?? null;
    }

    public set nodata(val: number | null | "nan" | "NaN" | undefined) {
        const parsed = parseNoDataValue(val);
        if (parsed !== undefined) {
            this._renderOptions.nodata = parsed;
        } else {
            delete this._renderOptions.nodata;
        }
        this._reapplyRenderOptions();
    }

    public async whenReady(): Promise<IGeoTIFFMetadata> {
        return this._readyPromise;
    }

    /**
     * Updates rendering options and re-renders active textures in place.
     */
    public setRenderOptions(renderOptions: IGeoTIFFRenderOptions, fullUpdate: boolean = false): void {
        const prevSamples = this._readSamples.slice();

        // Preserve nodata and any existing top-level options unless explicitly provided
        const currentNodata = this._renderOptions.nodata;
        const nextNodata =
            renderOptions.nodata !== undefined
                ? parseNoDataValue(renderOptions.nodata)
                : renderOptions.noData !== undefined
                  ? parseNoDataValue(renderOptions.noData)
                  : undefined;

        this._renderOptions = { ...this._renderOptions, ...renderOptions };

        if (nextNodata !== undefined) {
            this._renderOptions.nodata = nextNodata;
        } else if (currentNodata !== undefined) {
            this._renderOptions.nodata = currentNodata;
        }

        if (renderOptions.single) {
            delete this._renderOptions.multi;
            delete this._renderOptions.convertToRGB;
        } else if (renderOptions.multi) {
            delete this._renderOptions.single;
            delete this._renderOptions.convertToRGB;
        } else if (renderOptions.convertToRGB) {
            delete this._renderOptions.single;
            delete this._renderOptions.multi;
        }

        if (this._reader.metadata) {
            this._normalizeRenderOptions(this._reader.metadata);
        }
        if (this._reader.options) {
            this._reader.options.renderOptions = this._renderOptions;
        }
        this._updateReadSamples();

        this._renderOptionsVersion++;

        const samplesChanged =
            prevSamples.length !== this._readSamples.length ||
            prevSamples.some((s, idx) => s !== this._readSamples[idx]);

        if (!samplesChanged) {
            // Real-time styling update (stretch min/max, colormap, RGB contrast):
            // Re-render in-memory rasters instantly without reloading tiles or destroying textures.
            this._reapplyRenderOptions(fullUpdate);
        } else {
            // Sample/band selection changed: cancel pending requests, clear caches, and clear quadtree materials
            this.abortLoading();
            this.clearCache();
            if (this._planet) {
                this._planet.quadTreeStrategy.clearLayerMaterial(this, false);
                this._planet.renderer?.requestRedraw();
            }
        }
    }

    public override createMaterial(segment: Segment): Material {
        const mat = super.createMaterial(segment);
        this._activeMaterials.add(mat);
        return mat;
    }

    public override clearMaterial(material: Material): void {
        this._activeMaterials.delete(material);
        super.clearMaterial(material);
    }

    /**
     * Clears decoded in-memory tile and raster caches.
     */
    public clearCache(): void {
        if (this._debounceUpdateTimer !== null) {
            clearTimeout(this._debounceUpdateTimer);
            this._debounceUpdateTimer = null;
        }
        this._tileCache.clear();
        this._rasterCache.clear();
        this._activeMaterials.clear();
    }

    public override clear(): void {
        this.clearCache();
        super.clear();
    }

    public override redraw(): void {
        this.clearCache();
        super.redraw();
    }

    private _reapplyRenderOptions(fullUpdate: boolean = false): void {
        if (this._debounceUpdateTimer !== null) {
            clearTimeout(this._debounceUpdateTimer);
            this._debounceUpdateTimer = null;
        }

        if (!this._planet) {
            // Update cached images for in-memory rasters
            for (const [cacheKey, tileData] of this._rasterCache.entries()) {
                this._refreshCachedTile(cacheKey, tileData);
            }
            return;
        }

        const lid = this.__id;
        const qts = this._planet.quadTreeStrategy;
        const renderedNodes = qts._renderedNodes;

        if (!renderedNodes || renderedNodes.length === 0) {
            for (const [cacheKey, tileData] of this._rasterCache.entries()) {
                this._refreshCachedTile(cacheKey, tileData);
            }
            this._planet.renderer?.requestRedraw();
            return;
        }

        const renderedKeys = new Set<string>();

        // 1. Instantly re-render currently visible/rendered tiles using in-memory rasters without flicker
        for (let i = 0, len = renderedNodes.length; i < len; i++) {
            const node = renderedNodes[i];
            const seg = node.segment;
            if (!seg) continue;

            const mat = seg.materials[lid];
            const cacheKey = `${seg.tileZoom}_${seg.tileX}_${seg.tileY}`;
            renderedKeys.add(cacheKey);

            const tileData = this._rasterCache.get(cacheKey);
            if (tileData) {
                const image = this._refreshCachedTile(cacheKey, tileData);
                if (image && mat && mat.isReady && mat.texture) {
                    mat.applyImage(image);
                }
            }
        }

        // 2. Re-render all other in-memory rasters (ancestors, previously visited tiles) into _tileCache
        for (const [cacheKey, tileData] of this._rasterCache.entries()) {
            if (!renderedKeys.has(cacheKey)) {
                this._refreshCachedTile(cacheKey, tileData);
            }
        }

        // 3. Prune any image in _tileCache that no longer has corresponding raw raster data
        for (const key of this._tileCache.keys()) {
            if (!this._rasterCache.has(key)) {
                this._tileCache.delete(key);
            }
        }

        // 4. Update WebGL textures for offscreen materials:
        // Instead of traversing thousands of nodes across the entire Earth on every frame,
        // we directly iterate the materials created for this layer (_activeMaterials).
        const updateOffscreenMaterials = () => {
            if (this._activeMaterials.size > 0) {
                for (const mat of this._activeMaterials) {
                    if (!mat.segment || !mat.layer) {
                        this._activeMaterials.delete(mat);
                        continue;
                    }
                    if (mat.isReady && mat.texture) {
                        const seg = mat.segment;
                        const cacheKey = `${seg.tileZoom}_${seg.tileX}_${seg.tileY}`;
                        if (!renderedKeys.has(cacheKey)) {
                            const cached = this._tileCache.get(cacheKey);
                            if (cached) {
                                mat.applyImage(cached.image);
                            }
                        }
                    }
                }
            }
        };

        if (fullUpdate) {
            updateOffscreenMaterials();
        } else {
            // Debounce offscreen WebGL texture uploads by 100ms so continuous mouse dragging stays at 60 fps
            this._debounceUpdateTimer = setTimeout(() => {
                this._debounceUpdateTimer = null;
                updateOffscreenMaterials();
            }, 100);
        }

        this._planet.renderer?.requestRedraw();
    }

    private async _initSource(
        src: string | Blob | File | ArrayBuffer,
        options: IGeoTIFFLayerParams
    ): Promise<IGeoTIFFMetadata> {
        try {
            const meta = await this._reader.init(src);

            // Configure layer bounds
            if (this._reader.extentWgs84) {
                this.setExtent(this._reader.extentWgs84);
            }

            if (options.useImageCountAsMaximumLevel) {
                this.maxNativeZoom = Math.min(this.maxNativeZoom, meta.overviewCount - 1);
            }

            // Set up default rendering mode if not configured
            this._normalizeRenderOptions(meta);
            this._updateReadSamples();

            this.events.dispatch(this.events.ready, meta);
            this.redraw();
            return meta;
        } catch (err: any) {
            this.events.dispatch(this.events.error, err);
            throw err;
        }
    }

    private _normalizeRenderOptions(meta: IGeoTIFFMetadata): void {
        const samples = meta.samplesPerPixel;

        if (this._renderOptions.single) {
            const band = this._renderOptions.single.band ?? 1;
            const bandMeta = meta.bands[band] || meta.bands[1];
            if (!this._renderOptions.single.domain && bandMeta) {
                this._renderOptions.single.domain = [bandMeta.min, bandMeta.max];
            }
            if (!this._renderOptions.single.colorScale) {
                this._renderOptions.single.colorScale = "viridis";
            }
        } else if (this._renderOptions.multi) {
            const { r, g, b } = this._renderOptions.multi;
            if (r && r.min === undefined && meta.bands[r.band ?? 1]) {
                r.min = meta.bands[r.band ?? 1].min;
                r.max = meta.bands[r.band ?? 1].max;
            }
            if (g && g.min === undefined && meta.bands[g.band ?? 2]) {
                g.min = meta.bands[g.band ?? 2].min;
                g.max = meta.bands[g.band ?? 2].max;
            }
            if (b && b.min === undefined && meta.bands[b.band ?? 3]) {
                b.min = meta.bands[b.band ?? 3].min;
                b.max = meta.bands[b.band ?? 3].max;
            }
        } else if (samples >= 3) {
            this._renderOptions.convertToRGB = this._renderOptions.convertToRGB ?? true;
        } else {
            const bandMeta = meta.bands[1];
            this._renderOptions.single = {
                band: 1,
                colorScale: "viridis",
                domain: bandMeta ? [bandMeta.min, bandMeta.max] : [0, 255]
            };
        }

        if (this._renderOptions.nodata === undefined && meta.noData !== null) {
            this._renderOptions.nodata = meta.noData;
        }
    }

    private _updateReadSamples(): void {
        if (this._renderOptions.multi) {
            const { r, g, b } = this._renderOptions.multi;
            this._readSamples = [(r?.band ?? 1) - 1, (g?.band ?? 2) - 1, (b?.band ?? 3) - 1];
        } else if (this._renderOptions.convertToRGB) {
            this._readSamples = [0, 1, 2];
        } else if (this._renderOptions.single) {
            const expr = this._renderOptions.single.expression;
            if (expr) {
                const matches = expr.matchAll(/b(\d+)/g);
                const sampleSet = new Set<number>();
                for (const m of matches) {
                    const bandNum = parseInt(m[1], 10);
                    if (bandNum > 0) sampleSet.add(bandNum - 1);
                }
                this._readSamples =
                    sampleSet.size > 0
                        ? Array.from(sampleSet).sort((a, b) => a - b)
                        : [(this._renderOptions.single.band ?? 1) - 1];
            } else {
                this._readSamples = [(this._renderOptions.single.band ?? 1) - 1];
            }
        } else {
            this._readSamples = [0];
        }
    }

    public override loadMaterial(material: Material, forceLoading: boolean = false): void {
        this._activeMaterials.add(material);
        const seg = material.segment;

        if (!material.texture) {
            if (this._isBaseLayer) {
                material.texture = seg.getDefaultTexture();
            } else {
                material.texture = seg.planet.transparentTexture;
            }
        }

        if (!this._reader.isReady) {
            material.isLoading = false;
            material.isReady = false;
            return;
        }

        const tileExtent = seg.getExtentLonLat();
        if (!this._extent.overlaps(tileExtent)) {
            material.texture = this._isBaseLayer ? seg.getDefaultTexture() : seg.planet.transparentTexture;
            material.textureNotExists();
            return;
        }

        const cacheKey = `${seg.tileZoom}_${seg.tileX}_${seg.tileY}`;

        material.isReady = false;
        material.isLoading = true;

        if (this._tileCache.has(cacheKey) || this._rasterCache.has(cacheKey)) {
            requestAnimationFrame(() => {
                if (material.isLoading) {
                    const image = this._getCachedTileImage(cacheKey);
                    if (image) {
                        material.applyImage(image);
                    } else {
                        this._enqueueTile(material, cacheKey, forceLoading);
                    }
                }
            });
            return;
        }

        this._enqueueTile(material, cacheKey, forceLoading);
    }

    protected _enqueueTile(material: Material, cacheKey: string, forceLoading: boolean): void {
        if (this._activeRequestsCount >= GeoTIFFLayer.MAX_REQUESTS) {
            this._pendingsQueue.push({ material, forceLoading });
            return;
        }

        this._requestTile(material, cacheKey);
    }

    protected _whilePendings(): IPendingTile | null {
        while (this._pendingsQueue.length) {
            const pending = this._pendingsQueue.pop()!;
            const material = pending.material;
            const seg = material.segment;

            if (!material.isLoading || !seg || !seg.node) {
                continue;
            }

            if (pending.forceLoading || (seg.initialized && seg.node.getState() === RENDERING)) {
                return pending;
            }

            material.isLoading = false;
        }

        return null;
    }

    protected _dequeueRequest(): void {
        while (this._activeRequestsCount < GeoTIFFLayer.MAX_REQUESTS) {
            const pending = this._whilePendings();
            if (!pending) return;

            const seg = pending.material.segment;
            const cacheKey = `${seg.tileZoom}_${seg.tileX}_${seg.tileY}`;

            const image = this._getCachedTileImage(cacheKey);

            if (image) {
                pending.material.applyImage(image);
                continue;
            }

            this._requestTile(pending.material, cacheKey);
        }
    }

    private _removeFromQueue(material: Material): void {
        for (let i = 0, len = this._pendingsQueue.length; i < len; i++) {
            if (this._pendingsQueue[i].material === material) {
                this._pendingsQueue.splice(i, 1);
                return;
            }
        }
    }

    private _getCachedTileImage(cacheKey: string): ImageData | null {
        const cached = this._tileCache.get(cacheKey);
        const tileData = this._rasterCache.get(cacheKey);

        if (cached) {
            if (tileData && cached.renderOptionsVersion !== this._renderOptionsVersion) {
                const refreshed = this._refreshCachedTile(cacheKey, tileData);
                if (refreshed) {
                    return refreshed;
                }
            }
            return cached.image;
        }

        if (tileData) {
            return this._refreshCachedTile(cacheKey, tileData);
        }

        return null;
    }

    private _requestTile(material: Material, cacheKey: string): void {
        const seg = material.segment;

        this._activeRequestsCount++;

        this._reader
            .readTileRasters(
                seg.getExtentLonLat(),
                seg.tileZoom,
                this._tileSize,
                this._readSamples.slice(),
                seg._projection
            )
            .then((tileData) => {
                this._activeRequestsCount--;

                if (this._activeRequestsCount < 0) {
                    this._activeRequestsCount = 0;
                }

                this._dequeueRequest();

                if (!material.isLoading) return;

                if (!tileData || !tileData.rasters || tileData.rasters.length === 0) {
                    material.texture = this._isBaseLayer ? seg.getDefaultTexture() : seg.planet.transparentTexture;
                    material.textureNotExists();
                    return;
                }

                this._addRasterToCache(cacheKey, tileData);

                const image = this._refreshCachedTile(cacheKey, tileData);
                if (!image) {
                    material.texture = this._isBaseLayer ? seg.getDefaultTexture() : seg.planet.transparentTexture;
                    material.textureNotExists();
                    return;
                }

                material.applyImage(image);

                const e = this.events.load;
                if (e && e.handlers.length) {
                    this.events.dispatch(e, material);
                }
            })
            .catch((err) => {
                this._activeRequestsCount--;

                if (this._activeRequestsCount < 0) {
                    this._activeRequestsCount = 0;
                }

                this._dequeueRequest();

                if (material.isLoading) {
                    material.texture = this._isBaseLayer ? seg.getDefaultTexture() : seg.planet.transparentTexture;
                    material.textureNotExists();
                    console.error("[GeoTIFFLayer] Error loading tile:", err);
                }
            });
    }

    /**
     * Renders the tile rasters into an image that goes straight into the tile texture.
     * The previous image of the tile is reused, so restyling does not allocate.
     */
    private _renderTileImage(tileData: DecodedTileData, existingImage?: ImageData): ImageData | null {
        let image = existingImage;
        if (!image || image.width !== tileData.width || image.height !== tileData.height) {
            image = createImageData(tileData.width, tileData.height);
        }

        return this._renderToImageData(tileData, image);
    }

    /**
     * Renders the tile and puts it into the cache, reusing the image that is already there.
     */
    private _refreshCachedTile(cacheKey: string, tileData: DecodedTileData): ImageData | null {
        const image = this._renderTileImage(tileData, this._tileCache.get(cacheKey)?.image);
        if (!image) return null;

        this._addToCache(cacheKey, image);

        return image;
    }

    private _renderToImageData(tileData: DecodedTileData, outImageData?: ImageData): ImageData | null {
        const { rasters, width, height } = tileData;
        const rawNodata =
            this._renderOptions.nodata !== undefined
                ? this._renderOptions.nodata
                : (this._reader.metadata?.noData ?? null);
        const nodata = parseNoDataValue(rawNodata) ?? null;

        if (this._renderOptions.convertToRGB && rasters.length >= 3) {
            return renderRgbRastersToImageData(rasters, width, height, nodata, outImageData);
        }

        if (this._renderOptions.multi && rasters.length >= 3) {
            return renderMultiBandToImageData(
                rasters[0],
                rasters[1],
                rasters[2],
                width,
                height,
                this._renderOptions.multi,
                nodata,
                outImageData
            );
        }

        if (this._renderOptions.single && rasters.length > 0) {
            const expr = this._renderOptions.single.expression;
            let targetRaster = rasters[0];
            if (expr && rasters.length > 0) {
                const evaluated = this._evaluateBandExpression(rasters, width, height, expr, nodata);
                if (evaluated) {
                    targetRaster = evaluated;
                }
            }
            return renderSingleBandToImageData(
                targetRaster,
                width,
                height,
                this._renderOptions.single,
                nodata,
                outImageData
            );
        }

        if (rasters.length >= 3) {
            return renderRgbRastersToImageData(rasters, width, height, nodata, outImageData);
        } else if (rasters.length > 0) {
            return renderSingleBandToImageData(rasters[0], width, height, undefined, nodata, outImageData);
        }

        return null;
    }

    private _evaluateBandExpression(
        rasters: TypedArray[],
        width: number,
        height: number,
        expression: string,
        nodata: number | null
    ): Float32Array | null {
        try {
            const cleanExpr = expression.trim();
            const pixelCount = width * height;
            const result = new Float32Array(pixelCount);
            const hasNoData = nodata !== null && nodata !== undefined && !Number.isNaN(nodata);
            const checkNoData = hasNoData ? getFastNoDataChecker(nodata) : null;

            // Fast path for NDVI: (bX - bY) / (bX + bY)
            const ndviMatch = cleanExpr.replace(/\s+/g, "").match(/^\(b(\d+)-b(\d+)\)\/\(b\1\+b\2\)$/);
            if (ndviMatch) {
                const nirBand = parseInt(ndviMatch[1], 10);
                const redBand = parseInt(ndviMatch[2], 10);
                const nirSampleIdx = this._readSamples.indexOf(nirBand - 1);
                const redSampleIdx = this._readSamples.indexOf(redBand - 1);

                if (nirSampleIdx !== -1 && redSampleIdx !== -1 && rasters[nirSampleIdx] && rasters[redSampleIdx]) {
                    const nir = rasters[nirSampleIdx];
                    const red = rasters[redSampleIdx];

                    for (let i = 0; i < pixelCount; i++) {
                        const n = nir[i];
                        const r = red[i];
                        if (checkNoData ? checkNoData(n) || checkNoData(r) : Number.isNaN(n) || Number.isNaN(r)) {
                            result[i] = NaN;
                            continue;
                        }
                        const sum = n + r;
                        result[i] = sum !== 0 ? (n - r) / sum : 0;
                    }
                    return result;
                }
            }

            // General expression evaluation across bands
            const bandNumbers = Array.from(
                new Set(Array.from(cleanExpr.matchAll(/b(\d+)/g), (m) => parseInt(m[1], 10)))
            );
            const argNames = bandNumbers.map((b) => `b${b}`);
            const bandRasters: TypedArray[] = [];

            for (let i = 0; i < bandNumbers.length; i++) {
                const idx = this._readSamples.indexOf(bandNumbers[i] - 1);
                const raster = idx !== -1 ? rasters[idx] : undefined;
                if (!raster) return null;
                bandRasters.push(raster);
            }

            const fn = new Function(...argNames, `"use strict"; return (${cleanExpr});`);
            const args = new Array(bandNumbers.length);

            for (let i = 0; i < pixelCount; i++) {
                let isNoData = false;
                for (let k = 0; k < bandNumbers.length; k++) {
                    const val = bandRasters[k][i];
                    if (checkNoData ? checkNoData(val) : Number.isNaN(val)) {
                        isNoData = true;
                        break;
                    }
                    args[k] = val;
                }
                if (isNoData) {
                    result[i] = NaN;
                    continue;
                }
                const v = fn(...args);
                result[i] = Number.isFinite(v) ? v : 0;
            }
            return result;
        } catch (err) {
            console.error("[GeoTIFFLayer] Error evaluating expression:", expression, err);
            return null;
        }
    }

    private _addToCache(key: string, image: ImageData): void {
        if (!this._tileCache.has(key) && this._tileCache.size >= this._maxCacheSize) {
            const firstKey = this._tileCache.keys().next().value;
            if (firstKey !== undefined) {
                this._tileCache.delete(firstKey);
            }
        }
        this._tileCache.set(key, { image, renderOptionsVersion: this._renderOptionsVersion });
    }

    private _addRasterToCache(key: string, data: DecodedTileData): void {
        if (this._rasterCache.size >= this._maxCacheSize) {
            const firstKey = this._rasterCache.keys().next().value;
            if (firstKey !== undefined) {
                this._rasterCache.delete(firstKey);
            }
        }
        this._rasterCache.set(key, data);
    }

    public override abortMaterialLoading(material: Material): void {
        this._activeMaterials.delete(material);
        this._removeFromQueue(material);
        material.isLoading = false;
        material.isReady = false;
    }

    public override abortLoading(): void {
        for (let i = 0, len = this._pendingsQueue.length; i < len; i++) {
            this._pendingsQueue[i].material.isLoading = false;
        }
        this._pendingsQueue = [];
    }

    public override remove(): this {
        this.abortLoading();
        this.clearCache();
        this._reader.destroy();
        super.remove();
        return this;
    }
}
