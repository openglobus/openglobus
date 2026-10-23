import { packRgbHeightsParams, unpackRgbHeightsParams } from "../../src/utils/RgbTerrainWorkerParams";
import { RGB_ENCODING_TERRARIUM } from "../../src/terrain/terrainUtils";

test("packRgbHeightsParams and unpackRgbHeightsParams keep parameters", () => {
    const p = {
        decode: {
            encoding: RGB_ENCODING_TERRARIUM,
            minHeight: -10000,
            resolution: 0.1,
            heightFactor: 2,
            noDataValues: [-9999, 32767],
            parentData: null,
            parentOffsetX: 0,
            parentOffsetY: 0,
            parentZoomDiff: 0.5,
            skipPositiveHeights: true
        },
        size: 512,
        gridSize: 128,
        levels: 2,
        noDataHeight: -9999
    };
    const parent = new Float32Array(4);
    const [id, q] = unpackRgbHeightsParams(packRgbHeightsParams(42, p), parent);

    expect(id).toBe(42);
    expect({ ...q, decode: { ...q.decode, noDataValues: Array.from(q.decode.noDataValues) } }).toEqual({
        ...p,
        decode: { ...p.decode, parentData: parent }
    });
});
