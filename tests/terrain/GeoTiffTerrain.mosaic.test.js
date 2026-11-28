import { vi } from "vitest";

vi.mock("../../src/utils/RasterWorker", () => ({ getRasterWorker: () => null }));

import { writeArrayBuffer } from "geotiff";
import { GeoTiffTerrain } from "../../src/terrain/GeoTiffTerrain";
import { GeoTIFFReader } from "../../src/layer/geotiff/GeoTIFFReader";
import { MultiGeoTIFFReader } from "../../src/layer/geotiff/MultiGeoTIFFReader";
import { QuadTreeStrategy } from "../../src/quadTree/QuadTreeStrategy";
import { SegmentLonLatEqui } from "../../src/segment/SegmentLonLatEqui";
import { Extent } from "../../src/Extent";
import { LonLat } from "../../src/LonLat";
import * as mercator from "../../src/mercator";

const SIZE = 64;

// Single band GeoTIFF over [west, south, east, north] in its own units, the rows go from the north
function createTiff(values, [west, south, east, north], geoKeys = { GeographicTypeGeoKey: 4326 }) {
    const buf = writeArrayBuffer(values, {
        width: SIZE,
        height: SIZE,
        BitsPerSample: [32],
        SampleFormat: [3],
        ModelPixelScale: [(east - west) / SIZE, (north - south) / SIZE, 0],
        ModelTiepoint: [0, 0, 0, west, north, 0],
        ...geoKeys
    });
    return new Blob([buf]);
}

// One height over half a degree of longitude from the west edge, from 45 to 46 degrees of latitude
const createFlatTiff = (west, height) =>
    createTiff(new Float32Array(SIZE * SIZE).fill(height), [west, 45, west + 0.5, 46]);

// Planet of one lon/lat quad tree root over the world
function createPlanet() {
    const quadTreeStrategy = {
        planet: { renderer: { handler: {} }, terrain: { gridSizeByZoom: [] } },
        _quadTreeList: [],
        rootTileWidth: 360,
        getNodeByLonLat: QuadTreeStrategy.prototype.getNodeByLonLat
    };
    const root = { nodes: [], SegmentPrototype: SegmentLonLatEqui, quadTreeStrategy };
    root.segment = new SegmentLonLatEqui(
        root,
        quadTreeStrategy,
        0,
        new Extent(new LonLat(-180, -90), new LonLat(180, 90))
    );
    root.segment._setExtentLonLat();
    quadTreeStrategy._quadTreeList.push(root);
    return { quadTreeStrategy };
}

async function createTerrain(options) {
    const terrain = new GeoTiffTerrain(null, {
        workerPoolSize: 0,
        plainGridSize: 32,
        sampleSize: 64,
        geoidSrc: null,
        maxZoom: 12,
        maxNativeZoom: 12,
        ...options
    });
    await terrain.whenReady();
    terrain._planet = createPlanet();
    return terrain;
}

const heightAt = (terrain, lon, lat, zoom) =>
    new Promise((resolve) => terrain.getHeightAsync(new LonLat(lon, lat), resolve, zoom));

const extentOf = (terrain) => {
    const { southWest: sw, northEast: ne } = terrain.getExtent();
    return [sw.lon, sw.lat, ne.lon, ne.lat];
};

test("GeoTiffTerrain mosaic of two adjacent files has the heights of each file", async () => {
    const terrain = await createTerrain({
        sources: [{ src: createFlatTiff(10, 100) }, { src: createFlatTiff(10.5, 200) }]
    });

    expect(terrain.reader).toBeInstanceOf(MultiGeoTIFFReader);
    expect(terrain.reader.isReady).toBe(true);
    expect(extentOf(terrain)).toEqual([10, 45, 11, 46]);

    // Zoom 12 tiles are inside one file
    expect(await heightAt(terrain, 10.25, 45.5, 12)).toBe(100);
    expect(await heightAt(terrain, 10.75, 45.5, 12)).toBe(200);

    // A zoom 6 tile has both files and no data around them
    expect(await heightAt(terrain, 10.25, 45.5, 6)).toBe(100);
    expect(await heightAt(terrain, 10.75, 45.5, 6)).toBe(200);
    expect(await heightAt(terrain, 10.75, 46.5, 6)).toBe(terrain.noDataValues[0]);
});

test("GeoTiffTerrain mosaic sources take their own nodata and crs", async () => {
    // Web Mercator meters the file takes for degrees, its north rows are nodata
    const values = new Float32Array(SIZE * SIZE).fill(200).fill(-9999, 0, (SIZE * SIZE) / 2),
        bbox = [mercator.forward_lon(10.5), mercator.forward_lat(45), mercator.forward_lon(11), mercator.forward_lat(46)];

    const terrain = await createTerrain({
        sources: [{ src: createFlatTiff(10, 100) }, { src: createTiff(values, bbox), crs: 3857, nodata: -9999 }]
    });

    const [west, south, east, north] = extentOf(terrain);
    expect([west, south]).toEqual([10, 45]);
    expect(east).toBeCloseTo(11, 9);
    expect(north).toBeCloseTo(46, 9);

    expect(await heightAt(terrain, 10.25, 45.5, 12)).toBe(100);
    expect(await heightAt(terrain, 10.75, 45.25, 12)).toBe(200);
    expect(await heightAt(terrain, 10.75, 45.75, 12)).toBe(terrain.noDataValues[0]);
});

test("GeoTiffTerrain of one src reads that file", async () => {
    const terrain = await createTerrain({ src: createFlatTiff(10.5, 200) });

    expect(terrain.reader).toBeInstanceOf(GeoTIFFReader);
    expect(terrain.reader.isReady).toBe(true);
    expect(extentOf(terrain)).toEqual([10.5, 45, 11, 46]);
    expect(await heightAt(terrain, 10.75, 45.5, 12)).toBe(200);
});
