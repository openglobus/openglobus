import { Globe } from "../../src/og/Globe.js";
import { XYZ } from "../../src/og/layer/XYZ.js";
import { Extent } from "../../src/og/Extent.js";
import { LonLat } from "../../src/og/LonLat.js";
import { GlobusTerrain } from "../../src/og/terrain/GlobusTerrain.js";
import { DrawingSwitcher } from "../../src/og/control/DrawingSwitcher.js";

let osm = new XYZ("osm", {
    isBaseLayer: true,
    url: "http://tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
    attribution: 'Data @ OpenStreetMap contributors, ODbL',
    maxNativeZoom: 19,
    defaultTextures: [{ color: "#AAD3DF" }, { color: "#F2EFE9" }],
    isSRGB: false,
    shininess: 18,
    specular: [0.00063, 0.00055, 0.00032],
    ambient: [0.2, 0.2, 0.3],
    diffuse: [0.9, 0.9, 0.7],
});

var globus = new Globe({
    target: "earth",
    name: "Earth",
    maxAltitude: 15000000,
    terrain: new GlobusTerrain("19", {
        maxZoom: 14
    }),
    layers: [osm]
});

globus.planet.viewExtent(new Extent(new LonLat(158.31010, 54.45445), new LonLat(158.55687, 54.56659)));

globus.planet.addControl(new DrawingSwitcher());