import {binarySearchFast, TypedArray} from "../utils/shared";
import {Geoid} from "./Geoid";
import {LonLat} from "../LonLat";
import {Planet} from "../scene/Planet";
import {Segment} from "../segment/Segment";

export interface IEmptyTerrainParams {
    equalizeVertices?: boolean;
    name?: string;
    minZoom?: number;
    maxZoom?: number;
    maxNativeZoom?: number;
    geoidSrc?: string;
    geoid?: Geoid;
    gridSizeByZoom?: number[]
}

/**
 * Class represents terrain provider without elevation data.
 * @param {IEmptyTerrainParams} [options] - Provider options:
 * @param {string} [options.name="empty"] - Provider name.
 * @param {boolean} [options.equalizeVertices] -
 * @param {number} [options.minZoom=2] - Minimal visible zoom index when terrain handler works.
 * @param {number} [options.minZoom=50] - Maximal visible zoom index when terrain handler works.
 * @param {number} [options.maxNativeZoom=50] - Maximal available terrain zoom level.
 * @param {Array.<number>} [options.gridSizeByZoom] - Array of segment triangulation grid sizes where array index agreed to the segment zoom index.
 * @param {Array.<number>} [gridSizeByZoom] - Array of values, where each value corresponds to the size of a tile(or segment) on the globe. Each value must be power of two.
 * @param {Geoid} [options.geoid] -
 * @param {string} [options.geoidSrc] -
 */
class EmptyTerrain {

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

        this.equalizeVertices = options.equalizeVertices || false;

        this.equalizeNormals = false;

        this.isEmpty = true;

        this.name = options.name || "empty";

        this.minZoom = options.minZoom || 2;

        this.maxZoom = options.maxZoom || 50;

        this.maxNativeZoom = options.maxNativeZoom || this.maxZoom;

        this.gridSizeByZoom = options.gridSizeByZoom || [
            64, 32, 16, 8, 4, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2
        ];

        this._maxNodeZoom = this.gridSizeByZoom.length - 1;

        this.plainGridSize = 2;

        this.noDataValues = [];

        this._planet = null;

        this._geoid = options.geoid || new Geoid({
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

    public abortLoading() {
    }

    public clearCache() {
    }

    public getHeightAsync(lonLat: LonLat, callback: (height: number) => void): boolean {
        callback(0);
        return true;
    }

    public loadTerrain(segment: Segment, forceLoading: boolean = false) {

    }
}

export {EmptyTerrain};