import { DragAndDrop } from "../../src/control/DragAndDrop";

function createLayer(isImagery, added) {
    return {
        removed: false,
        flewOnPlanet: null,
        flyExtent() {
            this.flewOnPlanet = added.includes(this);
        },
        whenReady: () => Promise.resolve({ crsCode: 4326, crsResolved: true, isImagery }),
        remove() {
            this.removed = true;
            return this;
        }
    };
}

function createTerrain(planet) {
    return {
        flewWhenActive: null,
        flyExtent() {
            this.flewWhenActive = planet.terrain === this;
        },
        whenReady: () => Promise.resolve(),
        reader: {
            destroy() {}
        }
    };
}

// The layers and terrains are stubbed: a real one needs a GeoTIFF to parse. Resolving the projection of a
// source belongs to the layer, see GeoTIFFLayer.projection.test.js.
function setup({ isImagery = false } = {}) {
    const created = [];
    const terrains = [];
    const added = [];
    const baseTerrain = { name: "base" };

    const control = new DragAndDrop();
    control.renderer = { getUIContainer: () => document.body };
    control.planet = {
        terrain: baseTerrain,
        removed: [],
        addLayer: (layer) => added.push(layer),
        setTerrain(terrain) {
            this.terrain = terrain;
        },
        removeTerrain(terrain) {
            this.removed.push(terrain);
        }
    };
    control._createTiffLayer = () => {
        const layer = createLayer(isImagery, added);
        created.push(layer);
        return layer;
    };
    control._createTiffTerrain = () => {
        const terrain = createTerrain(control.planet);
        terrains.push(terrain);
        return terrain;
    };

    return { control, created, terrains, added, baseTerrain };
}

const dialogs = () => document.querySelectorAll(".og-geotiff-type");

async function waitDialog() {
    await vi.waitFor(() => expect(dialogs().length).toBe(1));
    return dialogs()[0];
}

async function clickButton(text) {
    const dialog = await waitDialog();
    const buttons = Array.from(dialog.querySelectorAll(".og-geotiff-type__button"));
    buttons.find((b) => b.textContent.trim() === text).click();
}

afterEach(() => {
    document.body.innerHTML = "";
});

describe("DragAndDrop placing a raster", () => {
    test("an image is placed as a layer without a question", async () => {
        const { control, created, added } = setup({ isImagery: true });

        await control._addTiff(new File([], "raster.tif"));

        expect(dialogs().length).toBe(0);
        expect(created.length).toBe(1);
        expect(added).toEqual([created[0]]);
        expect(control.tiffLayers).toEqual([created[0]]);
    });

    test("a raster that cannot be read is not left on the planet", async () => {
        const { control, added } = setup();
        const broken = [];
        control._createTiffLayer = () => {
            const layer = createLayer(false, added);
            layer.whenReady = () => Promise.reject(new Error("not a GeoTIFF"));
            broken.push(layer);
            return layer;
        };

        await expect(control._addTiff(new File([], "broken.tif"))).rejects.toThrow("not a GeoTIFF");

        expect(dialogs().length).toBe(0);
        expect(broken[0].removed).toBe(true);
        expect(broken[0].flewOnPlanet).toBeNull();
        expect(added).toEqual([]);
        expect(control.tiffLayers).toEqual([]);
    });
});

describe("DragAndDrop flying to a GeoTIFF", () => {
    test("an image flies once it is on the planet", async () => {
        const { control, created } = setup({ isImagery: true });

        await control._addTiff(new File([], "raster.tif"));

        expect(created[0].flewOnPlanet).toBe(true);
    });

    test("the layer answer flies to the layer", async () => {
        const { control, created } = setup();

        const done = control._addTiff(new File([], "dem.tif"));
        await clickButton("Layer");
        await done;

        expect(created[0].flewOnPlanet).toBe(true);
    });

    test("the terrain answer flies once the new terrain is active", async () => {
        const { control, created, terrains } = setup();

        const done = control._addTiff(new File([], "dem.tif"));
        await clickButton("Terrain");
        await done;

        expect(terrains[0].flewWhenActive).toBe(true);
        expect(created[0].flewOnPlanet).toBeNull();
    });

    test("closing the dialog does not fly", async () => {
        const { control, created } = setup();

        const done = control._addTiff(new File([], "dem.tif"));
        const dialog = await waitDialog();
        dialog.querySelector(".og-ddialog-header__buttons .og-button").click();
        await done;

        expect(created[0].flewOnPlanet).toBeNull();
    });
});

describe("DragAndDrop asking about a GeoTIFF", () => {
    test("the layer answer places the raster", async () => {
        const { control, created, added, terrains, baseTerrain } = setup();

        const done = control._addTiff(new File([], "dem.tif"));
        await clickButton("Layer");
        await done;

        expect(added).toEqual([created[0]]);
        expect(created[0].removed).toBe(false);
        expect(terrains).toEqual([]);
        expect(control.planet.terrain).toBe(baseTerrain);
        expect(dialogs().length).toBe(0);
    });

    test("the terrain answer activates a new terrain and drops the layer", async () => {
        const { control, created, added, terrains } = setup();

        const done = control._addTiff(new File([], "dem.tif"));
        await clickButton("Terrain");
        await done;

        expect(terrains.length).toBe(1);
        expect(control.planet.terrain).toBe(terrains[0]);
        expect(control.tiffTerrains).toEqual([terrains[0]]);
        expect(created[0].removed).toBe(true);
        expect(added).toEqual([]);
        expect(control.tiffLayers).toEqual([]);
        expect(dialogs().length).toBe(0);
    });

    test("closing the dialog adds nothing", async () => {
        const { control, created, added, terrains, baseTerrain } = setup();

        const done = control._addTiff(new File([], "dem.tif"));
        const dialog = await waitDialog();
        dialog.querySelector(".og-ddialog-header__buttons .og-button").click();
        await done;

        expect(created[0].removed).toBe(true);
        expect(added).toEqual([]);
        expect(terrains).toEqual([]);
        expect(control.planet.terrain).toBe(baseTerrain);
    });

    test("several files are asked one by one", async () => {
        const { control, added, terrains } = setup();

        const first = control._addTiff(new File([], "first.tif"));
        const second = control._addTiff(new File([], "second.tif"));

        const dialog = await waitDialog();
        expect(dialog.querySelector(".og-geotiff-type__file").textContent).toBe("first.tif");
        await clickButton("Layer");
        await first;

        await vi.waitFor(() =>
            expect(document.querySelector(".og-geotiff-type__file")?.textContent).toBe("second.tif")
        );
        expect(dialogs().length).toBe(1);
        await clickButton("Terrain");
        await second;

        expect(added.length).toBe(1);
        expect(terrains.length).toBe(1);
    });

    test("a file name is shown as a text", async () => {
        const { control } = setup();
        const name = "<img src=x onerror=alert(1)>.tif";

        const done = control._addTiff(new File([], name));
        const dialog = await waitDialog();

        expect(dialog.querySelector("img")).toBeNull();
        expect(dialog.querySelector(".og-geotiff-type__file").textContent).toBe(name);

        await clickButton("Layer");
        await done;
    });

    test("a terrain name has no markup", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});

        const terrain = new DragAndDrop()._createTiffTerrain(new File([], `<b>dem"&'.tif`));

        expect(terrain.name).toBe("bdem");

        await terrain.whenReady();
        error.mockRestore();
    });
});

describe("DragAndDrop removed with dropped terrains", () => {
    async function addTerrain(control, name) {
        const done = control._addTiff(new File([], name));
        await clickButton("Terrain");
        await done;
    }

    function stubLayers(control) {
        control.geoObjectsLayer.remove = () => {};
        control.markersLayer.remove = () => {};
    }

    test("the terrain the planet had is brought back", async () => {
        const { control, terrains, baseTerrain } = setup();
        stubLayers(control);

        await addTerrain(control, "first.tif");
        await addTerrain(control, "second.tif");

        const destroy = vi.spyOn(terrains[0].reader, "destroy");

        control.onremove();

        expect(control.planet.terrain).toBe(baseTerrain);
        expect(control.planet.removed).toEqual(terrains);
        expect(destroy).toHaveBeenCalled();
        expect(control.tiffTerrains).toEqual([]);
    });

    test("a terrain chosen after the drop stays active", async () => {
        const { control } = setup();
        stubLayers(control);
        const chosen = { name: "chosen" };

        await addTerrain(control, "dem.tif");
        control.planet.setTerrain(chosen);

        control.onremove();

        expect(control.planet.terrain).toBe(chosen);
    });

    test("an open question is closed and adds nothing", async () => {
        const { control, created, added } = setup();
        stubLayers(control);

        const done = control._addTiff(new File([], "dem.tif"));
        await waitDialog();

        control.onremove();
        await done;

        expect(dialogs().length).toBe(0);
        expect(created[0].removed).toBe(true);
        expect(added).toEqual([]);
    });
});
