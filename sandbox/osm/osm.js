'use strict';

import { Globe } from '../../src/og/Globe.js';
import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';
import { XYZ } from '../../src/og/layer/XYZ.js';
import { CanvasTiles } from '../../src/og/layer/CanvasTiles.js';
import { DebugInfo } from '../../src/og/control/DebugInfo.js';

let osm = new XYZ("OSM", {
    'specular': [0.0003, 0.00012, 0.00001],
    'shininess': 20,
    'diffuse': [0.89, 0.9, 0.83],
    'isBaseLayer': true,
    'url': "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    'visibility': true,
    'attribution': 'Data @ OpenStreetMap contributors, ODbL'
});

window.globe = new Globe({
    'name': "Earth",
    'target': "earth",
    'terrain': new GlobusTerrain(),
    'layers': [osm]
});


globe.planet.addControl(new DebugInfo());
 
