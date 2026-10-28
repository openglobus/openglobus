"use strict";
//
// Raster pixels worker: terrain grid heights of the tile pixels and the GeoTIFF tile resampling
//
import { createTileHeights } from "../terrain/terrainUtils";
import { warpRasters } from "../layer/geotiff/warp";

function makeResult(d) {
    if (d.type === "heights") {
        let heights = createTileHeights(d.pixels, d.size, d.gridSize, d.levels, d.noDataHeight);
        return [heights, [heights.buffer]];
    }

    let rasters = warpRasters(d);
    return [rasters, rasters.map((r) => r.buffer)];
}

self.onmessage = function (e) {
    let result = null,
        transfer = [];

    try {
        [result, transfer] = makeResult(e.data);
    } catch (err) {
        console.error(err);
    }

    self.postMessage({ id: e.data.id, result: result }, transfer);
};
