'use strict';

import { Globe } from '../../src/og/Globe.js';
import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';
import { XYZ } from '../../src/og/layer/XYZ.js';
import { Vector } from '../../src/og/layer/Vector.js';
import { Entity } from '../../src/og/entity/Entity.js';

let osm = new XYZ("OSM", {
    'isBaseLayer': true,
    'url': "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    'visibility': true,
    'attribution': 'Data @ OpenStreetMap contributors, ODbL'
});

let townMarkers = new Vector("towns", {
    'nodeCapacity': 100000
});

let towns = new Vector("towns", {
    'nodeCapacity': 50,
    'scaleByDistance': [0, 350000, 25000000],
    'minZoom': 8
});

towns.events.on("mouseenter", function (e) {
    e.renderer.handler.canvas.style.cursor = "pointer";
});

towns.events.on("mouseleave", function (e) {
    e.renderer.handler.canvas.style.cursor = "default";
});

window.globe = new Globe({
    'name': "Earth",
    'target': "earth",
    'terrain': new GlobusTerrain(),
    'layers': [osm, towns]
});

//globe.planet.events.on("draw", function () {
//    towns.setScaleByDistance(globe.planet.camera.getHeight(), globe.planet.camera.getHeight() * 2);
//});


fetch("DE.json.txt", {
    credentials: 'include',
    method: 'GET'
})
    .then(function (resp) {
        return resp.json();
    })
    .then(function (resp) {
        var entities = [];
        for (let i = 0; i < resp.length; i++) {
            let ri = resp[i];
            entities.push(new Entity({
                'lonlat': [parseFloat(ri.lon), parseFloat(ri.lat)],
                'label': {
                    'text': ri.name,
                    'size': [26],
                    'outline': 0,
                    'face': "Lucida Console",
                    'weight': "bold",
                    'color': "#5b3fff",
                    'align': "center"
                },
                'properties': {
                    'name': ri.name
                }
            }));
        }
        towns.setEntities(entities);
    });