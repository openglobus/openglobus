import { vi } from "vitest";

vi.mock("../../src/utils/RasterWorker", () => ({ getRasterWorker: () => null }));

import { writeArrayBuffer } from "geotiff";
import { GeoTIFFReader } from "../../src/layer/geotiff/GeoTIFFReader";

// A GeoTIFF of one image, so with no overviews, in degrees
function createTiff(width, height) {
    return writeArrayBuffer(new Uint8Array(width * height), {
        width,
        height,
        ModelPixelScale: [360 / width, 180 / height, 0],
        ModelTiepoint: [0, 0, 0, -180, 90, 0],
        GeographicTypeGeoKey: 4326
    });
}

async function initWarnings(width, height) {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const reader = new GeoTIFFReader({ workerPoolSize: 0 });
    await reader.init(createTiff(width, height));
    const messages = warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes("overviews"));
    warn.mockRestore();
    reader.destroy();
    return messages;
}

test("a large GeoTIFF with no overviews is reported", async () => {
    const messages = await initWarnings(4096, 2);

    expect(messages.length).toBe(1);
    expect(messages[0]).toContain("gdal_translate -of COG");
});

test("a small GeoTIFF needs no overviews", async () => {
    expect(await initWarnings(256, 128)).toEqual([]);
});
