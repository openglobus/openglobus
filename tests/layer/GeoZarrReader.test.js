import { describe, it, expect, vi } from "vitest";

// The raster worker runs in a browser, the tests resample in the main thread with the same functions
vi.mock("../../src/utils/RasterWorker", () => ({ getRasterWorker: () => null }));
import * as zarr from "zarrita";
import { GeoZarrReader } from "../../src/layer/geotiff/GeoZarrReader";
import { GeoZarrLayer } from "../../src/layer/GeoZarrLayer";
import { Extent } from "../../src/Extent";
import { LonLat } from "../../src/LonLat";
import { EPSG4326 } from "../../src/proj/EPSG4326";

function strides(shape) {
    const s = new Array(shape.length).fill(1);
    for (let i = shape.length - 2; i >= 0; i--) s[i] = s[i + 1] * shape[i + 1];
    return s;
}

async function createArray(store, path, data, shape, options = {}) {
    const arr = await zarr.create(zarr.root(store).resolve(path), {
        shape,
        chunkShape: options.chunkShape ?? shape,
        dtype: options.dtype ?? "float32",
        fillValue: options.fillValue ?? null,
        dimensionNames: options.dimensionNames,
        attributes: options.attributes ?? {}
    });
    await zarr.set(arr, null, { data, shape, stride: strides(shape) });
    return arr;
}

function fill(shape, fn, Type = Float32Array) {
    const [h, w] = shape;
    const data = new Type(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[y * w + x] = fn(x, y);
    return data;
}

/**
 * Store whose reads are recorded.
 */
function recording(store) {
    const keys = [];
    return {
        keys,
        get: (key) => {
            keys.push(key);
            return store.get(key);
        }
    };
}

/**
 * Zarr v3 multiscales group in lon/lat, one degree a pixel of level 0: b1 is the column, b2 is the row.
 */
async function createMultiscalesStore() {
    const store = new Map();
    await zarr.create(zarr.root(store), {
        attributes: {
            multiscales: {
                layout: [
                    { asset: "0", "spatial:transform": [1, 0, 0, 0, -1, 64], "spatial:shape": [64, 64] },
                    { asset: "1", derived_from: "0", transform: { scale: [2, 2] } }
                ]
            },
            "proj:code": "EPSG:4326"
        }
    });
    for (const [level, size] of [
        ["1", 32],
        ["0", 64]
    ]) {
        const f = 64 / size;
        await zarr.create(zarr.root(store).resolve(level), { attributes: {} });
        const options = { chunkShape: [16, 16], dimensionNames: ["y", "x"] };
        await createArray(
            store,
            `${level}/b1`,
            fill([size, size], (x) => x * f),
            [size, size],
            options
        );
        await createArray(
            store,
            `${level}/b2`,
            fill([size, size], (_x, y) => y * f),
            [size, size],
            options
        );
    }
    return store;
}

const tileExtent = (w, s, e, n) => new Extent(new LonLat(w, s), new LonLat(e, n));

describe("GeoZarrReader multiscales", () => {
    it("reads the levels, the georeference and the statistics", async () => {
        const reader = new GeoZarrReader({ bands: ["b1", "b2"] });
        const meta = await reader.init(await createMultiscalesStore());

        expect(meta.width).toBe(64);
        expect(meta.overviewCount).toBe(2);
        expect(meta.samplesPerPixel).toBe(2);
        expect(meta.crsCode).toBe(4326);
        expect(meta.isTiled).toBe(true);
        expect(reader.reverseY).toBe(false);
        expect(reader.extentWgs84.southWest.lon).toBe(0);
        expect(reader.extentWgs84.northEast.lat).toBe(64);
        // Statistics come from the coarsest level
        expect(meta.bands[1]).toEqual({ min: 0, max: 62 });
    });

    it("reads a tile with the source values and fetches only its chunk", async () => {
        const rec = recording(await createMultiscalesStore());
        const reader = new GeoZarrReader({ bands: ["b1", "b2"] });
        await reader.init(rec);
        rec.keys.length = 0;

        const tile = await reader.readTileRasters(tileExtent(0, 48, 16, 64), 4, 16, [0, 1], EPSG4326);

        expect(tile.rasters).toHaveLength(2);
        for (let j = 0; j < 16; j++) {
            for (let i = 0; i < 16; i++) {
                expect(tile.rasters[0][j * 16 + i]).toBe(i);
                expect(tile.rasters[1][j * 16 + i]).toBe(j);
            }
        }

        const chunkKeys = rec.keys.filter((k) => !k.endsWith("zarr.json") && !/\.z(array|attrs|group)$/.test(k));
        expect(chunkKeys.sort()).toEqual(["/0/b1/c/0/0", "/0/b2/c/0/0"]);
    });

    it("takes the coarse level for a zoomed out tile", async () => {
        const rec = recording(await createMultiscalesStore());
        const reader = new GeoZarrReader({ bands: ["b1", "b2"] });
        await reader.init(rec);
        rec.keys.length = 0;

        // The band statistics decoded the coarse chunk already
        reader._chunkCache.clear();

        const tile = await reader.readTileRasters(tileExtent(0, 0, 64, 64), 1, 16, [0], EPSG4326);

        expect(tile.rasters).toHaveLength(1);
        expect(rec.keys.some((k) => k.startsWith("/1/b1/c/"))).toBe(true);
        expect(rec.keys.some((k) => k.startsWith("/0/"))).toBe(false);
    });

    it("reads a tile again from the decoded chunks", async () => {
        const rec = recording(await createMultiscalesStore());
        const reader = new GeoZarrReader({ bands: ["b1", "b2"] });
        await reader.init(rec);

        const first = await reader.readTileRasters(tileExtent(0, 48, 16, 64), 4, 16, [0, 1], EPSG4326);
        rec.keys.length = 0;
        const second = await reader.readTileRasters(tileExtent(0, 48, 16, 64), 4, 16, [0, 1], EPSG4326);

        expect(rec.keys).toEqual([]);
        expect(second.rasters).toEqual(first.rasters);
    });

    it("returns null out of the raster and NaN out of the extent", async () => {
        const reader = new GeoZarrReader({ bands: ["b1", "b2"] });
        await reader.init(await createMultiscalesStore());

        expect(await reader.readTileRasters(tileExtent(100, 0, 110, 10), 4, 16, [0], EPSG4326)).toBeNull();

        const tile = await reader.readTileRasters(tileExtent(-16, 48, 16, 64), 4, 16, [0], EPSG4326);
        expect(tile.rasters[0][0]).toBeNaN();
        expect(tile.rasters[0][15]).toBe(14);
    });

    it("skips a level without a band", async () => {
        const store = await createMultiscalesStore();
        await createArray(
            store,
            "1/b3",
            fill([32, 32], () => 1),
            [32, 32],
            { dimensionNames: ["y", "x"] }
        );
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const reader = new GeoZarrReader({ bands: ["b1", "b3"] });
        const meta = await reader.init(store);

        expect(meta.overviewCount).toBe(1);
        expect(meta.width).toBe(32);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });

    it("throws without the arrays", async () => {
        const reader = new GeoZarrReader({ bands: ["nope"] });
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        await expect(reader.init(await createMultiscalesStore())).rejects.toThrow(/no pyramid level/);
        warn.mockRestore();
        await expect(new GeoZarrReader({ bands: ["b1"], variable: "v" }).init(new Map())).rejects.toThrow();
    });
});

/**
 * Zarr v2 group, south row first, with uint16 values packed by scale_factor and add_offset, 0 is the fill value.
 */
function createV2Store(scale_factor = 0.5, add_offset = 1) {
    const store = new Map();
    const enc = (obj) => new TextEncoder().encode(JSON.stringify(obj));
    const zarray = (shape, dtype, fill_value) => ({
        zarr_format: 2,
        shape,
        chunks: shape,
        dtype,
        fill_value,
        order: "C",
        compressor: null,
        filters: null
    });
    const centers = new Float64Array(8).map((_, i) => i + 0.5);

    store.set("/.zgroup", enc({ zarr_format: 2 }));
    store.set("/.zattrs", enc({}));
    store.set("/data/.zarray", enc(zarray([8, 8], "<u2", 0)));
    store.set("/data/.zattrs", enc({ _ARRAY_DIMENSIONS: ["lat", "lon"], scale_factor, add_offset }));
    // Row is the latitude from the south, the first pixel is the fill value
    store.set("/data/0.0", new Uint8Array(fill([8, 8], (x, y) => y * 8 + x, Uint16Array).buffer));
    for (const name of ["lat", "lon"]) {
        store.set(`/${name}/.zarray`, enc(zarray([8], "<f8", null)));
        store.set(`/${name}/.zattrs`, enc({ _ARRAY_DIMENSIONS: [name] }));
        store.set(`/${name}/0`, new Uint8Array(centers.buffer));
    }
    return store;
}

describe("GeoZarrReader Zarr v2", () => {
    it("reads the coordinates, the packing and the south-up rows", async () => {
        const reader = new GeoZarrReader({ variable: "data" });
        const meta = await reader.init(createV2Store());

        expect(meta.bbox).toEqual([0, 0, 8, 8]);
        expect(meta.crsCode).toBe(4326);
        // The fill value is NaN after the decoding
        expect(meta.noData).toBeNaN();
        expect(reader.reverseY).toBe(true);

        const tile = await reader.readTileRasters(tileExtent(0, 0, 8, 8), 4, 8, [0], EPSG4326);
        const raster = tile.rasters[0];

        // The tile goes from the north, its last row is the first source row
        for (let j = 0; j < 8; j++) {
            for (let i = 0; i < 8; i++) {
                const raw = (7 - j) * 8 + i;
                const expected = raw === 0 ? NaN : raw * 0.5 + 1;
                expect(raster[j * 8 + i]).toBe(expected);
            }
        }
    });

    it("keeps a value that unpacks to the raw fill value", async () => {
        const reader = new GeoZarrReader({ variable: "data" });
        await reader.init(createV2Store(0.5, -1));

        const tile = await reader.readTileRasters(tileExtent(0, 0, 8, 8), 4, 8, [0], EPSG4326);
        const lastRow = tile.rasters[0].subarray(7 * 8);

        // Raw 0 is the fill, raw 2 is 2 * 0.5 - 1 = 0
        expect(lastRow[0]).toBeNaN();
        expect(lastRow[2]).toBe(0);
    });

    it("reads the root consolidated metadata of a group", async () => {
        const files = new Map();
        const enc = (obj) => new TextEncoder().encode(JSON.stringify(obj));
        const metadata = {};
        for (const [key, bytes] of createV2Store()) {
            files.set(`https://example.com/store.zarr/sub${key}`, bytes);
            if (/\.z(array|attrs|group)$/.test(key)) {
                metadata[`sub${key}`] = JSON.parse(new TextDecoder().decode(bytes));
            }
        }
        metadata[".zgroup"] = { zarr_format: 2 };
        files.set("https://example.com/store.zarr/.zmetadata", enc({ zarr_consolidated_format: 1, metadata }));

        const urls = [];
        vi.stubGlobal("fetch", async (request) => {
            const url = typeof request === "string" ? request : request.url;
            urls.push(url);
            const bytes = files.get(url);
            return bytes ? new Response(bytes) : new Response(null, { status: 404 });
        });

        try {
            const reader = new GeoZarrReader({ url: "https://example.com/store.zarr", group: "sub", variable: "data" });
            const meta = await reader.init();

            expect(meta.bbox).toEqual([0, 0, 8, 8]);
            // Only missing keys, such as the probe of the group as an array, go to the store
            const metadataUrls = Object.keys(metadata).map((k) => `https://example.com/store.zarr/${k}`);
            expect(urls.filter((u) => metadataUrls.includes(u))).toEqual([]);

            const tile = await reader.readTileRasters(tileExtent(0, 0, 8, 8), 4, 8, [0], EPSG4326);
            expect(tile.rasters[0][7 * 8 + 1]).toBe(1.5);
        } finally {
            vi.unstubAllGlobals();
        }
    });
});

describe("GeoZarrReader bounding box", () => {
    it("takes the row order of the y coordinates with spatial:bbox", async () => {
        const store = new Map();
        await zarr.create(zarr.root(store), {
            attributes: { "spatial:bbox": [0, 0, 4, 4], "proj:code": "EPSG:4326" }
        });
        // Row is the latitude from the south
        await createArray(
            store,
            "data",
            fill([4, 4], (x, y) => y * 4 + x),
            [4, 4],
            { dimensionNames: ["lat", "lon"] }
        );
        const centers = new Float64Array([0.5, 1.5, 2.5, 3.5]);
        for (const name of ["lat", "lon"]) {
            await createArray(store, name, centers, [4], { dtype: "float64", dimensionNames: [name] });
        }

        const reader = new GeoZarrReader({ variable: "data" });
        await reader.init(store);
        expect(reader.reverseY).toBe(true);

        const tile = await reader.readTileRasters(tileExtent(0, 0, 4, 4), 4, 4, [0], EPSG4326);
        // The north tile row is the last source row
        expect(Array.from(tile.rasters[0].subarray(0, 4))).toEqual([12, 13, 14, 15]);
    });
});

describe("GeoZarrReader destroy", () => {
    it("drops the arrays after the last read", async () => {
        const reader = new GeoZarrReader({ bands: ["b1", "b2"] });
        await reader.init(await createMultiscalesStore());
        reader._chunkCache.clear();

        const reading = reader.readTileRasters(tileExtent(0, 48, 16, 64), 4, 16, [0, 1], EPSG4326);
        reader.destroy();

        expect(reader._levels).not.toHaveLength(0);
        const tile = await reading;
        expect(tile.rasters).toHaveLength(2);
        expect(reader._levels).toHaveLength(0);
        expect(await reader.readTileRasters(tileExtent(0, 48, 16, 64), 4, 16, [0, 1], EPSG4326)).toBeNull();
    });
});

/**
 * Zarr v3 (time, wavelength, y, x) cube of one level: value = time * 100 + wavelength * 10 + y * 4 + x.
 */
async function createCubeStore() {
    const store = new Map();
    await zarr.create(zarr.root(store), {
        attributes: { "spatial:bbox": [0, 0, 4, 4], "proj:code": "EPSG:4326" }
    });
    const shape = [2, 3, 4, 4];
    const data = new Float32Array(2 * 3 * 16);
    for (let t = 0; t < 2; t++)
        for (let b = 0; b < 3; b++) for (let p = 0; p < 16; p++) data[(t * 3 + b) * 16 + p] = t * 100 + b * 10 + p;
    await createArray(store, "cube", data, shape, {
        chunkShape: [1, 1, 4, 4],
        dimensionNames: ["time", "wavelength", "y", "x"]
    });
    await createArray(store, "time", new Float64Array([0, 31]), [2], {
        dtype: "float64",
        dimensionNames: ["time"],
        attributes: { units: "days since 2020-01-01" }
    });
    await createArray(store, "wavelength", new Float64Array([490, 560, 665]), [3], {
        dtype: "float64",
        dimensionNames: ["wavelength"],
        attributes: { units: "nm" }
    });
    return store;
}

async function readPixel(reader, sample) {
    const { rasters } = await reader._readWindow(0, [0, 0, 4, 4], [sample]);
    return rasters[0][0];
}

describe("GeoZarrReader dimensions", () => {
    it("lists the extra dimensions with their labels", async () => {
        const reader = new GeoZarrReader({ variable: "cube" });
        await reader.init(await createCubeStore());

        expect(reader.getDimensions()).toEqual([
            {
                name: "time",
                axisIndex: 0,
                size: 2,
                values: ["2020-01-01T00:00:00.000Z", "2020-02-01T00:00:00.000Z"],
                units: "days since 2020-01-01"
            },
            { name: "wavelength", axisIndex: 1, size: 3, values: [490, 560, 665], units: "nm" }
        ]);
        // Not given dimensions take the first entry
        expect(await readPixel(reader, 0)).toBe(0);
    });

    it("selects by index and label, a list makes the samples", async () => {
        const reader = new GeoZarrReader({
            variable: "cube",
            dimensions: { time: "2020-02", wavelength: ["665", "560", "490"] }
        });
        const meta = await reader.init(await createCubeStore());

        expect(meta.samplesPerPixel).toBe(3);
        expect(await readPixel(reader, 0)).toBe(120);
        expect(await readPixel(reader, 2)).toBe(100);

        reader.setDimensions({ time: 0 });
        expect(reader.getDimensionValues()).toEqual({ time: 0, wavelength: ["665", "560", "490"] });
        expect(await readPixel(reader, 1)).toBe(10);
    });

    it("throws for unknown dimensions, out of range indexes and other sample counts", async () => {
        const reader = new GeoZarrReader({ variable: "cube" });
        await reader.init(await createCubeStore());

        expect(() => reader.setDimensions({ depth: 0 })).toThrow(/no dimension/);
        expect(() => reader.setDimensions({ time: 5 })).toThrow(/out of range/);
        expect(() => reader.setDimensions({ wavelength: [0, 1] })).toThrow(/samples/);
        // A failed selection keeps the previous one
        expect(reader.getDimensionValues()).toEqual({});
    });

    it("reads an array that stores x before y", async () => {
        const store = new Map();
        await zarr.create(zarr.root(store), { attributes: { "spatial:bbox": [0, 0, 4, 2] } });
        // shape [x, y], value = x * 10 + y
        await createArray(
            store,
            "v",
            fill([4, 2], (y, x) => x * 10 + y),
            [4, 2],
            { dimensionNames: ["lon", "lat"] }
        );

        const reader = new GeoZarrReader({ variable: "v" });
        const meta = await reader.init(store);
        expect([meta.width, meta.height]).toEqual([4, 2]);

        const { rasters } = await reader._readWindow(0, [0, 0, 4, 2]);
        expect(Array.from(rasters[0])).toEqual([0, 10, 20, 30, 1, 11, 21, 31]);
    });
});

describe("GeoZarr 0..360 longitudes", () => {
    it("reads the western hemisphere of a 0..360 raster", async () => {
        const store = new Map();
        await zarr.create(zarr.root(store), {
            attributes: { "spatial:transform": [90, 0, 0, 0, -90, 90] }
        });
        await createArray(
            store,
            "v",
            fill([2, 4], (x) => x),
            [2, 4],
            { dimensionNames: ["lat", "lon"] }
        );

        const reader = new GeoZarrReader({ variable: "v" });
        await reader.init(store);

        expect(reader.crsCode).toBe(4326);
        expect(reader.extentWgs84.southWest.lon).toBe(-180);
        expect(reader.extentWgs84.northEast.lon).toBe(180);

        // lon -90..0 is 270..360, the last column
        const tile = await reader.readTileRasters(tileExtent(-90, 0, 0, 90), 2, 4, [0], EPSG4326);
        expect(Array.from(tile.rasters[0]).every((v) => v === 3)).toBe(true);

        // lon 0..90 is the first column
        const east = await reader.readTileRasters(tileExtent(0, 0, 90, 90), 2, 4, [0], EPSG4326);
        expect(Array.from(east.rasters[0]).every((v) => v === 0)).toBe(true);
    });

    it("reads the columns past the east edge of a raster around the globe from its west edge", async () => {
        const store = new Map();
        await zarr.create(zarr.root(store), { attributes: {} });
        // Cell centers 0, 2.8125 .. 357.1875 as CMIP6 models have them, the raster goes from -1.40625 to 358.59375
        await createArray(
            store,
            "tas",
            fill([4, 128], (x) => x),
            [4, 128],
            { dimensionNames: ["lat", "lon"] }
        );
        await createArray(store, "lon", Float64Array.from({ length: 128 }, (_, i) => i * 2.8125), [128], {
            dtype: "float64",
            dimensionNames: ["lon"]
        });
        await createArray(store, "lat", new Float64Array([-60, -20, 20, 60]), [4], {
            dtype: "float64",
            dimensionNames: ["lat"]
        });

        const reader = new GeoZarrReader({ variable: "tas" });
        await reader.init(store);

        // lon -5.625..0 is 354.375..360, the last two columns and the half of the first one past the east edge
        const tile = await reader.readTileRasters(tileExtent(-5.625, -10, 0, 10), 3, 16, [0], EPSG4326);
        const row = Array.from(tile.rasters[0].subarray(8 * 16, 9 * 16));

        expect(row.slice(0, 4)).toEqual([126, 126, 126, 126]);
        expect(row.slice(4, 12)).toEqual(new Array(8).fill(127));
        expect(row.slice(12)).toEqual([0, 0, 0, 0]);

        // The projection gives the zero meridian a bit east of 0, the east edge of a western tile still goes to 360
        const west = await reader.readTileRasters(tileExtent(-11.25, -10, 1e-14, 10), 5, 256, [0], EPSG4326);
        const westRow = Array.from(west.rasters[0].subarray(128 * 256, 129 * 256));

        expect(westRow[0]).toBe(124);
        expect(westRow.slice(1).every((v, i) => v >= westRow[i] || (v === 0 && westRow[i] === 127))).toBe(true);
        expect(westRow[255]).toBe(0);
    });
});

describe("GeoZarrLayer", () => {
    it("opens the store, sets the extent and reloads tiles for other dimensions", async () => {
        const layer = new GeoZarrLayer("cube", {
            url: await createCubeStore(),
            variable: "cube",
            dimensions: { wavelength: [2, 1, 0] },
            renderOptions: { multi: { r: { band: 1 }, g: { band: 2 }, b: { band: 3 } } }
        });

        const meta = await layer.whenReady();

        expect(layer.instanceName).toBe("GeoZarrLayer");
        expect(meta.samplesPerPixel).toBe(3);
        expect(layer.getExtent().northEast.lat).toBe(4);
        expect(layer.getDimensions().map((d) => d.name)).toEqual(["time", "wavelength"]);

        const clearCache = vi.spyOn(layer, "clearCache");
        const version = layer._dataVersion;

        layer.setDimensions({ time: "2020-02-01" });

        expect(layer.getDimensionValues().time).toBe("2020-02-01");
        expect(layer._dataVersion).toBe(version + 1);
        expect(clearCache).toHaveBeenCalled();
    });

    it("keeps the rendered images until the tiles of other dimensions are read", async () => {
        const layer = new GeoZarrLayer("cube", {
            url: await createCubeStore(),
            variable: "cube",
            renderOptions: { single: { band: 1, colorScale: "viridis", domain: [0, 200] } }
        });
        await layer.whenReady();

        const segment = {
            tileZoom: 4,
            tileX: 0,
            tileY: 0,
            initialized: true,
            materials: {},
            getExtentLonLat: () => tileExtent(0, 0, 4, 4)
        };
        const oldTexture = {};
        const material = {
            segment,
            layer,
            isReady: true,
            isLoading: false,
            texture: oldTexture,
            applyImage: vi.fn(function () {
                this.isReady = true;
                this.isLoading = false;
            })
        };
        segment.materials[layer.__id] = material;
        const clearLayerMaterial = vi.fn();
        layer._planet = {
            quadTreeStrategy: { clearLayerMaterial, _renderedNodes: [{ segment }] },
            renderer: { requestRedraw: () => {} }
        };

        // The first read is of the older time, the second one of the newer time
        const reads = [];
        vi.spyOn(layer._reader, "readTileRasters").mockImplementation(
            () => new Promise((resolve) => reads.push(resolve))
        );
        const tile = { rasters: [new Float32Array(16).fill(100)], width: 4, height: 4 };

        layer.setDimensions({ time: 1 });

        expect(clearLayerMaterial).toHaveBeenCalledWith(layer, true);
        expect(material.texture).toBe(oldTexture);
        expect(material.isReady).toBe(true);
        expect(reads).toHaveLength(1);

        layer.setDimensions({ time: 0 });
        reads[0](tile);
        await Promise.resolve();
        await Promise.resolve();

        // The read of the older time is not shown, the tile is read again
        expect(material.applyImage).not.toHaveBeenCalled();
        expect(reads).toHaveLength(2);

        reads[1](tile);
        await vi.waitFor(() => expect(material.applyImage).toHaveBeenCalledTimes(1));
        expect(material.isLoading).toBe(false);
    });
});
