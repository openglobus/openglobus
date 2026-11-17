import { Extent } from "../../src/Extent";
import { LonLat } from "../../src/LonLat";
import { EmptyTerrain } from "../../src/terrain/EmptyTerrain";
import { GlobusTerrain } from "../../src/terrain/GlobusTerrain";

function bounds(extent) {
    return [extent.getWest(), extent.getSouth(), extent.getEast(), extent.getNorth()];
}

test("a terrain covers the whole globe by default", () => {
    expect(bounds(new EmptyTerrain().getExtent())).toEqual([-180, -90, 180, 90]);
    expect(bounds(new GlobusTerrain().getExtent())).toEqual([-180, -90, 180, 90]);
});

test("GlobusTerrain extent comes from the options", () => {
    const extent = new Extent(new LonLat(10, 20), new LonLat(30, 40));

    expect(bounds(new GlobusTerrain("t", { extent }).getExtent())).toEqual([10, 20, 30, 40]);
});

test("the camera of the terrain planet flies to the extent", () => {
    const extent = new Extent(new LonLat(10, 20), new LonLat(30, 40));
    const terrain = new GlobusTerrain("t", { extent });
    const flyExtent = vi.fn();
    terrain._planet = { flyExtent };

    terrain.flyExtent();

    expect(flyExtent).toHaveBeenCalledTimes(1);
    expect(bounds(flyExtent.mock.calls[0][0])).toEqual([10, 20, 30, 40]);
});

test("a terrain out of a planet does not fly", () => {
    expect(() => new EmptyTerrain().flyExtent()).not.toThrow();
});
