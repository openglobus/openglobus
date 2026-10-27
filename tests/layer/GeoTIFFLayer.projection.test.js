import { GeoTIFFLayer } from "../../src/layer/GeoTIFFLayer";
import { GeoTIFFReader } from "../../src/layer/geotiff/GeoTIFFReader";
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

afterEach(() => {
    delete globalThis.proj4;
    delete globalThis.fetch;
});

describe("GeoTIFFReader resolving the projection of a source", () => {
    test("a UTM zone of WGS 84 needs no definition", async () => {
        const calls = stubFetch({});

        expect(await new GeoTIFFReader({})._resolveProjection(32636)).not.toBeNull();
        expect(calls.length).toBe(0);
    });

    test("lon/lat and Web Mercator are never looked up", async () => {
        const calls = stubFetch({});
        const reader = new GeoTIFFReader({});

        await reader._resolveProjection(4326);
        await reader._resolveProjection(3857);
        await reader._resolveProjection(900913);

        expect(calls.length).toBe(0);
    });

    test("a CRS unknown to proj4 is registered from epsg.io before the source is used", async () => {
        const calls = stubFetch({ 6582: "+proj=tmerc +lat_0=0 +lon_0=141 +k=0.9999 +no_defs" });

        const helper = await new GeoTIFFReader({})._resolveProjection(6582);

        expect(calls).toEqual(["https://epsg.io/6582.proj4"]);
        expect(helper).not.toBeNull();
        // The definition landed in the registry the readers go to
        expect(proj4.defs("EPSG:6582")).toBeTruthy();
        expect(getProjectionHelper(6582)).not.toBeNull();
    });

    test("a CRS with no definition anywhere has no helper, the registry is asked once", async () => {
        const calls = stubFetch({ 3059: "<!DOCTYPE html><html lang=\"en\">" });

        expect(await new GeoTIFFReader({})._resolveProjection(3059)).toBeNull();
        expect(await new GeoTIFFReader({})._resolveProjection(3059)).toBeNull();
        expect(calls.length).toBe(1);
    });

    test("a projection the application brings itself is never looked up", async () => {
        const calls = stubFetch({ 2193: "+proj=tmerc +lat_0=0 +lon_0=173 +no_defs" });
        const reader = new GeoTIFFReader({
            projFunc: (code) => (code === 2193 ? { project: (p) => p, unproject: (p) => p } : undefined)
        });

        expect(await reader._resolveProjection(2193)).not.toBeNull();
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
        const reader = new GeoTIFFReader({
            projFunc: (code) => (code === 2180 ? { project: (p) => p, unproject: (p) => p } : undefined)
        });

        expect(await reader._resolveProjection(3346)).not.toBeNull();
        expect(calls.length).toBe(1);
    });

    test("a read that fails is not retried", async () => {
        const calls = stubFetch({});
        const layer = new GeoTIFFLayer("broken");
        layer._reader = { init: () => Promise.reject(new Error("not a GeoTIFF")) };

        await expect(layer._readSource("broken.tif")).rejects.toThrow("not a GeoTIFF");
        expect(calls.length).toBe(0);
    });
});
