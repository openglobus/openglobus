import { DragAndDrop } from "../../src/control/DragAndDrop";

// The layers are stubbed: a real one needs a GeoTIFF to parse. Resolving the projection of a
// source belongs to the layer, see GeoTIFFLayer.projection.test.js.
function setup() {
    const created = [];
    const added = [];

    const control = new DragAndDrop();
    control.planet = { addLayer: (layer) => added.push(layer) };
    control._createTiffLayer = () => {
        const layer = {
            removed: false,
            whenReady: () => Promise.resolve({ crsCode: 4326, crsResolved: true }),
            remove() {
                this.removed = true;
                return this;
            }
        };
        created.push(layer);
        return layer;
    };

    return { control, created, added };
}

describe("DragAndDrop placing a raster", () => {
    test("a raster is placed once it is ready", async () => {
        const { control, created, added } = setup();

        await control._addTiff(new File([], "raster.tif"));

        expect(created.length).toBe(1);
        expect(added).toEqual([created[0]]);
        expect(control.tiffLayers).toEqual([created[0]]);
    });

    test("a raster that cannot be read is not left on the planet", async () => {
        const { control, added } = setup();
        const broken = [];
        control._createTiffLayer = () => {
            const layer = {
                removed: false,
                whenReady: () => Promise.reject(new Error("not a GeoTIFF")),
                remove() {
                    this.removed = true;
                    return this;
                }
            };
            broken.push(layer);
            return layer;
        };

        await expect(control._addTiff(new File([], "broken.tif"))).rejects.toThrow("not a GeoTIFF");

        expect(broken[0].removed).toBe(true);
        expect(added).toEqual([]);
        expect(control.tiffLayers).toEqual([]);
    });
});
