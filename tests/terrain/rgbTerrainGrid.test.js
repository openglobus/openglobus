import {
    createHeightsLevels,
    createVertexGrid,
    decodeRgbHeightsRow,
    packRgbHeightsParams,
    RGB_ENCODING_RGB,
    RGB_ENCODING_TERRARIUM,
    sampleSubGrid,
    unpackRgbHeightsParams
} from "../../src/terrain/rgbTerrainGrid";

// Linear heights in pixel-center coordinates: pixel (i, j) has its center at (i + 0.5, j + 0.5).
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
    const decoded = [];
    const decodeRow = (row, outHeights) => {
        decoded.push(row);
        outHeights.set(heights.subarray(row * size, (row + 1) * size));
    };
    return { decodeRow, decoded };
}

test("createVertexGrid places vertices at pixel corners, including extrapolated edges", () => {
    const size = 8;
    const grid = createVertexGrid(size, rowsOf(createPixels(size, plane), size).decodeRow, NO_DATA);

    expect(grid.length).toBe((size + 1) * (size + 1));
    for (let i = 0; i <= size; i++) {
        for (let j = 0; j <= size; j++) {
            expect(grid[i * (size + 1) + j]).toBeCloseTo(plane(i, j), 4);
        }
    }
});

test("createVertexGrid decodes every pixel row once, in order", () => {
    const size = 8;
    const { decodeRow, decoded } = rowsOf(createPixels(size, plane), size);
    createVertexGrid(size, decodeRow, NO_DATA);
    expect(decoded).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
});

test("createVertexGrid skips no data pixels", () => {
    const size = 4;
    const heights = new Float32Array(size * size).fill(100);
    heights[5] = NaN;

    const grid = createVertexGrid(size, rowsOf(heights, size).decodeRow, NO_DATA);

    for (let k = 0; k < grid.length; k++) {
        expect(grid[k]).toBe(100);
    }
});

test("createVertexGrid writes noDataHeight where all nearest pixels have no data", () => {
    const size = 4;
    const heights = new Float32Array(size * size).fill(100);
    // Pixels around the vertex (2, 2)
    heights[5] = heights[6] = heights[9] = heights[10] = NaN;

    const grid = createVertexGrid(size, rowsOf(heights, size).decodeRow, NO_DATA);

    for (let k = 0; k < grid.length; k++) {
        expect(grid[k]).toBe(k === 2 * (size + 1) + 2 ? NO_DATA : 100);
    }
});

test("sampleSubGrid splits the grid recursively with shared edges", () => {
    const size = 16,
        gridSize = 4,
        gs = gridSize + 1;
    const grid = createVertexGrid(size, rowsOf(createPixels(size, plane), size).decodeRow, NO_DATA);

    const parent = sampleSubGrid(grid, size, 0, 0, size, gridSize);
    expect(parent.length).toBe(gs * gs);
    expect(parent[0]).toBeCloseTo(plane(0, 0), 4);
    expect(parent[gs * gs - 1]).toBeCloseTo(plane(size, size), 4);

    // Level 1: 2x2 tiles of 8 cells
    const left = sampleSubGrid(grid, size, 0, 0, 8, gridSize);
    const right = sampleSubGrid(grid, size, 0, 8, 8, gridSize);
    const bottom = sampleSubGrid(grid, size, 8, 0, 8, gridSize);
    for (let r = 0; r < gs; r++) {
        expect(right[r * gs]).toBe(left[r * gs + gridSize]);
        expect(bottom[r]).toBe(left[gridSize * gs + r]);
    }

    // Level 2 tile is the same as the quarter of the level 1 tile
    const quarter = sampleSubGrid(grid, size, 4, 4, 4, gridSize);
    for (let r = 0; r < gs; r++) {
        for (let c = 0; c < gs; c++) {
            expect(quarter[r * gs + c]).toBe(grid[(4 + r) * (size + 1) + 4 + c]);
        }
    }
    expect(quarter[0]).toBe(left[2 * gs + 2]);
    expect(quarter[gs * gs - 1]).toBe(left[gs * gs - 1]);
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

test("packRgbHeightsParams and unpackRgbHeightsParams keep parameters", () => {
    const p = {
        decode: { ...decodeParams(RGB_ENCODING_TERRARIUM, [-9999, 32767]), skipPositiveHeights: true },
        size: 512,
        gridSize: 128,
        levels: 2,
        noDataHeight: -9999
    };
    const parent = new Float32Array(4);
    const [id, q] = unpackRgbHeightsParams(packRgbHeightsParams(42, p), parent);

    expect(id).toBe(42);
    expect({ ...q, decode: { ...q.decode, noDataValues: Array.from(q.decode.noDataValues) } }).toEqual({
        ...p,
        decode: { ...p.decode, parentData: parent }
    });
});

test("createHeightsLevels outputs the tile and its levels row by row", () => {
    const size = 16,
        gridSize = 4,
        tileLength = (gridSize + 1) * (gridSize + 1);
    const pixels = createPixels(size, plane);
    const grid = createVertexGrid(size, rowsOf(pixels, size).decodeRow, NO_DATA);

    const out = createHeightsLevels(size, gridSize, 2, rowsOf(pixels, size).decodeRow, NO_DATA);
    const tile = (n) => Array.from(out.subarray(n * tileLength, (n + 1) * tileLength));

    expect(out.length).toBe((1 + 4 + 16) * tileLength);
    expect(tile(0)).toEqual(Array.from(sampleSubGrid(grid, size, 0, 0, size, gridSize)));
    // Level 1, row 1, column 0
    expect(tile(1 + 2)).toEqual(Array.from(sampleSubGrid(grid, size, 8, 0, 8, gridSize)));
    // Level 2, row 3, column 3
    expect(tile(1 + 4 + 15)).toEqual(Array.from(sampleSubGrid(grid, size, 12, 12, 4, gridSize)));
});

test("createHeightsLevels uses (2^n + 1) images as the grid", () => {
    const size = 9,
        gridSize = 4;
    const pixels = new Float32Array(size * size).map((_, k) => k);
    pixels[size * 2 + 2] = NaN;

    const out = createHeightsLevels(size, gridSize, 1, rowsOf(pixels, size).decodeRow, NO_DATA);

    // The tile takes every second vertex, the first level tiles take all of them
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(2);
    expect(out[1 * (gridSize + 1) + 1]).toBe(NO_DATA);
    expect(out[(gridSize + 1) * (gridSize + 1) + 2 * (gridSize + 1) + 2]).toBe(NO_DATA);
});
