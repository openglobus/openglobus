import { Globe } from "../../src/og/Globe.js";
import { Entity } from "../../src/og/entity/Entity.js";
import { XYZ } from "../../src/og/layer/XYZ.js";
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

let cnv = document.createElement("canvas");
let ctx = cnv.getContext("2d");
cnv.width = 256;
cnv.height = 256;

let frameCounter = 0;

const tg = new CanvasTiles("Tile grid", {
    visibility: false,
    isBaseLayer: false,
    maxNativeZoom: 5,
    animated: false,
    preLoadZoomLevels: [0],
    drawTile: function (material, applyCanvas) {

        frameCounter++;

        //Clear canvas
        ctx.clearRect(0, 0, cnv.width, cnv.height);

        let size;

        if (material.segment.isPole) {
            // let ext = material.segment.getExtentLonLat();
            //
            //
            // if (material.segment.tileZoom > 14) {
            //     size = "26";
            // } else {
            //     size = "32";
            // }
            // ctx.fillStyle = 'black';
            // ctx.font = 'normal ' + size + 'px Verdana';
            // ctx.textAlign = 'center';
            // ctx.fillText(material.segment.tileX + "," + material.segment.tileY + "," + material.segment.tileZoom, cnv.width / 2, cnv.height / 2);
        } else {

            if (material.segment.tileZoom > 14) {
                size = "26";
            } else {
                size = "32";
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
        ctx.lineWidth = 2;
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

var clouds = new XYZ("clouds", {
    opacity: 1.0,
    isBaseLayer: false,
    textureFilter: "mipmap",
    url: "https://assets.msn.com/weathermapdata/1/cloudforeca/202207030000/{z}_{x}_{y}_202207031100.png",
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
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: false,
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
    visibility: true,
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
    maxZoom: 16,
    //url:"//127.0.0.1/og/terrain/eu/{z}/{x}/{y}.png",
    url: "//terrain.openglobus.org/public/eu10/{z}/{x}/{y}.png",
    //url: "//terrain.openglobus.org/public/austria10/{z}/{x}/{y}.png",
    //url: "//terrain.openglobus.org/public/nz/{z}/{x}/{y}.png",
    //url: "//127.0.0.1/terrain/andorra/dest/{z}/{x}/{y}.png",
    //imageSize: 129,
    //plainGridSize: 256,
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
    target: "earth",
    name: "Earth",
    //frustums: [[100, 100000000]],
    maxAltitude: 15000000,
    minAltitude: 1,
    //terrain: highResTerrain,
    //terrain: new EmptyTerrain(),
    //terrain: new MapboxTerrain(),
    terrain: new GlobusTerrain(),
    //maxEqualZoomAltitude: 1,
    layers: [sat, tg, osm, img, colorado],
    //frustums: [[1, 1e3 + 100], [1e3, 1e6 + 10000], [1e6, 1e9]],
    //useNightTexture: false,
    //useEarthNavigation: true,
    //useSpecularTexture: false
});

//globus.renderer.fontAtlas.loadFont("chinese.msyh", "//assets.msn.com/weathermapdata/1/static/3d/label/zh-cn/font-v2.2/", "chinese.msyh.json");

globus.planet.addControl(new LayerSwitcher());

//globus.planet.addControl(new DebugInfo());

globus.planet.addControl(new ToggleWireframe());
globus.planet.addControl(new KeyboardNavigation());
globus.planet.addControl(new TimelineControl());
globus.planet.addControl(new Lighting());
globus.planet.addControl(new RulerSwitcher());
globus.planet.addControl(new Selection());
globus.planet.addControl(new GeoImageDragControl());

//globus.planet.renderer.controls.sun.stop()

//globus.planet.viewExtentArr([8.08, 46.72, 8.31, 46.75]);

window.globus = globus;