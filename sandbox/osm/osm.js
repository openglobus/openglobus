import { Globe } from "../../src/og/Globe.js";
import { Entity } from "../../src/og/entity/Entity.js";
import { XYZ } from "../../src/og/layer/XYZ.js";
import { CanvasTiles } from "../../src/og/layer/CanvasTiles.js";
import { Vector } from "../../src/og/layer/Vector.js";
import { GlobusTerrain } from "../../src/og/terrain/GlobusTerrain.js";
import { EmptyTerrain } from "../../src/og/terrain/EmptyTerrain.js";
//import { labelXYZ } from "./labelXYZ.js";
//import { labelXYZ } from "./labelXYZ_new.js";
import { stringTemplate } from "../../src/og/utils/shared.js";
import { Lighting } from "../../src/og/control/Lighting.js";
import { LayerSwitcher } from "../../src/og/control/LayerSwitcher.js";
import { DebugInfo } from "../../src/og/control/DebugInfo.js";
import { ToggleWireframe } from "../../src/og/control/ToggleWireframe.js";

const tg = new CanvasTiles("Tile grid", {
    visibility: true,
    isBaseLayer: false,
    drawTile: function (material, applyCanvas) {
        //
        // This is important create canvas here!
        //
        let cnv = document.createElement("canvas");
        let ctx = cnv.getContext("2d");
        cnv.width = 256;
        cnv.height = 256;

        //Clear canvas
        ctx.clearRect(0, 0, cnv.width, cnv.height);

        let size;

        if (material.segment.isPole) {
            let ext = material.segment.getExtentLonLat();

            ctx.fillStyle = "#888888";
            ctx.fillRect(0, 0, 256, 256);

            ctx.font = 'normal ' + 29 + 'px Verdana';
            ctx.textAlign = 'center';
            ctx.fillText(`${ext.northEast.lon.toFixed(3)} ${ext.northEast.lat.toFixed(3)}`, cnv.width / 2, cnv.height / 2 + 20);
            ctx.fillText(`${ext.southWest.lon.toFixed(3)} ${ext.southWest.lat.toFixed(3)}`, cnv.width / 2, cnv.height / 2 - 20);
        } else {

            ctx.fillStyle = "#888888";
            ctx.fillRect(0, 0, 256, 256);

            if (material.segment.tileZoom > 14) {
                size = "26";
            } else {
                size = "32";
            }
            ctx.fillStyle = 'black';
            ctx.font = 'normal ' + size + 'px Verdana';
            ctx.textAlign = 'center';
            ctx.fillText(material.segment.tileX + "," + material.segment.tileY + "," + material.segment.tileZoom, cnv.width / 2, cnv.height / 2);
        }

        //Draw border
        //ctx.beginPath();
        //ctx.rect(0, 0, cnv.width, cnv.height);
        //ctx.lineWidth = 2;
        //ctx.strokeStyle = "black";
        //ctx.stroke();

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
};

let temp = new XYZ("temp", {
    isBaseLayer: true,
    url: "//assets.msn.com/weathermapdata/1/temperaturerendered/112818/{x}_{y}_{z}_2021113007.jpg",
    visibility: true,
    attribution: 'Temperature',
    maxNativeZoom: 19,
    textureFilter: "mipmap"
});

var borders = new XYZ("borders", {
    opacity: 1.0,
    isBaseLayer: false,
    textureFilter: "mipmap",
    url: "//t.ssl.ak.dynamic.tiles.virtualearth.net/comp/ch/{quad}?mkt=en-us&it=Z,GF,L&shading=t&og=1638&n=z&ur=US&o=PNG&st=me|lv:0;v:0_wt|v:1_trs|v:1;lv:0;sc:FF6B6B6B;fc:FF6B6B6B;strokeWidthScale:0.2_cst|v:1;fc:FF000000;strokeWidthScale:0.5&cstl=weather&shdw=1&rs=1&dpi=d1",
    visibility: true,
    urlRewrite: function (s, u) {
        return stringTemplate(u, {
            'quad': toQuadKey(s.tileX, s.tileY, s.tileZoom)
        });
    }
});

let osm = new XYZ("osm", {
    isBaseLayer: true,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
    attribution: 'Data @ OpenStreetMap contributors, ODbL',
    maxNativeZoom: 19,
    defaultTextures: [{ color: "#AAD3DF" }, { color: "#F2EFE9" }],
    isSRGB: false
    //textureFilter: "linear"
});

let sat = new XYZ("sat", {
    isBaseLayer: true,
    subdomains: ['t0', 't1', 't2', 't3'],
    url: "https://ecn.{s}.tiles.virtualearth.net/tiles/a{quad}.jpeg?n=z&g=7146",
    visibility: false,
    attribution: `<div style="transform: scale(0.8); margin-top:-2px;"><a href="http://www.bing.com" target="_blank"><img title="Bing Imagery" src="https://sandcastle.cesium.com/CesiumUnminified/Assets/Images/bing_maps_credit.png"></a> © 2021 Microsoft Corporation</div>`,
    maxNativeZoom: 19,
    defaultTextures: [{ color: "#001522" }, { color: "#E4E6F3" }],
    textureFilter: "linear",
    urlRewrite: function (s, u) {
        return stringTemplate(u, {
            's': this._getSubdomain(),
            'quad': toQuadKey(s.tileX, s.tileY, s.tileZoom)
        });
    }
});

var globus = new Globe({
    target: "earth",
    name: "Earth",
    maxAltitude: 15000000,
    minAltitude: 1,
    terrain: new GlobusTerrain({
        gridSizeByZoom: [32, 32, 32, 32, 16, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8]
    }),
    //maxEqualZoomAltitude: 1,
    layers: [sat, osm, temp, borders],
    useNightTexture: false,
    //useEarthNavigation: true,
    useSpecularTexture: false
});

globus.planet.setRatioLod(1.0, 0.7);

globus.planet.addControl(new Lighting());

globus.planet.addControl(new LayerSwitcher());

globus.planet.addControl(new DebugInfo());

globus.planet.addControl(new ToggleWireframe());


window.globus = globus;
