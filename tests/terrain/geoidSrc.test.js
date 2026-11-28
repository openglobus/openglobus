import { vi } from "vitest";
import { EmptyTerrain } from "../../src/terrain/EmptyTerrain";
import { ProceduralTerrain } from "../../src/terrain/ProceduralTerrain";
import { GlobusTerrain } from "../../src/terrain/GlobusTerrain";
import { BilTerrain } from "../../src/terrain/BilTerrain";
import { RgbTerrain } from "../../src/terrain/RgbTerrain";
import { GlobusRgbTerrain } from "../../src/terrain/GlobusRgbTerrain";
import { MapterhornTerrain } from "../../src/terrain/MapterhornTerrain";
import { CubeRgbTerrain } from "../../src/terrain/CubeRgbTerrain";
import { GeoTiffTerrain } from "../../src/terrain/GeoTiffTerrain";
import { GeoTIFFReader } from "../../src/layer/geotiff/GeoTIFFReader";
import { Geoid } from "../../src/terrain/Geoid";

const DEFAULT_GEOID = "https://openglobus.org/geoid/egm84-30.pgm";

beforeEach(() => {
    vi.spyOn(GeoTIFFReader.prototype, "init").mockResolvedValue({});
});

const geoidSrc = (create, options) => create(options).geoid.src;

describe.each([
    ["GlobusTerrain", (o) => new GlobusTerrain("", o)],
    ["BilTerrain", (o) => new BilTerrain(o)],
    ["RgbTerrain", (o) => new RgbTerrain(null, o)],
    ["GlobusRgbTerrain", (o) => new GlobusRgbTerrain(null, o)],
    ["MapterhornTerrain", (o) => new MapterhornTerrain(null, o)],
    ["GeoTiffTerrain", (o) => new GeoTiffTerrain(null, { src: "dem.tif", ...o })]
])("%s geoid", (_, create) => {
    test("is the default one when geoidSrc is not given or undefined", () => {
        expect(geoidSrc(create, {})).toBe(DEFAULT_GEOID);
        expect(geoidSrc(create, { geoidSrc: undefined })).toBe(DEFAULT_GEOID);
    });

    test("is none for null and the file of a string", () => {
        expect(geoidSrc(create, { geoidSrc: null })).toBe(null);
        expect(geoidSrc(create, { geoidSrc: "./g.pgm" })).toBe("./g.pgm");
    });

    test("is the given Geoid instance first", () => {
        const geoid = new Geoid({ src: "./own.pgm" });
        expect(create({ geoid, geoidSrc: "./g.pgm" }).geoid).toBe(geoid);
    });
});

describe.each([
    ["EmptyTerrain", (o) => new EmptyTerrain(o)],
    ["ProceduralTerrain", (o) => new ProceduralTerrain(null, { getHeights: () => null, ...o })],
    ["CubeRgbTerrain", (o) => new CubeRgbTerrain(null, { url: "./{f}/{z}/{x}/{y}.png", ...o })]
])("%s without a default geoid", (_, create) => {
    test("has none unless geoidSrc is a string", () => {
        expect(geoidSrc(create, {})).toBe(null);
        expect(geoidSrc(create, { geoidSrc: undefined })).toBe(null);
        expect(geoidSrc(create, { geoidSrc: null })).toBe(null);
        expect(geoidSrc(create, { geoidSrc: "./g.pgm" })).toBe("./g.pgm");
    });
});
