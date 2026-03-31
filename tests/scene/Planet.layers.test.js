import { Planet } from "../../src/scene/Planet";
import { Bing } from "../../src/layer/Bing";
import { OpenStreetMap } from "../../src/layer/OpenStreetMap";

test("base layer is sorted before overlays regardless of add order", () => {
    const planet = new Planet();

    const osmOverlay = new OpenStreetMap("OSM", {
        isBaseLayer: false,
        opacity: 0.5
    });
    const bingBase = new Bing("Bing");

    planet.visibleTileLayers = [osmOverlay, bingBase];
    planet._sortLayers();

    expect(planet.visibleTileLayers.map(layer => layer.name)).toEqual(["Bing", "OSM"]);
});

test("base layer remains first when initially added before overlays", () => {
    const planet = new Planet();

    const osmOverlay = new OpenStreetMap("OSM", {
        isBaseLayer: false,
        opacity: 0.5
    });
    const bingBase = new Bing("Bing");

    planet.visibleTileLayers = [bingBase, osmOverlay];
    planet._sortLayers();

    expect(planet.visibleTileLayers.map(layer => layer.name)).toEqual(["Bing", "OSM"]);
});
