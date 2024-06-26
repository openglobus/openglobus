import {
    Globe,
    RgbTerrain,
    XYZ,
    control,
    utils,
    LonLat,
    GlobusTerrain,
    OpenStreetMap,
    Bing,
    GlobusRgbTerrain
} from "../../lib/@openglobus/og.esm.js";


// function toQuadKey(x, y, z) {
//     var index = '';
//     for (let i = z; i > 0; i--) {
//         var b = 0;
//         var mask = 1 << (i - 1);
//         if ((x & mask) !== 0) b++;
//         if ((y & mask) !== 0) b += 2;
//         index += b.toString();
//     }
//     return index;
// }

let sat = new Bing();

// let sat = new XYZ("sat", {
//     iconSrc: "https://ecn.t0.tiles.virtualearth.net/tiles/a120.jpeg?n=z&g=7146",
//     subdomains: ['t0', 't1', 't2', 't3'],
//     url: "https://ecn.{s}.tiles.virtualearth.net/tiles/a{quad}.jpeg?n=z&g=7146",
//     isBaseLayer: true,
//     maxNativeZoom: 19,
//     defaultTextures: [{ color: "#001522" }, { color: "#E4E6F3" }],
//     attribution: `<div style="transform: scale(0.8); margin-top:-2px;"><a href="http://www.bing.com" target="_blank"><img style="position: relative; top: 2px;" title="Bing Imagery" src="https://sandcastle.cesium.com/CesiumUnminified/Assets/Images/bing_maps_credit.png"></a> © 2021 Microsoft Corporation</div>`,
//     urlRewrite: function (s, u) {
//         return utils.stringTemplate(u, {
//             's': this._getSubdomain(),
//             'quad': toQuadKey(s.tileX, s.tileY, s.tileZoom)
//         });
//     },
//     specular: [0.00063, 0.00055, 0.00032],
//     ambient: "rgb(90,90,90)",
//     diffuse: "rgb(350,350,350)",
//     shininess: 20,
//     nightTextureCoefficient: 2.7
// });

let st = new XYZ("swisstopo", {
    url: "",
    visibility: true,
    isBaseLayer: false,
    minNativeZoom: 0,
    maxNativeZoom: 0,
    attribution: `Digital Elevation swissALTI3D ©swisstopo`,
});

let osm = new OpenStreetMap();

// let osm = new XYZ("OpenStreetMap", {
//     iconSrc: "https://tile.openstreetmap.org/8/138/95.png",
//     isBaseLayer: true,
//     url: "http://tile.openstreetmap.org/{z}/{x}/{y}.png",
//     visibility: true,
//     attribution: 'Data @ OpenStreetMap contributors, ODbL',
//     maxNativeZoom: 19,
//     defaultTextures: [{ color: "#AAD3DF" }, { color: "#F2EFE9" }],
//     isSRGB: false,
//     shininess: 18, //specular: "rgb(0.16575, 0.14152, 0.06375)",
//     specular: [0.00063, 0.00055, 0.00032],
//     ambient: [0.2, 0.2, 0.3],
//     diffuse: [0.9, 0.9, 0.7], //textureFilter: "linear"
// });

// var highResTerrain = new RgbTerrain(null, {
//     maxNativeZoom: 6,
//     maxZoom: 17,
//     url: "https://{s}.terrain.openglobus.org/public/all/{z}/{x}/{y}.png",
// });


const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    //terrain: new GlobusTerrain(),
    layers: [osm, sat],
    atmosphereEnabled: false,
    fontsSrc: "../../res/fonts",
    sun: {
        stopped: false
    }
});

//globus.planet.addControl(new control.ElevationProfileControl());
window.LonLat = LonLat;
//globus.planet.addControl(new control.DebugInfo());
globus.planet.addControl(new control.KeyboardNavigation());
globus.planet.addControl(new control.TimelineControl());
globus.planet.addControl(new control.Lighting());
globus.planet.addControl(new control.DebugInfo());
globus.planet.addControl(new control.ElevationProfileControl());
globus.planet.addControl(new control.ToggleWireframe());
globus.planet.addControl(new control.LayerSwitcher());
//globus.planet.addControl(new control.ToggleWireframe());