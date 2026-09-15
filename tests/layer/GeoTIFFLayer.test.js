import { describe, it, expect } from "vitest";
import { GeoTIFFLayer } from "../../src/layer/GeoTIFFLayer";
import {
    buildColorLUT,
    parseColor,
    getRasterMinMax,
    renderSingleBandToImageData,
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
        layer._tileCache.set("5_10_10", document.createElement("canvas"));
        layer._tileCache.set("2_1_1", document.createElement("canvas"));
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


