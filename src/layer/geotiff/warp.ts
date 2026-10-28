import type { TypedArray } from "geotiff";
import { getFastNoDataChecker } from "./ColorScale";

/**
 * Tile resampling data, the window rasters and the grid of the source positions of the tile pixels.
 */
export interface IWarpParams {
    /** Window rasters, one by band. */
    rasters: TypedArray[];
    /** Source positions of the grid nodes, normalized to 0..1, v grows down the raster rows. */
    gridU: Float64Array;
    gridV: Float64Array;
    gridSize: number;
    imgWidth: number;
    imgHeight: number;
    window: [number, number, number, number];
    tileSize: number;
    bilinear: boolean;
    nodata: number | null;
    /** Valid pixels of the window, if the file has a mask. */
    maskRaster?: TypedArray | null;
}

/**
 * Returns the tile rasters resampled from the window rasters, the nearest or bilinear. Tile pixels out of
 * the image, of no data or out of the mask are NaN.
 */
export function warpRasters(p: IWarpParams): Float32Array[] {
    const { rasters, gridU, gridV, gridSize, imgWidth, imgHeight, tileSize, bilinear, maskRaster } = p;
    const [winX0, winY0, winX1, winY1] = p.window;
    const winWidth = winX1 - winX0;
    const winHeight = winY1 - winY0;

    const side = gridSize + 1;
    const cellSize = tileSize / gridSize;

    const checkNoData = p.nodata !== null ? getFastNoDataChecker(p.nodata) : null;

    const out: Float32Array[] = [];
    for (let b = 0; b < rasters.length; b++) {
        out.push(new Float32Array(tileSize * tileSize).fill(NaN));
    }

    for (let y = 0; y < tileSize; y++) {
        // Grid nodes sit on tile pixel borders, so pixel centers are used here
        const gy = (y + 0.5) / cellSize;
        const j0 = Math.min(gridSize - 1, gy | 0);
        const fy = gy - j0;

        for (let x = 0; x < tileSize; x++) {
            const gx = (x + 0.5) / cellSize;
            const i0 = Math.min(gridSize - 1, gx | 0);
            const fx = gx - i0;

            // Bilinear interpolation of the source position between the grid nodes
            const n00 = j0 * side + i0;
            const n10 = n00 + 1;
            const n01 = n00 + side;
            const n11 = n01 + 1;

            const w00 = (1 - fx) * (1 - fy);
            const w10 = fx * (1 - fy);
            const w01 = (1 - fx) * fy;
            const w11 = fx * fy;

            const u = gridU[n00] * w00 + gridU[n10] * w10 + gridU[n01] * w01 + gridU[n11] * w11;
            const v = gridV[n00] * w00 + gridV[n10] * w10 + gridV[n01] * w01 + gridV[n11] * w11;

            if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;

            // Source position inside the window, in pixel centers
            const sx = u * imgWidth - winX0 - 0.5;
            const sy = v * imgHeight - winY0 - 0.5;

            const outIdx = y * tileSize + x;

            // Pixels the mask marks as invalid stay NaN, which is rendered as transparent
            if (maskRaster) {
                const mx = Math.max(0, Math.min(winWidth - 1, Math.round(sx)));
                const my = Math.max(0, Math.min(winHeight - 1, Math.round(sy)));
                if (!maskRaster[my * winWidth + mx]) continue;
            }

            if (bilinear) {
                const x0 = Math.floor(sx);
                const y0 = Math.floor(sy);
                const tx = sx - x0;
                const ty = sy - y0;
                const x1 = Math.min(winWidth - 1, x0 + 1);
                const y1 = Math.min(winHeight - 1, y0 + 1);
                const cx0 = Math.max(0, Math.min(winWidth - 1, x0));
                const cy0 = Math.max(0, Math.min(winHeight - 1, y0));

                const i00 = cy0 * winWidth + cx0;
                const i10 = cy0 * winWidth + x1;
                const i01 = y1 * winWidth + cx0;
                const i11 = y1 * winWidth + x1;

                for (let b = 0; b < rasters.length; b++) {
                    const src = rasters[b];
                    const v00 = src[i00],
                        v10 = src[i10],
                        v01 = src[i01],
                        v11 = src[i11];

                    if (
                        checkNoData
                            ? checkNoData(v00) || checkNoData(v10) || checkNoData(v01) || checkNoData(v11)
                            : Number.isNaN(v00) || Number.isNaN(v10) || Number.isNaN(v01) || Number.isNaN(v11)
                    ) {
                        continue;
                    }

                    out[b][outIdx] = (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
                }
            } else {
                const px = Math.max(0, Math.min(winWidth - 1, Math.round(sx)));
                const py = Math.max(0, Math.min(winHeight - 1, Math.round(sy)));
                const srcIdx = py * winWidth + px;

                for (let b = 0; b < rasters.length; b++) {
                    const val = rasters[b][srcIdx];
                    if (checkNoData ? checkNoData(val) : Number.isNaN(val)) continue;
                    out[b][outIdx] = val;
                }
            }
        }
    }

    return out;
}
