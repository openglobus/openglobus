import { Extent } from "../../src/Extent";
import { LonLat } from "../../src/LonLat";
import {
    createHeightsLevels,
    createVertexGrid,
    decodeRgbHeightsRow,
    findPeaks,
    getEdgeHeight,
    getGroundHeight,
    getMeshHeights,
    getSubdivisionLevels,
    getVertexGridCells,
    RGB_ENCODING_RGB,
    RGB_ENCODING_TERRARIUM,
    sampleSubGrid
} from "../../src/terrain/terrainUtils";

// Linear heights in pixel coordinates: pixel (i, j) has its center at (i + 0.5, j + 0.5).
const plane = (y, x) => 10 + 3 * x - 2 * y;

function createPixels(size, f) {
    const heights = new Float32Array(size * size);
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            heights[i * size + j] = f(i + 0.5, j + 0.5);
        }
    }
    return heights;
}

const NO_DATA = -10000;

function rowsOf(heights, size) {
    return (row, outHeights) => outHeights.set(heights.subarray(row * size, (row + 1) * size));
}

// Peaks of the pixel centers grid
const peaksOf = (pixels, size) => findPeaks(pixels, size, 0.5, 2);

test("getVertexGridCells doubles 2^n images cells, (2^n + 1) images are the grid", () => {
    expect(getVertexGridCells(256)).toBe(512);
    expect(getVertexGridCells(257)).toBe(256);
});

test("getSubdivisionLevels keeps native zoom levels down to the pixels, and goes down to the vertex grid above", () => {
    // Native zooms only
    expect(getSubdivisionLevels(256, 128, 5, 17, 14)).toBe(1);
    expect(getSubdivisionLevels(512, 128, 5, 17, 14)).toBe(2);
    // Above the native zooms only
    expect(getSubdivisionLevels(512, 128, 17, 21, 17)).toBe(3);
    // Native and above
    expect(getSubdivisionLevels(256, 128, 13, 17, 14)).toBe(2);
    // Limited by the max zoom
    expect(getSubdivisionLevels(512, 128, 17, 19, 17)).toBe(2);
    expect(getSubdivisionLevels(9, 4, 0, 10, 0)).toBe(1);
});

test("createVertexGrid places vertices at pixel centers and corners, including extrapolated edges", () => {
    const size = 8,
        gs = 2 * size + 1;
    const grid = createVertexGrid(createPixels(size, plane), size, NO_DATA);

    expect(grid.length).toBe(gs * gs);
    for (let i = 0; i < gs; i++) {
        for (let j = 0; j < gs; j++) {
            expect(grid[i * gs + j]).toBeCloseTo(plane(i / 2, j / 2), 4);
        }
    }
});

test("createVertexGrid without pixel centers is the pixel corners of the full grid", () => {
    const size = 8,
        gs = size + 1;
    const pixels = createPixels(size, (y, x) => Math.sin(x) * 5 + y * y);
    pixels[3 * size + 4] = NaN;

    const full = createVertexGrid(pixels, size, NO_DATA);
    const corners = createVertexGrid(pixels, size, NO_DATA, false);

    expect(corners.length).toBe(gs * gs);
    for (let i = 0; i < gs; i++) {
        for (let j = 0; j < gs; j++) {
            expect(corners[i * gs + j]).toBe(full[2 * i * (2 * size + 1) + 2 * j]);
        }
    }
});

test("createVertexGrid skips no data pixels", () => {
    const size = 4;
    const heights = new Float32Array(size * size).fill(100);
    heights[5] = NaN;

    const grid = createVertexGrid(heights, size, NO_DATA);

    for (let k = 0; k < grid.length; k++) {
        expect(grid[k]).toBe(100);
    }
});

test("createVertexGrid writes noDataHeight where all nearest pixels have no data", () => {
    const size = 4,
        gs = 2 * size + 1;
    const heights = new Float32Array(size * size).fill(100);
    // Pixels around the corner vertex (4, 4)
    heights[5] = heights[6] = heights[9] = heights[10] = NaN;

    const grid = createVertexGrid(heights, size, NO_DATA);

    for (let k = 0; k < grid.length; k++) {
        expect(grid[k]).toBe(k === 4 * gs + 4 ? NO_DATA : 100);
    }
});

test("getEdgeHeight extrapolates slopes, but not peaks, pits and slope breaks", () => {
    expect(getEdgeHeight(1, 2, 3)).toBe(0.5);
    // Cliff at the edge
    expect(getEdgeHeight(10, 0, 0)).toBe(10);
    expect(getEdgeHeight(0, 10, 10)).toBe(0);
    // Peak at the edge
    expect(getEdgeHeight(5, 3, 4)).toBe(5);
    // The gentler slope is taken
    expect(getEdgeHeight(1, 2, 4)).toBe(0.5);
});

test("createVertexGrid does not overshoot a cliff at the tile edge", () => {
    const size = 4,
        gs = 2 * size + 1;
    const heights = new Float32Array(size * size).map((_, k) => (k % size === 0 ? 10 : 0));

    const grid = createVertexGrid(heights, size, NO_DATA);

    for (let i = 0; i < gs; i++) {
        expect(grid[i * gs]).toBe(10);
    }
});

test("example: a stone one pixel wide keeps its height at the pixel center", () => {
    // Seabed at -10m with a 0.5m stone at the pixel (1, 2)
    const pixels = new Float32Array(
        [
            [-10, -10, -10, -10],
            [-10, -10, -9.5, -10],
            [-10, -10, -10, -10],
            [-10, -10, -10, -10]
        ].flat()
    );

    const grid = createVertexGrid(pixels, 4, NO_DATA);

    // Odd rows and columns are the pixel centers
    // prettier-ignore
    expect(Array.from(grid)).toEqual([
        -10, -10, -10, -10, -10,     -10,    -10,     -10, -10,
        -10, -10, -10, -10, -10,     -10,    -10,     -10, -10,
        -10, -10, -10, -10, -9.875,  -9.75,  -9.875,  -10, -10,
        -10, -10, -10, -10, -9.75,   -9.5,   -9.75,   -10, -10,
        -10, -10, -10, -10, -9.875,  -9.75,  -9.875,  -10, -10,
        -10, -10, -10, -10, -10,     -10,    -10,     -10, -10,
        -10, -10, -10, -10, -10,     -10,    -10,     -10, -10,
        -10, -10, -10, -10, -10,     -10,    -10,     -10, -10,
        -10, -10, -10, -10, -10,     -10,    -10,     -10, -10
    ]);
});

test("findPeaks finds peaks and pits of the pixels, not flat areas and slopes", () => {
    const size = 8;
    const pixels = new Float32Array(size * size).fill(-10);
    pixels[2 * size + 5] = -9.5;
    // Pit on a slope
    for (let j = 0; j < size; j++) {
        pixels[6 * size + j] = -20 + j;
    }
    pixels[6 * size + 3] = -25;

    const peaks = peaksOf(pixels, size);
    const found = (row, col) => {
        for (let p = peaks.rowStart[row]; p < peaks.rowStart[row + 1]; p++) {
            if (peaks.cols[p] === col) {
                return peaks.isPeak[p] ? "peak" : "pit";
            }
        }
        return null;
    };

    expect(found(2, 5)).toBe("peak");
    expect(found(6, 3)).toBe("pit");
    // Flat area and slope
    expect(found(0, 0)).toBe(null);
    expect(found(6, 5)).toBe(null);
});

test("findPeaks compares every pixel with all its neighbours", () => {
    const size = 7;
    let seed = 7;
    const pixels = new Float32Array(size * size).map(() => {
        seed = (seed * 16807) % 2147483647;
        return seed % 11 === 0 ? NaN : seed % 5;
    });

    const expected = [];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const h = pixels[r * size + c];
            let higher = false,
                lower = false;
            for (let nr = Math.max(r - 1, 0); nr <= Math.min(r + 1, size - 1); nr++) {
                for (let nc = Math.max(c - 1, 0); nc <= Math.min(c + 1, size - 1); nc++) {
                    const n = pixels[nr * size + nc];
                    higher ||= n > h;
                    lower ||= n < h;
                }
            }
            if (higher !== lower) {
                expected.push([r, c, lower ? 1 : 0]);
            }
        }
    }

    const peaks = findPeaks(pixels, size, 0, 1);
    const found = [];
    for (let r = 0; r < size; r++) {
        for (let p = peaks.rowStart[r]; p < peaks.rowStart[r + 1]; p++) {
            found.push([r, peaks.cols[p], peaks.isPeak[p]]);
        }
    }

    expect(expected.length).toBeGreaterThan(0);
    expect(found).toEqual(expected);
});

test("sampleSubGrid splits the grid recursively with shared edges", () => {
    const size = 16,
        cells = 2 * size,
        gridSize = 4,
        gs = gridSize + 1;
    const pixels = createPixels(size, plane);
    const grid = createVertexGrid(pixels, size, NO_DATA);
    const peaks = peaksOf(pixels, size);
    const sample = (row0, col0, c) => sampleSubGrid(grid, cells, row0, col0, c, gridSize, undefined, 0, peaks, NO_DATA);

    const parent = sample(0, 0, cells);
    expect(parent.length).toBe(gs * gs);
    for (let i = 0; i < gs; i++) {
        for (let j = 0; j < gs; j++) {
            expect(parent[i * gs + j]).toBeCloseTo(plane(i * 4, j * 4), 4);
        }
    }

    // Level 1: 2x2 tiles of 16 cells
    const left = sample(0, 0, 16);
    const right = sample(0, 16, 16);
    const bottom = sample(16, 0, 16);
    for (let r = 0; r < gs; r++) {
        expect(right[r * gs]).toBe(left[r * gs + gridSize]);
        expect(bottom[r]).toBe(left[gridSize * gs + r]);
    }

    // Level 3 tile takes all of its vertices
    const tile = sample(4, 4, 4);
    for (let r = 0; r < gs; r++) {
        for (let c = 0; c < gs; c++) {
            expect(tile[r * gs + c]).toBe(grid[(4 + r) * (cells + 1) + 4 + c]);
        }
    }
});

test("sampleSubGrid keeps a peak on a slope, the slope keeps its sampled heights", () => {
    const size = 8,
        cells = 2 * size,
        gridSize = 4,
        gs = gridSize + 1;
    const pixels = createPixels(size, plane);
    pixels[2 * size + 5] += 5;

    const grid = createVertexGrid(pixels, size, NO_DATA);
    const tile = sampleSubGrid(grid, cells, 0, 0, cells, gridSize, undefined, 0, peaksOf(pixels, size), NO_DATA);

    // The stone moves from the pixel center vertex (5, 11) to the nearest tile vertex (4, 12)
    for (let i = 0; i < gs; i++) {
        for (let j = 0; j < gs; j++) {
            if (i === 1 && j === 3) {
                expect(tile[i * gs + j]).toBeCloseTo(plane(2.5, 5.5) + 5, 4);
            } else {
                expect(tile[i * gs + j]).toBeCloseTo(grid[i * 4 * (cells + 1) + j * 4], 4);
            }
        }
    }
});

test("sampleSubGrid skips peaks with no data around", () => {
    const size = 9;
    const grid = new Float32Array(size * size).fill(-10);
    grid[3 * size + 3] = -9;
    grid[4 * size + 4] = NO_DATA;

    const peaks = findPeaks(grid, size, 0, 1);

    expect(Array.from(sampleSubGrid(grid, size - 1, 0, 0, size - 1, 2, undefined, 0, peaks, NO_DATA))).toEqual([
        -10,
        -10,
        -10,
        -10,
        NO_DATA,
        -10,
        -10,
        -10,
        -10
    ]);
});

function levelRanges(out, gridSize, levels) {
    const tileLength = (gridSize + 1) * (gridSize + 1);
    const ranges = [];
    for (let k = 0, offset = 0; k <= levels; k++) {
        const level = out.subarray(offset, offset + (1 << (2 * k)) * tileLength);
        ranges.push([Math.min(...level), Math.max(...level)]);
        offset += level.length;
    }
    return ranges;
}

test("example: every level keeps a stone and a pit one pixel wide", () => {
    // 8x8 seabed at -10m with a 0.5m stone at the pixel (2, 5) and a 0.4m pit at the pixel (5, 1)
    const size = 8,
        gridSize = 4,
        gs = gridSize + 1;
    const pixels = new Float32Array(size * size).fill(-10);
    pixels[2 * size + 5] = -9.5;
    pixels[5 * size + 1] = -10.4;

    const out = createHeightsLevels(size, gridSize, 2, rowsOf(pixels, size), NO_DATA);

    expect(out.length).toBe((1 + 4 + 16) * gs * gs);
    expect(levelRanges(out, gridSize, 2)).toEqual([
        [-10.399999618530273, -9.5],
        [-10.399999618530273, -9.5],
        [-10.399999618530273, -9.5]
    ]);

    // The tile vertices are 2 pixels apart, the stone and the pit are moved to the nearest of them by half a pixel
    expect(out[1 * gs + 3]).toBe(-9.5);
    expect(out[3 * gs + 1]).toBeCloseTo(-10.4, 5);
});

function decodeParams(encoding, noDataValues, parentData = null) {
    return {
        encoding,
        minHeight: -10000,
        resolution: 0.1,
        heightFactor: 2,
        noDataValues,
        parentData,
        parentOffsetX: 0,
        parentOffsetY: 0,
        parentZoomDiff: 0.5,
        skipPositiveHeights: false
    };
}

function rgbaOf(pixels) {
    const rgba = new Uint8ClampedArray(pixels.length * 4);
    pixels.forEach(([r, g, b], i) => rgba.set([r, g, b, 255], i * 4));
    return rgba;
}

test("decodeRgbHeightsRow decodes rgb heights and no data", () => {
    const rgba = rgbaOf([
        [1, 134, 170], // 1m
        [255, 0, 0], // minHeight, no data
        [10, 0, 0], // > 50000, no data
        [1, 134, 160] // 0m
    ]);
    const out = new Float32Array(4);
    decodeRgbHeightsRow(rgba, 0, 4, 1, decodeParams(RGB_ENCODING_RGB, [-20000]), out, NaN);

    expect(out[0]).toBeCloseTo(2, 4);
    expect(out[1]).toBeNaN();
    expect(out[2]).toBeNaN();
    expect(out[3]).toBe(0);
});

test("decodeRgbHeightsRow decodes terrarium heights with several no data values", () => {
    const rgba = rgbaOf([
        [128, 10, 128], // 10.5m
        [88, 241, 0], // -9999m
        [255, 255, 0], // 32767m
        [127, 217, 0] // -39m
    ]);
    const out = new Float32Array(4);
    decodeRgbHeightsRow(rgba, 0, 4, 1, decodeParams(RGB_ENCODING_TERRARIUM, [-19998, 65534]), out, -1);

    expect(out[0]).toBe(21);
    expect(out[1]).toBe(-1);
    expect(out[2]).toBe(-1);
    expect(out[3]).toBe(-78);
});

test("decodeRgbHeightsRow takes zero and no data heights from the parent", () => {
    const rgba = rgbaOf([
        [1, 134, 160], // 0m
        [255, 0, 0], // no data
        [1, 134, 170] // 1m
    ]);
    const parent = new Float32Array(9).fill(7);
    const out = new Float32Array(3);
    decodeRgbHeightsRow(rgba, 0, 3, 1, decodeParams(RGB_ENCODING_RGB, [-20000], parent), out, NaN);

    expect(Array.from(out)).toEqual([7, 7, 2]);
});

test("createHeightsLevels outputs the tile and its levels row by row", () => {
    const size = 16,
        gridSize = 4,
        tileLength = (gridSize + 1) * (gridSize + 1);
    const pixels = createPixels(size, (y, x) => Math.sin(x) * 5 + y * y);
    const peaks = (scale) => findPeaks(pixels, size, 0.5, scale);

    // The last level is not finer than the pixels, vertices at the pixel corners
    let grid = createVertexGrid(pixels, size, NO_DATA, false);
    let out = createHeightsLevels(size, gridSize, 2, rowsOf(pixels, size), NO_DATA);
    let tile = (n) => Array.from(out.subarray(n * tileLength, (n + 1) * tileLength));
    let sample = (row0, col0, c) =>
        Array.from(sampleSubGrid(grid, size, row0, col0, c, gridSize, undefined, 0, peaks(1), NO_DATA));

    expect(out.length).toBe((1 + 4 + 16) * tileLength);
    expect(tile(0)).toEqual(sample(0, 0, size));
    // Level 1, row 1, column 0
    expect(tile(1 + 2)).toEqual(sample(8, 0, 8));
    // Level 2, row 3, column 3
    expect(tile(1 + 4 + 15)).toEqual(sample(12, 12, 4));

    // The last level is finer than the pixels, vertices at the pixel centers and corners
    grid = createVertexGrid(pixels, size, NO_DATA);
    out = createHeightsLevels(size, gridSize, 3, rowsOf(pixels, size), NO_DATA);
    sample = (row0, col0, c) =>
        Array.from(sampleSubGrid(grid, 2 * size, row0, col0, c, gridSize, undefined, 0, peaks(2), NO_DATA));

    expect(out.length).toBe((1 + 4 + 16 + 64) * tileLength);
    expect(tile(0)).toEqual(sample(0, 0, 2 * size));
    // Level 3, row 7, column 7
    expect(tile(1 + 4 + 16 + 63)).toEqual(sample(28, 28, 4));
});

test("createHeightsLevels uses (2^n + 1) images as the grid", () => {
    const size = 9,
        gridSize = 4;
    const pixels = new Float32Array(size * size).map((_, k) => k);
    pixels[size * 2 + 2] = NaN;

    const out = createHeightsLevels(size, gridSize, 1, rowsOf(pixels, size), NO_DATA);

    // The tile takes every second vertex, the first level tiles take all of them
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(2);
    expect(out[1 * (gridSize + 1) + 1]).toBe(NO_DATA);
    expect(out[(gridSize + 1) * (gridSize + 1) + 2 * (gridSize + 1) + 2]).toBe(NO_DATA);
});

test("getGroundHeight takes the vertex heights and interpolates planes exactly", () => {
    const gs = 5,
        extent = new Extent(new LonLat(100, -20), new LonLat(140, 0)),
        f = (x, y) => 3 * x - 7 * y + 1;

    // Rows from north to south
    const heights = new Float32Array(gs * gs);
    for (let i = 0; i < gs; i++) {
        for (let j = 0; j < gs; j++) {
            heights[i * gs + j] = f(100 + j * 10, 0 - i * 5);
        }
    }

    for (let i = 0; i < gs; i++) {
        for (let j = 0; j < gs; j++) {
            expect(getGroundHeight(100 + j * 10, -i * 5, extent, heights)).toBeCloseTo(heights[i * gs + j], 3);
        }
    }

    for (const [x, y] of [
        [101.3, -0.7],
        [117, -13.2],
        [139.9, -19.9],
        [125, -10]
    ]) {
        expect(getGroundHeight(x, y, extent, heights)).toBeCloseTo(f(x, y), 3);
    }
});

test("getGroundHeight splits the cell by the south east to north west diagonal", () => {
    const extent = new Extent(new LonLat(0, 0), new LonLat(10, 10));
    // North west, north east, south west, south east
    const heights = [0, 10, 0, 0];

    expect(getGroundHeight(5, 5, extent, heights)).toBe(0);
    expect(getGroundHeight(7.5, 7.5, extent, heights)).toBe(5);
});

test("getGroundHeight works with heights over 100km", () => {
    const extent = new Extent(new LonLat(0, 0), new LonLat(10, 10));
    expect(getGroundHeight(3, 4, extent, [200000, 200000, 200000, 200000])).toBe(200000);
});

test("getMeshHeights moves peaks and pits to the nearest mesh vertices, edges and slopes are sampled", () => {
    const fileGridSize = 8,
        gs = fileGridSize + 1,
        gridSize = 2;
    const elevations = new Float32Array(gs * gs).map((_, k) => 3 * (k % gs) - 2 * Math.floor(k / gs));
    // Peak at the vertex (3, 3), smaller pit at the edge vertex (0, 5)
    elevations[3 * gs + 3] += 50;
    elevations[5] -= 30;

    const mesh = getMeshHeights(elevations, fileGridSize, gridSize, NaN);
    const sample = (i, j) => elevations[i * 4 * gs + j * 4];

    expect(mesh.length).toBe(9);
    // The only inner vertex gets the most deviating one, the peak
    expect(mesh[4]).toBe(elevations[3 * gs + 3]);
    // Edges are sampled, the pit is not moved to them
    for (const [i, j] of [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 0],
        [1, 2],
        [2, 0],
        [2, 1],
        [2, 2]
    ]) {
        expect(mesh[i * 3 + j]).toBe(sample(i, j));
    }
});

test("getMeshHeights does not move no data elevations", () => {
    const fileGridSize = 4,
        gs = fileGridSize + 1;
    const elevations = new Float32Array(gs * gs).fill(10);
    elevations[1 * gs + 1] = NO_DATA;

    expect(Array.from(getMeshHeights(elevations, fileGridSize, 2, NO_DATA))).toEqual(new Array(9).fill(10));
});
