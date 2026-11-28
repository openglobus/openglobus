import * as mercator from "../mercator";
import { createExtent, stringTemplate } from "../utils/shared";
import type { TypedArray } from "../utils/shared";
import { EmptyTerrain } from "./EmptyTerrain";
import type { IEmptyTerrainParams, ITerrainCacheInfo, UrlRewriteFunc } from "./EmptyTerrain";
import { Extent } from "../Extent";
import { Layer } from "../layer/Layer";
import { Loader } from "../utils/Loader";
import type { FetchCache, IResponse } from "../utils/Loader";
import { LonLat } from "../LonLat";
import { NOTRENDERING } from "../quadTree/quadTree";
import { Segment, TILEGROUP_COMMON } from "../segment/Segment";
import { getGroundHeight } from "./terrainUtils";
import { LRUCache } from "../utils/LRUCache";
// import { QueueArray } from '../QueueArray';

export interface IGlobusTerrainParams extends IEmptyTerrainParams {
    subdomains?: string[];
    url?: string;
    extent?: Extent | [[number, number], [number, number]];
    urlRewrite?: UrlRewriteFunc;
    noDataValues?: number[];
    plainGridSize?: number;
    heightFactor?: number;
    elevationCacheSize?: number;
    loadEveryZoom?: boolean;
    /**
     * Fetch RequestCache value
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/cache
     * @default "default"
     */
    cache?: FetchCache;
}

type TileData = {
    heights: number[] | TypedArray | null;
    extent: Extent | null;
};

/** Tiles known to be on the server or not. */
const TILE_STATUS_CACHE_SIZE = 10000;

/**
 * Class that loads segment elevation data, converts it to the array and passes it to the planet segment.
 * @class
 * @extends {EmptyTerrain}
 * @param {string} [name=""] - Terrain provider name.
 * @param {IGlobusTerrainParams} [options] - Provider options:
 * @param {number} [options.minZoom=3] - Minimal visible zoom index when terrain handler works.
 * @param {number} [options.maxZoom=14] - Maximal visible zoom index when terrain handler works.
 * @param {number} [options.maxNativeZoom=14] - Last zoom with tiles everywhere, getHeightAsync reads heights there.
 * @param {string} [options.url="https://{s}.srtm3.openglobus.org/{z}/{y}/{x}.ddm"] - Terrain source URL template.
 * @param {Array.<number>} [options.gridSizeByZoom] - Segment triangulation grid sizes where array index matches segment zoom index.
 * @param {number} [options.plainGridSize=32] - Elevation grid size. Default is 32x32. Must be power of two.
 * @param {number} [options.heightFactor=1] - Elevation height multiplier.
 * @param {number} [options.elevationCacheSize=1000] - Number of tiles which heights are kept in the cache.
 * @param {boolean} [options.loadEveryZoom=false] - Loads the tiles of every zoom. By default up to maxNativeZoom a tile
 * the level of its parent stands for is not loaded: fewer requests, coarser heights on every other zoom.
 * @param {FetchCache} [options.cache="default"] - Fetch cache mode.
 * @param {string|null} [options.geoidSrc="https://openglobus.org/geoid/egm84-30.pgm"] - Geoid model URL, null for no
 * geoid. Undefined is the same as not given.
 *
 * @fires load
 * @fires loadend
 */
class GlobusTerrain extends EmptyTerrain {
    protected _s: string[];

    protected _requestCount: number;

    protected _requestsPeerSubdomain: number;

    /**
     * Terrain source path url template.
     * @protected
     * @type {string}
     */
    protected url: string;

    protected _extent: Extent;

    protected _dataType: string;

    protected _elevationCache: LRUCache<string, TileData>;

    /**
     * Whether the server has the tile: true for a loaded tile, false for the one it has not (4xx). The tiles that are
     * not here are requested, the missing ones are not requested again.
     * @protected
     */
    protected _tileStatus: LRUCache<string, boolean>;

    /**
     * Loads the tiles of every zoom, else up to maxNativeZoom a tile the level of its parent stands for is not loaded.
     * @public
     */
    public loadEveryZoom: boolean;

    protected _fetchCache: Record<string, Promise<any>>;

    protected _loader: Loader<GlobusTerrain>;

    /**
     * Rewrites elevation storage url query.
     * @protected
     * @type {Function}
     */
    protected _urlRewriteCallback: UrlRewriteFunc | null;

    protected _heightFactor: number;

    protected _cache: FetchCache;

    constructor(name: string = "", options: IGlobusTerrainParams = {}) {
        super({
            maxNativeZoom: options.maxNativeZoom || 14,
            ...options,
            geoidSrc: options.geoidSrc !== undefined ? options.geoidSrc : "https://openglobus.org/geoid/egm84-30.pgm"
        });

        this._s = options.subdomains || ["a", "b", "c"];

        this._requestCount = 0;

        this._requestsPeerSubdomain = 4;

        this.isEmpty = false;

        this.equalizeNormals = true;

        this.name = name || "openglobus";

        this.url = options.url || "https://{s}.srtm3.openglobus.org/{z}/{y}/{x}.ddm";

        this.gridSizeByZoom = options.gridSizeByZoom || [
            64, 32, 32, 16, 16, 8, 8, 8, 16, 16, 16, 32, 32, 32, 32, 16, 8, 4, 2, 2, 2, 2, 2, 2
        ];

        this._heightFactor = options.heightFactor != undefined ? options.heightFactor : 1.0;

        this.noDataValues = options.noDataValues || [];

        for (let i = 0; i < this.noDataValues.length; i++) {
            this.noDataValues[i] *= this._heightFactor;
        }

        this.plainGridSize = options.plainGridSize || 32;

        this._extent = createExtent(options.extent, new Extent(new LonLat(-180.0, -90.0), new LonLat(180.0, 90.0)));

        this._dataType = "arrayBuffer";

        this._maxNodeZoom = this.gridSizeByZoom.length - 1;

        this._elevationCache = new LRUCache(options.elevationCacheSize || 1000);

        this._tileStatus = new LRUCache(TILE_STATUS_CACHE_SIZE);

        this.loadEveryZoom = options.loadEveryZoom ?? false;

        this._fetchCache = {};

        this._cache = options.cache || "default";

        this._loader = new Loader<GlobusTerrain>();

        this._urlRewriteCallback = options.urlRewrite || null;
    }

    public override getMaxHeight(): number {
        return this.maxHeight * this._heightFactor;
    }

    public override getExtent(): Extent {
        return this._extent;
    }

    public get loader(): Loader<GlobusTerrain> {
        return this._loader;
    }

    public override clearCache() {
        this._elevationCache.clear();
        this._tileStatus.clear();

        for (let c in this._fetchCache) {
            //@ts-ignore
            this._fetchCache[c] = null;
            delete this._fetchCache[c];
        }
        //@ts-ignore
        this._fetchCache = null;
        this._fetchCache = {};
    }

    public override isBlur(segment: Segment): boolean {
        return segment.tileZoom >= 6;
    }

    public override getCacheInfo(): ITerrainCacheInfo {
        return { tiles: this._elevationCache.size };
    }

    public setElevationCache(tileIndex: string, tileData: TileData) {
        this._elevationCache.set(tileIndex, tileData);
    }

    public getElevationCache(tileIndex: string): TileData | undefined {
        return this._elevationCache.get(tileIndex);
    }

    public override getHeightAsync(
        lonLat: LonLat,
        callback: (h: number) => void,
        zoom?: number,
        firstAttempt?: boolean
    ): boolean {
        if (!lonLat || lonLat.lat > mercator.MAX_LAT || lonLat.lat < mercator.MIN_LAT) {
            callback(0);
            return true;
        }

        firstAttempt = firstAttempt != undefined ? firstAttempt : true;

        const [x, y, z, tileGroup] = this._planet!.quadTreeStrategy.getTileXY(lonLat, zoom || this.maxZoom);

        let tileIndex = Layer.getTileIndex(x, y, z, tileGroup);

        let cache = this.getElevationCache(tileIndex);

        let merc = mercator.forward(lonLat);

        if (cache) {
            if (cache.heights) {
                callback(this._getGroundHeightMerc(merc, cache));
            } else {
                callback(0);
            }
            return true;
        } else {
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
                let extent = mercator.getTileExtent(x, y, z);

                if (response.status === "ready") {
                    delete this._fetchCache[tileIndex];

                    let cache: TileData = {
                        heights: this._createHeights(response.data, null, tileGroup, x, y, z, extent),
                        extent: extent
                    };

                    this.setElevationCache(tileIndex, cache);

                    callback(this._getGroundHeightMerc(merc, cache));
                } else if (response.status === "error") {
                    if (firstAttempt && z > this.maxNativeZoom) {
                        firstAttempt = false;
                        this.getHeightAsync(lonLat, callback, this.maxNativeZoom, false);
                        return;
                    }

                    this.setElevationCache(tileIndex, {
                        heights: null,
                        extent: extent
                    });

                    callback(0);
                } else {
                    // @ts-ignore
                    this._fetchCache[tileIndex] = null;
                    delete this._fetchCache[tileIndex];
                }
            });
        }

        return false;
    }

    protected _getGroundHeightMerc(merc: LonLat, tileData: TileData): number {
        return tileData.extent && tileData.heights
            ? getGroundHeight(merc.lon, merc.lat, tileData.extent, tileData.heights)
            : 0;
    }

    /**
     * Stop loading.
     * @public
     */
    public override abortLoading() {
        this._loader.abortAll();
    }

    /**
     * Sets terrain data url template.
     * @public
     * @param {string} url - Url template.
     * @example <caption>Default openglobus url template:</caption>:
     * "https://{s}.srtm3.openglobus.org/{z}/{y}/{x}.ddm"
     */
    public setUrl(url: string) {
        this.url = url;
    }

    /**
     * Sets provider name.
     * @public
     * @param {string} name - Name.
     */
    public setName(name: string) {
        this.name = name;
    }

    public isReadyToLoad(segment: Segment): boolean {
        return segment.tileGroup === TILEGROUP_COMMON && this._extent.overlaps(segment.getExtentLonLat());
    }

    /**
     * Starts to load segment elevation data.
     * @public
     * @param {Segment} segment - Segment that requests terrain data.
     * @param {boolean} [forceLoading=false] - Forces loading even if default filter would skip it.
     */
    public override loadTerrain(segment: Segment, forceLoading: boolean = false) {
        if (this._planet!.terrainLock.isFree()) {
            segment.terrainReady = false;
            segment.terrainIsLoading = true;

            if (this.isReadyToLoad(segment)) {
                let status = this._tileStatus.get(segment.tileIndex),
                    // A loaded tile, or a native one when not every zoom is loaded, takes its cached heights
                    cache =
                        status || (!this.loadEveryZoom && segment.tileZoom <= this.maxNativeZoom)
                            ? this.getElevationCache(segment.tileIndex)
                            : undefined;

                if (status === false) {
                    this._applyParentHeights(segment);
                } else if (cache) {
                    this._applyElevationsData(segment, cache.heights);
                } else {
                    this._loadTile(segment, forceLoading);
                }
            } else {
                segment.elevationsNotExists();
            }
        } else {
            segment.terrainIsLoading = false;
        }
    }

    protected _loadTile(segment: Segment, forceLoading: boolean) {
        this._loader.load(
            {
                sender: this,
                src: this._getHTTPRequestString(segment),
                segment: segment,
                type: this._dataType,
                options: {
                    cache: this._cache
                },
                filter: () => (segment.plainReady && segment.node.getState() !== NOTRENDERING) || forceLoading
            },
            (response: IResponse) => {
                if (response.status === "ready") {
                    this._tileStatus.set(segment.tileIndex, true);
                    this._onTerrainLoaded(segment, response.data);
                } else if (response.status === "abort") {
                    segment.terrainIsLoading = false;
                } else if (response.status === "error") {
                    this._onTerrainError(segment, response);
                } else {
                    segment.terrainIsLoading = false;
                }
            }
        );
    }

    protected _onTerrainError(segment: Segment, response: IResponse) {
        let s = response.statusCode;
        if (s != undefined && s >= 400 && s < 500) {
            this._tileStatus.set(segment.tileIndex, false);
        }

        this._applyParentHeights(segment);
    }

    protected _applyParentHeights(segment: Segment) {
        let cache = this.getElevationCache(segment.tileIndex);
        this._applyElevationsData(segment, cache ? cache.heights : null);
    }

    /**
     * Converts loaded segment data to elevations and applies them.
     * @protected
     * @param {Segment} segment - Segment that requested terrain data.
     * @param {any} data - Loaded data.
     */
    protected _onTerrainLoaded(segment: Segment, data: any) {
        if (!segment.node) {
            return;
        }

        let heights = this._createHeights(
            data,
            segment,
            segment.tileGroup,
            segment.tileX,
            segment.tileY,
            segment.tileZoom,
            segment.getExtent(),
            segment.tileZoom === this.maxZoom
        );

        this.setElevationCache(segment.tileIndex, {
            heights: heights,
            extent: segment.getExtent()
        });

        this._applyElevationsData(segment, heights);
    }

    protected _getSubdomain(): string {
        this._requestCount++;
        return this._s[
            Math.floor(
                (this._requestCount % (this._requestsPeerSubdomain * this._s.length)) / this._requestsPeerSubdomain
            )
        ];
    }

    public buildURL(x: number, y: number, z: number, tileGroup: number): string {
        return stringTemplate(this.url, {
            s: this._getSubdomain(),
            x: x.toString(),
            y: y.toString(),
            z: z.toString(),
            f: tileGroup.toString()
        });
    }

    /**
     * Creates default query url string.
     * @protected
     * @param {Segment} segment - Segment to create URL for.
     * @returns {string} URL string.
     */
    protected _createUrl(segment: Segment): string {
        return this.buildURL(segment.tileX, segment.tileY, segment.tileZoom, segment.tileGroup);
    }

    /**
     * Returns actual url query string.
     * @protected
     * @param {Segment} segment - Segment that loads terrain data.
     * @returns {string} URL string.
     */
    protected _getHTTPRequestString(segment: Segment): string {
        if (this._urlRewriteCallback) {
            return (
                this._urlRewriteCallback(segment.tileX, segment.tileY, segment.tileZoom, segment.tileGroup) ||
                this._createUrl(segment)
            );
        } else {
            return this._createUrl(segment);
        }
    }

    /**
     * Sets url rewrite callback, used for custom url rewriting for every tile loading.
     * @public
     * @param {UrlRewriteFunc} ur - The callback that returns tile custom-created url.
     */
    public override setUrlRewriteCallback(ur: UrlRewriteFunc) {
        this._urlRewriteCallback = ur;
    }

    /**
     * Converts loaded data to segment elevation data type (column major elevation data array in meters)
     * @public
     * @returns {Array.<number> | TypedArray} Column-major elevation data array in meters.
     */
    protected _createHeights(
        data: any,
        segment?: Segment | null,
        tileGroup?: number,
        x?: number,
        y?: number,
        z?: number,
        extent?: Extent,
        isMaxZoom?: boolean
    ): TypedArray | number[] {
        if (this._heightFactor !== 1) {
            let res = new Float32Array(data);
            for (let i = 0, len = res.length; i < len; i++) {
                res[i] = res[i] * this._heightFactor;
            }
            return res;
        }
        return new Float32Array(data);
    }

    /**
     * @protected
     */
    protected _applyElevationsData(segment: Segment, elevations: number[] | TypedArray | null) {
        if (segment) {
            let e = this.events.load!;
            if (e.handlers.length) {
                this.events.dispatch(e, {
                    elevations: elevations,
                    segment: segment
                });
            }
            segment.applyTerrain(elevations);
        }
    }
}

export { TERRAIN_EVENTS } from "./EmptyTerrain";
export type { TerrainEventsList, TerrainEvents } from "./EmptyTerrain";

export { GlobusTerrain };
