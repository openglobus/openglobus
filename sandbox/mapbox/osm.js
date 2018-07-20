'use strict';

let osm = new og.layer.XYZ("OSM", {
    'specular': [0.0003, 0.00012, 0.00001],
    'shininess': 20,
    'diffuse': [0.89, 0.9, 0.83],
    'isBaseLayer': true,
    'url': "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    'visibility': true,
    'attribution': 'Data @ OpenStreetMap contributors, ODbL'
});


window.globe = new og.Globe({
    'name': "Earth",
    'target': "earth",
    'terrain': new og.terrain.MapboxTerrain(),
    'layers': [osm]
});

globe.planet.addControl(new og.control.DebugInfo());
