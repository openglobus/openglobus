import { describe, expect, test, vi } from "vitest";
import { Extent } from "../../src/Extent";
import { LonLat } from "../../src/LonLat";
import { BaseGeoImage, getCubeFaceExtents } from "../../src/layer/BaseGeoImage";
import { cube, cubeEquiangular, CUBE_FRONT, CUBE_RIGHT, CUBE_TOP } from "../../src/proj/cube";
import { EPSG3857 } from "../../src/proj/EPSG3857";
import { GeoImageCreator } from "../../src/utils/GeoImageCreator";

// The grid of the image with the corners from the north-west one clockwise
const gridOf = (w, s, e, n) =>
    new GeoImageCreator({}).createGridLonLat([new LonLat(w, n), new LonLat(e, n), new LonLat(e, s), new LonLat(w, s)]);

const facesOf = (extents) => extents.map((e, face) => (e ? face : -1)).filter((face) => face >= 0);

describe.each([
    ["gnomonic", cube],
    ["equiangular", cubeEquiangular]
])("the faces of a geo image on the %s cube", (_, proj) => {
    test("an image in the middle of a face is on it only", () => {
        const extents = getCubeFaceExtents(gridOf(-5, -5, 5, 5), proj),
            e = extents[CUBE_FRONT];

        expect(facesOf(extents)).toEqual([CUBE_FRONT]);
        expect(e.southWest.lon - CUBE_FRONT).toBeGreaterThan(0.4);
        expect(e.northEast.lon - CUBE_FRONT).toBeLessThan(0.6);
        expect(e.southWest.lat).toBeGreaterThan(0.4);
        expect(e.northEast.lat).toBeLessThan(0.6);
    });

    test("an image over a face edge is on both faces, each rectangle ends on the edge", () => {
        const extents = getCubeFaceExtents(gridOf(40, -5, 50, 5), proj);

        expect(facesOf(extents)).toEqual([CUBE_FRONT, CUBE_RIGHT]);
        expect(extents[CUBE_FRONT].northEast.lon).toBe(CUBE_FRONT + 1);
        expect(extents[CUBE_RIGHT].southWest.lon).toBe(CUBE_RIGHT);
    });

    test("an image over a cube corner is on the three faces", () => {
        expect(facesOf(getCubeFaceExtents(gridOf(41, 31, 49, 39), proj))).toEqual([CUBE_TOP, CUBE_FRONT, CUBE_RIGHT]);
    });

    test("the whole world is on all the faces, all of them", () => {
        const extents = getCubeFaceExtents(gridOf(-180, -89.9, 180, 89.9), proj);

        expect(facesOf(extents)).toEqual([0, 1, 2, 3, 4, 5]);
        extents.forEach((e, face) => {
            expect(e.southWest.lon).toBeCloseTo(face, 3);
            expect(e.northEast.lon).toBeCloseTo(face + 1, 3);
        });
    });

    test("every grid point on a face is in its rectangle", () => {
        const points = gridOf(30, 20, 60, 50),
            extents = getCubeFaceExtents(points, proj);

        for (const p of points) {
            const n = proj.fromLonLat(p),
                e = extents[Math.floor(n.lon)];
            expect(e).not.toBe(null);
            expect(e.isInside(n)).toBe(true);
        }
    });
});

describe("a geo image on the cube", () => {
    const image = () => {
        const g = new BaseGeoImage("image", {
            corners: [
                [40, 5],
                [50, 5],
                [50, -5],
                [40, -5]
            ]
        });
        g._assignPlanet({
            _layers: [],
            renderer: null,
            quadTreeStrategy: { projection: cubeEquiangular },
            transparentTexture: "transparent"
        });
        return g;
    };

    const material = (face, extent) => ({
        segment: { tileGroup: face, getExtent: () => extent },
        isReady: false,
        texture: null,
        applyTexture: vi.fn(function (texture) {
            this.texture = texture;
            this.isReady = true;
        })
    });

    test("draws on the planes of the faces", () => {
        const g = image();
        expect(g._projType).toBe(2);
        expect(g.rendering).toBe(g._renderingProjTypePlane);
    });

    test("a tile takes the texture of its face and the place of the tile in it", () => {
        const g = image();
        g._faceExtents = getCubeFaceExtents(gridOf(40, -5, 50, 5), cubeEquiangular);
        g._faceTextures = g._faceExtents.map((e, face) => (e ? `face ${face}` : null));
        g._ready = true;

        const e = g._faceExtents[CUBE_FRONT],
            w = e.northEast.lon - e.southWest.lon,
            h = e.northEast.lat - e.southWest.lat,
            // The east half of the image rectangle, the north quarter of it
            tile = Extent.createFromArray([
                e.southWest.lon + w / 2,
                e.northEast.lat - h / 4,
                e.northEast.lon,
                e.northEast.lat
            ]),
            m = material(CUBE_FRONT, tile),
            offset = g.applyMaterial(m);

        expect(m.texture).toBe(`face ${CUBE_FRONT}`);
        expect(offset[0]).toBeCloseTo(0.5, 12);
        expect(offset[1]).toBeCloseTo(0, 12);
        expect(offset[2]).toBeCloseTo(0.5, 12);
        expect(offset[3]).toBeCloseTo(0.25, 12);
    });

    test("a tile of a face the image does not reach is out of the texture", () => {
        const g = image();
        g._faceExtents = getCubeFaceExtents(gridOf(40, -5, 50, 5), cubeEquiangular);
        g._faceTextures = g._faceExtents.map((e, face) => (e ? `face ${face}` : null));
        g._ready = true;

        const m = material(CUBE_TOP, Extent.createFromArray([0.4, 0, 0.5, 0.1])),
            offset = g.applyMaterial(m);

        expect(m.texture).toBe("transparent");
        expect(offset[0]).toBeGreaterThan(1);
        expect(offset[1]).toBeGreaterThan(1);
    });

    test("new corners keep the planes of the faces", () => {
        const g = image();
        g.setCorners([
            [100, 20],
            [110, 20],
            [110, 10],
            [100, 10]
        ]);
        expect(g._projType).toBe(2);
        expect(g.rendering).toBe(g._renderingProjTypePlane);
    });

    test("another strategy keeps the Mercator image", () => {
        const g = new BaseGeoImage("image", {
            corners: [
                [40, 5],
                [50, 5],
                [50, -5],
                [40, -5]
            ]
        });
        g._assignPlanet({ _layers: [], renderer: null, quadTreeStrategy: { projection: EPSG3857 } });
        expect(g._projType).toBe(1);
    });

    test("an image removed from the cube draws in the Mercator again", () => {
        const g = new BaseGeoImage("image", {
                corners: [
                    [40, 5],
                    [50, 5],
                    [50, -5],
                    [40, -5]
                ]
            }),
            planet = {
                _layers: [g],
                renderer: { handler: { gl: null }, clearPickingColor: () => {}, isInitialized: () => false },
                quadTreeStrategy: { projection: cubeEquiangular },
                transparentTexture: "transparent",
                _geoImageCreator: { remove: () => {} },
                _clearLayerMaterial: () => {},
                updateVisibleLayers: () => {},
                events: { dispatch: () => {} }
            };

        g._assignPlanet(planet);
        expect(g._projType).toBe(2);

        g.remove();
        expect(g._planet).toBe(null);

        g.setCorners([
            [41, 5],
            [51, 5],
            [51, -5],
            [41, -5]
        ]);
        expect(g._projType).toBe(1);

        g._assignPlanet({ _layers: [], renderer: null, quadTreeStrategy: { projection: EPSG3857 } });
        expect(g._projType).toBe(1);
        expect(g.rendering).toBe(g._renderingProjType1);
    });
});
