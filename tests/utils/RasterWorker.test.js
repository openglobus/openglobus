import { describe, test, expect, vi } from "vitest";
import { createTileHeights } from "../../src/terrain/terrainUtils";
import { warpRasters } from "../../src/layer/geotiff/warp";

// The worker module sets self.onmessage, its results go to self.postMessage
const post = vi.spyOn(self, "postMessage").mockImplementation(() => {});
await import("../../src/utils/RasterWorker.worker.js");

function run(data) {
    post.mockClear();
    self.onmessage({ data: { id: 7, ...data } });
    const [message, transfer] = post.mock.calls[0];
    expect(message.id).toBe(7);
    return [message.result, transfer];
}

describe("RasterWorker", () => {
    test("makes the tile grid heights as createTileHeights", () => {
        const pixels = () => new Float32Array(256).map((_, k) => (k % 16) * (k >> 4));
        const args = [16, 4, 1, -10000];

        const [heights, transfer] = run({ type: "heights", pixels: pixels(), size: 16, gridSize: 4, levels: 1, noDataHeight: -10000 });

        expect(Array.from(heights)).toEqual(Array.from(createTileHeights(pixels(), ...args)));
        expect(transfer).toEqual([heights.buffer]);
    });

    test("resamples the tile as warpRasters", () => {
        // A 4x4 window over a whole 8x8 image, the grid turns it a bit
        const params = () => ({
            rasters: [new Float32Array(16).map((_, k) => k)],
            gridU: new Float64Array([0.1, 0.6, 0.15, 0.65]),
            gridV: new Float64Array([0.1, 0.12, 0.6, 0.62]),
            gridSize: 1,
            imgWidth: 8,
            imgHeight: 8,
            window: [0, 0, 4, 4],
            tileSize: 8,
            bilinear: true,
            nodata: 5,
            maskRaster: null
        });

        const [rasters, transfer] = run({ type: "warp", ...params() });

        expect(Array.from(rasters[0])).toEqual(Array.from(warpRasters(params())[0]));
        expect(transfer).toEqual([rasters[0].buffer]);
    });
});
