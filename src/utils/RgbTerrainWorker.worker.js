"use strict";
//
// RGB terrain heights worker
//
import {
    createHeightsLevels,
    decodeRgbHeightsRow,
    getGridCells,
    unpackRgbHeightsParams
} from "../terrain/rgbTerrainGrid";

let ctx = null;

function getImageData(bitmap, size) {
    if (!ctx || ctx.canvas.width !== size) {
        ctx = new OffscreenCanvas(size, size).getContext("2d", {
            willReadFrequently: true
        });
    }

    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(bitmap, 0, 0);

    return ctx.getImageData(0, 0, size, size).data;
}

self.onmessage = function (e) {
    const [id, p] = unpackRgbHeightsParams(e.data.params, e.data.parentData);
    const bitmap = e.data.bitmap;

    let heights = null;

    try {
        const rgbaData = getImageData(bitmap, p.size);
        const parentScale = p.gridSize / getGridCells(p.size);

        heights = createHeightsLevels(
            p.size,
            p.gridSize,
            p.levels,
            (row, outHeights) => decodeRgbHeightsRow(rgbaData, row, p.size, parentScale, p.decode, outHeights, NaN),
            p.noDataHeight
        );
    } catch (err) {
        console.error(err);
    }

    bitmap.close();

    self.postMessage(
        {
            id: id,
            heights: heights
        },
        heights ? [heights.buffer] : []
    );
};
