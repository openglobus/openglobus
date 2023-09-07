import * as mercator from "./mercator";
import {NumberArray2} from "./math/Vec2";
import {NumberArray3} from "./math/Vec3";

const HALF_PI = Math.PI * 0.5;
const INV_PI_BY_180 = 180.0 / Math.PI;
const INV_PI_BY_360 = INV_PI_BY_180 * 2.0;
const PI_BY_360 = Math.PI / 360.0;
const INV_PI_BY_180_HALF_PI = INV_PI_BY_180 * HALF_PI;

/**
 * Represents a geographical point with a certain latitude, longitude and height.
 * @class
 * @param {number} [lon] - Longitude.
 * @param {number} [lat] - Latitude.
 * @param {number} [height] - Height over the surface.
 */
export class LonLat {
    /**
     * Longitude.
     * @public
     * @type {number}
     */
    public lon: number = 0;

    /**
     * Latitude.
     * @public
     * @type {number}
     */
    public lat: number = 0;

    /**
     * Height.
     * @public
     * @type {number}
     */
    public height: number = 0;

    constructor(lon: number = 0, lat: number = 0, height: number = 0) {
        this.lon = lon;
        this.lat = lat;
        this.height = height;
    }

    /**
     * Check zero coordinates
     * @returns {boolean} -
     */
    public isZero(): boolean {
        return this.lon === 0.0 && this.lat === 0.0 && this.height === 0.0;
    }

    /**
     * Creates coordinates array.
     * @static
     * @param{Array.<Array<number>>} arr - Coordinates array data. (exactly 3 entries)
     * @return{Array.<LonLat>} the same coordinates array but each element is LonLat instance.
     */
    static join(arr: NumberArray2[] | NumberArray3[]): LonLat[] {
        let res = [];
        for (let i = 0; i < arr.length; i++) {
            let ai = arr[i];
            res[i] = new LonLat(ai[0], ai[1], ai[2]);
        }
        return res;
    }

    /**
     * Creates an object by coordinate array.
     * @static
     * @param {Array.<number>} arr - Coordinates array, where first is longitude, second is latitude and third is a height. (exactly 3 entries)
     * @returns {LonLat} -
     */
    static createFromArray(arr: [number, number, number]): LonLat {
        return new LonLat(arr[0], arr[1], arr[2]);
    }

    /**
     * Create array from lonLat
     * @param lonLat
     * @returns {number[]}
     */
    static toArray(lonLat: LonLat): [number, number, number] {
        return [lonLat.lon, lonLat.lat, lonLat.height]
    }

    /**
     * Create array from lonLat
     * @returns {number[]}
     */
    public toArray(): [number, number, number] {
        return LonLat.toArray(this);
    }

    /**
     * Converts degrees to mercator coordinates.
     * @static
     * @param {number} lon - Degrees longitude.
     * @param {number} lat - Degrees latitude.
     * @param {number} [height] - Height.
     * @returns {LonLat} -
     */
    static forwardMercator(lon: number, lat: number, height: number): LonLat {
        return new LonLat(
            lon * mercator.POLE_BY_180,
            Math.log(Math.tan((90.0 + lat) * PI_BY_360)) * mercator.POLE_BY_PI,
            height
        );
    }

    /**
     * Converts degrees to mercator coordinates.
     * @static
     * @param {LonLat} lonLat - Input geodetic degree coordinates
     * @param {LonLat} res - Output mercator coordinates
     * @returns {LonLat} - Output mercator coordinates
     */
    static forwardMercatorRes(lonLat: LonLat, res: LonLat): LonLat {
        res.lon = lonLat.lon * mercator.POLE_BY_180;
        res.lat = Math.log(Math.tan((90.0 + lonLat.lat) * PI_BY_360)) * mercator.POLE_BY_PI,
            res.height = lonLat.height;
        return res;
    }

    /**
     * Converts mercator to degrees coordinates.
     * @static
     * @param {number} x - Mercator longitude.
     * @param {number} y - Mercator latitude.
     * @param {number} [height] - Height.
     * @returns {LonLat} -
     */
    static inverseMercator(x: number, y: number, height: number = 0): LonLat {
        return new LonLat(
            x * mercator.INV_POLE_BY_180,
            INV_PI_BY_360 * Math.atan(Math.exp(y * mercator.PI_BY_POLE)) - INV_PI_BY_180_HALF_PI,
            height
        );
    }

    /**
     * Sets coordinates.
     * @public
     * @param {number} [lon] - Longitude.
     * @param {number} [lat] - Latitude.
     * @param {number} [height] - Height.
     * @returns {LonLat} -
     */
    public set(lon: number = 0, lat: number = 0, height: number = 0): LonLat {
        this.lon = lon;
        this.lat = lat;
        this.height = height;
        return this;
    }

    /**
     * Copy coordinates.
     * @public
     * @param {LonLat} [lonLat] - Coordinates to copy.
     * @returns {LonLat} -
     */
    public copy(lonLat: LonLat): LonLat {
        this.lon = lonLat.lon;
        this.lat = lonLat.lat;
        this.height = lonLat.height;
        return this;
    }

    /**
     * Clone the coordinates.
     * @public
     * @returns {LonLat} -
     */
    public clone(): LonLat {
        return new LonLat(this.lon, this.lat, this.height);
    }

    /**
     * Converts to mercator coordinates.
     * @public
     * @returns {LonLat} -
     */
    public forwardMercator(): LonLat {
        return LonLat.forwardMercator(this.lon, this.lat, this.height);
    }

    public forwardMercatorEPS01(): LonLat {
        let lat = this.lat;
        if (lat > 89.9) {
            lat = 89.9;
        } else if (lat < -89.9) {
            lat = -89.9;
        }
        return new LonLat(
            this.lon * mercator.POLE_BY_180,
            Math.log(Math.tan((90.0 + lat) * PI_BY_360)) * mercator.POLE_BY_PI
        );
    }

    /**
     * Converts from mercator coordinates.
     * @public
     * @returns {LonLat} -
     */
    public inverseMercator(): LonLat {
        return LonLat.inverseMercator(this.lon, this.lat, this.height);
    }

    /**
     * Compares coordinates.
     * @public
     * @param {LonLat} b - Coordinate to compare with.
     * @returns {boolean} -
     */
    public equal(b: LonLat): boolean {
        if (b.height) {
            return this.lon === b.lon && this.lat === b.lat && this.height === b.height;
        } else {
            return this.lon === b.lon && this.lat === b.lat;
        }
    }
}
