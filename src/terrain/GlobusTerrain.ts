import * as mercator from "../mercator";
import {createEvents, EventsHandler} from "../Events";
import {createExtent, stringTemplate, TypedArray} from "../utils/shared";
import {EPSG3857} from "../proj/EPSG3857";
import {EmptyTerrain, IEmptyTerrainParams} from "./EmptyTerrain";
import {Extent} from "../Extent";
import {Layer} from "../layer/Layer";
import {IResponse, Loader} from "../utils/Loader";
import {LonLat} from "../LonLat";
import {NOTRENDERING} from "../quadTree/quadTree";
import {getTileGroupByLat, Segment} from "../segment/Segment";
// import { QueueArray } from '../QueueArray';
import {Ray} from "../math/Ray";
import {Vec3} from "../math/Vec3";

export interface IGlobusTerrainParams extends IEmptyTerrainParams {
    subdomains?: string[];
    url?: string;
    extent?: Extent | [[number, number], [number, number]];
    urlRewrite?: UrlRewriteFunc;
    noDataValues?: number[];
    plainGridSize?: number;
    heightFactor?: number;
}

type TileData = {
    heights: number[] | TypedArray | null,
    extent: Extent | null
}

type UrlRewriteFunc = (segment: Segment, url: string) => string | null | undefined;

/**
 * Class that loads segment elevation data, converts it to the array and passes it to the planet segment.
 * @class
 * @extends {GlobusTerrain}
 * @param {string} [name=""] - Terrain provider name.
 * @param {IGlobusTerrainParams} [options] - Provider options:
 * @param {number} [options.minZoom=3] - Minimal visible zoom index when terrain handler works.
 * @param {number} [options.minZoom=14] - Maximal visible zoom index when terrain handler works.
 * @param {number} [options.minNativeZoom=14] - Maximal available terrain zoom level.
 * @param {string} [options.url="//openglobus.org/heights/srtm3/{z}/{y}/{x}.ddm"] - Terrain source path url template. Default is openglobus ddm elevation file.
 * @param {Array.<number>} [options.gridSizeByZoom] - Array of segment triangulation grid sizes where array index agreed to the segment zoom index.
 * @param {number} [options.plainGridSize=32] - Elevation grid size. Default is 32x32. Must be power of two.
 * @param {string} [options.responseType="arraybuffer"] - Response type.
 * @param {number} [options.MAX_LOADING_TILES] - Maximum at one time loading tiles.
 * @param {Array.<number>} [gridSizeByZoom] - Array of values, where each value corresponds to the size of a tile(or segment) on the globe. Each value must be power of two.
 * @param {number} [heightFactor=1] - Elevation height multiplier.
 *
 * @fires GlobusTerrainEvents#load
 * @fires GlobusTerrainEvents#loadend
 */
class GlobusTerrain extends EmptyTerrain {

    public events: GlobusTerrainEvents;

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

    protected _elevationCache: Record<string, TileData>;

    protected _fetchCache: Record<string, Promise<any>>;

    protected _loader: Loader<GlobusTerrain>;

    /**
     * Rewrites elevation storage url query.
     * @protected
     * @type {Function} -
     */
    protected _urlRewriteCallback: UrlRewriteFunc | null;

    protected _heightFactor: number;


    constructor(name: string = "", options: IGlobusTerrainParams = {}) {

        super({
            geoidSrc: "https://openglobus.org/geoid/egm84-30.pgm",
            maxNativeZoom: options.maxNativeZoom || 14,
            ...options
        });

        this._s = options.subdomains || ["a", "b", "c"];

        this.events = createEvents(GLOBUSTERRAIN_EVENTS, this);

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

        this._elevationCache = {};

        this._fetchCache = {};

        this._loader = new Loader<GlobusTerrain>();

        this._urlRewriteCallback = options.urlRewrite || null;
    }

    public get loader(): Loader<GlobusTerrain> {
        return this._loader;
    }

    public override clearCache() {
        for (let c in this._elevationCache) {
            this._elevationCache[c].heights = null;
            this._elevationCache[c].extent = null;
            delete this._elevationCache[c];
        }
        //@ts-ignore
        this._elevationCache = null;
        this._elevationCache = {};

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

    public setElevationCache(tileIndex: string, tileData: TileData) {
        this._elevationCache[tileIndex] = tileData;
    }

    public getElevationCache(tileIndex: string): TileData | undefined {
        return this._elevationCache[tileIndex];
    }

    public override getHeightAsync(lonLat: LonLat, callback: (h: number) => void, zoom?: number, firstAttempt?: boolean): boolean {
        // if (!lonLat || lonLat.lat > mercator.MAX_LAT || lonLat.lat < mercator.MIN_LAT) {
        //     callback(0);
        //     return true;
        // }

        firstAttempt = firstAttempt != undefined ? firstAttempt : true;

        let z = zoom || this.maxZoom,
            z2 = (1 << z),//Math.pow(2, z),
            size = mercator.POLE2 / z2,
            merc = mercator.forward(lonLat),
            x = Math.floor((mercator.POLE + merc.lon) / size),
            y = Math.floor((mercator.POLE - merc.lat) / size);

        let tileGroup = getTileGroupByLat(lonLat.lat, mercator.MAX_LAT);

        let tileIndex = Layer.getTileIndex(x, y, z, tileGroup);

        let cache = this.getElevationCache(tileIndex);

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
                    src: this._buildURL(x, y, z),
                    type: this._dataType
                });
                this._fetchCache[tileIndex] = def;
            }

            def!.then((response: IResponse) => {

                let extent = mercator.getTileExtent(x, y, z);

                if (response.status === "ready") {

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
        if (!(tileData.extent && tileData.heights)) {
            return 0;
        }

        let w = tileData.extent.getWidth(),
            gs = Math.sqrt(tileData.heights.length);

        let size = w / (gs - 1);

        /*
        v2-----------v3
        |            |
        |            |
        |            |
        v0-----------v1
        */

        let i = gs - Math.ceil((merc.lat - tileData.extent.southWest.lat) / size) - 1,
            j = Math.floor((merc.lon - tileData.extent.southWest.lon) / size);

        let v0Ind = (i + 1) * gs + j,
            v1Ind = v0Ind + 1,
            v2Ind = i * gs + j,
            v3Ind = v2Ind + 1;

        let h0 = tileData.heights[v0Ind],
            h1 = tileData.heights[v1Ind],
            h2 = tileData.heights[v2Ind],
            h3 = tileData.heights[v3Ind];

        let v0 = new Vec3(tileData.extent.southWest.lon + size * j, h0, tileData.extent.northEast.lat - size * i - size),
            v1 = new Vec3(v0.x + size, h1, v0.z),
            v2 = new Vec3(v0.x, h2, v0.z + size),
            v3 = new Vec3(v0.x + size, h3, v0.z + size);

        let xyz = new Vec3(merc.lon, 100000.0, merc.lat),
            ray = new Ray(xyz, new Vec3(0, -1, 0));

        let res = new Vec3();
        let d = ray.hitTriangle(v0, v1, v2, res);

        if (d === Ray.INSIDE) {
            return res.y;
        }

        d = ray.hitTriangle(v1, v3, v2, res);
        if (d === Ray.INSIDE) {
            return res.y;
        }

        return 0;
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
     * "http://earth3.openglobus.org/{z}/{y}/{x}.ddm"
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
        return /*segment._projection.equal(EPSG3857) &&*/ this._extent.overlaps(segment.getExtentLonLat());
    }

    /**
     * Starts to load segment elevation data.
     * @public
     * @param {Segment} segment - Segment that wants a terrain data.
     * @param {boolean} [forceLoading] -
     */
    public override loadTerrain(segment: Segment, forceLoading: boolean = false) {

        if (this._planet!.terrainLock.isFree()) {

            segment.terrainReady = false;
            segment.terrainIsLoading = true;

            if (this.isReadyToLoad(segment)) {

                let cache = this.getElevationCache(segment.tileIndex);

                if (cache) {
                    this._applyElevationsData(segment, cache.heights);
                } else {
                    this._loader.load({
                            sender: this,
                            src: this._getHTTPRequestString(segment),
                            segment: segment,
                            type: this._dataType,
                            filter: () => (segment.plainReady && segment.node.getState() !== NOTRENDERING) || forceLoading
                        }, (response: IResponse) => {

                            if (response.status === "ready") {

                                let heights = this._createHeights(
                                    response.data,
                                    segment,
                                    segment._tileGroup,
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

                            } else if (response.status === "abort") {
                                segment.terrainIsLoading = false;
                            } else if (response.status === "error") {
                                this._applyElevationsData(segment, null);
                            } else {
                                segment.terrainIsLoading = false;
                            }
                        }
                    );
                }
            } else {
                segment.elevationsNotExists();
            }
        } else {
            segment.terrainIsLoading = false;
        }
    }

    protected _getSubdomain(): string {
        this._requestCount++;
        return this._s[Math.floor(this._requestCount % (this._requestsPeerSubdomain * this._s.length) / this._requestsPeerSubdomain)];
    }

    public _buildURL(x: number, y: number, z: number): string {
        return stringTemplate(this.url, {
            s: this._getSubdomain(),
            x: x.toString(),
            y: y.toString(),
            z: z.toString()
        });
    }

    /**
     * Creates default query url string.
     * @protected
     * @param {Segment} segment -
     * @returns {string} -
     */
    protected _createUrl(segment: Segment): string {
        return this._buildURL(segment.tileX, segment.tileY, segment.tileZoom);
    }

    /**
     * Returns actual url query string.
     * @protected
     * @param {Segment} segment - Segment that loads image data.
     * @returns {string} - Url string.
     */
    protected _getHTTPRequestString(segment: Segment): string {
        if (this._urlRewriteCallback) {
            return this._urlRewriteCallback(segment, this.url) || this._createUrl(segment);
        } else {
            return this._createUrl(segment);
        }
    }

    /**
     * Sets url rewrite callback, used for custom url rewriting for every tile loading.
     * @public
     * @param {UrlRewriteFunc} ur - The callback that returns tile custom created url.
     */
    public override setUrlRewriteCallback(ur: UrlRewriteFunc) {
        this._urlRewriteCallback = ur;
    }

    /**
     * Converts loaded data to segment elevation data type(column major elevation data array in meters)
     * @public
     * @returns {Array.<number>} -
     */
    protected _createHeights(data: any, segment?: Segment | null, tileGroup?: number, x?: number, y?: number, z?: number, extent?: Extent, isMaxZoom?: boolean): TypedArray | number[] {
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

type GlobusTerrainEventsList = [
    "load",
    "loadend"
];

type GlobusTerrainEvents = EventsHandler<GlobusTerrainEventsList>;

const GLOBUSTERRAIN_EVENTS: GlobusTerrainEventsList = [
    /**
     * Triggered when current elevation tile has loaded but before rendering.
     * @event og.terrain.GlobusTerrain#load
     */
    "load",

    /**
     * Triggered when all elevation tiles have loaded or loading has stopped.
     * @event og.terrain.GlobusTerrain#loadend
     */
    "loadend"
];


export {GlobusTerrain};