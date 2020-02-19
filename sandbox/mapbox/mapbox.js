'use strict';

import { Globe } from '../../src/og/Globe.js';
// import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';
import { MapboxTerrain } from '../../src/og/terrain/MapboxTerrain.js';
import { XYZ } from '../../src/og/layer/XYZ.js';
import { CanvasTiles } from '../../src/og/layer/CanvasTiles.js';
// import { Vector } from '../../src/og/layer/Vector.js';
// import { Entity } from '../../src/og/entity/Entity.js';
import { DebugInfo } from '../../src/og/control/DebugInfo.js';
import { ToggleWireframe } from '../../src/og/control/ToggleWireframe.js';
// import * as math from '../../src/og/math.js';
import { LayerSwitcher } from '../../src/og/control/LayerSwitcher.js';

let cnv = document.createElement("canvas");
let ctx = cnv.getContext("2d");
cnv.width = 256;
cnv.height = 256;

const tg = new CanvasTiles("Tile grid", {
    visibility: true,
    isBaseLayer: true,
    drawTile: function (material, applyCanvas) {
        // Clear canvas
        ctx.clearRect(0, 0, cnv.width, cnv.height);

        // Draw border
        ctx.beginPath();
        ctx.rect(0, 0, cnv.width, cnv.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'black';
        ctx.stroke();

        let size;

        // Draw text
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

        // Draw canvas tile
        applyCanvas(cnv);
    }
});

let osm = new XYZ("OSM", {
    specular: [0.0003, 0.00012, 0.00001],
    shininess: 20,
    diffuse: [0.89, 0.9, 0.83],
    isBaseLayer: true,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
    attribution: 'Data @ OpenStreetMap contributors, ODbL'
});

window.globe = new Globe({
    name: "Earth",
    target: "earth",
    terrain: new MapboxTerrain(),
    layers: [osm, tg]
});

window.globe.planet.addControl(new DebugInfo());
window.globe.planet.addControl(new ToggleWireframe({
    isActive: false
}));
window.globe.planet.addControl(new LayerSwitcher());