'use strict';

import { Globe } from '../../src/og/Globe.js';
//import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';
import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';
import { MapboxTerrain } from '../../src/og/terrain/MapboxTerrain.js';
import { XYZ } from '../../src/og/layer/XYZ.js';
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
    'terrain': new GlobusTerrain(),
    //'terrain': new MapboxTerrain(),
    'layers': [osm, sat, tg]
});

globe.planet.addControl(new DebugInfo());
globe.planet.addControl(new ToggleWireframe({
    isActive: false
}));

globe.planet.addControl(new LayerSwitcher());

//globe.planet.viewExtentArr([12.97153, 46.81244, 13.13657, 46.86488]);

//let townLabels = new Vector("town labels", {
//    'nodeCapacity': 5000000,
//    'visibility': true
//});
//function randomCoordinateJitter(degree, margin) {
//    return degree + margin * (Math.random() - 0.5) / 0.5;
//}

//var nCats = 15,
//    labels = [];
//for (var i = 0; i <= nCats; i++) {
//    labels.push(new Entity({
//        'lonlat': [randomCoordinateJitter(-77.009003, .5), randomCoordinateJitter(38.889931, .5)],
//        'label': {
//            'text': 'CUTE #' + i,
//            'size': 26,
//            'outline': 0,
//            'face': "Lucida Console",
//            'weight': "bold",
//            'color': "black",
//        },
//        'billboard': {
//            'size': [36, 24],
//            'src': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhFpaxDXCS5O9hx90F3ufJI2VnC_wW0lPnrr6BIb18P4V5JXxBCg'
//        }
//    }));
//}

//townLabels.setEntities(labels);

//var _inc = 0;

//var List = function (next, data) {
//    this.data = _inc++;
//    this.next = next || null;
//};

//var head = new List(new List(new List(new List())));

//function nthToLast(head, k) {
//    if (head == null) {
//        return 0;
//    }
//    var i = nthToLast(head.next, k) + 1;
//    if (i == k) {
//        console.log(head.data);
//    }
//    return i;
//}

//nthToLast(head, 2);

const SIZE = 8;
const OUTPUT_SIZE = SIZE / 2;

function createMockData() {
    let res = new Uint8Array(SIZE * SIZE * 4);
    for (let i = 0, len = res.length; i < len; i += 4) {
        let c = Math.round(i / 4);
        res[i] = c;
        res[i + 1] = c;
        res[i + 2] = c;
        res[i + 3] = 255;
    }
    return res;
}

function createTiles(rgbaData, x, y, z) {

    let destSize = OUTPUT_SIZE;
    let destSizeOne = destSize + 1;
    let elevationsSize = destSizeOne * destSizeOne;
    let sourceSize = Math.sqrt(rgbaData.length / 4);
    let d = sourceSize / destSize;

    const resTiles = new Array(d);
    for (let i = 0; i < resTiles.length; i++) {
        resTiles[i] = [];
        for (let j = 0; j < resTiles.length; j++) {
            resTiles[i][j] = new Float32Array(elevationsSize);
        }
    }

    let sourceDataLength = rgbaData.length / 4;

    for (let k = 0; k < sourceDataLength; k++) {

        let height = rgbaData[k * 4];

        let i = Math.floor(k / sourceSize);
        let j = k % sourceSize;

        let tileX = Math.floor(j / destSize);
        let tileY = Math.floor(i / destSize);

        let destArr = resTiles[tileY][tileX];

        let ii = i % destSize;
        let jj = j % destSize;

        let destIndex = (ii + tileY) * destSizeOne + jj + tileX;
        destArr[destIndex] = height;

        if ((j + 1) % destSize === 0 && j !== (sourceSize - 1)) {

            //current tile
            let rightHeigh = rgbaData[(k + 1) * 4];
            let middleHeight = (height + rightHeigh) * 0.5;
            destIndex = (ii + tileY) * destSizeOne + jj + 1;
            destArr[destIndex] = middleHeight;

            //next right tile
            let jjj = (jj + 1) % destSize;
            let rightindex = (ii + tileY) * destSizeOne + jjj;
            resTiles[tileY][tileX + 1][rightindex] = middleHeight;
        }

        if ((i + 1) % destSize === 0 && i !== (sourceSize - 1)) {

            //current tile
            let bottomHeigh = rgbaData[(k + sourceSize) * 4];
            let middleHeight = (height + bottomHeigh) * 0.5;
            destIndex = (ii + 1) * destSizeOne + jj + tileX;
            destArr[destIndex] = middleHeight;

            //next bottom tile
            let iii = (ii + 1) % destSize;
            let bottomindex = iii * destSizeOne + jj + tileX;
            resTiles[tileY + 1][tileX][bottomindex] = middleHeight;
        }

        if ((j + 1) % destSize === 0 && j !== (sourceSize - 1) &&
            (i + 1) % destSize === 0 && i !== (sourceSize - 1)) {

            //current tile
            let rightHeigh = rgbaData[(k + 1) * 4];
            let bottomHeigh = rgbaData[(k + sourceSize) * 4];
            let rightBottomHeight = rgbaData[(k + sourceSize + 1) * 4];
            let middleHeight = (height + rightHeigh + bottomHeigh + rightBottomHeight) * 0.25;
            destIndex = (ii + 1) * destSizeOne + (jj + 1);
            destArr[destIndex] = middleHeight;

            //next right tile            
            let rightindex = (ii + 1) * destSizeOne;
            resTiles[tileY][tileX + 1][rightindex] = middleHeight;

            //next bottom tile
            let bottomindex = destSize;
            resTiles[tileY + 1][tileX][bottomindex] = middleHeight;

            //next right bottom tile
            let rightBottomindex = 0;
            resTiles[tileY + 1][tileX + 1][rightBottomindex] = middleHeight;
        }
    }

    return resTiles;
}

window.createTiles = createTiles;

createTiles(createMockData(), 1, 1, 1);