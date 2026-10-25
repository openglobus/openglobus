import { GeoTiffTerrain } from "../../src/terrain/GeoTiffTerrain";
import { GeoTIFFReader } from "../../src/layer/geotiff/GeoTIFFReader";
import { Extent } from "../../src/Extent";
import { LonLat } from "../../src/LonLat";

// The reader opens a GeoTIFF of the width pixels over the lon degrees
function stubSource(width, lon) {
    return vi.spyOn(GeoTIFFReader.prototype, "init").mockImplementation(function () {
        this.extentWgs84 = new Extent(new LonLat(0, 40), new LonLat(lon, 43));
        this.isReady = true;
        return Promise.resolve({ crsResolved: true, width: width });
    });
}

afterEach(() => {
    vi.restoreAllMocks();
});

test("GeoTiffTerrain native zoom is the first zoom which pixels are not larger than the GeoTIFF ones", async () => {
    // Web Mercator z16 pixels of the 256 tiles, 640 tiles by the side
    stubSource(163840, 3.515625);

    let terrain = new GeoTiffTerrain(null, { src: "dem.tif" });
    await terrain.whenReady();
    expect(terrain.maxNativeZoom).toBe(16);

    terrain = new GeoTiffTerrain(null, { src: "dem.tif", sampleSize: 512 });
    await terrain.whenReady();
    expect(terrain.maxNativeZoom).toBe(15);

    // A bit finer than z16 pixels
    stubSource(163841, 3.515625);
    terrain = new GeoTiffTerrain(null, { src: "dem.tif" });
    await terrain.whenReady();
    expect(terrain.maxNativeZoom).toBe(17);

    terrain = new GeoTiffTerrain(null, { src: "dem.tif", maxZoom: 16 });
    await terrain.whenReady();
    expect(terrain.maxNativeZoom).toBe(16);

    terrain = new GeoTiffTerrain(null, { src: "dem.tif", maxNativeZoom: 14 });
    await terrain.whenReady();
    expect(terrain.maxNativeZoom).toBe(14);
});

test("GeoTiffTerrain segments wait for the source", async () => {
    stubSource(163840, 3.515625);
    const read = vi.spyOn(GeoTIFFReader.prototype, "readTileRasters").mockResolvedValue(null);

    const terrain = new GeoTiffTerrain(null, { src: "dem.tif" }),
        segment = { terrainIsLoading: true };

    terrain.loadTerrain(segment);

    expect(segment.terrainIsLoading).toBe(false);
    expect(read).not.toHaveBeenCalled();

    await terrain.whenReady();
    expect(terrain._sourceReady).toBe(true);
});

test("GeoTiffTerrain without the source has no heights", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(GeoTIFFReader.prototype, "init").mockRejectedValue(new Error("not a GeoTIFF"));

    const terrain = new GeoTiffTerrain(null, { src: "broken.tif" });
    await terrain.whenReady();

    expect(terrain._sourceReady).toBe(true);
    expect(error).toHaveBeenCalled();
    expect(await terrain._readHeights({ getExtentLonLat: () => new Extent(), tileZoom: 3 })).toBe(null);
});

test("GeoTiffTerrain reads sampleSize pixels of the band in the segment projection", async () => {
    stubSource(163840, 3.515625);
    const pixels = new Float32Array(64 * 64),
        read = vi
            .spyOn(GeoTIFFReader.prototype, "readTileRasters")
            .mockResolvedValueOnce({ rasters: [pixels] })
            .mockResolvedValueOnce(null);

    const terrain = new GeoTiffTerrain(null, { src: "dem.tif", sampleSize: 64, plainGridSize: 32, band: 2 }),
        extent = new Extent(new LonLat(1, 41), new LonLat(2, 42)),
        projection = {},
        segment = { getExtentLonLat: () => extent, tileZoom: 9, _projection: projection };

    await terrain.whenReady();

    expect(await terrain._readHeights(segment)).toBe(pixels);
    expect(read).toHaveBeenCalledWith(extent, 9, 64, [1], projection);

    // Out of the GeoTIFF
    expect(await terrain._readHeights(segment)).toBe(null);
});
