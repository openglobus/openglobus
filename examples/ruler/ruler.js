import { Globe } from "../../src/og/Globe.js";
import { XYZ } from "../../src/og/layer/XYZ.js";
import { GlobusTerrain } from "../../src/og/terrain/GlobusTerrain.js";
import { RulerSwitcher } from "../../src/og/control/RulerSwitcher.js";

let osm = new XYZ("osm-1", {
    isBaseLayer: false,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    diffuse: [1, 1, 1],
    maxNativeZoom: 19,
    defaultTextures: [{ color: "#AAD3DF" }, { color: "#F2EFE9" }],
    isSRGB: false
});

var globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusTerrain(),
    layers: [osm]
});

let ruler = new RulerSwitcher({
    ignoreTerrain: false
});

globus.planet.addControl(ruler);

//ruler.activate();
