import { describe, test, expect, vi } from "vitest";
import { NormalMapCreator } from "../../src/utils/NormalMapCreator";

describe("the normal map size", () => {
    test("is the elevation grid size, a power of two, 128 at least", () => {
        const nmc = new NormalMapCreator({});

        for (const [gridSize, size] of [
            [256, 256],
            [512, 512],
            [128, 128],
            // The terrains with no elevations and the small grids
            [2, 128],
            [32, 128],
            // Up to a power of two
            [300, 512]
        ]) {
            nmc.setGridSize(gridSize);
            expect([nmc.width, nmc.height]).toEqual([size, size]);
        }
    });

    test("makes the framebuffer and the vertices texture of the size again when it is made", () => {
        const nmc = new NormalMapCreator({}),
            gl = { deleteTexture: vi.fn() };

        nmc._handler = { gl, createEmptyTexture_l: vi.fn((w, h) => ({ w, h })) };
        nmc._framebuffer = { setSize: vi.fn() };
        nmc._normalMapVerticesTexture = { w: 128, h: 128 };

        nmc.setGridSize(256);

        expect(nmc._framebuffer.setSize).toHaveBeenCalledWith(256, 256);
        expect(gl.deleteTexture).toHaveBeenCalledTimes(1);
        expect(nmc._normalMapVerticesTexture).toEqual({ w: 256, h: 256 });

        // The same size, nothing is made again
        nmc.setGridSize(256);
        expect(nmc._framebuffer.setSize).toHaveBeenCalledTimes(1);
    });
});
