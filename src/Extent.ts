import * as math from "./math";
import * as mercator from "./mercator";
import {Ellipsoid} from "./ellipsoid/Ellipsoid";
import {LonLat} from "./LonLat";

/**
 * Represents geographical coordinates extent.
 * @class
 * @param {LonLat} [sw] - South West extent corner coordinates.
 * @param {LonLat} [ne] - North East extent corner coordinates.
 */
export class Extent {
    public southWest: LonLat;
    public northEast: LonLat;

    constructor(sw: LonLat = new LonLat(), ne: LonLat = new LonLat()) {
        this.southWest = sw;
        this.northEast = ne;
    }

    /**
     * Creates extent instance from values in array.
     * @static
     * @param {Array.<number>} arr - South west and north-east longitude and latitudes packed in array. (exactly 4 entries)
     * @return {Extent} Extent object.
     */
    static createFromArray(arr: [number, number, number, number]): Extent {
        return new Extent(new LonLat(arr[0], arr[1]), new LonLat(arr[2], arr[3]));
    }

    /**
     * Creates bound extent instance by coordinate array.
     * @static
     * @param {Array.<LonLat>} arr - Coordinate array.
     * @return {Extent} Extent object.
     */
    static createByCoordinates(arr: LonLat[]): Extent {
        let lonmin = math.MAX,
            lonmax = math.MIN,
            latmin = math.MAX,
            latmax = math.MIN;
        for (let i = 0; i < arr.length; i++) {
            const vi = arr[i];
            if (vi.lon < lonmin) lonmin = vi.lon;
            if (vi.lon > lonmax) lonmax = vi.lon;
            if (vi.lat < latmin) latmin = vi.lat;
            if (vi.lat > latmax) latmax = vi.lat;
        }
        return new Extent(new LonLat(lonmin, latmin), new LonLat(lonmax, latmax));
    }

    /**
     * Creates bound extent instance by coordinates array.
     * @static
     * @param {Array.<Array<number>>} arr - Coordinate array. (exactly 2 entries)
     * @return {Extent} Extent object.
     */
    static createByCoordinatesArr(arr: [number, number][]): Extent {
        let lonmin = math.MAX,
            lonmax = math.MIN,
            latmin = math.MAX,
            latmax = math.MIN;
        for (let i = 0; i < arr.length; i++) {
            const vi = arr[i];
            if (vi[0] < lonmin) lonmin = vi[0];
            if (vi[0] > lonmax) lonmax = vi[0];
            if (vi[1] < latmin) latmin = vi[1];
            if (vi[1] > latmax) latmax = vi[1];
        }
        return new Extent(new LonLat(lonmin, latmin), new LonLat(lonmax, latmax));
    }

    /**
     * Creates extent by merсator grid tile coordinates.
     * @static
     * @param {number} x -
     * @param {number} y -
     * @param {number} z -
     * @param {number} width -
     * @param {number} height -
     * @returns {Extent} -
     */
    static fromTile(
        x: number,
        y: number,
        z: number,
        width: number = mercator.POLE_DOUBLE,
        height: number = mercator.POLE_DOUBLE): Extent {
        const H = Math.pow(2, z);
        const W = Math.pow(2, z);
        const lnSize = width / W;
        const ltSize = height / H;

        const left = -width * 0.5 + x * lnSize,
            top = height * 0.5 - y * ltSize,
            bottom = top - ltSize,
            right = left + lnSize;

        return new Extent(new LonLat(left, bottom), new LonLat(right, top));
    }

    /**
     * Sets current bounding extent object by coordinate array.
     * @public
     * @param {Array.<LonLat>} arr - Coordinate array.
     * @return {Extent} Current extent.
     */
    public setByCoordinates(arr: LonLat[]): Extent {
        let lonmin = math.MAX,
            lonmax = math.MIN,
            latmin = math.MAX,
            latmax = math.MIN;
        for (let i = 0; i < arr.length; i++) {
            const vi = arr[i];
            if (vi.lon < lonmin) lonmin = vi.lon;
            if (vi.lon > lonmax) lonmax = vi.lon;
            if (vi.lat < latmin) latmin = vi.lat;
            if (vi.lat > latmax) latmax = vi.lat;
        }
        this.southWest.lon = lonmin;
        this.southWest.lat = latmin;
        this.northEast.lon = lonmax;
        this.northEast.lat = latmax;
        return this;
    }

    /**
     * Determines if point inside extent.
     * @public
     * @param {LonLat} lonlat - Coordinate point.
     * @return {boolean} Returns true if point inside extent.
     */
    public isInside(lonlat: LonLat): boolean {
        const sw = this.southWest;
        const ne = this.northEast;
        return (
            lonlat.lon >= sw.lon && lonlat.lon <= ne.lon &&
            lonlat.lat >= sw.lat && lonlat.lat <= ne.lat
        );
    }

    /**
     * Returns true if two extent overlap each other.
     * @public
     * @param {Extent} e - Another extent.
     * @return {boolean} -
     */
    public overlaps(e: Extent): boolean {
        const sw = this.southWest;
        const ne = this.northEast;
        return (
            sw.lon <= e.northEast.lon &&
            ne.lon >= e.southWest.lon &&
            sw.lat <= e.northEast.lat &&
            ne.lat >= e.southWest.lat
        );
    }

    /**
     * Gets extent width.
     * @public
     * @return {number} Extent width.
     */
    public getWidth(): number {
        return this.northEast.lon - this.southWest.lon;
    }

    /**
     * Gets extent height.
     * @public
     * @return {number} Extent height.
     */
    public getHeight(): number {
        return this.northEast.lat - this.southWest.lat;
    }

    /**
     * Creates clone instance of the current extent.
     * @public
     * @return {Extent} Extent clone.
     */
    public clone(): Extent {
        return new Extent(this.southWest.clone(), this.northEast.clone());
    }

    /**
     * Gets the center coordinate of the extent.
     * @public
     * @return {number} Center coordinate.
     */
    public getCenter(): LonLat {
        const sw = this.southWest;
        const ne = this.northEast;
        return new LonLat(sw.lon + (ne.lon - sw.lon) * 0.5, sw.lat + (ne.lat - sw.lat) * 0.5);
    }

    /**
     * @public
     */
    public getNorthWest(): LonLat {
        return new LonLat(this.southWest.lon, this.northEast.lat);
    }

    /**
     * @public
     */
    public getNorthEast(): LonLat {
        return new LonLat(this.northEast.lon, this.northEast.lat);
    }

    /**
     * @public
     */
    public getSouthWest(): LonLat {
        return new LonLat(this.southWest.lon, this.southWest.lat);
    }

    /**
     * @public
     */
    public getSouthEast(): LonLat {
        return new LonLat(this.northEast.lon, this.southWest.lat);
    }

    /**
     * @public
     */
    public getNorth(): number {
        return this.northEast.lat;
    }

    public getEast(): number {
        return this.northEast.lon;
    }

    /**
     * @public
     */
    public getWest(): number {
        return this.southWest.lon;
    }

    /**
     * @public
     */
    public getSouth(): number {
        return this.southWest.lat;
    }

    /**
     * Returns extents are equals.
     * @param {Extent} extent - Extent.
     * @returns {boolean} -
     */
    public equals(extent: Extent): boolean {
        return (
            this.southWest.lon === extent.southWest.lon &&
            this.southWest.lat === extent.southWest.lat &&
            this.northEast.lon === extent.northEast.lon &&
            this.northEast.lat === extent.northEast.lat
        );
    }

    /**
     * Converts extent coordinates to mercator projection coordinates.
     * @public
     * @return {Extent} New instance of the current extent.
     */
    public forwardMercator(): Extent {
        return new Extent(this.southWest.forwardMercator(), this.northEast.forwardMercator());
    }

    /**
     * Converts extent coordinates from mercator projection to degrees.
     * @public
     * @return {Extent} New instance of the current extent.
     */
    public inverseMercator(): Extent {
        return new Extent(this.southWest.inverseMercator(), this.northEast.inverseMercator());
    }

    /**
     * Gets cartesian bounding bounds of the current ellipsoid.
     * @public
     * @param {Ellipsoid} ellipsoid - Ellipsoid.
     * @return {Array.<number>} Cartesian 3d coordinate array. (exactly 6 entries)
     */
    public getCartesianBounds(ellipsoid: Ellipsoid): [number, number, number, number, number, number] {
        let xmin = math.MAX,
            xmax = math.MIN,
            ymin = math.MAX,
            ymax = math.MIN,
            zmin = math.MAX,
            zmax = math.MIN;

        const v = [
            new LonLat(this.southWest.lon, this.southWest.lat),
            new LonLat(this.southWest.lon, this.northEast.lat),
            new LonLat(this.northEast.lon, this.northEast.lat),
            new LonLat(this.northEast.lon, this.southWest.lat)
        ];

        for (let i = 0; i < v.length; i++) {
            const coord = ellipsoid.lonLatToCartesian(v[i]);
            const x = coord.x;
            const y = coord.y;
            const z = coord.z;
            if (x < xmin) xmin = x;
            if (x > xmax) xmax = x;
            if (y < ymin) ymin = y;
            if (y > ymax) ymax = y;
            if (z < zmin) zmin = z;
            if (z > zmax) zmax = z;
        }

        return [xmin, ymin, zmin, xmax, ymax, zmax];
    }

    public toString(): string {
        return (
            `[${this.southWest.lon.toFixed(5)}, ${this.southWest.lat.toFixed(5)}, ${this.northEast.lon.toFixed(5)}, ${this.northEast.lat.toFixed(5)}]`
        );
    }
}
