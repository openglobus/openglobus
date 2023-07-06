import * as math from "../../src/og/math.js";
import { Globe } from "../../src/og/Globe.js";
import { Object3d } from "../../src/og/Object3d.js";
import { Entity } from "../../src/og/entity/Entity.js";
import { EntityCollection } from "../../src/og/entity/EntityCollection.js";
import { XYZ } from "../../src/og/layer/XYZ.js";
import { LonLat } from "../../src/og/LonLat.js";
import { CanvasTiles } from "../../src/og/layer/CanvasTiles.js";
import { Vector } from "../../src/og/layer/Vector.js";
import { GlobusTerrain } from "../../src/og/terrain/GlobusTerrain.js";
import { MapboxTerrain } from "../../src/og/terrain/MapboxTerrain.js";
import { EmptyTerrain } from "../../src/og/terrain/EmptyTerrain.js";
import { stringTemplate } from "../../src/og/utils/shared.js";
import { Lighting } from "../../src/og/control/Lighting.js";
import { LayerSwitcher } from "../../src/og/control/LayerSwitcher.js";
import { Selection } from "../../src/og/control/selection/Selection.js";
import { RulerSwitcher } from "../../src/og/control/RulerSwitcher.js";
import { KeyboardNavigation } from "../../src/og/control/KeyboardNavigation.js";
import { DebugInfo } from "../../src/og/control/DebugInfo.js";
import { ToggleWireframe } from "../../src/og/control/ToggleWireframe.js";
import { VisibleExtent } from "../../src/og/control/visibleExtent/VisibleExtent.js";
import { TimelineControl } from "../../src/og/control/timeline/TimelineControl.js";
import { GeoImageDragControl } from "../../src/og/control/GeoImageDragControl.js";
import { GeoImage } from '../../src/og/layer/GeoImage.js';
import { DrawingSwitcher } from "../../src/og/control/DrawingSwitcher.js";

let cnv = document.createElement("canvas");
let ctx = cnv.getContext("2d");
cnv.width = 256;
cnv.height = 256;

let frameCounter = 0;

const clouds = new GeoImage(`transparentImage`, {
    src: `data:image/png;base64,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`,
    corners: [
        [-20, 10],
        [20, 10],
        [20, -10],
        [-20, -10]
    ],
    visibility: true,
    isBaseLayer: false,
    opacity: 1,
    height: 1000,
})


const tg = new CanvasTiles("Tile grid", {
    visibility: true,
    isBaseLayer: false,
    //maxNativeZoom: 7,
    //animated: true,
    preLoadZoomLevels: [0],
    drawTile: function (material, applyCanvas) {

        frameCounter++;

        //Clear canvas
        ctx.clearRect(0, 0, cnv.width, cnv.height);

        let size;

        if (material.segment.isPole) {
            let ext = material.segment.getExtentLonLat();
            if (material.segment.tileZoom > 14) {
                size = "26";
            } else {
                size = "32";
            }
            ctx.fillStyle = 'black';
            ctx.font = 'normal ' + size + 'px Verdana';
            ctx.textAlign = 'center';
            ctx.fillText(material.segment.tileX + "," + material.segment.tileY + "," + material.segment.tileZoom, cnv.width / 2, cnv.height / 2);
        } else {

            if (material.segment.tileZoom > 14) {
                size = "22";
            } else {
                size = "28";
            }
            ctx.fillStyle = 'black';
            ctx.font = 'normal ' + size + 'px Verdana';
            ctx.textAlign = 'center';
            ctx.fillText(material.segment.tileX + "," + material.segment.tileY + "," + material.segment.tileZoom, cnv.width / 2, cnv.height / 2);
            //ctx.fillText(frameCounter, cnv.width / 2, cnv.height / 2);
        }

        //Draw border
        ctx.beginPath();
        ctx.rect(0, 0, cnv.width, cnv.height);
        //ctx.fillRect(0, 0, cnv.width, cnv.height);
        ctx.lineWidth = 2;
        //ctx.fillStyle = "black";
        ctx.strokeStyle = "black";
        ctx.stroke();

        //Draw canvas tile
        applyCanvas(cnv);
    }
});

function toQuadKey(x, y, z) {
    var index = '';
    for (var i = z; i > 0; i--) {
        var b = 0;
        var mask = 1 << (i - 1);
        if ((x & mask) !== 0) b++;
        if ((y & mask) !== 0) b += 2;
        index += b.toString();
    }
    return index;
}

let temp = new XYZ("temp", {
    isBaseLayer: true,
    url: "https://assets.msn.com/weathermapdata/1/temperaturerendered/042500/{x}_{y}_{z}_2022042514.jpg",
    visibility: true,
    attribution: 'Temperature',
    maxNativeZoom: 5,
    textureFilter: "mipmap"
});

var borders = new XYZ("borders", {
    opacity: 1.0,
    isBaseLayer: false,
    textureFilter: "mipmap",
    url: "https://t.ssl.ak.dynamic.tiles.virtualearth.net/comp/ch/{quad}?mkt=en-us&it=Z,GF,L&shading=t&og=1631&n=z&ur=RU&o=PNG&st=me|lv:0;v:0_wt|v:1_trs|v:1;lv:0;sc:FF6B6B6B;fc:FF6B6B6B;strokeWidthScale:0.2_cst|v:1;fc:FF000000;strokeWidthScale:0.2&cstl=weather&shdw=1",
    visibility: true,
    maxNativeZoom: 14,
    preLoadZoomLevels: [],
    minNativeZoom: 1,
    urlRewrite: function (s, u) {
        return stringTemplate(u, {
            'quad': toQuadKey(s.tileX, s.tileY, s.tileZoom)
        });
    }
});

// var clouds = new XYZ("clouds", {
//     opacity: 1.0,
//     isBaseLayer: false,
//     textureFilter: "mipmap",
//     url: "https://assets.msn.com/weathermapdata/1/cloudforeca/202207030000/{z}_{x}_{y}_202207031100.png",
//     visibility: true,
//     maxNativeZoom: 14,
//     preLoadZoomLevels: [],
//     minNativeZoom: 1,
//     urlRewrite: function (s, u) {
//         return stringTemplate(u, {
//             'quad': toQuadKey(s.tileX, s.tileY, s.tileZoom)
//         });
//     }
// });

var red = new XYZ("borders", {
    opacity: 1.0,
    isBaseLayer: true,
    textureFilter: "mipmap",
    url: "//dynamic.t3.tiles.ditu.live.com/comp/ch/{quad}?mkt=zh-cn,en-us&it=Z,GF,L&ur=CN&og=649&n=z&shading=t&o=PNG&st=me|lv:0_wt|v:1_trs|v:1;lv:0;sc:FF6B6B6B;fc:FF6B6B6B;strokeWidthScale:0.2_cst|v:1;fc:FF000000;strokeWidthScale:0.5&cstl=weather&shdw=1",
    visibility: true,
    maxNativeZoom: 14,
    preLoadZoomLevels: [],
    minNativeZoom: 1,
    urlRewrite: function (s, u) {
        console.log(s.tileZoom);
        return stringTemplate(u, {
            'quad': toQuadKey(s.tileX, s.tileY, s.tileZoom)
        });
    }
});

let osm = new XYZ("osm", {
    isBaseLayer: true,
    url: "http://tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
    attribution: 'Data @ OpenStreetMap contributors, ODbL',
    maxNativeZoom: 19,
    defaultTextures: [{ color: "#AAD3DF" }, { color: "#F2EFE9" }],
    isSRGB: false,
    shininess: 18,
    //specular: "rgb(0.16575, 0.14152, 0.06375)",
    specular: [0.00063, 0.00055, 0.00032],
    ambient: [0.2, 0.2, 0.3],
    diffuse: [0.9, 0.9, 0.7],
    //textureFilter: "linear"
});

let sat2 = new XYZ("osm-1", {
    isBaseLayer: true,
    url: "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
});

//osm.events.on("loadend", () => console.log("osm loadend"));
//borders.events.on("loadend", () => console.log("borders loadend"));
tg.events.on("loadend", () => console.log("tilegrid loadend"));

let sat = new XYZ("sat", {
    isBaseLayer: true,
    subdomains: ['t0', 't1', 't2', 't3'],
    url: "https://ecn.{s}.tiles.virtualearth.net/tiles/a{quad}.jpeg?n=z&g=7146",
    //url: "https://astro.arcgis.com/arcgis/rest/services/OnMars/MDIM/MapServer/tile/{z}/{y}/{x}?blankTile=false",
    //url: "//127.0.0.1/whereonmars.cartodb.net/celestia_mars-shaded-16k_global/{z}/{y}/{x}.png",
    //url: "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg",
    visibility: false,
    attribution: `<a href="http://www.bing.com" target="_blank"><img title="Bing Imagery" src="https://sandcastle.cesium.com/CesiumUnminified/Assets/Images/bing_maps_credit.png"></a> © 2021 Microsoft Corporation`,
    maxNativeZoom: 19,
    defaultTextures: [{ color: "#001522" }, { color: "#E4E6F3" }],
    //textureFilter: "linear",
    // diffuse: "rgb(325,325,355)",
    // ambient: "rgb(75,75,105)",
    //diffuse: "rgb(500-77,490-77,540-128)",
    shininess: 18,
    //specular: "rgb(0.16575, 0.14152, 0.06375)",
    specular: [0.00063, 0.00055, 0.00032],
    ambient: "rgb(100,100,140)",
    diffuse: "rgb(450,450,450)",
    nightTextureCoefficient: 2.7,
    //ambient: "rgb(77,77,128)",
    urlRewrite: function (s, u) {
        return stringTemplate(u, {
            's': this._getSubdomain(),
            'quad': toQuadKey(s.tileX, s.tileY, s.tileZoom)
        });
    }
});

//let visExtent = new VisibleExtent();

var highResTerrain = new MapboxTerrain(null, {
    maxZoom: 19,
    //url:"//127.0.0.1/og/terrain/eu/{z}/{x}/{y}.png",
    //url: "//terrain.openglobus.org/public/eu10/{z}/{x}/{y}.png",
    //url: "https://andorra.utm.microavia.com/Andora_dsm_las/{z}/{x}/{y}.png",
    url: "//terrain.openglobus.org/public/zion/{z}/{x}/{y}.png",
    //equalizeVertices: false,
    //url: "//terrain.openglobus.org/public/nz/{z}/{x}/{y}.png",
    //url: "//127.0.0.1/terrain/andorra/dest/{z}/{x}/{y}.png",
    //imageSize: 129,
    plainGridSize: 256,
    gridSizeByZoom: [
        64, 32, 16, 8, 8, 8, 8, 16, 16, 16, 16, 16, 32, 32, 32, 64, 64, 64, 64, 32, 16, 8
        //8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 4
    ]
});

let img = new GeoImage("Kilimanjaro SPOT-7", {
    src: "./SPOT 7 Satellite Image Kilimanjaro.jpg",
    corners: [[37.286664453664194, -3.0473247187887442], [37.38444113753977, -3.0468478037959073], [37.384014813048736, -3.0904441121085506], [37.29373990291454, -3.09380219219323]],
    visibility: true,
    isBaseLayer: false,
    attribution: '<a href="//www.satimagingcorp.com/">www.satimagingcorp.com</a> SPOT-7',
    opacity: 1.0
});

let colorado = new GeoImage("Colorado Lagoon from International Space Station (this is a very long label)", {
    src: "colorado-lagoon.jpg",
    corners: [[-67.53063210679933, -22.148203215209232], [-67.76790919786042, -22.472194951833597], [-67.98127275782282, -22.331289122713546], [-67.74288424259892, -21.991520350954644]],
    visibility: true,
    isBaseLayer: false,
    attribution: `
            <a href="https://vk.com/olegmks">Oleg Artemjev</a>`,
    opacity: 1,
    zIndex: 3
});

var globus = new Globe({
    autoActivate: false,
    //target: "earth4",
    name: "Earth",
    //frustums: [[100, 100000000]],
    maxAltitude: 15000000,
    //minAltitude: 1,
    //terrain: highResTerrain,
    //terrain: new MapboxTerrain(),
    terrain: new GlobusTerrain("19", {
        maxZoom: 19
    }),
    //terrain: new EmptyTerrain(),
    //maxEqualZoomAltitude: 1,
    layers: [osm, sat2, clouds],
    //frustums: [[1, 1e3 + 100], [1e3, 1e6 + 10000], [1e6, 1e9]],
    //useNightTexture: false,
    //useEarthNavigation: true,
    //useSpecularTexture: false
});

//globus.renderer.fontAtlas.loadFont("chinese.msyh", "//assets.msn.com/weathermapdata/1/static/3d/label/zh-cn/font-v2.2/", "chinese.msyh.json");

globus.planet.addControl(new LayerSwitcher());

globus.planet.addControl(new DebugInfo());

globus.planet.addControl(new ToggleWireframe());
globus.planet.addControl(new KeyboardNavigation());
globus.planet.addControl(new TimelineControl());
globus.planet.addControl(new Lighting());
globus.planet.addControl(new RulerSwitcher());
globus.planet.addControl(new Selection());
globus.planet.addControl(new GeoImageDragControl());
globus.planet.addControl(new DrawingSwitcher());


window.globus = globus;

let obj3d = Object3d.createSphere();

const entity = new Entity({
    lonlat: [0.2, 87],
    geoObject: {
        scale: 1,
        color: "yellow",
        instanced: true,
        object3d: obj3d
    }
});

window.marker = entity;

let geoObjects = new EntityCollection({
    entities: [entity],
    scaleByDistance: [100, 20000000, 1.0]
});

geoObjects.addTo(globus.planet);