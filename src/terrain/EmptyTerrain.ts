import { binarySearchFast } from "../utils/shared";
import type { TypedArray } from "../utils/shared";
import { Geoid } from "./Geoid";
import { LonLat } from "../LonLat";
import { Planet } from "../scene/Planet";
import { Segment } from "../segment/Segment";

export const EMPTY_TERRAIN_ICON_SRC =
    "data:image/png;base64,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";

export interface IEmptyTerrainParams {
    equalizeVertices?: boolean;
    name?: string;
    attribution?: string;
    iconSrc?: string | null;
    minZoom?: number;
    maxZoom?: number;
    maxNativeZoom?: number;
    geoidSrc?: string;
    geoid?: Geoid;
    gridSizeByZoom?: number[];
}

export type UrlRewriteFunc = (
    tileX: number,
    tileY: number,
    tileZoom: number,
    tileGroup: number
) => string | null | undefined;

/**
 * Class represents terrain provider without elevation data.
 * @param {IEmptyTerrainParams} [options] - Provider options:
 * @param {string} [options.name="empty"] - Provider name.
 * @param {string} [options.attribution=""] - Terrain attribution shown in the attribution area.
 * @param {string|null} [options.iconSrc] - Icon for LayerSwitcher.
 * @param {boolean} [options.equalizeVertices=false] - Enables vertex equalization on tile borders.
 * @param {number} [options.minZoom=2] - Minimal visible zoom index when terrain handler works.
 * @param {number} [options.maxZoom=19] - Maximal visible zoom index when terrain handler works.
 * @param {number} [options.maxNativeZoom=19] - Maximal available terrain zoom level.
 * @param {Array.<number>} [options.gridSizeByZoom] - Segment triangulation grid sizes by zoom index.
 * @param {Geoid} [options.geoid] - Geoid model instance.
 * @param {string} [options.geoidSrc] - URL to geoid model source.
 */
class EmptyTerrain {
    static __counter__: number = 0;

    /**
     * Uniq identifier.
     * @public
     * @type {number}
     */
    public __id: number;

    public equalizeVertices: boolean;

    public equalizeNormals: boolean;

    public isEmpty: boolean;

    /**
     * Provider name is "empty"
     * @public
     * @type {string}
     */
    public name: string;

    /**
     * Terrain provider attribution.
     * @protected
     * @type {string}
     */
    protected _attribution: string;

    /**
     * Terrain provider icon for LayerSwitcher.
     * @protected
     * @type {string | null}
     */
    protected _iconSrc: string | null;

    /**
     * Minimal z-index value for segment elevation data handling.
     * @public
     * @type {number}
     */
    public minZoom: number;

    /**
     * Maximal z-index value for segment elevation data handling.
     * @public
     * @type {number}
     */
    public maxZoom: number;

    public noDataValues: number[];

    /**
     * Maximal existent available zoom
     * @type {number}
     */
    public maxNativeZoom: number;

    /**
     * @public
     * @type {Array.<number>}
     */
    public gridSizeByZoom: number[];

    public _maxNodeZoom: number;

    /**
     * Elevation grid size. Current is 2x2 is the smallest grid size.
     * @public
     * @type {number}
     */
    public plainGridSize: number;

    /**
     * Planet scene.
     * @public
     * @type {Planet}
     */
    public _planet: Planet | null;

    public _geoid: Geoid;

    public _isReady: boolean;

    constructor(options: IEmptyTerrainParams = {}) {
        this.__id = EmptyTerrain.__counter__++;

        this.equalizeVertices = options.equalizeVertices || false;

        this.equalizeNormals = false;

        this.isEmpty = true;

        this.name = options.name || "empty";

        this._attribution = options.attribution || "";

        this._iconSrc =
            options.iconSrc !== undefined
                ? options.iconSrc
                : this.constructor === EmptyTerrain
                  ? EMPTY_TERRAIN_ICON_SRC
                  : null;

        this.minZoom = options.minZoom || 2;

        this.maxZoom = options.maxZoom || 19;

        this.maxNativeZoom = options.maxNativeZoom || this.maxZoom;

        this.gridSizeByZoom = options.gridSizeByZoom || [
            64, 32, 16, 8, 4, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2
        ];

        this._maxNodeZoom = this.gridSizeByZoom.length - 1;

        this.plainGridSize = 2;

        this.noDataValues = [];

        this._planet = null;

        this._geoid =
            options.geoid ||
            new Geoid({
                src: options.geoidSrc || null
            });

        this._isReady = false;

        // const _ellToAltFn = [
        //     (lon, lat, alt, callback) => callback(alt),
        //     (lon, lat, alt, callback) => callback(alt - this._geoid.getHeight(lon, lat)),
        //     (lon, lat, alt, callback) => {

        //         let x = mercator.getTileX(lon, zoom),
        //             y = mercator.getTileY(lat, zoom);

        //         let mslAlt = alt - this._geoid.getHeight(lon, lat);

        //         if (true) {

        //         } else {

        //         }

        //         return callback(mslAlt);
        //     },
        // ];
    }

    /**
     * Sets url rewrite callback, used for custom url rewriting for every tile loading.
     * @public
     * @param {UrlRewriteFunc} ur - The callback that returns tile custom created url.
     */
    public setUrlRewriteCallback(ur: UrlRewriteFunc) {}

    public get isIdle(): boolean {
        return true;
    }

    public isEqual(obj: EmptyTerrain): boolean {
        return obj.__id === this.__id;
    }

    /**
     * Sets terrain provider attribution text.
     * @public
     * @param {string} html - HTML string that represents terrain provider attribution.
     */
    public setAttribution(html: string) {
        if (this._attribution !== html) {
            this._attribution = html;
            this._planet && this._planet.updateAttributionsList();
        }
    }

    /**
     * Gets terrain provider attribution.
     * @public
     * @returns {string} Terrain provider attribution.
     */
    public getAttribution(): string {
        return this._attribution;
    }

    /**
     * Gets terrain provider icon.
     * @public
     * @returns {string | null} Icon source.
     */
    public get iconSrc(): string | null {
        return this._iconSrc;
    }

    /**
     * Sets terrain provider icon.
     * @public
     * @param {string | null} src - Icon source.
     */
    public set iconSrc(src: string | null) {
        this._iconSrc = src;
    }

    static checkNoDataValue(noDataValues: number[] | TypedArray, value: number): boolean {
        return binarySearchFast(noDataValues, value) !== -1;
    }

    public isBlur(segment?: Segment): boolean {
        return false;
    }

    public set maxNodeZoom(val: number) {
        if (val > this.gridSizeByZoom.length - 1) {
            val = this.gridSizeByZoom.length - 1;
        }
        this._maxNodeZoom = val;
    }

    public get maxNodeZoom(): number {
        return this._maxNodeZoom;
    }

    public set geoid(geoid: Geoid) {
        this._geoid = geoid;
    }

    public get geoid(): Geoid {
        return this._geoid;
    }

    public getGeoid(): Geoid {
        return this._geoid;
    }

    /**
     * Loads or creates segment elevation data.
     * @public
     * @param {Segment} segment - Segment to create elevation data.
     */
    public handleSegmentTerrain(segment: Segment) {
        segment.terrainIsLoading = false;
        segment.terrainReady = true;
        segment.terrainExists = true;
    }

    public isReady(): boolean {
        return this._isReady;
    }

    public abortLoading() {}

    public clearCache() {}

    public getHeightAsync(lonLat: LonLat, callback: (height: number) => void, zoom?: number): boolean {
        callback(0);
        return true;
    }

    public loadTerrain(segment: Segment, forceLoading: boolean = false) {}
}

export { EmptyTerrain };
