import { EmptyTerrain } from "../../src/terrain/EmptyTerrain";
import { GlobusTerrain } from "../../src/terrain/GlobusTerrain";
import { RgbTerrain } from "../../src/terrain/RgbTerrain";

test("maxHeight is the Everest by default", () => {
    expect(new EmptyTerrain().getMaxHeight()).toBe(8848);
    expect(new EmptyTerrain({ maxHeight: 0 }).getMaxHeight()).toBe(0);
});

test("getMaxHeight is scaled by the terrain height factor", () => {
    expect(new GlobusTerrain(null, { heightFactor: 3 }).getMaxHeight()).toBe(8848 * 3);
    expect(new RgbTerrain(null, { maxHeight: 1000, heightFactor: 2 }).getMaxHeight()).toBe(2000);
});
