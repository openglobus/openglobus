'use strict';

import { Globe } from '../../src/og/Globe.js';
import { BilTerrain } from '../../src/og/terrain/BilTerrain.js';
import { XYZ } from '../../src/og/layer/XYZ.js';
import { CanvasTiles } from '../../src/og/layer/CanvasTiles.js';
import { DebugInfo } from '../../src/og/control/DebugInfo.js';
import { ToggleWireframe } from '../../src/og/control/ToggleWireframe.js';
import { LayerSwitcher } from '../../src/og/control/LayerSwitcher.js';

let cnv = document.createElement("canvas");
let ctx = cnv.getContext("2d");
cnv.width = 256;
cnv.height = 256;

const tg = new CanvasTiles("Tile grid", {
    visibility: true,
    isBaseLayer: false,
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
    terrain: new BilTerrain({
        url: "//95.211.82.211:8080/geoserver/og/",
        layers: "og:n44_e009_1arc_v3",
        imageSize: 128,
        extent: [[8.9, 44.0], [10.0, 45]]
    }),
    layers: [osm, tg]
});

//globe.planet.viewExtentArr([129.548, 30.130, 131.476, 30.6269])

window.globe.planet.addControl(new DebugInfo());
window.globe.planet.addControl(new ToggleWireframe({
    isActive: false
}));
window.globe.planet.addControl(new LayerSwitcher());