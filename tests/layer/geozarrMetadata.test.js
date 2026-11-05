import { describe, it, expect } from "vitest";
import {
    bboxFromCoordinates,
    bboxFromTransform,
    decodeCfTime,
    fallbackCrs,
    getScaleOffset,
    getSpatialAxes,
    parseCrsAttrs,
    parseFillValue,
    parseMultiscales,
    parseWktEpsg,
    resolveDimensionIndex
} from "../../src/layer/geotiff/geozarrMetadata";

describe("GeoZarr multiscales", () => {
    it("parses the zarr-conventions layout", () => {
        const levels = parseMultiscales({
            multiscales: {
                layout: [
                    { asset: "r10m", "spatial:transform": [10, 0, 499980, 0, -10, 7100040] },
                    { asset: "r20m", derived_from: "r10m", transform: { scale: [2, 2] } }
                ]
            }
        });
        expect(levels).toEqual([
            { path: "r10m", transform: [10, 0, 499980, 0, -10, 7100040] },
            { path: "r20m", transform: undefined }
        ]);
    });

    it("parses the legacy datasets list", () => {
        const levels = parseMultiscales({
            multiscales: [{ datasets: [{ path: "0", crs: "EPSG:3857" }, { path: "1" }] }]
        });
        expect(levels.map((l) => l.path)).toEqual(["0", "1"]);
        expect(levels[0].crs).toBe("EPSG:3857");
    });

    it("takes the group itself without multiscales", () => {
        expect(parseMultiscales({})).toEqual([{ path: "", transform: undefined }]);
        expect(parseMultiscales(undefined)).toEqual([{ path: "", transform: undefined }]);
    });
});

describe("GeoZarr spatial axes", () => {
    it("finds the axes by spatial:dimensions, by names, or takes the last two", () => {
        expect(getSpatialAxes(["time", "band", "y", "x"], 4)).toEqual({ y: 2, x: 3 });
        expect(getSpatialAxes(["time", "lat", "lon"], 3)).toEqual({ y: 1, x: 2 });
        expect(getSpatialAxes(["a", "b", "c"], 3, ["b", "c"])).toEqual({ y: 1, x: 2 });
        expect(getSpatialAxes(undefined, 3)).toEqual({ y: 1, x: 2 });
    });

    it("detects the x before y order", () => {
        expect(getSpatialAxes(["lon", "lat"], 2)).toEqual({ y: 1, x: 0 });
    });

    it("throws for a 1-D array", () => {
        expect(() => getSpatialAxes(["x"], 1)).toThrow();
    });
});

describe("GeoZarr CRS", () => {
    it("reads proj: attributes", () => {
        expect(parseCrsAttrs({ "proj:code": "EPSG:32627" })).toBe(32627);
        expect(parseCrsAttrs({ "proj:epsg": 3857 })).toBe(3857);
        expect(parseCrsAttrs({ "proj:projjson": { id: { authority: "EPSG", code: 2193 } } })).toBe(2193);
        expect(parseCrsAttrs({})).toBeUndefined();
    });

    it("takes the root authority of a WKT", () => {
        const wkt1 =
            'PROJCS["WGS 84 / UTM zone 27N",GEOGCS["WGS 84",AUTHORITY["EPSG","4326"]],' +
            'UNIT["metre",1,AUTHORITY["EPSG","9001"]],AUTHORITY["EPSG","32627"]]';
        expect(parseWktEpsg(wkt1)).toBe(32627);
        expect(parseCrsAttrs({ crs_wkt: wkt1 })).toBe(32627);
        expect(parseCrsAttrs({ "proj:wkt2": 'PROJCRS["x",BASEGEOGCRS["y",ID["EPSG",4326]],ID["EPSG",3035]]' })).toBe(
            3035
        );
        expect(parseCrsAttrs({ crs_wkt: 'PROJCS["custom"]' })).toBeUndefined();
    });

    it("falls back to lon/lat for a bounding box in degrees", () => {
        expect(fallbackCrs([-180, -90, 180, 90])).toBe(4326);
        expect(fallbackCrs([0, -90, 360, 90])).toBe(4326);
        // Pixel centers of a 0..360 grid
        expect(fallbackCrs([-1.40625, -89.26, 358.59375, 89.26])).toBe(4326);
        expect(fallbackCrs([499980, 6990240, 609780, 7100040])).toBe(3857);
    });
});

describe("GeoZarr bounding box", () => {
    it("calculates the box of a transform", () => {
        expect(bboxFromTransform([10, 0, 100, 0, -10, 500], 4, 3)).toEqual({
            bbox: [100, 470, 140, 500],
            reverseY: false
        });
        expect(bboxFromTransform([10, 0, 100, 0, 10, 470], 4, 3)).toEqual({
            bbox: [100, 470, 140, 500],
            reverseY: true
        });
    });

    it("expands the pixel center coordinates by half a pixel", () => {
        expect(bboxFromCoordinates(0.5, 7.5, 8, 7.5, 0.5, 8)).toEqual({ bbox: [0, 0, 8, 8], reverseY: false });
        expect(bboxFromCoordinates(0.5, 7.5, 8, 0.5, 7.5, 8).reverseY).toBe(true);
    });
});

describe("GeoZarr values", () => {
    it("parses the fill values and skips encoded ones", () => {
        expect(parseFillValue(0)).toBe(0);
        expect(parseFillValue("NaN")).toBeNaN();
        expect(parseFillValue("-Infinity")).toBe(-Infinity);
        expect(parseFillValue("AAAAAAAA+H8=")).toBeNull();
        expect(parseFillValue(null)).toBeNull();
    });

    it("takes the CF packing, not the EOPF source attributes", () => {
        expect(getScaleOffset({ scale_factor: 0.0001, add_offset: -0.1 })).toEqual({ scale: 0.0001, offset: -0.1 });
        expect(getScaleOffset({ _eopf_attrs: { scale_factor: 0.0001, add_offset: -0.1 } })).toBeNull();
        expect(getScaleOffset({ scale_factor: 1 })).toBeNull();
    });

    it("decodes CF time", () => {
        expect(decodeCfTime([0, 1.5], "days since 2020-01-01")).toEqual([
            "2020-01-01T00:00:00.000Z",
            "2020-01-02T12:00:00.000Z"
        ]);
        expect(decodeCfTime([3600], "seconds since 2020-01-01 00:00:00")).toEqual(["2020-01-01T01:00:00.000Z"]);
        expect(decodeCfTime([1], "m")).toBeNull();
    });

    it("decodes CF time of the calendars without leap years", () => {
        // 164 years of 365 days and 196 days, mid July 2014
        expect(decodeCfTime([164 * 365 + 196.5], "days since 1850-01-01", "365_day")).toEqual([
            "2014-07-16T12:00:00.000Z"
        ]);
        expect(decodeCfTime([59], "days since 2000-01-01", "noleap")).toEqual(["2000-03-01T00:00:00.000Z"]);
        expect(decodeCfTime([360 + 45], "days since 2000-01-01", "360_day")).toEqual(["2001-02-16T00:00:00.000Z"]);
        // The Gregorian calendar has the leap day, the reference date has microseconds
        expect(decodeCfTime([59 * 24], "hours since 2000-01-01 00:00:00.000000", "standard")).toEqual([
            "2000-02-29T00:00:00.000Z"
        ]);
    });
});

describe("GeoZarr dimension index", () => {
    const dates = ["2020-01-01T00:00:00.000Z", "2020-02-01T00:00:00.000Z"];

    it("resolves indexes, labels, dates and numbers", () => {
        expect(resolveDimensionIndex("time", 2, 1)).toBe(1);
        expect(resolveDimensionIndex("time", 2, "2020-02", dates)).toBe(1);
        expect(resolveDimensionIndex("band", 3, "b2", ["b1", "b2", "b3"])).toBe(1);
        expect(resolveDimensionIndex("depth", 3, "12", [0, 10, 50])).toBe(1);
    });

    it("throws for out of range and unknown values", () => {
        expect(() => resolveDimensionIndex("time", 2, 2)).toThrow(/out of range/);
        expect(() => resolveDimensionIndex("time", 2, 0.5)).toThrow(/out of range/);
        expect(() => resolveDimensionIndex("time", 2, "1999", dates)).toThrow(/no value/);
        expect(() => resolveDimensionIndex("time", 2, "2020")).toThrow(/no value/);
    });
});
