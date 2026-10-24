import { RgbTerrain } from "../../src/terrain/RgbTerrain";
import { LonLat } from "../../src/LonLat";

// Terrain with one pixel images of 10m, the tile x is the point longitude
function createTerrain(options) {
    const terrain = new RgbTerrain(null, { encoding: "terrarium", imageSize: 1, ...options });

    terrain._planet = {
        quadTreeStrategy: {
            getTileXY: (lonLat, zoom) => [lonLat.lon, 0, zoom, 0],
            getLonLatTileOffset: () => [0, 0]
        }
    };

    // 128 * 256 + 10 - 32768 = 10m
    terrain._ctx = { clearRect() {}, drawImage() {}, getImageData: () => ({ data: [128, 10, 0, 255] }) };
    terrain._loader.fetch = vi.fn(() => Promise.resolve({ status: "ready", data: {} }));

    return terrain;
}

const flush = async () => {
    for (let i = 0; i < 4; i++) {
        await Promise.resolve();
    }
};

test("RgbTerrain getHeightAsync keeps the image pixels of the least recently used tiles", async () => {
    const terrain = createTerrain({ imageDataCacheSize: 2 }),
        heights = [];
    const getHeight = (lon) => terrain.getHeightAsync(new LonLat(lon, 0), (h) => heights.push(h), 5);

    expect(getHeight(1)).toBe(false);
    await flush();
    expect(heights).toEqual([10]);

    // Cached, the fetch is not kept
    expect(getHeight(1)).toBe(true);
    expect(terrain._fetchCache).toEqual({});

    getHeight(2);
    await flush();
    // The tile 1 is used after the tile 2, the tile 3 drops the tile 2
    expect(getHeight(1)).toBe(true);
    getHeight(3);
    await flush();

    expect(terrain._loader.fetch).toHaveBeenCalledTimes(3);
    expect(getHeight(1)).toBe(true);
    expect(getHeight(2)).toBe(false);
    await flush();

    expect(terrain._loader.fetch).toHaveBeenCalledTimes(4);
    expect(heights.every((h) => h === 10)).toBe(true);
});

test("RgbTerrain getHeightAsync does not repeat failed requests, clearCache drops the pixels", async () => {
    const terrain = createTerrain();
    terrain._loader.fetch.mockImplementation((params) =>
        Promise.resolve(params.src.includes("/5/") ? { status: "error" } : { status: "ready", data: {} })
    );

    const heights = [];
    terrain.getHeightAsync(new LonLat(1, 0), (h) => heights.push(h), 5);
    await flush();
    terrain.getHeightAsync(new LonLat(1, 0), (h) => heights.push(h), 5);
    await flush();

    // The zoom 5 request failed once, the zoom 4 heights are taken
    expect(terrain._loader.fetch.mock.calls.map((c) => c[0].src.split("/").slice(-3).join("/"))).toEqual([
        "5/1/0.pngraw?access_token=<key>",
        "4/1/0.pngraw?access_token=<key>"
    ]);
    expect(heights).toEqual([10, 10]);

    terrain.clearCache();
    expect(terrain._imageDataCache.size).toBe(0);
});
