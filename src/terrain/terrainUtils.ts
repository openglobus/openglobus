import type { TypedArray } from "../utils/shared";
import type { Extent } from "../Extent";

export const RGB_ENCODING_CUSTOM = -1;
export const RGB_ENCODING_RGB = 0;
export const RGB_ENCODING_TERRARIUM = 1;

/** Segment grid sizes by zoom of the elevation terrains. */
export const TERRAIN_GRID_SIZE_BY_ZOOM = [
    64, 32, 16, 8, 8, 8, 16, 16, 16, 32, 32, 32, 32, 32, 32, 64, 64, 64, 32, 32, 16, 8
];

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

/**
 * Returns pixel grid cells for the image size, 2^n and (2^n + 1) sizes only.
 * @param {number} size - Image size.
 * @returns {number} -
 */
export function getGridCells(size: number): number {
    return (size & (size - 1)) === 0 ? size : size - 1;
}

/**
 * Returns vertex grid cells for the image size. 2^n images have vertices at the pixel centers and corners,
 * (2^n + 1) images are the grid itself.
 * @param {number} size - Image size.
 * @returns {number} -
 */
export function getVertexGridCells(size: number): number {
    let cells = getGridCells(size);
    return cells === size ? cells * 2 : cells;
}

/**
 * Returns subdivision levels of the image tile. Native zoom levels are not finer than the image pixels,
 * finer data comes with their own tiles. Levels above the native zooms go down to the vertex grid.
 * @param {number} size - Image size.
 * @param {number} gridSize - Tile grid size.
 * @param {number} tileZoom - Image tile zoom.
 * @param {number} maxZoom - Maximal terrain zoom.
 * @param {number} maxNativeZoom - Maximal zoom of the terrain tiles.
 * @returns {number} -
 */
export function getSubdivisionLevels(
    size: number,
    gridSize: number,
    tileZoom: number,
    maxZoom: number,
    maxNativeZoom: number
): number {
    let pixelCells = getGridCells(size),
        vertexCells = getVertexGridCells(size),
        levels = 0;

    for (let k = 1; tileZoom + k <= maxZoom; k++) {
        if ((tileZoom + k > maxNativeZoom ? vertexCells : pixelCells) >> k < gridSize) {
            break;
        }
        levels = k;
    }

    return levels;
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
 * Returns the height at the tile edge, extrapolated from the edge pixel p0 inwards through p1 and p2.
 * The slope is limited (minmod), so peaks, pits and slope breaks at the edge are not overshot.
 * @param {number} p0 - Edge pixel height.
 * @param {number} p1 - Next pixel height.
 * @param {number} p2 - Pixel height after the next.
 * @returns {number} -
 */
export function getEdgeHeight(p0: number, p1: number, p2: number): number {
    let s0 = p0 - p1,
        s1 = p1 - p2;
    return p0 + 0.5 * (s0 * s1 <= 0 ? 0 : Math.abs(s0) < Math.abs(s1) ? s0 : s1);
}

/**
 * Returns the ground height at the point of the tile heights grid, on the grid triangles as they are rendered.
 * @param {number} x - Point x in the tile extent projection.
 * @param {number} y - Point y in the tile extent projection.
 * @param {Extent} extent - Tile extent.
 * @param {number[] | TypedArray} heights - Tile heights grid, rows from north to south.
 * @returns {number} -
 */
export function getGroundHeight(x: number, y: number, extent: Extent, heights: number[] | TypedArray): number {
    let gs = Math.sqrt(heights.length),
        cells = gs - 1,
        col = ((x - extent.southWest.lon) / extent.getWidth()) * cells,
        row = ((extent.northEast.lat - y) / extent.getHeight()) * cells,
        j = Math.min(Math.max(Math.floor(col), 0), cells - 1),
        i = Math.min(Math.max(Math.floor(row), 0), cells - 1),
        fx = col - j,
        fy = 1 - (row - i);

    /*
    v2-----------v3
    |  \         |
    |     \      |
    |        \   |
    v0-----------v1
    */
    let k = i * gs + j,
        h2 = heights[k],
        h3 = heights[k + 1],
        h0 = heights[k + gs],
        h1 = heights[k + gs + 1];

    return fx + fy <= 1 ? h0 + fx * (h1 - h0) + fy * (h2 - h0) : h3 + (1 - fx) * (h2 - h3) + (1 - fy) * (h1 - h3);
}

/**
 * Writes the pixel row heights at the vertex columns: the edges, the pixel corners and, with half pixel steps,
 * the pixel centers.
 */
function interpolateRow(pixels: Float32Array, offset: number, size: number, halfSteps: number, out: Float32Array) {
    let last = offset + size - 1;

    out[0] = getEdgeHeight(pixels[offset], pixels[Math.min(offset + 1, last)], pixels[Math.min(offset + 2, last)]);

    out[(size * 2) / halfSteps] = getEdgeHeight(
        pixels[last],
        pixels[Math.max(last - 1, offset)],
        pixels[Math.max(last - 2, offset)]
    );

    if (halfSteps === 1) {
        let prev = pixels[offset];
        out[1] = prev;
        for (let k = 1; k < size; k++) {
            let h = pixels[offset + k];
            out[k * 2] = 0.5 * (prev + h);
            out[k * 2 + 1] = h;
            prev = h;
        }
    } else {
        for (let k = 1; k < size; k++) {
            out[k] = 0.5 * (pixels[offset + k - 1] + pixels[offset + k]);
        }
    }
}

/**
 * Converts size x size pixel heights to the vertex grid in the pixel corners, (size + 1) x (size + 1),
 * or in the pixel centers and corners, (2 * size + 1) x (2 * size + 1). Pixel center vertices keep the pixel heights.
 * @param {Float32Array} pixels - Pixel heights, NaN for no data.
 * @param {number} size - Image size.
 * @param {number} noDataHeight - Height for vertices without data around.
 * @param {boolean} [pixelCenters=true] - Vertices at the pixel centers too.
 * @returns {Float32Array} -
 */
export function createVertexGrid(
    pixels: Float32Array,
    size: number,
    noDataHeight: number,
    pixelCenters: boolean = true
): Float32Array {
    let halfSteps = pixelCenters ? 1 : 2,
        gs = (size * 2) / halfSteps + 1,
        last = size - 1;

    // Heights at the vertex columns of the last three pixel rows, pixel row r is kept at (r % 3)
    let columns = new Float32Array(gs * 3),
        rowColumns = [columns.subarray(0, gs), columns.subarray(gs, gs * 2), columns.subarray(gs * 2)],
        lastRow = -1;

    let out = new Float32Array(gs * gs);

    for (let vi = 0; vi < gs; vi++) {
        let u = vi * halfSteps,
            k = u >> 1,
            dst = vi * gs;

        let needRow = u === 0 ? Math.min(2, last) : Math.min(k, last);

        while (lastRow < needRow) {
            lastRow++;
            interpolateRow(pixels, lastRow * size, size, halfSteps, rowColumns[lastRow % 3]);
        }

        if (u & 1) {
            out.set(rowColumns[k % 3], dst);
        } else if (k === 0 || k === size) {
            let c0 = rowColumns[(k === 0 ? 0 : last) % 3],
                c1 = rowColumns[(k === 0 ? Math.min(1, last) : Math.max(last - 1, 0)) % 3],
                c2 = rowColumns[(k === 0 ? Math.min(2, last) : Math.max(last - 2, 0)) % 3];

            for (let vj = 0; vj < gs; vj++) {
                out[dst + vj] = getEdgeHeight(c0[vj], c1[vj], c2[vj]);
            }
        } else {
            let c0 = rowColumns[(k - 1) % 3],
                c1 = rowColumns[k % 3];

            for (let vj = 0; vj < gs; vj++) {
                out[dst + vj] = 0.5 * (c0[vj] + c1[vj]);
            }
        }

        for (let vj = 0; vj < gs; vj++) {
            if (out[dst + vj] !== out[dst + vj]) {
                out[dst + vj] = averagePixels(pixels, size, u, vj * halfSteps, noDataHeight);
            }
        }
    }

    return out;
}

function averagePixels(pixels: Float32Array, size: number, ui: number, uj: number, noDataHeight: number): number {
    let last = size - 1,
        ki = ui >> 1,
        kj = uj >> 1,
        sum = 0,
        count = 0;

    for (let i = Math.max(ki - 1, 0), i1 = Math.min(ki + (ui & 1), last); i <= i1; i++) {
        for (let j = Math.max(kj - 1, 0), j1 = Math.min(kj + (uj & 1), last); j <= j1; j++) {
            let h = pixels[i * size + j];
            if (h === h) {
                sum += h;
                count++;
            }
        }
    }

    return count ? sum / count : noDataHeight;
}

/** Peak and pit pixels, and their place in the vertex grid. */
export interface IGridPeaks {
    pixels: Float32Array;
    size: number;
    /** Peaks by pixel rows, columns of row r are cols[rowStart[r]] ... cols[rowStart[r + 1] - 1]. */
    rowStart: Int32Array;
    cols: Int32Array;
    /** 1 for peaks, 0 for pits. */
    isPeak: Uint8Array;
    /** Pixel p is at (p + offset) * scale vertex. */
    offset: number;
    scale: number;
}

const HIGHER_AROUND = 1,
    LOWER_AROUND = 2;

let _around = new Uint8Array(0);

/** Marks pixels a and b with the neighbour higher or lower flags, NaN pixels are not compared. */
function compareNeighbours(pixels: Float32Array, around: Uint8Array, a: number, b: number) {
    let ha = pixels[a],
        hb = pixels[b];

    if (hb > ha) {
        around[a] |= HIGHER_AROUND;
        around[b] |= LOWER_AROUND;
    } else if (hb < ha) {
        around[a] |= LOWER_AROUND;
        around[b] |= HIGHER_AROUND;
    }
}

/**
 * Finds the pixels that are not lower (peaks) or not higher (pits) than the pixels around,
 * and differ from at least one of them.
 * @param {Float32Array} pixels - Pixel heights, NaN for no data.
 * @param {number} size - Image size.
 * @param {number} offset - Pixel p is at (p + offset) * scale vertex of the grid.
 * @param {number} scale - Grid vertices by pixel.
 * @returns {IGridPeaks} -
 */
export function findPeaks(pixels: Float32Array, size: number, offset: number, scale: number): IGridPeaks {
    let last = size - 1,
        length = size * size;

    if (_around.length < length) {
        _around = new Uint8Array(length);
    } else {
        _around.fill(0, 0, length);
    }

    let around = _around;

    // Every neighbour pair is compared once, in 2x2 squares a b / c d: a-b, a-c, a-d and b-c
    for (let r = 0; r < last; r++) {
        let row = r * size;
        for (let k = row, end = row + last; k < end; k++) {
            compareNeighbours(pixels, around, k, k + 1);
            compareNeighbours(pixels, around, k, k + size);
            compareNeighbours(pixels, around, k, k + size + 1);
            compareNeighbours(pixels, around, k + 1, k + size);
        }
        compareNeighbours(pixels, around, row + last, row + last + size);
    }
    for (let k = last * size, end = k + last; k < end; k++) {
        compareNeighbours(pixels, around, k, k + 1);
    }

    let rowStart = new Int32Array(size + 1),
        count = 0;

    for (let k = 0; k < length; k++) {
        if (around[k] === HIGHER_AROUND || around[k] === LOWER_AROUND) {
            count++;
        }
    }

    let cols = new Int32Array(count),
        isPeak = new Uint8Array(count);

    count = 0;

    for (let r = 0; r < size; r++) {
        rowStart[r] = count;
        for (let c = 0, k = r * size; c < size; c++, k++) {
            if (around[k] === HIGHER_AROUND || around[k] === LOWER_AROUND) {
                cols[count] = c;
                isPeak[count] = around[k] === LOWER_AROUND ? 1 : 0;
                count++;
            }
        }
    }

    rowStart[size] = count;

    return { pixels, size, rowStart, cols, isPeak, offset, scale };
}

// Peak deviations of the sampled grid vertices, reused
let _deviations = new Float32Array(0);

/**
 * Takes (gridSize + 1) x (gridSize + 1) vertices of the cells x cells square starting at
 * the row0, col0 vertex of the (size + 1) x (size + 1) grid. Cells must be gridSize multiplied by a power of two.
 *
 * With peaks, peaks and pits are moved to the nearest inner vertices, slopes and edge vertices stay sampled.
 */
export function sampleSubGrid(
    grid: Float32Array,
    size: number,
    row0: number,
    col0: number,
    cells: number,
    gridSize: number,
    out: Float32Array = new Float32Array((gridSize + 1) * (gridSize + 1)),
    outOffset: number = 0,
    peaks: IGridPeaks | null = null,
    noDataHeight: number = NaN
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

    if (peaks && step > 1 && gridSize > 1) {
        keepPeaks(grid, gs, row0, col0, cells, gridSize, out, outOffset, peaks, noDataHeight);
    }

    return out;
}

function keepPeaks(
    grid: Float32Array,
    gs: number,
    row0: number,
    col0: number,
    cells: number,
    gridSize: number,
    out: Float32Array,
    outOffset: number,
    peaks: IGridPeaks,
    noDataHeight: number
) {
    let outGs = gridSize + 1,
        step = cells / gridSize,
        half = step >> 1,
        inner = gridSize - 1,
        { pixels, size, rowStart, cols, isPeak, offset, scale } = peaks;

    // Pixels in the square
    let pr0 = Math.max(Math.ceil(row0 / scale - offset), 0),
        pr1 = Math.min(Math.floor((row0 + cells) / scale - offset), size - 1),
        pc0 = Math.max(Math.ceil(col0 / scale - offset), 0),
        pc1 = Math.min(Math.floor((col0 + cells) / scale - offset), size - 1);

    if (_deviations.length < outGs * outGs) {
        _deviations = new Float32Array(outGs * outGs);
    }

    _deviations.fill(0, 0, outGs * outGs);

    for (let pr = pr0; pr <= pr1; pr++) {
        let p = rowStart[pr],
            end = rowStart[pr + 1];

        for (let hi = end; p < hi;) {
            let m = (p + hi) >> 1;
            if (cols[m] < pc0) {
                p = m + 1;
            } else {
                hi = m;
            }
        }

        if (p === end || cols[p] > pc1) {
            continue;
        }

        let y = (pr + offset) * scale - row0,
            ci = Math.min(Math.floor(y / step), inner),
            fy = y / step - ci,
            i = Math.min(Math.max(Math.floor((y + half) / step), 1), inner),
            top = (row0 + ci * step) * gs + col0,
            bottom = top + step * gs,
            vertexRow = (row0 + i * step) * gs + col0;

        for (; p < end && cols[p] <= pc1; p++) {
            let x = (cols[p] + offset) * scale - col0,
                cj = Math.min(Math.floor(x / step), inner),
                fx = x / step - cj,
                k = cj * step;

            let h00 = grid[top + k],
                h01 = grid[top + k + step],
                h10 = grid[bottom + k],
                h11 = grid[bottom + k + step];

            if (h00 === noDataHeight || h01 === noDataHeight || h10 === noDataHeight || h11 === noDataHeight) {
                continue;
            }

            let surface = (1 - fy) * ((1 - fx) * h00 + fx * h01) + fy * ((1 - fx) * h10 + fx * h11),
                h = pixels[pr * size + cols[p]],
                deviation = isPeak[p] ? h - surface : surface - h;

            if (deviation <= 0 || h === noDataHeight) {
                continue;
            }

            let j = Math.min(Math.max(Math.floor((x + half) / step), 1), inner),
                v = i * outGs + j;

            if (deviation > _deviations[v] && deviation > Math.abs(surface - grid[vertexRow + j * step])) {
                _deviations[v] = deviation;
                out[outOffset + v] = h;
            }
        }
    }
}

/**
 * Returns (gridSize + 1) x (gridSize + 1) mesh heights of (fileGridSize + 1) x (fileGridSize + 1) elevations,
 * their peaks and pits are moved to the nearest mesh vertices.
 * @param {Float32Array} elevations - Elevations grid, rows from north to south.
 * @param {number} fileGridSize - Elevations grid size.
 * @param {number} gridSize - Mesh grid size, fileGridSize divided by a power of two.
 * @param {number} noDataHeight - Height of no data elevations.
 * @param {Float32Array} [out] - Mesh heights.
 * @returns {Float32Array} -
 */
export function getMeshHeights(
    elevations: Float32Array,
    fileGridSize: number,
    gridSize: number,
    noDataHeight: number,
    out: Float32Array = new Float32Array((gridSize + 1) * (gridSize + 1))
): Float32Array {
    return sampleSubGrid(
        elevations,
        fileGridSize,
        0,
        0,
        fileGridSize,
        gridSize,
        out,
        0,
        findPeaks(elevations, fileGridSize + 1, 0, 1),
        noDataHeight
    );
}

/**
 * Creates the tile heights grid and its subdivision levels, each tile is (gridSize + 1) x (gridSize + 1).
 * Output order is the tile itself, then 2x2 tiles of the first level, 4x4 of the second and so on, row by row.
 * Peaks and pits of the pixels stay in all the levels.
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
    let pixels = new Float32Array(size * size);

    for (let row = 0; row < size; row++) {
        decodeRow(row, pixels.subarray(row * size, (row + 1) * size));
    }

    let grid: Float32Array, cells: number, peaks: IGridPeaks;

    if (getGridCells(size) === size) {
        // Vertices at the pixel centers are needed when the last level is finer than the pixels
        let pixelCenters = size >> levels < gridSize;
        grid = createVertexGrid(pixels, size, noDataHeight, pixelCenters);
        cells = pixelCenters ? size * 2 : size;
        peaks = findPeaks(pixels, size, 0.5, cells / size);
    } else {
        peaks = findPeaks(pixels, size, 0, 1);
        for (let k = 0; k < pixels.length; k++) {
            if (pixels[k] !== pixels[k]) {
                pixels[k] = noDataHeight;
            }
        }
        grid = pixels;
        cells = size - 1;
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
                sampleSubGrid(grid, cells, i * c, j * c, c, gridSize, out, offset, peaks, noDataHeight);
                offset += tileLength;
            }
        }
    }

    return out;
}
