import { PbfReader } from "../../../src/layer/mvt/PbfReader";
import {
    MVT_LINESTRING,
    MVT_POINT,
    MVT_POLYGON,
    tileCoordinatesToLonLat,
    VectorTile
} from "../../../src/layer/mvt/VectorTile";
import { MAX_LAT } from "../../../src/mercator";
import { command, encodeTile, PbfWriter, zigzag } from "./pbfWriter";

describe("PbfReader", () => {
    test("reads varints of any length", () => {
        const values = [0, 1, 127, 128, 300, 2 ** 28 - 1, 2 ** 28, 2 ** 31, 2 ** 32 + 5, 2 ** 35 + 7, 2 ** 52 + 1];
        const w = new PbfWriter();
        values.forEach((v) => w.varint(v));
        const pbf = new PbfReader(w.finish());
        expect(values.map(() => pbf.readVarint())).toEqual(values);
    });

    test("reads negative int64 as signed", () => {
        const w = new PbfWriter();
        w.varint(-1)
            .varint(-5)
            .varint(-(2 ** 40));
        const pbf = new PbfReader(w.finish());
        expect(pbf.readVarint(true)).toBe(-1);
        expect(pbf.readVarint(true)).toBe(-5);
        expect(pbf.readVarint(true)).toBe(-(2 ** 40));
    });

    test("reads zigzag varints", () => {
        const w = new PbfWriter();
        w.svarintField(1, 0)
            .svarintField(1, -1)
            .svarintField(1, 1)
            .svarintField(1, -1000000)
            .svarintField(1, 2 ** 40);
        const pbf = new PbfReader(w.finish());
        const res = [];
        pbf.readFields((tag, r, p) => r.push(p.readSVarint()), res);
        expect(res).toEqual([0, -1, 1, -1000000, 2 ** 40]);
    });

    test("skips fields the callback doesn't read", () => {
        const w = new PbfWriter();
        w.varintField(1, 300).doubleField(2, 1.5).floatField(3, 2.5).stringField(4, "skip me").varintField(5, 7);
        const pbf = new PbfReader(w.finish());
        const res = pbf.readFields((tag, r, p) => tag === 5 && (r.value = p.readVarint()), {});
        expect(res.value).toBe(7);
        expect(pbf.pos).toBe(pbf.length);
    });

    test("decodes utf-8 strings", () => {
        const w = new PbfWriter();
        w.stringField(1, "Rīga Ķemeri 東京 🙂");
        const pbf = new PbfReader(w.finish());
        pbf.readVarint();
        expect(pbf.readString()).toBe("Rīga Ķemeri 東京 🙂");
    });
});

describe("VectorTile", () => {
    const data = encodeTile([
        {
            name: "place",
            extent: 4096,
            features: [
                {
                    id: 1,
                    type: MVT_POINT,
                    properties: {
                        name: "Rīga",
                        rank: { uint: 3 },
                        population: { uint: 2 ** 40 },
                        ele: { double: 12.5 },
                        neg: { int: -5 },
                        sint: { sint: -7 },
                        capital: true,
                        ratio: { float: 1.5 }
                    },
                    geometry: [command(1, 1), zigzag(100), zigzag(200)]
                },
                {
                    type: MVT_LINESTRING,
                    properties: { name: "road" },
                    geometry: [command(1, 1), zigzag(10), zigzag(10), command(2, 2), zigzag(5), 0, 0, zigzag(5)]
                },
                {
                    type: MVT_POLYGON,
                    geometry: [command(1, 1), 0, 0, command(2, 2), zigzag(10), 0, 0, zigzag(10), command(7, 1)]
                },
                {
                    type: MVT_POINT,
                    geometry: [command(1, 2), zigzag(1), zigzag(1), zigzag(2), zigzag(2)]
                },
                {
                    type: MVT_LINESTRING,
                    geometry: [command(1, 1), zigzag(-3), zigzag(-4), command(2, 1), zigzag(-10), zigzag(5)]
                }
            ]
        },
        { name: "water", features: [{ type: MVT_POINT, properties: { name: "Daugava" }, geometry: [9, 0, 0] }] },
        { name: "empty", features: [] }
    ]);

    test("reads layers, skipping empty ones", () => {
        const vt = new VectorTile(data);
        expect(Object.keys(vt.layers).sort()).toEqual(["place", "water"]);
        expect(vt.layers.place.length).toBe(5);
        expect(vt.layers.place.version).toBe(2);
        expect(vt.layers.place.extent).toBe(4096);
        expect(vt.layers.water.extent).toBe(4096);
    });

    test("reads feature properties of every value type", () => {
        const f = new VectorTile(data).layers.place.feature(0);
        expect(f.id).toBe(1);
        expect(f.type).toBe(MVT_POINT);
        expect(f.properties).toEqual({
            name: "Rīga",
            rank: 3,
            population: 2 ** 40,
            ele: 12.5,
            neg: -5,
            sint: -7,
            capital: true,
            ratio: 1.5
        });
    });

    test("decodes point, line, polygon and multipoint geometry", () => {
        const layer = new VectorTile(data).layers.place;
        expect(layer.feature(0).loadGeometry()).toEqual([[100, 200]]);
        expect(layer.feature(1).loadGeometry()).toEqual([[10, 10, 15, 10, 15, 15]]);
        expect(layer.feature(2).type).toBe(MVT_POLYGON);
        expect(layer.feature(2).loadGeometry()).toEqual([[0, 0, 10, 0, 10, 10, 0, 0]]);
        expect(layer.feature(3).loadGeometry()).toEqual([
            [1, 1],
            [3, 3]
        ]);
        expect(layer.feature(4).loadGeometry()).toEqual([[-3, -4, -13, 1]]);
    });

    test("features can be read in any order", () => {
        const layer = new VectorTile(data).layers.place;
        const f3 = layer.feature(3);
        const f0 = layer.feature(0);
        expect(f3.loadGeometry()).toEqual([
            [1, 1],
            [3, 3]
        ]);
        expect(f0.properties.name).toBe("Rīga");
        expect(f0.loadGeometry()).toEqual([[100, 200]]);
        expect(() => layer.feature(5)).toThrow();
    });

    test("reads an empty buffer as a tile without layers", () => {
        expect(new VectorTile(new ArrayBuffer(0)).layers).toEqual({});
    });
});

describe("tileCoordinatesToLonLat", () => {
    test("converts tile-local coordinates of a Web Mercator tile", () => {
        let ll = tileCoordinatesToLonLat(2048, 2048, 4096, 0, 0, 0);
        expect(ll.lon).toBeCloseTo(0, 9);
        expect(ll.lat).toBeCloseTo(0, 9);

        ll = tileCoordinatesToLonLat(0, 0, 4096, 0, 0, 0);
        expect(ll.lon).toBeCloseTo(-180, 9);
        expect(ll.lat).toBeCloseTo(MAX_LAT, 9);

        // South-west corner of z10 tile 582/312
        ll = tileCoordinatesToLonLat(0, 4096, 4096, 582, 312, 10);
        expect(ll.lon).toBeCloseTo((582 / 1024) * 360 - 180, 6);
        expect(ll.lat).toBeCloseTo((Math.atan(Math.sinh(Math.PI * (1 - (2 * 313) / 1024))) * 180) / Math.PI, 6);
    });
});
