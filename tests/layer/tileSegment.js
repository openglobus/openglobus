import { Extent } from "../../src/Extent";
import { LonLat } from "../../src/LonLat";
import { EPSG4326 } from "../../src/proj/EPSG4326";

/**
 * The segment of a tile the GeoTIFF reader needs: its extent and its points. A Web Mercator tile by default, a lon/lat
 * one for EPSG:4326.
 */
export function tileSegment(extentLonLat, proj) {
    if (proj === EPSG4326) {
        return {
            getExtent: () => extentLonLat,
            getExtentLonLat: () => extentLonLat,
            getLonLat: (lon, lat) => new LonLat(lon, lat)
        };
    }

    const native = new Extent(extentLonLat.southWest.forwardMercator(), extentLonLat.northEast.forwardMercator());

    return {
        getExtent: () => native,
        getExtentLonLat: () => extentLonLat,
        getLonLat: (x, y) => LonLat.inverseMercator(x, y)
    };
}
