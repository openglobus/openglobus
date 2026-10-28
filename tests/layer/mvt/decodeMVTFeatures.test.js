import {
    decodeMVTFeatures,
    getMVTDecodedProperties,
    getMVTDecodedTransferables
} from "../../../src/layer/mvt/decodeMVTFeatures";
import { MVT_LINESTRING, MVT_POINT, tileCoordinatesToLonLat } from "../../../src/layer/mvt/VectorTile";
import { command, encodeTile, zigzag } from "./pbfWriter";

const point = (x, y) => [command(1, 1), zigzag(x), zigzag(y)];

const data = encodeTile([
    {
        name: "place",
        extent: 4096,
        features: [
            {
                type: MVT_POINT,
                properties: { name: "Rīga", class: "city", rank: { uint: 1 } },
                geometry: point(1024, 2048)
            },
            // In the tile buffer, belongs to the neighbour tile
            { type: MVT_POINT, properties: { name: "Outside", class: "town" }, geometry: point(-100, 50) },
            { type: MVT_LINESTRING, properties: { name: "Road" }, geometry: [9, 0, 0, 10, 20, 20] },
            {
                type: MVT_POINT,
                properties: { name: "Twin", class: "town" },
                geometry: [command(1, 3), zigzag(10), zigzag(10), zigzag(5000), 0, zigzag(-4990), zigzag(20)]
            }
        ]
    },
    { name: "water_name", features: [{ type: MVT_POINT, properties: { name: "Daugava" }, geometry: point(5, 5) }] },
    { name: "poi", features: [{ type: MVT_POINT, properties: { name: "Cafe" }, geometry: point(7, 7) }] }
]);

describe("decodeMVTFeatures", () => {
    const request = { z: 10, x: 582, y: 312, pointLayers: ["place", "water_name", "missing"] };

    test("reads in-tile point features of the requested layers only", () => {
        const res = decodeMVTFeatures(data, request);
        expect(res.pointLayers.map((l) => l.name)).toEqual(["place", "water_name"]);

        const place = res.pointLayers[0];
        // Feature 1 is outside, 2 is a line
        expect([...place.order]).toEqual([0, 3]);
        expect([...place.pointOffsets]).toEqual([0, 1, 3]);
    });

    test("gives geodetic and tile-relative point positions", () => {
        const place = decodeMVTFeatures(data, request).pointLayers[0];
        const ll = tileCoordinatesToLonLat(1024, 2048, 4096, 582, 312, 10);
        expect(place.points[0]).toBeCloseTo(ll.lon, 10);
        expect(place.points[1]).toBeCloseTo(ll.lat, 10);
        expect(place.points[2]).toBe(0.25);
        expect(place.points[3]).toBe(0.5);

        // Multipoint: (10, 10) and (20, 30) are inside, (5010, 10) is not
        expect([...place.points.slice(6, 8)]).toEqual([10 / 4096, 10 / 4096]);
        expect([...place.points.slice(10, 12)]).toEqual([20 / 4096, 30 / 4096]);
    });

    test("keeps only the values the features use", () => {
        const place = decodeMVTFeatures(data, request).pointLayers[0];
        expect(getMVTDecodedProperties(place, 0)).toEqual({ name: "Rīga", class: "city", rank: 1 });
        expect(getMVTDecodedProperties(place, 1)).toEqual({ name: "Twin", class: "town" });
        expect(place.values).not.toContain("Outside");
        expect(place.values).not.toContain("Road");
    });

    test("transfers every typed array", () => {
        const res = decodeMVTFeatures(data, request);
        expect(getMVTDecodedTransferables(res).length).toBe(5 * res.pointLayers.length);
    });

    test("returns no layers for empty data or no requested layers", () => {
        expect(decodeMVTFeatures(new ArrayBuffer(0), request).pointLayers).toEqual([]);
        expect(decodeMVTFeatures(data, { ...request, pointLayers: [] }).pointLayers).toEqual([]);
    });
});
