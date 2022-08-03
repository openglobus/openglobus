import { Globe } from "../../src/og/Globe.js";
import { XYZ } from "../../src/og/layer/XYZ.js";
import { CanvasTiles } from "../../src/og/layer/CanvasTiles.js";
import { Vector } from "../../src/og/layer/Vector.js";
import { GlobusTerrain } from "../../src/og/terrain/GlobusTerrain.js";
import { EmptyTerrain } from "../../src/og/terrain/EmptyTerrain.js";
import { LayerSwitcher } from "../../src/og/control/LayerSwitcher.js";
import { DebugInfo } from "../../src/og/control/DebugInfo.js";
import { LayerAnimation } from "../../src/og/control/LayerAnimation.js";


let osm1 = new XYZ("osm-1", {
    isBaseLayer: true,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxNativeZoom: 19,
    defaultTextures: [{ color: "#AAD3DF" }, { color: "#F2EFE9" }],
    isSRGB: false,
    //textureFilter: "linear",
    //fading: true
});

let timeLayers = [];
let min = 0,
    max = 19;
for (let i = min; i <= max; i++) {
    let h = i.toString().padStart(2, "0");
    let l = new XYZ(`clouds-${i}`, {
        isBaseLayer: false,
        //url: `//assets.msn.com/weathermapdata/1/cloudforeca/202207300000/{x}_{y}_{z}_20220730${h}00.png`,
        url: `//assets.msn.com/weathermapdata/1/cloudforeca/202208021200/{x}_{y}_{z}_20220803${h}00.png`,
        maxNativeZoom: 7,
        isSRGB: false,
        //textureFilter: "linear"
        height: 10000,
        //fading: false
    });

    timeLayers.push(l);
}


var globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new EmptyTerrain(),
    layers: [osm1]
});

let la = new LayerAnimation({
    layers: timeLayers
});

globus.planet.addControl(new LayerSwitcher());
globus.planet.addControl(la);

window.la = la;

window.globus = globus;
