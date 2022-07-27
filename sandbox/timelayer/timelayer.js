import { Globe } from "../../src/og/Globe.js";
import { XYZ } from "../../src/og/layer/XYZ.js";
import { CanvasTiles } from "../../src/og/layer/CanvasTiles.js";
import { Vector } from "../../src/og/layer/Vector.js";
import { GlobusTerrain } from "../../src/og/terrain/GlobusTerrain.js";
import { EmptyTerrain } from "../../src/og/terrain/EmptyTerrain.js";
import { LayerSwitcher } from "../../src/og/control/LayerSwitcher.js";
import { DebugInfo } from "../../src/og/control/DebugInfo.js";
//import { LayerAnimation } from "../../src/og/control/LayerAnimation.js";
import { Ruller } from "../../src/og/control/ruller/Ruller.js";


let osm1 = new XYZ("osm-1", {
    isBaseLayer: false,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    diffuse: [1, 1, 1],
    maxNativeZoom: 19,
    defaultTextures: [{ color: "#AAD3DF" }, { color: "#F2EFE9" }],
    isSRGB: false
    //textureFilter: "linear"
});

let osm2 = new XYZ("osm-2", {
    diffuse: [1, 0, 0],
    isBaseLayer: false,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxNativeZoom: 19,
    defaultTextures: [{ color: "#FF0000" }, { color: "#FF0000" }],
    isSRGB: false
    //textureFilter: "linear"
});

let osm3 = new XYZ("osm-3", {
    diffuse: [0, 1, 0],
    isBaseLayer: false,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxNativeZoom: 19,
    defaultTextures: [{ color: "#00FF00" }, { color: "#00FF00" }],
    isSRGB: false
    //textureFilter: "linear"
});

let osm4 = new XYZ("osm-4", {
    diffuse: [0, 0, 1],
    isBaseLayer: false,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxNativeZoom: 19,
    defaultTextures: [{ color: "#0000FF" }, { color: "#0000FF" }],
    isSRGB: false
    //textureFilter: "linear"
});

var globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusTerrain(),
    layers: [osm1]
});

// let la = new LayerAnimation({
//     layers: [osm1, osm2, osm3, osm4]
// });

globus.planet.addControl(new LayerSwitcher());
//globus.planet.addControl(la);
let ruller = new Ruller();
globus.planet.addControl(ruller);
ruller.activate();

window.globus = globus;
//window.layerAnimation = la;
window.ruller = ruller;
