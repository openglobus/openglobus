import { writeArrayBuffer } from "geotiff";
import { GeoTIFFReader } from "../../src/layer/geotiff/GeoTIFFReader";

const WIDTH = 4;
const HEIGHT = 4;

function createTiff(values, tags) {
    return writeArrayBuffer(values, {
        width: WIDTH,
        height: HEIGHT,
        ModelPixelScale: [0.1, 0.1, 0],
        ModelTiepoint: [0, 0, 0, 10, 10, 0],
        GeographicTypeGeoKey: 4326,
        GTModelTypeGeoKey: 2,
        GTRasterTypeGeoKey: 1,
        ...tags
    });
}

async function readIsImagery(buffer) {
    const reader = new GeoTIFFReader({});
    const meta = await reader.init(buffer);
    reader.destroy();
    return meta.isImagery;
}

const PIXELS = WIDTH * HEIGHT;

describe("GeoTIFF that may hold heights", () => {
    test("a float band, like the sandbox DEM files", async () => {
        const tiff = createTiff(new Float32Array(PIXELS).fill(1200.5), {
            BitsPerSample: [32],
            SampleFormat: [3],
            SamplesPerPixel: 1,
            PhotometricInterpretation: 1
        });

        expect(await readIsImagery(tiff)).toBe(false);
    });

    test("a signed 16 bit band", async () => {
        const tiff = createTiff(new Int16Array(PIXELS).fill(-40), {
            BitsPerSample: [16],
            SampleFormat: [2],
            SamplesPerPixel: 1,
            PhotometricInterpretation: 1
        });

        expect(await readIsImagery(tiff)).toBe(false);
    });
});

describe("GeoTIFF that is an image for certain", () => {
    test("an 8 bit band", async () => {
        const tiff = createTiff(new Uint8Array(PIXELS).fill(200), {
            BitsPerSample: [8],
            SampleFormat: [1],
            SamplesPerPixel: 1,
            PhotometricInterpretation: 1
        });

        expect(await readIsImagery(tiff)).toBe(true);
    });

    test("three bands of any type", async () => {
        const tiff = createTiff(new Float32Array(PIXELS * 3).fill(0.5), {
            BitsPerSample: [32, 32, 32],
            SampleFormat: [3, 3, 3],
            SamplesPerPixel: 3,
            PhotometricInterpretation: 2
        });

        expect(await readIsImagery(tiff)).toBe(true);
    });

    test("a palette", async () => {
        const tiff = createTiff(new Uint16Array(PIXELS).fill(3), {
            BitsPerSample: [16],
            SampleFormat: [1],
            SamplesPerPixel: 1,
            PhotometricInterpretation: 3
        });

        expect(await readIsImagery(tiff)).toBe(true);
    });
});
