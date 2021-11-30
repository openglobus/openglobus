"use strict";

import { Globe } from "../../src/og/Globe.js";
import { GlobusTerrain } from "../../src/og/terrain/GlobusTerrain.js";
import { BilTerrain } from "../../src/og/terrain/BilTerrain.js";
import { MapboxTerrain } from "../../src/og/terrain/MapboxTerrain.js";
import { EmptyTerrain } from "../../src/og/terrain/EmptyTerrain.js";
import { XYZ } from "../../src/og/layer/XYZ.js";
import { WMS } from "../../src/og/layer/WMS.js";
import { CanvasTiles } from "../../src/og/layer/CanvasTiles.js";
import { DebugInfo } from "../../src/og/control/DebugInfo.js";
import { KeyboardNavigation } from "../../src/og/control/KeyboardNavigation.js";
import { ToggleWireframe } from "../../src/og/control/ToggleWireframe.js";
import { LayerSwitcher } from "../../src/og/control/LayerSwitcher.js";
//import { LonLat } from '../../src/og/LonLat.js';
//import { Vec3 } from '../../src/og/math/Vec3.js';
import { SegmentBoundVisualization } from "../../src/og/control/SegmentBoundVisualization.js";
import { stringTemplate } from "../../src/og/utils/shared.js";
import { Lighting } from "../../src/og/control/Lighting.js";

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

let bing = new XYZ("sat", {
    shininess: 20,
    isBaseLayer: true,
    subdomains: ["t0", "t1", "t2", "t3"],
    url: "https://ecn.{s}.tiles.virtualearth.net/tiles/a{quad}.jpeg?n=z&g=7146",
    visibility: true,
    attribution: `Bing`,
    maxNativeZoom: 19,
    defaultTextures: [{ color: "#001522" }, { color: "#E4E6F3" }],
    urlRewrite: function (s, u) {
        return stringTemplate(u, {
            s: this._getSubdomain(),
            quad: toQuadKey(s.tileX, s.tileY, s.tileZoom)
        });
    }
});

let cnv = document.createElement("canvas");
let ctx = cnv.getContext("2d");
cnv.width = 256;
cnv.height = 256;

const tg = new CanvasTiles("Tile grid", {
    visibility: false,
    isBaseLayer: false,
    zIndex: 100,
    drawTile: function (material, applyCanvas) {
        //Clear canvas
        ctx.clearRect(0, 0, cnv.width, cnv.height);

        //Draw border
        ctx.beginPath();
        ctx.rect(0, 0, cnv.width, cnv.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "black";
        ctx.stroke();

        let size;

        //Draw text
        if (material.segment.tileZoom > 17) {
            size = "18";
        } else if (material.segment.tileZoom > 14) {
            size = "26";
        } else {
            size = "32";
        }
        ctx.fillStyle = "black";
        ctx.font = "normal " + size + "px Verdana";
        ctx.textAlign = "center";

        //let tms = XYZ.getTMS(material.segment.tileX, material.segment.tileY, material.segment.tileZoom);

        ctx.fillText(
            material.segment.tileX + "," + material.segment.tileY + "," + material.segment.tileZoom,
            cnv.width / 2,
            cnv.height / 2
        );

        //Draw canvas tile
        applyCanvas(cnv);
    }
});

var wms = new WMS("wms", {
    visibility: false,
    isBaseLayer: false,
    url: "//openglobus.org:8080/geoserver/",
    layers: "og:USGS_one_meter_x32y413_UT_ZionNP_QL2_2016_3857_RGB",
    version: "1.1.1",
    opacity: 1.0,
    extent: [
        [-113.159, 37.176],
        [-112.77, 37.32]
    ]
});

let osm = new XYZ("OSM", {
    isBaseLayer: true,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
    attribution: "Data @ OpenStreetMap contributors, ODbL"
});

let ma = new XYZ("microavia", {
    isBaseLayer: false,
    opacity: 0.5,
    url: "//openglobus.org/ma/{z}/{x}/{y}.png",
    visibility: true,
    attribution: "Data @ Microavia - 18.11.2021",
    diffuse: [2, 2, 2],
    ambient: [0, 0, 0],
});

let sat = new XYZ("Google Satellite", {
    shininess: 20,
    isBaseLayer: true,
    specular: [0.00048, 0.00037, 0.00035],
    diffuse: [0.88, 0.85, 0.8],
    ambient: [0.15, 0.1, 0.23],
    url: "https://khms1.googleapis.com/kh?v=894&hl=en-GB&x={x}&y={y}&z={z}",
    visibility: false,
    attribution: ``
});

let emptyTerrain = new EmptyTerrain(),
    globusTerrain = new GlobusTerrain(),
    mapboxTerrain = new MapboxTerrain(),
    bilTerrain = new BilTerrain({
        maxZoom: 18,
        url: "//openglobus.org:8080/geoserver/og/",
        layers: "og:USGS_one_meter_x32y413_UT_ZionNP_QL2_2016_3857",
        imageSize: 129,
        plainGridSize: 128,
        gridSizeByZoom: [
            64, 32, 16, 8, 8, 8, 8, 16, 16, 16, 16, 16, 32, 16, 32, 32, 32, 16, 16, 8, 8, 4
        ]
        //extent: [[8.9, 44.0], [10.0, 45]]
    }),
    rastTerrain = new MapboxTerrain(null, {
        maxZoom: 19,
        url: "//terrain.openglobus.org/public/ma/{z}/{x}/{y}.png" /*"//terrain.openglobus.org/public/oahu/{z}/{x}/{y}.png", "//terrain.openglobus.org/public/waikato/{z}/{x}/{y}.png"*/,
        //imageSize: 129,
        //plainGridSize: 128,
        gridSizeByZoom: [
            //64, 32, 16, 8, 8, 8, 8, 16, 16, 16, 16, 16, 32, 32, 32, 32, 32, 32, 32, 16, 8, 4
            64, 32, 16, 8, 8, 8, 8, 16, 16, 16, 16, 16, 32, 64, 64, 128, 128, 128, 128, 128, 128, 64, 32
            //8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 4
        ]
        // urlRewrite: function (s, u) {
        //     let z = s.tileZoom,
        //         ymax = 1 << z,
        //         y = ymax - s.tileY - 1;
        //
        //     return stringTemplate(u, XYZ.getTMS(s.tileX, s.tileY, s.tileZoom));
        // }
    });

let mat = new XYZ("MA RASTER", {
    isBaseLayer: false,
    url: "//terrain.openglobus.org/public/ma/{z}/{x}/{y}.png",
    visibility: true,
    attribution: "",
    diffuse: [2, 2, 2],
    ambient: [0, 0, 0],
    opacity: 0.5
});

window.globe = new Globe({
    name: "Earth",
    target: "earth",
    terrain: rastTerrain,
    layers: [osm, tg, ma, bing, sat, mat],
    viewExtent: [-113.159, 37.176, -112.77, 37.32],
    maxGridSize: 256
    //useNightTexture: false,
    //useSpecularTexture: false
});

globe.planet.addControl(
    new DebugInfo({
        watch: [
            {
                label: "temp",
                frame: () => true
            }
        ]
    })
);

globe.planet.addControl(
    new ToggleWireframe({
        isActive: false
    })
);

//globe.planet.addControl(new SegmentBoundVisualization());
globe.planet.addControl(new KeyboardNavigation());
globe.planet.addControl(new LayerSwitcher());
//globe.planet.addControl(new Lighting());