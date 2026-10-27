import { GeoTIFFLayer } from "../../src/layer/GeoTIFFLayer";
import { getProjectionHelper } from "../../src/layer/geotiff/utm";
import { proj4 } from "../../src/proj/proj4";

// epsg.io answers with a PROJ string for a known code and with an html page for an unknown one,
// never with a 404, which is why the body is checked.
function stubFetch(bodyByCode) {
    const calls = [];
    globalThis.fetch = (url) => {
        calls.push(url);
        const code = Number(String(url).match(/(\d+)\.proj4$/)[1]);
        const body = bodyByCode[code];
        if (body === undefined) {
            return Promise.reject(new Error("network down"));
        }
        return Promise.resolve({ ok: true, text: () => Promise.resolve(body) });
    };
    return calls;
}

// A reader stub: a real one needs a GeoTIFF to parse. `crsResolved` is what it reports about the
// CRS it has just parsed, and a source read again after a definition was registered resolves.
function stubReader(layer, crsCode, crsResolved) {
    const reads = [];
    layer._reader = {
        extentWgs84: null,
        init: (src) => {
            reads.push(src);
            return Promise.resolve({
                crsCode,
                crsResolved: crsResolved || reads.length > 1,
                bbox: [0, 0, 1, 1],
                width: 1,
                height: 1,
                samplesPerPixel: 1,
                noData: null,
                isTiled: false,
                overviewCount: 1,
                bands: { 1: { min: 0, max: 255 } }
            });
        }
    };
    return reads;
}

afterEach(() => {
    delete globalThis.proj4;
    delete globalThis.fetch;
});

describe("GeoTIFFLayer resolving the projection of a source", () => {
    test("a CRS the reader georeferenced itself is read once", async () => {
        const calls = stubFetch({ 32636: "+proj=utm +zone=36 +no_defs" });
        const layer = new GeoTIFFLayer("utm");
        const reads = stubReader(layer, 32636, true);

        const meta = await layer._readSource("utm.tif");

        expect(meta.crsResolved).toBe(true);
        expect(reads.length).toBe(1);
        // A UTM zone needs no definition
        expect(calls.length).toBe(0);
    });

    test("an unresolved CRS is registered from epsg.io and the source is read again", async () => {
        const calls = stubFetch({ 6582: "+proj=tmerc +lat_0=0 +lon_0=141 +k=0.9999 +no_defs" });
        const layer = new GeoTIFFLayer("tmerc");
        const reads = stubReader(layer, 6582, false);

        const meta = await layer._readSource("tmerc.tif");

        expect(calls).toEqual(["https://epsg.io/6582.proj4"]);
        expect(reads.length).toBe(2);
        expect(meta.crsResolved).toBe(true);
        // The definition landed in the registry the readers go to
        expect(proj4.defs("EPSG:6582")).toBeTruthy();
        expect(getProjectionHelper(6582)).not.toBeNull();
    });

    test("a CRS with no definition anywhere is read once and kept as it is", async () => {
        const calls = stubFetch({ 3059: "<!DOCTYPE html><html lang=\"en\">" });
        const layer = new GeoTIFFLayer("unknown");
        const reads = stubReader(layer, 3059, false);

        const meta = await layer._readSource("unknown.tif");

        expect(calls.length).toBe(1);
        expect(reads.length).toBe(1);
        expect(meta.crsResolved).toBe(false);

        // The registry has already been asked for this code
        const again = new GeoTIFFLayer("unknown2");
        stubReader(again, 3059, false);
        await again._readSource("unknown.tif");
        expect(calls.length).toBe(1);
    });

    test("a projection the application brings itself is never looked up", async () => {
        const calls = stubFetch({ 2193: "+proj=tmerc +lat_0=0 +lon_0=173 +no_defs" });

        // Whichever way it is supplied, a projFunc or a definition registered beforehand, the
        // reader georeferences the CRS on the first read and reports it as resolved
        const layer = new GeoTIFFLayer("nztm", {
            projFunc: (code) =>
                code === 2193 ? { project: (p) => p, unproject: (p) => p } : undefined
        });
        const reads = stubReader(layer, 2193, true);

        await layer._readSource("nztm.tif");

        expect(reads.length).toBe(1);
        expect(calls.length).toBe(0);
    });

    test("a registered definition cannot override projFunc", async () => {
        // Even for a code that is in the proj4 registry, projFunc is consulted first, so a
        // definition taken from epsg.io never takes a projection away from the application
        proj4.defs("EPSG:2180", "+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +no_defs");
        const projFunc = (code) =>
            code === 2180 ? { project: () => [1, 2], unproject: () => [3, 4] } : undefined;

        expect(getProjectionHelper(2180, projFunc).project([0, 0])).toEqual([1, 2]);
        // Without it the registry answers, with real numbers rather than the sentinels
        expect(getProjectionHelper(2180).project([19, 52])).not.toEqual([1, 2]);
    });

    test("a code projFunc does not cover falls through to the registry", async () => {
        const calls = stubFetch({ 3346: "+proj=tmerc +lat_0=0 +lon_0=24 +no_defs" });
        const layer = new GeoTIFFLayer("other", {
            projFunc: (code) =>
                code === 2180 ? { project: (p) => p, unproject: (p) => p } : undefined
        });
        const reads = stubReader(layer, 3346, false);

        const meta = await layer._readSource("other.tif");

        // projFunc declined this code, so the usual fallback chain applies
        expect(calls.length).toBe(1);
        expect(reads.length).toBe(2);
        expect(meta.crsResolved).toBe(true);
    });

    test("a read that fails is not retried", async () => {
        const calls = stubFetch({});
        const layer = new GeoTIFFLayer("broken");
        layer._reader = { init: () => Promise.reject(new Error("not a GeoTIFF")) };

        await expect(layer._readSource("broken.tif")).rejects.toThrow("not a GeoTIFF");
        expect(calls.length).toBe(0);
    });
});
