'use strict';

import { Entity } from '../../src/og/entity/Entity.js';
import { Globe } from '../../src/og/Globe.js';
import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';
import { LonLat } from '../../src/og/LonLat.js';
import { Vector } from '../../src/og/layer/Vector.js';
import { XYZ } from '../../src/og/layer/XYZ.js';

function createGrid(center) {
    let grid = [];

    let size = 0.26;
    let cell = 0.005;

    let vert = [];
    for (let i = 0; i < size; i += cell) {
        let par = [],
            mer = [];
        for (let j = 0; j < size; j += cell) {
            par.push(new LonLat(center.lon + j - size / 2, center.lat + i - size / 2));
            mer.push(new LonLat(center.lon + i - size / 2, center.lat + j - size / 2));
        }
        grid.push(par);
        grid.push(mer);
    }
    return grid;
};

let center = new LonLat(8.19, 46.73);

const polylineEntity = new Entity({
    'polyline': {
        'pathLonLat': createGrid(center),
        'thickness': 3,
        'color': "rgba(68, 157, 205, 0.92)",
        'isClosed': false
    }
});

const pointLayer = new Vector("points", {
    'clampToGround': true,
    'entities': [
        polylineEntity
    ],
    'async': false
});

const osm = new XYZ("OpenStreetMap", {
    specular: [0.0003, 0.00012, 0.00001],
    shininess: 20,
    diffuse: [0.89, 0.9, 0.83],
    isBaseLayer: true,
    url: "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
    attribution: 'Data @ OpenStreetMap contributors, ODbL'
});

const globe = new Globe({
    "target": "earth",
    "name": "Earth",
    "terrain": new GlobusTerrain(),
    "layers": [osm, pointLayer]
});

let pickingObject = null;
let startPos, endPos;

pointLayer.events.on("mouseenter", function (e) {
    e.renderer.handler.canvas.style.cursor = "pointer";
});

pointLayer.events.on("mouseleave", function (e) {
    e.renderer.handler.canvas.style.cursor = "default";
});

pointLayer.events.on("ldown", function (e) {
    this.planet.renderer.controls.mouseNavigation.deactivate();
    startPos = this.planet.getLonLatFromPixelTerrain(e);
    pickingObject = e.pickingObject;
});

pointLayer.events.on("lup", function (e) {
    e.renderer.controls.mouseNavigation.activate();
    center.lon += endPos.lon - startPos.lon;
    center.lat += endPos.lat - startPos.lat;
    pickingObject = null;
});

globe.planet.renderer.events.on("mousemove", function (e) {
    if (pickingObject) {
        endPos = this.getLonLatFromPixelTerrain(e);
        if (endPos) {
            let dlon = endPos.lon - startPos.lon,
                dlat = endPos.lat - startPos.lat;
            let grid = createGrid(new LonLat(center.lon + dlon, center.lat + dlat));
            polylineEntity.polyline.setPathLonLat(grid, true);
        }
    }
}, globe.planet);

globe.planet.viewExtentArr([8.08, 46.72, 8.31, 46.75]);
