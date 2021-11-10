import { Globe } from "../../src/og/Globe.js";
import { Entity } from "../../src/og/entity/Entity.js";
import { XYZ } from "../../src/og/layer/XYZ.js";
import { SkyBox } from "../../src/og/scene/SkyBox.js";
import { CanvasTiles } from "../../src/og/layer/CanvasTiles.js";
import { MouseNavigation } from "../../src/og/control/MouseNavigation.js";
import { TouchNavigation } from "../../src/og/control/TouchNavigation.js";
import { CompassButton } from "../../src/og/control/CompassButton.js";
import { ZoomControl } from "../../src/og/control/ZoomControl.js";

import { Vector } from "../../src/og/layer/Vector.js";
import { GlobusTerrain } from "../../src/og/terrain/GlobusTerrain.js";
import { EmptyTerrain } from "../../src/og/terrain/EmptyTerrain.js";
import { labelXYZ } from "./labelXYZ.js";
import { stringTemplate } from "../../src/og/utils/shared.js";
import { LonLat } from "../../src/og/LonLat.js";

const tg1 = new CanvasTiles("Tile grid", {
    visibility: true,
    isBaseLayer: false,
    opacity: 0.6,
    drawTile: function (material, applyCanvas) {
        setTimeout(() => {
            //
            // This is important create canvas here!
            //
            let cnv = document.createElement("canvas");
            let ctx = cnv.getContext("2d");
            cnv.width = 256;
            cnv.height = 256;

            //Clear canvas
            ctx.clearRect(0, 0, cnv.width, cnv.height);

            //Draw border
            ctx.beginPath();
            ctx.rect(0, 0, cnv.width, cnv.height);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "black";
            ctx.stroke();

            ctx.fillStyle = "red";

            if (material.segment.isPole) {
                ctx.fillRect(0, 0, 256, 256);
            } else {
                ctx.fillRect(0, 0, 256, 256);
            }

            //Draw canvas tile
            applyCanvas(cnv);
        }, 300);
    }
});

const tg2 = new CanvasTiles("Tile grid", {
    visibility: true,
    isBaseLayer: false,
    opacity: 0.6,
    drawTile: function (material, applyCanvas) {
        setTimeout(() => {
            //
            // This is important create canvas here!
            //
            let cnv = document.createElement("canvas");
            let ctx = cnv.getContext("2d");
            cnv.width = 256;
            cnv.height = 256;

            //Clear canvas
            ctx.clearRect(0, 0, cnv.width, cnv.height);

            //Draw border
            ctx.beginPath();
            ctx.rect(0, 0, cnv.width, cnv.height);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "black";
            ctx.stroke();

            ctx.fillStyle = "green";

            if (material.segment.isPole) {
                ctx.fillRect(0, 0, 256, 256);
                console.log(material.segment.tileIndex);
            } else {
                ctx.fillRect(0, 0, 256, 256);
            }

            //Draw canvas tile
            applyCanvas(cnv);
        }, 500);
    }
});

const labelLayer = new labelXYZ("labelLayer", {
    isBaseLayer: false,
    visibility: true,
    zIndex: 3,
    url: "//t.ssl.ak.dynamic.tiles.virtualearth.net/comp/ch/{key}?mkt=en-us&it=Z%2CGF%2CL&shading=hill&og=1471&n=z&ur=JP&js=1&cstl=in&st=me|lv:0_pp|lv:1_cr|lv:1_ad|lv:1&nvlos=1&vpt=e,p&pll=1&ell=1",
    countryLayerData: "//assets.msn.com/weathermapdata/1/static/3d/label.0.1/country-{}.json",
    height: 16,
    size: 11.5,
    color: "white"
});

var osm = new XYZ("OpenStreetMap", {
    isBaseLayer: true,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
    textureFilter: "linear",
    opacity: 1,
    attribution: "Data @ OpenStreetMap contributors, ODbL"
});

function toQuadKey(x, y, z) {
    var index = "";
    for (var i = z; i > 0; i--) {
        var b = 0;
        var mask = 1 << (i - 1);
        if ((x & mask) !== 0) b++;
        if ((y & mask) !== 0) b += 2;
        index += b.toString();
    }
    return index;
}

let hillshade = new XYZ("hillshade", {
    //shininess: 20,
    isBaseLayer: false,
    url: "//t.ssl.ak.dynamic.tiles.virtualearth.net/comp/ch/{quad}?mkt=en-us&it=Z,GF,L&shading=t&og=1631&n=z&ur=RU&rs=1&dpi=d1&o=PNG&st=me|lv:0;v:0_wt|v:1_trs|v:1;lv:0;sc:FF6B6B6B;fc:FF6B6B6B;strokeWidthScale:0.2_cst|v:1;fc:FF000000;strokeWidthScale:0.5&cstl=weather&shdw=1",
    visibility: true,
    attribution: `virtualearth`,
    maxNativeZoom: 19,
    zIndex: 100,
    urlRewrite: function (s, u) {
        return stringTemplate(u, {
            s: this._getSubdomain(),
            quad: toQuadKey(s.tileX, s.tileY, s.tileZoom)
        });
    }
});

var globus = new Globe({
    target: "earth",
    name: "Earth",
    maxAltitude: 15000000,
    minAltitude: 4200000,
    skybox: SkyBox.createDefault("https://assets.msn.com/weathermapdata/1/static/3d/"),
    // controls: [
    //     new ZoomControl({}),
    //     new MouseNavigation({}),
    //     new TouchNavigation({}),
    //     new CompassButton({})
    // ],
    terrain: new EmptyTerrain({
        gridSizeByZoom: [32, 32, 32, 32, 16, 8, 8]
    }),
    layers: [labelLayer, tg1, tg2, hillshade /*, osm*/],
    useNightTexture: false,
    useSpecularTexture: false,
    sun: {
        active: false
    }
    //useNightTexture: false,
    //useSpecularTexture: false
});

globus.planet.camera.setLonLat(new LonLat(45, 45, 4500000));
globus.planet.camera.update();

//requestAnimationFrame(() => {
//    globus.planet.flyLonLat(new LonLat(45, 45, 100000));
//});

//globus.planet.viewExtentArr([8.08, 46.72, 8.31, 46.75]);

window.globus = globus;
