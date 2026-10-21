import type { TypedArray } from "../utils/shared";

export const RGB_ENCODING_CUSTOM = -1;
export const RGB_ENCODING_RGB = 0;
export const RGB_ENCODING_TERRARIUM = 1;

/** Writes a row of pixel heights, NaN for no data pixels. */
export type DecodeHeightsRowFunc = (row: number, outHeights: Float32Array) => void;

export interface IRgbDecodeParams {
    encoding: number;
    minHeight: number;
    resolution: number;
    heightFactor: number;
    noDataValues: number[] | TypedArray;
    parentData: number[] | TypedArray | null;
    parentOffsetX: number;
    parentOffsetY: number;
    parentZoomDiff: number;
    skipPositiveHeights: boolean;
}

export interface IRgbHeightsParams {
    decode: IRgbDecodeParams;
    size: number;
    gridSize: number;
    levels: number;
    noDataHeight: number;
}

const PARAMS_ID = 0,
    PARAMS_SIZE = 1,
    PARAMS_GRID_SIZE = 2,
    PARAMS_LEVELS = 3,
    PARAMS_ENCODING = 4,
    PARAMS_MIN_HEIGHT = 5,
    PARAMS_RESOLUTION = 6,
    PARAMS_HEIGHT_FACTOR = 7,
    PARAMS_PARENT_OFFSET_X = 8,
    PARAMS_PARENT_OFFSET_Y = 9,
    PARAMS_PARENT_ZOOM_DIFF = 10,
    PARAMS_SKIP_POSITIVE_HEIGHTS = 11,
    PARAMS_NO_DATA_HEIGHT = 12,
    PARAMS_NO_DATA_VALUES = 13;

/**
 * Packs heights parameters to the buffer for the worker message.
 * @param {number} id - Worker task id.
 * @param {IRgbHeightsParams} p - Heights parameters, parent data is sent separately.
 * @returns {Float64Array} -
 */
export function packRgbHeightsParams(id: number, p: IRgbHeightsParams): Float64Array {
    let d = p.decode,
        ndv = d.noDataValues;
    let params = new Float64Array(PARAMS_NO_DATA_VALUES + ndv.length);

    params[PARAMS_ID] = id;
    params[PARAMS_SIZE] = p.size;
    params[PARAMS_GRID_SIZE] = p.gridSize;
    params[PARAMS_LEVELS] = p.levels;
    params[PARAMS_ENCODING] = d.encoding;
    params[PARAMS_MIN_HEIGHT] = d.minHeight;
    params[PARAMS_RESOLUTION] = d.resolution;
    params[PARAMS_HEIGHT_FACTOR] = d.heightFactor;
    params[PARAMS_PARENT_OFFSET_X] = d.parentOffsetX;
    params[PARAMS_PARENT_OFFSET_Y] = d.parentOffsetY;
    params[PARAMS_PARENT_ZOOM_DIFF] = d.parentZoomDiff;
    params[PARAMS_SKIP_POSITIVE_HEIGHTS] = d.skipPositiveHeights ? 1 : 0;
    params[PARAMS_NO_DATA_HEIGHT] = p.noDataHeight;

    for (let i = 0; i < ndv.length; i++) {
        params[PARAMS_NO_DATA_VALUES + i] = ndv[i];
    }
    return params;
}

/**
 * Unpacks heights parameters from the worker message buffer.
 * @param {Float64Array} params - Packed parameters.
 * @param {Float32Array | null} parentData - Parent segment elevations.
 * @returns {Array} - Task id and parameters (exactly 2 entries).
 */
export function unpackRgbHeightsParams(
    params: Float64Array,
    parentData: Float32Array | null
): [number, IRgbHeightsParams] {
    return [
        params[PARAMS_ID],
        {
            decode: {
                encoding: params[PARAMS_ENCODING],
                minHeight: params[PARAMS_MIN_HEIGHT],
                resolution: params[PARAMS_RESOLUTION],
                heightFactor: params[PARAMS_HEIGHT_FACTOR],
                noDataValues: params.subarray(PARAMS_NO_DATA_VALUES),
                parentData: parentData,
                parentOffsetX: params[PARAMS_PARENT_OFFSET_X],
                parentOffsetY: params[PARAMS_PARENT_OFFSET_Y],
                parentZoomDiff: params[PARAMS_PARENT_ZOOM_DIFF],
                skipPositiveHeights: params[PARAMS_SKIP_POSITIVE_HEIGHTS] === 1
            },
            size: params[PARAMS_SIZE],
            gridSize: params[PARAMS_GRID_SIZE],
            levels: params[PARAMS_LEVELS],
            noDataHeight: params[PARAMS_NO_DATA_HEIGHT]
        }
    ];
}

/**
 * Returns vertex grid cells for the image size, 2^n and (2^n + 1) sizes only.
 * @param {number} size - Image size.
 * @returns {number} -
 */
export function getGridCells(size: number): number {
    return (size & (size - 1)) === 0 ? size : size - 1;
}

function isNoDataValue(noDataValues: number[] | TypedArray, ndMin: number, ndMax: number, h: number): boolean {
    if (h > 50000) {
        return true;
    }
    if (h <= ndMin || h >= ndMax) {
        return false;
    }
    let start = 0,
        end = noDataValues.length - 1;
    while (start <= end) {
        let k = (start + end) >> 1;
        if (Math.abs(noDataValues[k] - h) < 1e-3) {
            return true;
        } else if (noDataValues[k] < h) {
            start = k + 1;
        } else {
            end = k - 1;
        }
    }
    return false;
}

export function getParentHeight(
    oneByDz2: number,
    offsetX: number,
    offsetY: number,
    heights: TypedArray | number[],
    i: number,
    j: number,
    skipPositiveHeights?: boolean
) {
    let parentGridSize = Math.sqrt(heights.length);
    let pi = Math.floor(offsetY * oneByDz2 * parentGridSize + i * oneByDz2),
        pj = Math.floor(offsetX * oneByDz2 * parentGridSize + j * oneByDz2);
    let h = heights[pi * parentGridSize + pj];
    return skipPositiveHeights ? (h > 0 ? 0 : h) : h;
}

/**
 * Decodes "rgb" or "terrarium" encoded pixel row heights.
 * @param {number[] | TypedArray} rgbaData - Image RGBA data.
 * @param {number} row - Pixel row.
 * @param {number} size - Image size.
 * @param {number} parentScale - Parent grid cells by image grid cells.
 * @param {IRgbDecodeParams} p - Decode parameters.
 * @param {Float32Array} outHeights - Row heights.
 * @param {number} noDataHeight - Height for no data pixels.
 */
export function decodeRgbHeightsRow(
    rgbaData: number[] | TypedArray,
    row: number,
    size: number,
    parentScale: number,
    p: IRgbDecodeParams,
    outHeights: Float32Array,
    noDataHeight: number
) {
    let ndv = p.noDataValues,
        ndMin = ndv.length ? ndv[0] - 1e-3 : 0,
        ndMax = ndv.length ? ndv[ndv.length - 1] + 1e-3 : 0;

    let isTerrarium = p.encoding === RGB_ENCODING_TERRARIUM,
        minHeight = p.minHeight,
        resolution = p.resolution,
        heightFactor = p.heightFactor,
        parentData = p.parentData;

    let pi = Math.floor(row * parentScale);

    for (let j = 0, k4 = row * size * 4; j < size; j++, k4 += 4) {
        let r = rgbaData[k4],
            g = rgbaData[k4 + 1],
            b = rgbaData[k4 + 2];

        let height = isTerrarium
            ? r * 256 + g + b / 256 - 32768
            : r === 255
              ? minHeight
              : minHeight + resolution * (r * 65536 + g * 256 + b);

        height *= heightFactor;

        let isNoData = isNoDataValue(ndv, ndMin, ndMax, height);

        if ((isNoData || height === 0) && parentData) {
            height = getParentHeight(
                p.parentZoomDiff,
                p.parentOffsetX,
                p.parentOffsetY,
                parentData,
                pi,
                Math.floor(j * parentScale),
                p.skipPositiveHeights
            );
            isNoData = isNoDataValue(ndv, ndMin, ndMax, height);
        }

        outHeights[j] = isNoData ? noDataHeight : height;
    }
}

/**
 * Converts size x size pixel heights to (size + 1) x (size + 1) vertex grid in pixel corners.
 * @param {number} size - Image size.
 * @param {DecodeHeightsRowFunc} decodeRow - Decodes pixel row heights, NaN for no data.
 * @param {number} noDataHeight - Height for vertices without data around.
 * @returns {Float32Array} -
 */
export function createVertexGrid(size: number, decodeRow: DecodeHeightsRowFunc, noDataHeight: number): Float32Array {
    let gs = size + 1;

    // Per-axis taps for vertex v: two pixel indices with interpolation weights, and the nearest pixels.
    let i0 = new Int32Array(gs),
        i1 = new Int32Array(gs),
        w0 = new Float32Array(gs),
        w1 = new Float32Array(gs),
        n0 = new Int32Array(gs),
        n1 = new Int32Array(gs);

    for (let v = 0; v < gs; v++) {
        if (v === 0) {
            i0[v] = 0;
            i1[v] = 1;
            w0[v] = 1.5;
            w1[v] = -0.5;
            n0[v] = n1[v] = 0;
        } else if (v === size) {
            i0[v] = size - 1;
            i1[v] = size - 2;
            w0[v] = 1.5;
            w1[v] = -0.5;
            n0[v] = n1[v] = size - 1;
        } else {
            i0[v] = n0[v] = v - 1;
            i1[v] = n1[v] = v;
            w0[v] = w1[v] = 0.5;
        }
    }

    // Pixel row r is kept at (r & 1) * size
    let heights = new Float32Array(size * 2),
        rowHeights = [heights.subarray(0, size), heights.subarray(size)],
        lastRow = -1;

    let out = new Float32Array(gs * gs);

    for (let vi = 0; vi < gs; vi++) {
        let needRow = vi === 0 ? 1 : Math.min(vi, size - 1);
        while (lastRow < needRow) {
            lastRow++;
            decodeRow(lastRow, rowHeights[lastRow & 1]);
        }

        let r0 = (i0[vi] & 1) * size,
            r1 = (i1[vi] & 1) * size,
            wr0 = w0[vi],
            wr1 = w1[vi],
            nr0 = (n0[vi] & 1) * size,
            nr1 = (n1[vi] & 1) * size;

        for (let vj = 0; vj < gs; vj++) {
            let c0 = i0[vj],
                c1 = i1[vj];

            let h =
                wr0 * (w0[vj] * heights[r0 + c0] + w1[vj] * heights[r0 + c1]) +
                wr1 * (w0[vj] * heights[r1 + c0] + w1[vj] * heights[r1 + c1]);

            // NaN means at least one tap has no data
            if (h === h) {
                out[vi * gs + vj] = h;
            } else {
                let h00 = heights[nr0 + n0[vj]],
                    h01 = heights[nr0 + n1[vj]],
                    h10 = heights[nr1 + n0[vj]],
                    h11 = heights[nr1 + n1[vj]];

                let sum = 0,
                    count = 0;

                if (h00 === h00) {
                    sum += h00;
                    count++;
                }
                if (h01 === h01) {
                    sum += h01;
                    count++;
                }
                if (h10 === h10) {
                    sum += h10;
                    count++;
                }
                if (h11 === h11) {
                    sum += h11;
                    count++;
                }

                out[vi * gs + vj] = count ? sum / count : noDataHeight;
            }
        }
    }

    return out;
}

/**
 * Takes (gridSize + 1) x (gridSize + 1) vertices of the cells x cells square starting at
 * the row0, col0 vertex of the (size + 1) x (size + 1) grid. Cells must be gridSize multiplied by a power of two.
 */
export function sampleSubGrid(
    grid: Float32Array,
    size: number,
    row0: number,
    col0: number,
    cells: number,
    gridSize: number,
    out: Float32Array = new Float32Array((gridSize + 1) * (gridSize + 1)),
    outOffset: number = 0
): Float32Array {
    let gs = size + 1,
        outGs = gridSize + 1,
        step = cells / gridSize;

    for (let i = 0; i < outGs; i++) {
        let src = (row0 + i * step) * gs + col0,
            dst = outOffset + i * outGs;
        for (let j = 0; j < outGs; j++) {
            out[dst + j] = grid[src + j * step];
        }
    }

    return out;
}

/**
 * Creates the tile heights grid and its subdivision levels, each tile is (gridSize + 1) x (gridSize + 1).
 * Output order is the tile itself, then 2x2 tiles of the first level, 4x4 of the second and so on, row by row.
 * @param {number} size - Image size, 2^n or (2^n + 1).
 * @param {number} gridSize - Tile grid size.
 * @param {number} levels - Subdivision levels.
 * @param {DecodeHeightsRowFunc} decodeRow - Decodes pixel row heights, NaN for no data.
 * @param {number} noDataHeight - Height for vertices without data.
 * @returns {Float32Array} -
 */
export function createHeightsLevels(
    size: number,
    gridSize: number,
    levels: number,
    decodeRow: DecodeHeightsRowFunc,
    noDataHeight: number
): Float32Array {
    let cells = getGridCells(size);

    let grid: Float32Array;

    if (cells === size) {
        grid = createVertexGrid(size, decodeRow, noDataHeight);
    } else {
        grid = new Float32Array(size * size);
        for (let row = 0; row < size; row++) {
            let rowHeights = grid.subarray(row * size, (row + 1) * size);
            decodeRow(row, rowHeights);
            for (let j = 0; j < size; j++) {
                if (rowHeights[j] !== rowHeights[j]) {
                    rowHeights[j] = noDataHeight;
                }
            }
        }
    }

    let tileLength = (gridSize + 1) * (gridSize + 1),
        tilesCount = 0;

    for (let k = 0; k <= levels; k++) {
        tilesCount += 1 << (2 * k);
    }

    let out = new Float32Array(tilesCount * tileLength);

    for (let k = 0, c = cells, offset = 0; k <= levels; k++, c >>= 1) {
        let d = 1 << k;
        for (let i = 0; i < d; i++) {
            for (let j = 0; j < d; j++) {
                sampleSubGrid(grid, cells, i * c, j * c, c, gridSize, out, offset);
                offset += tileLength;
            }
        }
    }

    return out;
}
