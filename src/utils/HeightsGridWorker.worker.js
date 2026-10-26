"use strict";
//
// Tile pixel heights to the terrain grid worker
//
import { createTileHeights } from "../terrain/terrainUtils";

self.onmessage = function (e) {
    const d = e.data;

    let heights = null;

    try {
        heights = createTileHeights(d.pixels, d.size, d.gridSize, d.levels, d.noDataHeight);
    } catch (err) {
        console.error(err);
    }

    self.postMessage(
        {
            id: d.id,
            heights: heights
        },
        heights ? [heights.buffer] : []
    );
};
