import { vi } from "vitest";

vi.mock("../../src/utils/RasterWorker", () => ({ getRasterWorker: () => null }));

import { GeoTIFFReader } from "../../src/layer/geotiff/GeoTIFFReader";
import { Extent } from "../../src/Extent";
import { LonLat } from "../../src/LonLat";
import * as mercator from "../../src/mercator";
import { cube, cubeEquiangular } from "../../src/proj/cube";
import { CubeQuadTreeStrategy, EquiangularCubeQuadTreeStrategy } from "../../src/quadTree/cube/CubeQuadTreeStrategy";
import { NE, NW, SE, SW } from "../../src/quadTree/quadTree";
import { STRATEGIES, createStrategy } from "../quadTree/quadTreeScene";
import { EPSG4326 } from "../../src/proj/EPSG4326";
import { tileSegment } from "./tileSegment";

// A whole world raster in degrees, its pixels are a tenth of a degree
function createReader() {
    const reader = Object.create(GeoTIFFReader.prototype);
    reader.nativeBBox = [-180, -90, 180, 90];
    reader.crsCode = 4326;
    reader.reverseY = false;
    reader.images = [{ getWidth: () => 3600, getHeight: () => 1800 }];
    return reader;
}

function getSegment(Strategy, face, path) {
    const qts = createStrategy(Strategy);
    let node = qts.quadTreeList[face];
    for (const part of path) {
        node.createChildNodes();
        node = node.nodes[part];
    }
    return node.segment;
}

// The raster position of every grid node against the lon/lat of the tile point, the longitude taken across
// the antimeridian when it is closer that way
function gridErrors(reader, grid, segment) {
    const e = segment.getExtent(),
        side = grid.gridSize + 1;

    let worst = 0;

    for (let j = 0; j < side; j++) {
        for (let i = 0; i < side; i++) {
            const p = segment.getLonLat(
                    e.southWest.lon + (e.getWidth() * i) / grid.gridSize,
                    e.northEast.lat - (e.getHeight() * j) / grid.gridSize
                ),
                n = j * side + i,
                u = grid.gridU[n],
                v = grid.gridV[n],
                du = Math.abs(u - (p.lon + 180) / 360),
                dv = Math.abs(v - (90 - p.lat) / 180);

            if (Math.abs(p.lat) < 89.999) {
                worst = Math.max(worst, Math.min(du, Math.abs(du - 1)), dv);
            }
        }
    }

    return worst;
}

describe.each([
    ["the gnomonic cube", CubeQuadTreeStrategy, cube],
    ["the equiangular cube", EquiangularCubeQuadTreeStrategy, cubeEquiangular]
])("GeoTIFF tile grid of %s", (_, Strategy, proj) => {
    test("every node is the raster position of its tile point", () => {
        const reader = createReader();

        for (const face of [0, 1, 2, 3, 4, 5]) {
            for (const path of [[NW], [SE, NE], [SW, SW, NW], [NE, SE, SW, NW]]) {
                const segment = getSegment(Strategy, face, path),
                    grid = reader._createTileGrid(segment, 256);

                expect(grid).not.toBe(null);
                expect(gridErrors(reader, grid, segment)).toBeLessThan(1e-9);
            }
        }
    });

    test("a tile on the antimeridian stays on one side of the raster", () => {
        const reader = createReader();

        // The back face lies on the antimeridian, its tiles touch it from both sides
        for (const path of [[NW], [NE], [SW, NE], [SE, NW]]) {
            const segment = getSegment(Strategy, 3, path),
                grid = reader._createTileGrid(segment, 256);

            expect(grid.uMax - grid.uMin).toBeLessThan(0.3);
        }
    });

    test("a tile with a pole in its corner has a finite grid of a quarter of the longitudes", () => {
        const reader = createReader();

        for (const face of [0, 5]) {
            for (const part of [NW, NE, SW, SE]) {
                const segment = getSegment(Strategy, face, [part]),
                    grid = reader._createTileGrid(segment, 256);

                expect(Number.isFinite(grid.uMin) && Number.isFinite(grid.uMax)).toBe(true);
                expect(grid.uMax - grid.uMin).toBeLessThan(0.3);
                expect(face === 0 ? grid.vMin : 1 - grid.vMax).toBeLessThan(1e-9);
            }
        }
    });
});

test("a Web Mercator tile grid is the lon/lat rectangle", () => {
    const reader = createReader(),
        extent = new Extent(new LonLat(10, 40), new LonLat(20, 50)),
        grid = reader._createTileGrid(tileSegment(extent), 256),
        side = grid.gridSize + 1,
        top = mercator.forward_lat(50),
        bottom = mercator.forward_lat(40);

    for (let j = 0; j < side; j++) {
        for (let i = 0; i < side; i++) {
            const n = j * side + i,
                lon = 10 + (10 * i) / grid.gridSize,
                lat = mercator.inverse_lat(top + ((bottom - top) * j) / grid.gridSize);
            expect(grid.gridU[n]).toBeCloseTo((lon + 180) / 360, 12);
            expect(grid.gridV[n]).toBeCloseTo((90 - lat) / 180, 12);
        }
    }
});

// Down the tree to every tile of the zoom
function collectTiles(Strategy, zoom) {
    const qts = createStrategy(Strategy),
        tiles = [],
        visit = (node) => {
            if (node.segment.tileZoom < zoom) {
                node.createChildNodes();
                node.nodes.forEach(visit);
            } else {
                tiles.push(node.segment);
            }
        };
    qts.quadTreeList.forEach(visit);
    return tiles;
}

describe.each(STRATEGIES)("GeoTIFF tile grid of $name segments", ({ Strategy }) => {
    test("every node is the raster position of its tile point", () => {
        const reader = createReader();

        for (const segment of collectTiles(Strategy, 3)) {
            const grid = reader._createTileGrid(segment, 256);
            expect(gridErrors(reader, grid, segment)).toBeLessThan(1e-9);
        }
    });
});

// The pole row of a lon/lat tile of the Earth caps keeps the longitudes of its columns
test("the pole row of an Earth cap tile keeps its column longitudes", () => {
    const reader = createReader();

    let checked = 0;

    for (const segment of collectTiles(STRATEGIES[0].Strategy, 3)) {
        const ext = segment.getExtentLonLat();

        if (ext.northEast.lat < 90 && ext.southWest.lat > -90) {
            continue;
        }

        const grid = reader._createTileGrid(segment, 256),
            side = grid.gridSize + 1,
            row = ext.northEast.lat >= 90 ? 0 : grid.gridSize;

        for (let i = 0; i < side; i++) {
            const lon = ext.southWest.lon + ((ext.northEast.lon - ext.southWest.lon) * i) / grid.gridSize;
            expect(grid.gridU[row * side + i]).toBeCloseTo((lon + 180) / 360, 12);
            checked++;
        }
    }

    expect(checked).toBeGreaterThan(0);
});

describe("GeoTIFF overview of a tile", () => {
    // A whole world raster of 921600 x 460800 pixels and its overviews down by 2 to 256 times smaller
    const OVERVIEWS = 9;

    function createPyramidReader() {
        const reader = createReader();
        reader.images = Array.from({ length: OVERVIEWS }, (_, k) => ({
            getWidth: () => 921600 / 2 ** k,
            getHeight: () => 460800 / 2 ** k
        }));
        return reader;
    }

    const windowPixels = (reader, grid, index) =>
        (Math.min(grid.uMax, 1) - Math.max(grid.uMin, 0)) *
        reader.images[index].getWidth() *
        (Math.min(grid.vMax, 1) - Math.max(grid.vMin, 0)) *
        reader.images[index].getHeight();

    const BUDGET = 16 * 256 * 256;

    test.each([
        ["gnomonic", CubeQuadTreeStrategy],
        ["equiangular", EquiangularCubeQuadTreeStrategy]
    ])("a %s cube tile with the pole in its corner takes the resolution of the rows", (_, Strategy) => {
        const reader = createPyramidReader();

        for (const zoom of [3, 4, 5, 6, 8]) {
            // Down to the north pole, the center of the top face
            const segment = getSegment(Strategy, 0, [NW, ...Array(zoom - 1).fill(SE)]),
                grid = reader._createTileGrid(segment, 256),
                index = reader._selectOverviewIndex(grid, 256);

            // The columns converge at the pole, by them it would be the coarsest overview
            expect(index).toBeLessThan(OVERVIEWS - 1);
            expect(windowPixels(reader, grid, index)).toBeLessThanOrEqual(BUDGET);
        }
    });

    test("a window larger than the budget takes a coarser overview", () => {
        const reader = createPyramidReader();

        // One full resolution pixel per tile pixel over a tenth of the raster by each side
        const u = 256 / 921600,
            v = 256 / 460800,
            grid = {
                gridU: new Float64Array([0, u, 0, u]),
                gridV: new Float64Array([0, 0, v, v]),
                gridSize: 1,
                uMin: 0,
                uMax: 0.1,
                vMin: 0,
                vMax: 0.1
            };

        const index = reader._selectOverviewIndex(grid, 256);

        expect(index).toBeGreaterThan(0);
        expect(windowPixels(reader, grid, index)).toBeLessThanOrEqual(BUDGET);
        expect(windowPixels(reader, grid, index - 1)).toBeGreaterThan(BUDGET);
    });

    test("a lon/lat tile on a lon/lat raster takes the overview of its pixel size", () => {
        const reader = createPyramidReader();

        // A 10 degrees tile: 100 full resolution pixels in a tile pixel, the 128 times smaller overview is the
        // coarsest one under 1.4 of it
        const extent = new Extent(new LonLat(10, 60), new LonLat(20, 70)),
            grid = reader._createTileGrid(tileSegment(extent, EPSG4326), 256);

        expect(reader._selectOverviewIndex(grid, 256)).toBe(7);
    });
});
