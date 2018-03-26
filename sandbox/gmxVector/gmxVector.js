'use strict';

import { Globe } from '../../src/og/Globe.js';
import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';
import { XYZ } from '../../src/og/layer/XYZ.js';
import { CanvasTiles } from '../../src/og/layer/CanvasTiles.js';
import { GmxVector } from '../../src/og/plugins/gmxVector/GmxVector.js';
import { LayerSwitcher } from '../../src/og/control/LayerSwitcher.js';

const l1 = new GmxVector("Regions Big", {
    'layerId': "3BCCB0F1ACFB4A56BAC87ECA31ADA199",
    'visibility': false
});

const l2 = new GmxVector("Regions Small", {
    'layerId': "035A32EDA95D4D2BBBF6E44AF3FA21DD",
    'visibility': false
});

const l3 = new GmxVector("House", {
    'layerId': "24FE35D1E6DA492D82001721E0D79C17",
    'visibility': false,
    'zIndex': 105
});

const ct = new GmxVector("LANDSAT-8", {
    'layerId': "47A9D4E5E5AE497A8A1A7EA49C7FC336",
    'visibility': false,
    'beginDate': new Date(2017, 6, 1),
    'endDate': new Date(2017, 6, 10)
});

const osm = new XYZ("OSM", {
    'specular': [0.0003, 0.00012, 0.00001],
    'shininess': 20,
    'diffuse': [0.89, 0.9, 0.83],
    'isBaseLayer': true,
    'url': "http://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
    'visibility': true,
    'attribution': 'Data @ OpenStreetMap contributors, ODbL'
});

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
        if (material.segment.tileZoom > 14) {
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

window.globe = new Globe({
    'name': "Earth",
    'target': "earth",
    'terrain': new GlobusTerrain(),
    'layers': [osm, tg, l1, l2, l3, ct],
    "sun": {
        "active": false
    }
});

globe.planet.addControl(new LayerSwitcher());