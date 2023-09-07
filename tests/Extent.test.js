import { Extent } from "../src/Extent";
import * as mercator from "../src/mercator";

test("Testing Extent", () => {
    const extent = new Extent();
    Extent.createByCoordinates([]);
    Extent.FULL_MERC;
    Extent.NORTH_POLE_DEG;
    Extent.SOUTH_POLE_DEG;
    expect(extent).toBeTruthy();

});

test("Testing Extent fromTile", () => {

    function getTileX(extent) {
        return Math.round(
            Math.abs(-mercator.POLE - extent.southWest.lon) / (extent.northEast.lon - extent.southWest.lon)
        );
    }

    function getTileY(extent) {
        return Math.round(
            Math.abs(mercator.POLE - extent.northEast.lat) / (extent.northEast.lat - extent.southWest.lat)
        );
    }

    function doTest(x, y, z) {

        let srcX = x,
            srcY = y,
            srcZ = z;

        let ext = Extent.fromTile(srcX, srcY, srcZ);

        let resX = getTileX(ext),
            resY = getTileY(ext);

        expect(resX).toStrictEqual(srcX);
        expect(resY).toStrictEqual(srcY);
    }


    for (let z = 0; z < 5; z++) {
        let size = Math.pow(2, z);
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                doTest(x, y, z);
            }
        }
    }
});
