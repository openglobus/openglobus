'use strict';

import { Globe } from '../../src/og/Globe.js';
import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';
import { BilTerrain } from '../../src/og/terrain/BilTerrain.js';
import { MapboxTerrain } from '../../src/og/terrain/MapboxTerrain.js';
import { XYZ } from '../../src/og/layer/XYZ.js';
import { WMS } from '../../src/og/layer/WMS.js';
import { CanvasTiles } from '../../src/og/layer/CanvasTiles.js';
import { Vector } from '../../src/og/layer/Vector.js';
import { Entity } from '../../src/og/entity/Entity.js';
import { DebugInfo } from '../../src/og/control/DebugInfo.js';
import { ToggleWireframe } from '../../src/og/control/ToggleWireframe.js';
import * as math from '../../src/og/math.js';
import { LayerSwitcher } from '../../src/og/control/LayerSwitcher.js';

// document.getElementById("ambient-r").addEventListener("input", function (e) {
//     osm.ambient.x = this.value;
//     document.querySelector(".value.ambient-r").innerHTML = this.value;
// });
// document.getElementById("ambient-g").addEventListener("input", function (e) {
//     osm.ambient.y = this.value;
//     document.querySelector(".value.ambient-g").innerHTML = this.value;
// });
// document.getElementById("ambient-b").addEventListener("input", function (e) {
//     osm.ambient.z = this.value;
//     document.querySelector(".value.ambient-b").innerHTML = this.value;
// });

// document.getElementById("diffuse-r").addEventListener("input", function (e) {
//     osm.diffuse.x = this.value;
//     document.querySelector(".value.diffuse-r").innerHTML = this.value;
// });
// document.getElementById("diffuse-g").addEventListener("input", function (e) {
//     osm.diffuse.y = this.value;
//     document.querySelector(".value.diffuse-g").innerHTML = this.value;
// });
// document.getElementById("diffuse-b").addEventListener("input", function (e) {
//     osm.diffuse.z = this.value;
//     document.querySelector(".value.diffuse-b").innerHTML = this.value;
// });

// document.getElementById("specular-r").addEventListener("input", function (e) {
//     osm.specular.x = this.value;
//     document.querySelector(".value.specular-r").innerHTML = this.value;
// });
// document.getElementById("specular-g").addEventListener("input", function (e) {
//     osm.specular.y = this.value;
//     document.querySelector(".value.specular-g").innerHTML = this.value;
// });
// document.getElementById("specular-b").addEventListener("input", function (e) {
//     osm.specular.z = this.value;
//     document.querySelector(".value.specular-b").innerHTML = this.value;
// });

// document.getElementById("shininess").addEventListener("input", function (e) {
//     osm.shininess = this.value;
//     document.querySelector(".value.shininess").innerHTML = this.value;
// });

let cnv = document.createElement("canvas");
let ctx = cnv.getContext("2d");
cnv.width = 256;
cnv.height = 256;

const tg = new CanvasTiles("Tile grid", {
    visibility: true,
    isBaseLayer: false,
    drawTile: function (material, applyCanvas) {
        //Clear canvas
        ctx.clearRect(0, 0, cnv.width, cnv.height);

        //Draw border
        ctx.beginPath();
        ctx.rect(0, 0, cnv.width, cnv.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'black';
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
        ctx.fillStyle = 'black';
        ctx.font = 'normal ' + size + 'px Verdana';
        ctx.textAlign = 'center';
        ctx.fillText(material.segment.tileX + "," + material.segment.tileY + "," + material.segment.tileZoom, cnv.width / 2, cnv.height / 2);

        //Draw canvas tile
        applyCanvas(cnv);
    }
});

let osm = new XYZ("OSM", {
    'specular': [0.0003, 0.00012, 0.00001],
    'shininess': 20,
    'diffuse': [0.89, 0.9, 0.83],
    'isBaseLayer': true,
    'url': "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    'visibility': true,
    'attribution': 'Data @ OpenStreetMap contributors, ODbL'
});

var states = new WMS("USA Population", {
    extent: [[-127, 24.5], [-66.5, 48]],
    opacity: 0.7,
    visibility: false,
    isBaseLayer: false,
    url: "//95.211.82.211:8080/geoserver",
    layers: "topp:states",
    transparentColor: [1.0, 1.0, 1.0]
});

//let sat = new XYZ("MapQuest Satellite", {
//    shininess: 20,
//    specular: [0.00048, 0.00037, 0.00035],
//    diffuse: [0.88, 0.85, 0.8],
//    ambient: [0.15, 0.1, 0.23],
//    isBaseLayer: true,
//    url: "//api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoibWdldmxpY2hzY2FuZXgiLCJhIjoiY2pwcGdsaXlnMDQzdDQybXhsOWZlbXBvdSJ9.fR2YE-ehJA4iajaJBAPKvw",
//    visibility: false,
//    attribution: `@2014 MapQuest - Portions @2014 "Map data @
//        <a target="_blank" href="//www.openstreetmap.org/">OpenStreetMap</a> and contributors,
//        <a target="_blank" href="//opendatacommons.org/licenses/odbl/"> CC-BY-SA</a>"`
//});

let sat = new XYZ("MapQuest Satellite", {
    shininess: 20,
    specular: [0.00048, 0.00037, 0.00035],
    diffuse: [0.88, 0.85, 0.8],
    ambient: [0.15, 0.1, 0.23],
    isBaseLayer: true,
    url: "http://api.tomtom.com/map/1/tile/basic/night/{z}/{x}/{y}.png?key=44LDLhblEzN2HswvgkU7wRFIOmoNUqFe",
    visibility: false,
    attribution: `@2014 MapQuest - Portions @2014 "Map data @
        <a target="_blank" href="//www.openstreetmap.org/">OpenStreetMap</a> and contributors,
        <a target="_blank" href="//opendatacommons.org/licenses/odbl/"> CC-BY-SA</a>"`
});

window.globe = new Globe({
    'name': "Earth",
    'target': "earth",
    'terrain': new MapboxTerrain(),
    'layers': [osm, sat, tg, states],
    'viewExtent': [7.86, 44.24, 11.29, 45.0]
});

//window.globe = new Globe({
//    target: "earth",
//    name: "Bil Terrain Source",
//    terrain: new BilTerrain({
//        url: "//95.211.82.211:8080/geoserver/og/",
//        layers: "og:n44_e009_1arc_v3",
//        imageSize: 128,
//        extent: [[8.9, 44.0], [10.0, 45]]
//    }),
//    viewExtent: [7.86, 44.24, 11.29, 45.0],
//    layers: [osm, sat, tg, states]
//});

globe.planet.addControl(new DebugInfo());
globe.planet.addControl(new ToggleWireframe({
    isActive: false
}));

globe.planet.addControl(new LayerSwitcher());