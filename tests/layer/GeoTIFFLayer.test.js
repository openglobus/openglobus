import { describe, it, expect, vi } from "vitest";
import { GeoTIFFLayer } from "../../src/layer/GeoTIFFLayer";
import { Material } from "../../src/layer/Material";
import { GeoTIFFReader } from "../../src/layer/geotiff/GeoTIFFReader";
import { getProjectionHelper } from "../../src/layer/geotiff/utm";
import * as mercator from "../../src/mercator";
import { EPSG3857 } from "../../src/proj/EPSG3857";
import { EPSG4326 } from "../../src/proj/EPSG4326";
import { RENDERING, NOTRENDERING } from "../../src/quadTree/quadTree";
import {
    buildColorLUT,
    parseColor,
    getRasterMinMax,
    renderSingleBandToImageData,
    createImageData,
    renderMultiBandToImageData,
    parseNoDataValue,
    isNoData
} from "../../src/layer/geotiff/ColorScale";
import { Extent } from "../../src/Extent";
import { LonLat } from "../../src/LonLat";

describe("ColorScale & Palette", () => {
    it("should correctly parse hex and rgba colors", () => {
        expect(parseColor("#ff0000")).toEqual([255, 0, 0, 255]);
        expect(parseColor("#00ff00")).toEqual([0, 255, 0, 255]);
        expect(parseColor("#0000ff80")).toEqual([0, 0, 255, 128]);
        expect(parseColor("rgb(10, 20, 30)")).toEqual([10, 20, 30, 255]);
        expect(parseColor("rgba(10, 20, 30, 0.5)")).toEqual([10, 20, 30, 128]);
    });

    it("should parse various nodata representations", () => {
        expect(parseNoDataValue(undefined)).toBeUndefined();
        expect(parseNoDataValue(null)).toBeNull();
        expect(parseNoDataValue("null")).toBeNull();
        expect(parseNoDataValue("none")).toBeNull();
        expect(Number.isNaN(parseNoDataValue(NaN))).toBe(true);
        expect(Number.isNaN(parseNoDataValue("nan"))).toBe(true);
        expect(Number.isNaN(parseNoDataValue("NaN"))).toBe(true);
        expect(parseNoDataValue(-9999)).toBe(-9999);
        expect(parseNoDataValue("-9999")).toBe(-9999);
        expect(parseNoDataValue(0)).toBe(0);
        expect(parseNoDataValue(0.00010976348130498081)).toBe(0.00010976348130498081);
    });

    it("should evaluate isNoData properly for numbers, NaN, null, and floats", () => {
        // NaN raster values should always be nodata
        expect(isNoData(NaN, null)).toBe(true);
        expect(isNoData(NaN, undefined)).toBe(true);
        expect(isNoData(NaN, -9999)).toBe(true);
        expect(isNoData(NaN, NaN)).toBe(true);

        // When nodata is null or NaN or undefined, regular numbers are NOT nodata
        expect(isNoData(0, null)).toBe(false);
        expect(isNoData(-9999, null)).toBe(false);
        expect(isNoData(-9999, NaN)).toBe(false);
        expect(isNoData(100, undefined)).toBe(false);

        // Standard matching
        expect(isNoData(-9999, -9999)).toBe(true);
        expect(isNoData(0, 0)).toBe(true);

        // Float precision matching
        expect(isNoData(Math.fround(0.00010976348130498081), 0.00010976348130498081)).toBe(true);
    });

    it("should build 256-color LUT for built-in viridis", () => {
        const lut = buildColorLUT({ colorScale: "viridis" });
        expect(lut.length).toBe(256 * 4);
        expect(lut[3]).toBe(255); // Alpha channel
    });

    it("should build 256-color LUT for custom color stops", () => {
        const lut = buildColorLUT({
            colors: [
                [0, "#000000"],
                [1, "#ffffff"]
            ]
        });
        expect(lut.length).toBe(1024);
        expect(lut[0]).toBe(0); // Black at start
        expect(lut[1020]).toBe(255); // White at end
    });

    it("should correctly compute min/max excluding NoData and NaN", () => {
        const data = new Float32Array([10, -9999, 20, NaN, 50, -9999]);
        const minMax = getRasterMinMax(data, -9999);
        expect(minMax.min).toBe(10);
        expect(minMax.max).toBe(50);
    });

    it("should render single-band raster to ImageData with transparent NoData", () => {
        const data = new Float32Array([0, 50, 100, -9999]);
        const imgData = renderSingleBandToImageData(data, 2, 2, {
            domain: [0, 100],
            colorScale: "viridis"
        }, -9999);

        expect(imgData.width).toBe(2);
        expect(imgData.height).toBe(2);
        // Last pixel is NoData => alpha must be 0
        expect(imgData.data[3 * 4 + 3]).toBe(0);
        // First pixel is valid => alpha must be 255
        expect(imgData.data[3]).toBe(255);
    });

    it("should render multi-band RGB rasters", () => {
        const r = new Uint8Array([255, 0]);
        const g = new Uint8Array([0, 255]);
        const b = new Uint8Array([0, 0]);

        const imgData = renderMultiBandToImageData(r, g, b, 2, 1);
        expect(imgData.data[0]).toBe(255); // R
        expect(imgData.data[1]).toBe(0);   // G
        expect(imgData.data[2]).toBe(0);   // B
        expect(imgData.data[3]).toBe(255); // A

        expect(imgData.data[4]).toBe(0);   // R
        expect(imgData.data[5]).toBe(255); // G
        expect(imgData.data[6]).toBe(0);   // B
        expect(imgData.data[7]).toBe(255); // A
    });
});

describe("GeoTIFFLayer", () => {
    it("should instantiate with default options", () => {
        const layer = new GeoTIFFLayer("test-tiff", {
            url: "https://example.com/cog.tif"
        });

        expect(layer.instanceName).toBe("GeoTIFFLayer");
        expect(layer.name).toBe("test-tiff");
        expect(layer.reader).toBeTruthy();
    });

    it("requests the visible tile without waiting for the parent material", () => {
        const layer = new GeoTIFFLayer("test-tiff", { url: "https://example.com/cog.tif" });
        expect(layer.waitForParentMaterial).toBe(false);

        const waiting = new GeoTIFFLayer("test-tiff", {
            url: "https://example.com/cog.tif",
            waitForParentMaterial: true
        });
        expect(waiting.waitForParentMaterial).toBe(true);
    });
    it("should support opacity property and opacity setter/getter methods", () => {
        const layer = new GeoTIFFLayer("test-tiff", {
            url: "https://example.com/cog.tif",
            opacity: 0.75
        });

        expect(layer.opacity).toBe(0.75);

        layer.opacity = 0.4;
        expect(layer.opacity).toBe(0.4);

        layer.opacity = 0.9;
        expect(layer.opacity).toBe(0.9);
    });

    it("should update render options and clear cache", () => {
        const layer = new GeoTIFFLayer("test-tiff", {
            url: "https://example.com/cog.tif"
        });

        layer.setRenderOptions({
            single: { band: 2, colorScale: "turbo" }
        });

        expect(layer).toBeTruthy();
    });

    it("should clear both raster and tile caches when clearCache, clear, or redraw are called", () => {
        const layer = new GeoTIFFLayer("test-tiff", {
            url: "https://example.com/cog.tif"
        });

        layer._tileCache.set("0_0_0", {});
        layer._rasterCache.set("0_0_0", {});
        expect(layer._tileCache.size).toBe(1);
        expect(layer._rasterCache.size).toBe(1);

        layer.clearCache();
        expect(layer._tileCache.size).toBe(0);
        expect(layer._rasterCache.size).toBe(0);

        layer._tileCache.set("1_1_1", {});
        layer._rasterCache.set("1_1_1", {});
        layer.clear();
        expect(layer._tileCache.size).toBe(0);
        expect(layer._rasterCache.size).toBe(0);

        layer._tileCache.set("2_2_2", {});
        layer._rasterCache.set("2_2_2", {});
        layer.redraw();
        expect(layer._tileCache.size).toBe(0);
        expect(layer._rasterCache.size).toBe(0);
    });

    it("should clear all materials and caches when bands change (samplesChanged === true)", () => {
        const layer = new GeoTIFFLayer("test-tiff", {
            url: "https://example.com/cog.tif",
            renderOptions: {
                single: { band: 1 }
            }
        });

        let clearedKeepRendered = null;
        let redrawRequested = false;
        layer._planet = {
            quadTreeStrategy: {
                clearLayerMaterial: (_l, keepRendered) => {
                    clearedKeepRendered = keepRendered;
                }
            },
            renderer: {
                requestRedraw: () => {
                    redrawRequested = true;
                }
            }
        };

        layer._tileCache.set("0_0_0", {});
        layer._rasterCache.set("0_0_0", {});

        // Switch to multi-band (bands change)
        layer.setRenderOptions({
            multi: {
                r: { band: 1 },
                g: { band: 2 },
                b: { band: 3 }
            }
        });

        expect(clearedKeepRendered).toBe(false);
        expect(redrawRequested).toBe(true);
        expect(layer._tileCache.size).toBe(0);
        expect(layer._rasterCache.size).toBe(0);
    });

    it("should clear non-rendered materials and prune non-rendered canvases when styling changes (samplesChanged === false)", () => {
        const layer = new GeoTIFFLayer("test-tiff", {
            url: "https://example.com/cog.tif",
            renderOptions: {
                single: { band: 1, domain: [0, 100] }
            }
        });

        let clearedKeepRendered = null;
        let redrawRequested = false;
        const visibleNode = {
            segment: {
                tileZoom: 5,
                tileX: 10,
                tileY: 10,
                materials: {
                    [layer.__id]: {
                        isReady: true,
                        texture: {},
                        applyImage: () => {}
                    }
                },
                getExtentLonLat: () => new Extent()
            }
        };

        layer._planet = {
            quadTreeStrategy: {
                _renderedNodes: [visibleNode],
                clearLayerMaterial: (_l, keepRendered) => {
                    clearedKeepRendered = keepRendered;
                }
            },
            renderer: {
                requestRedraw: () => {
                    redrawRequested = true;
                }
            }
        };

        // Cache contains rendered tile (5_10_10) and ancestor/stale tile (2_1_1)
        layer._tileCache.set("5_10_10", {image: createImageData(2, 1), renderOptionsVersion: 0});
        layer._tileCache.set("2_1_1", {image: createImageData(2, 1), renderOptionsVersion: 0});
        layer._rasterCache.set("5_10_10", {
            rasters: [new Float32Array([10, 20])],
            width: 2,
            height: 1,
            dstX: 0,
            dstY: 0
        });
        layer._rasterCache.set("2_1_1", {
            rasters: [new Float32Array([5, 10])],
            width: 2,
            height: 1,
            dstX: 0,
            dstY: 0
        });

        // Change domain only (same band 1, so samplesChanged === false)
        layer.setRenderOptions({
            single: { band: 1, domain: [10, 50] }
        });

        // clearLayerMaterial should NOT be called on styling change to prevent parent-fallback tile requests
        expect(clearedKeepRendered).toBe(null);
        expect(redrawRequested).toBe(true);
        // Both rendered canvas '5_10_10' and ancestor canvas '2_1_1' are updated in-place from _rasterCache
        expect(layer._tileCache.has("5_10_10")).toBe(true);
        expect(layer._tileCache.has("2_1_1")).toBe(true);
        // Raw rasters are retained in _rasterCache for instant re-render upon zoom out
        expect(layer._rasterCache.has("2_1_1")).toBe(true);
        expect(layer._rasterCache.has("5_10_10")).toBe(true);
    });

    it("should parse real cogtif.tif buffer and metadata", async () => {
        const fs = await import("fs");
        const path = await import("path");
        const filePath = path.resolve(__dirname, "../../sandbox/geotiff/cogtif.tif");
        if (fs.existsSync(filePath)) {
            const buffer = fs.readFileSync(filePath);
            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
            const layer = new GeoTIFFLayer("real-cog", {
                src: arrayBuffer
            });
            const meta = await layer.whenReady();
            expect(meta).toBeTruthy();
            expect(meta.width).toBeGreaterThan(0);
            expect(meta.height).toBeGreaterThan(0);
            expect(layer.getExtent()).toBeTruthy();

            // Test tile raster reading for layer's extent
            const extent = layer.getExtent();
            const tileData = await layer.reader.readTileRasters(extent, 0, 256);
            expect(tileData).toBeTruthy();
            expect(tileData.rasters.length).toBeGreaterThan(0);
            expect(tileData.width).toBeGreaterThan(0);
            expect(tileData.height).toBeGreaterThan(0);

            // Test out-of-bounds extent returns null
            const { Extent } = await import("../../src/Extent");
            const { LonLat } = await import("../../src/LonLat");
            const oobExtent = new Extent(new LonLat(-170, -80), new LonLat(-160, -70));
            const oobTileData = await layer.reader.readTileRasters(oobExtent, 0, 256);
            expect(oobTileData).toBeNull();
        }
    });
});


describe("GeoTIFFLayer cached tile material", () => {
    function createLayer(waitForParentMaterial) {
        const layer = new GeoTIFFLayer("test-tiff", { waitForParentMaterial });
        layer._reader.isReady = true;
        layer._planet = { renderer: { requestRedraw: () => {} } };
        layer._internalFormat = 0;
        layer.createTexture = vi.fn(() => ({ own: true }));
        return layer;
    }

    function createSegment(layer, tileZoom, tileX, tileY, parentNode, deleteTexture) {
        const segment = {
            initialized: true,
            passReady: true,
            tileZoom,
            tileX,
            tileY,
            materials: {},
            planet: { transparentTexture: { default: true }, renderer: { requestRedraw: () => {} } },
            handler: { gl: { deleteTexture } },
            getExtentLonLat: () => new Extent(new LonLat(10, 45), new LonLat(11, 46))
        };
        segment.node = { segment, parentNode, nodeId: tileZoom * 100 + tileX };
        return segment;
    }

    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

    it("keeps valid texture offsets when the tile is taken from the cache (waitForParentMaterial)", async () => {
        const layer = createLayer(true);
        const segment = createSegment(layer, 3, 1, 2, null, vi.fn());
        const material = (segment.materials[layer.__id] = new Material(segment, layer));
        layer._tileCache.set("3_1_2", {image: createImageData(256, 256), renderOptionsVersion: 0});

        layer.applyMaterial(material);
        await nextFrame();

        expect(material.isReady).toBe(true);
        expect(material.textureExists).toBe(true);
        expect(material.texOffset).toEqual([0, 0, 1, 1]);
        expect(layer.applyMaterial(material)).toEqual([0, 0, 1, 1]);
    });

    it("does not take over the parent texture when the tile is taken from the cache", async () => {
        const layer = createLayer(false);
        const deleteTexture = vi.fn();
        const parentTexture = { parent: true };

        const parentSegment = createSegment(layer, 3, 1, 2, null, deleteTexture);
        const parentMaterial = (parentSegment.materials[layer.__id] = new Material(parentSegment, layer));
        parentMaterial.applyTexture(parentTexture);

        const segment = createSegment(layer, 4, 2, 4, parentSegment.node, deleteTexture);
        const material = (segment.materials[layer.__id] = new Material(segment, layer));
        layer._tileCache.set("4_2_4", {image: createImageData(256, 256), renderOptionsVersion: 0});

        layer.applyMaterial(material);
        await nextFrame();

        expect(material.isReady).toBe(true);
        expect(material.texture).not.toBe(parentTexture);
        expect(material.texOffset).toEqual([0, 0, 1, 1]);

        layer.clearMaterial(material);
        expect(deleteTexture).not.toHaveBeenCalledWith(parentTexture);
    });
});

describe("GeoTIFFReader tile reprojection", () => {
    const BBOX = [205503, 3268530, 230433, 3280287]; // Planet scene, WGS 84 / UTM zone 15N
    const UTM_15N = 32615;

    // Every source pixel keeps the easting of its own center, so a warped tile
    // can be compared with the true projected position of its pixels.
    function createEastingImage(width, height) {
        return {
            getWidth: () => width,
            getHeight: () => height,
            readRasters: async ({ window }) => {
                const [x0, y0, x1, y1] = window;
                const w = x1 - x0;
                const h = y1 - y0;
                const out = new Float64Array(w * h);
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        out[y * w + x] = BBOX[0] + ((x0 + x + 0.5) / width) * (BBOX[2] - BBOX[0]);
                    }
                }
                return [out];
            }
        };
    }

    function createReader() {
        const reader = new GeoTIFFReader({});
        reader.source = {};
        reader.images = [createEastingImage(8310, 3919), createEastingImage(2770, 1307)];
        reader.nativeBBox = BBOX;
        reader.crsCode = UTM_15N;
        reader._projHelper = getProjectionHelper(UTM_15N);
        reader.metadata = { noData: null };
        const sw = reader._projHelper.unproject([BBOX[0], BBOX[1]]);
        const ne = reader._projHelper.unproject([BBOX[2], BBOX[3]]);
        reader.extentWgs84 = new Extent(new LonLat(sw[0], sw[1]), new LonLat(ne[0], ne[1]));
        reader.isReady = true;
        return reader;
    }

    const ZOOM = 13;
    const TILE_SIZE = 256;
    const tileSpan = (2 * mercator.POLE) / 2 ** ZOOM;

    function tileExtent(tx, ty) {
        return new Extent(
            new LonLat(
                mercator.inverse_lon(-mercator.POLE + tx * tileSpan),
                mercator.inverse_lat(mercator.POLE - (ty + 1) * tileSpan)
            ),
            new LonLat(
                mercator.inverse_lon(-mercator.POLE + (tx + 1) * tileSpan),
                mercator.inverse_lat(mercator.POLE - ty * tileSpan)
            )
        );
    }

    // Longitude and latitude of a tile pixel center, the same way the tile texture is laid out
    function pixelLonLat(extent, x, y) {
        const west = extent.southWest.lon;
        const east = extent.northEast.lon;
        const top = mercator.forward_lat(extent.northEast.lat);
        const bottom = mercator.forward_lat(extent.southWest.lat);
        return [
            west + ((x + 0.5) / TILE_SIZE) * (east - west),
            mercator.inverse_lat(top + ((y + 0.5) / TILE_SIZE) * (bottom - top))
        ];
    }

    it("places UTM pixels on their true geographic position", async () => {
        const reader = createReader();
        const center = reader.extentWgs84.getCenter();
        const tx = Math.floor((mercator.forward_lon(center.lon) + mercator.POLE) / tileSpan);
        const ty = Math.floor((mercator.POLE - mercator.forward_lat(center.lat)) / tileSpan);

        const extent = tileExtent(tx, ty);
        const tile = await reader.readTileRasters(extent, ZOOM, TILE_SIZE, [0], EPSG3857);

        expect(tile).toBeTruthy();
        expect(tile.width).toBe(TILE_SIZE);
        expect(tile.height).toBe(TILE_SIZE);

        const metersPerPixel = (tileSpan / TILE_SIZE) * Math.cos((center.lat * Math.PI) / 180);
        const project = getProjectionHelper(UTM_15N).project;
        let checked = 0;

        for (let y = 16; y < TILE_SIZE; y += 32) {
            for (let x = 16; x < TILE_SIZE; x += 32) {
                const value = tile.rasters[0][y * TILE_SIZE + x];
                if (Number.isNaN(value)) continue; // outside of the raster
                const [lon, lat] = pixelLonLat(extent, x, y);
                expect(Math.abs(value - project([lon, lat])[0])).toBeLessThan(2 * metersPerPixel);
                checked++;
            }
        }

        expect(checked).toBeGreaterThan(0);
    });

    it("keeps EPSG:4326 rasters aligned on Mercator tiles", async () => {
        const west = -10, south = 30, east = 10, north = 60;
        const size = 1024;
        // Every source pixel keeps the latitude of its own center
        const image = {
            getWidth: () => size,
            getHeight: () => size,
            readRasters: async ({ window }) => {
                const [x0, y0, x1, y1] = window;
                const w = x1 - x0;
                const h = y1 - y0;
                const out = new Float64Array(w * h);
                for (let y = 0; y < h; y++) {
                    const lat = north - ((y0 + y + 0.5) / size) * (north - south);
                    out.fill(lat, y * w, (y + 1) * w);
                }
                return [out];
            }
        };

        const reader = new GeoTIFFReader({});
        reader.source = {};
        reader.images = [image];
        reader.nativeBBox = [west, south, east, north];
        reader.crsCode = 4326;
        reader.metadata = { noData: null };
        reader.extentWgs84 = new Extent(new LonLat(west, south), new LonLat(east, north));
        reader.isReady = true;

        // Low zoom tile, where linear stretching in latitude is noticeably wrong
        const zoom = 4;
        const span = (2 * mercator.POLE) / 2 ** zoom;
        const tx = Math.floor((mercator.forward_lon(0) + mercator.POLE) / span);
        const ty = Math.floor((mercator.POLE - mercator.forward_lat(45)) / span);
        const extent = new Extent(
            new LonLat(
                mercator.inverse_lon(-mercator.POLE + tx * span),
                mercator.inverse_lat(mercator.POLE - (ty + 1) * span)
            ),
            new LonLat(
                mercator.inverse_lon(-mercator.POLE + (tx + 1) * span),
                mercator.inverse_lat(mercator.POLE - ty * span)
            )
        );

        const tile = await reader.readTileRasters(extent, zoom, TILE_SIZE, [0], EPSG3857);
        expect(tile).toBeTruthy();

        const latPerPixel = (extent.northEast.lat - extent.southWest.lat) / TILE_SIZE;
        let checked = 0;

        for (let y = 8; y < TILE_SIZE; y += 16) {
            const value = tile.rasters[0][y * TILE_SIZE + 64];
            if (Number.isNaN(value)) continue;
            expect(Math.abs(value - pixelLonLat(extent, 64, y)[1])).toBeLessThan(2 * latPerPixel);
            checked++;
        }

        expect(checked).toBeGreaterThan(0);

        // The same tile as an EPSG:4326 segment: rows are linear in latitude
        const poleTile = await reader.readTileRasters(extent, zoom, TILE_SIZE, [0], EPSG4326);
        expect(poleTile).toBeTruthy();

        for (let y = 8; y < TILE_SIZE; y += 16) {
            const value = poleTile.rasters[0][y * TILE_SIZE + 64];
            if (Number.isNaN(value)) continue;
            const lat =
                extent.northEast.lat -
                ((y + 0.5) / TILE_SIZE) * (extent.northEast.lat - extent.southWest.lat);
            expect(Math.abs(value - lat)).toBeLessThan(2 * latPerPixel);
        }
    });

    it("refines the sampling grid only where the projection bends", () => {
        const reader = createReader();
        const center = reader.extentWgs84.getCenter();
        const tx = Math.floor((mercator.forward_lon(center.lon) + mercator.POLE) / tileSpan);
        const ty = Math.floor((mercator.POLE - mercator.forward_lat(center.lat)) / tileSpan);

        // A UTM scene on a zoomed in tile is almost affine, the coarsest grid is enough
        const near = reader._createTileGrid(tileExtent(tx, ty), TILE_SIZE, EPSG3857);
        expect(near.gridSize).toBe(4);

        // The whole world on a single tile needs a finer grid
        const world = new Extent(new LonLat(-180, -85.0511), new LonLat(180, 85.0511));
        const global = reader._createTileGrid(world, TILE_SIZE, EPSG3857);
        expect(global.gridSize).toBeGreaterThan(4);
    });
    it("allows a slightly coarser overview instead of reading nine times more pixels", () => {
        const reader = createReader();
        // Pyramid steps by three: 8310 -> 2770 -> 924
        reader.images = [createEastingImage(8310, 3919), createEastingImage(2770, 1307), createEastingImage(924, 436)];

        const grid = { gridU: null, gridV: null, gridSize: 1 };
        // One cell, where a tile pixel covers 2.8 full resolution pixels
        const u = (2.8 * TILE_SIZE) / 8310;
        const v = (2.8 * TILE_SIZE) / 3919;
        grid.gridU = new Float64Array([0, u, 0, u]);
        grid.gridV = new Float64Array([0, 0, v, v]);

        expect(reader._selectOverviewIndex(grid, TILE_SIZE)).toBe(1);
    });
    it("matches neighbour tiles at the seams", async () => {
        const reader = createReader();
        const center = reader.extentWgs84.getCenter();
        const tx = Math.floor((mercator.forward_lon(center.lon) + mercator.POLE) / tileSpan);
        const ty = Math.floor((mercator.POLE - mercator.forward_lat(center.lat)) / tileSpan);

        const left = await reader.readTileRasters(tileExtent(tx, ty), ZOOM, TILE_SIZE, [0], EPSG3857);
        const right = await reader.readTileRasters(tileExtent(tx + 1, ty), ZOOM, TILE_SIZE, [0], EPSG3857);

        expect(left).toBeTruthy();
        expect(right).toBeTruthy();

        const metersPerPixel = (tileSpan / TILE_SIZE) * Math.cos((center.lat * Math.PI) / 180);
        let compared = 0;

        for (let y = 0; y < TILE_SIZE; y += 8) {
            const a = left.rasters[0][y * TILE_SIZE + (TILE_SIZE - 1)];
            const b = right.rasters[0][y * TILE_SIZE];
            if (Number.isNaN(a) || Number.isNaN(b)) continue;
            // Neighbouring pixels of the seam are one tile pixel apart on the ground
            expect(Math.abs(b - a)).toBeLessThan(3 * metersPerPixel);
            compared++;
        }

        expect(compared).toBeGreaterThan(0);
    });
});

describe("GeoTIFFLayer tile request queue", () => {
    function createLayer(readTileRasters) {
        const layer = new GeoTIFFLayer("test-tiff", {});
        layer._reader.isReady = true;
        layer._reader.readTileRasters = readTileRasters;
        layer._planet = { renderer: { requestRedraw: () => {} } };
        layer._internalFormat = 0;
        layer.createTexture = vi.fn(() => ({}));
        return layer;
    }

    function createMaterial(layer, tileX, state = RENDERING) {
        const extent = new Extent(new LonLat(10 + tileX, 45), new LonLat(11 + tileX, 46));
        const segment = {
            initialized: true,
            passReady: true,
            tileZoom: 5,
            tileX,
            tileY: 1,
            materials: {},
            planet: { transparentTexture: { default: true }, renderer: { requestRedraw: () => {} } },
            handler: { gl: { deleteTexture: vi.fn() } },
            getExtentLonLat: () => extent
        };
        segment.node = { segment, parentNode: null, nodeId: tileX, getState: () => state };
        const material = new Material(segment, layer);
        segment.materials[layer.__id] = material;
        return material;
    }

    it("keeps only a limited number of tile reads running", () => {
        const previous = GeoTIFFLayer.MAX_REQUESTS;
        GeoTIFFLayer.MAX_REQUESTS = 2;

        try {
            const read = vi.fn(() => new Promise(() => {}));
            const layer = createLayer(read);
            const materials = [0, 1, 2, 3].map((x) => createMaterial(layer, x));

            materials.forEach((m) => layer.loadMaterial(m));

            expect(read).toHaveBeenCalledTimes(2);
            expect(layer._pendingsQueue.length).toBe(2);
            materials.forEach((m) => expect(m.isLoading).toBe(true));
        } finally {
            GeoTIFFLayer.MAX_REQUESTS = previous;
        }
    });

    it("drops queued tiles that are no longer rendered", async () => {
        const previous = GeoTIFFLayer.MAX_REQUESTS;
        GeoTIFFLayer.MAX_REQUESTS = 1;

        try {
            let settle;
            const read = vi.fn(
                () =>
                    new Promise((resolve) => {
                        settle = resolve;
                    })
            );
            const layer = createLayer(read);

            const running = createMaterial(layer, 0);
            const waiting = createMaterial(layer, 1);
            const gone = createMaterial(layer, 2, NOTRENDERING);

            layer.loadMaterial(running);
            layer.loadMaterial(waiting);
            layer.loadMaterial(gone);

            expect(read).toHaveBeenCalledTimes(1);
            expect(layer._pendingsQueue.length).toBe(2);

            // The running read finishes with no data, the queue moves on
            settle(null);
            await new Promise((resolve) => setTimeout(resolve, 0));

            // The tile that left the view is dropped, the visible one is read
            expect(gone.isLoading).toBe(false);
            expect(read).toHaveBeenCalledTimes(2);
            expect(read.mock.calls[1][0]).toBe(waiting.segment.getExtentLonLat());
        } finally {
            GeoTIFFLayer.MAX_REQUESTS = previous;
        }
    });
});
