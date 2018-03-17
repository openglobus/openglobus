'use strict';

import { Globe } from '../../src/og/Globe.js';
import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';
import { XYZ } from '../../src/og/layer/XYZ.js';
import { WMS } from '../../src/og/layer/WMS.js';
import { Vector } from '../../src/og/layer/Vector.js';
import { GeoImage } from '../../src/og/layer/GeoImage.js';
import { LayerSwitcher } from '../../src/og/control/LayerSwitcher.js';

const osm = new XYZ("OSM", {
    'specular': [0.0003, 0.00012, 0.00001],
    'shininess': 20,
    'diffuse': [0.89, 0.9, 0.83],
    'isBaseLayer': true,
    'url': "http://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
    'visibility': true,
    'attribution': 'Data @ OpenStreetMap contributors, ODbL'
});

const sat1 = new XYZ("MapQuest Satellite", {
    shininess: 20,
    specular: [0.00048, 0.00037, 0.00035],
    diffuse: [0.88, 0.85, 0.8],
    ambient: [0.15, 0.1, 0.23],
    isBaseLayer: true,
    url: "https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWdldmxpY2giLCJhIjoiY2o0ZmVudncwMGZvbjJ3bGE0OGpsejBlZyJ9.RSRJLS0J_U9_lw1Ti1CmsQ",
    visibility: false,
    attribution: '@2014 MapQuest - Portions @2014 "Map data @ <a target="_blank" href="http://www.openstreetmap.org/">OpenStreetMap</a> and contributors, <a target="_blank" href="http://opendatacommons.org/licenses/odbl/"> CC-BY-SA</a>"'
});

const sat2 = new XYZ("MapQuest Satellite With Labels", {
    shininess: 20,
    specular: [0.00048, 0.00037, 0.00035],
    diffuse: [0.88, 0.85, 0.8],
    ambient: [0.15, 0.1, 0.23],
    isBaseLayer: true,
    url: "https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v10/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWdldmxpY2giLCJhIjoiY2o0ZmVudncwMGZvbjJ3bGE0OGpsejBlZyJ9.RSRJLS0J_U9_lw1Ti1CmsQ",
    visibility: false,
    attribution: '@2014 MapQuest - Portions @2014 "Map data @ <a target="_blank" href="http://www.openstreetmap.org/">OpenStreetMap</a> and contributors, <a target="_blank" href="http://opendatacommons.org/licenses/odbl/"> CC-BY-SA</a>"'
});

const dark = new XYZ("MapQuest Dark", {
    shininess: 20,
    specular: [0.00048, 0.00037, 0.00035],
    diffuse: [0.88, 0.85, 0.8],
    ambient: [0.15, 0.1, 0.23],
    isBaseLayer: true,
    url: "https://api.mapbox.com/styles/v1/mapbox/dark-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWdldmxpY2giLCJhIjoiY2o0ZmVudncwMGZvbjJ3bGE0OGpsejBlZyJ9.RSRJLS0J_U9_lw1Ti1CmsQ",
    visibility: false,
    attribution: '@2014 MapQuest - Portions @2014 "Map data @ <a target="_blank" href="http://www.openstreetmap.org/">OpenStreetMap</a> and contributors, <a target="_blank" href="http://opendatacommons.org/licenses/odbl/"> CC-BY-SA</a>"'
});

const light = new XYZ("MapQuest Light", {
    shininess: 20,
    specular: [0.00048, 0.00037, 0.00035],
    diffuse: [0.88, 0.85, 0.8],
    ambient: [0.15, 0.1, 0.23],
    isBaseLayer: true,
    url: "https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWdldmxpY2giLCJhIjoiY2o0ZmVudncwMGZvbjJ3bGE0OGpsejBlZyJ9.RSRJLS0J_U9_lw1Ti1CmsQ",
    visibility: false,
    attribution: '@2014 MapQuest - Portions @2014 "Map data @ <a target="_blank" href="http://www.openstreetmap.org/">OpenStreetMap</a> and contributors, <a target="_blank" href="http://opendatacommons.org/licenses/odbl/"> CC-BY-SA</a>"'
});

const states = new WMS("USA Population", {
    extent: [[-128, 24], [-66, 49]],
    visibility: false,
    isBaseLayer: false,
    url: "http://openglobus.org/geoserver/",
    layers: "topp:states",
    opacity: 0.4,
    attribution: 'Hi!',
    transparentColor: [1.0, 1.0, 1.0]
});

const piramids = new GeoImage("Piramids photo from ISS", {
    src: "piramids.jpg",
    corners: [[31.061754739258063, 30.03959006565637], [31.17648426417484, 30.057611504555695], [31.203304916614744, 29.9373839729686], [31.089023614432307, 29.92090997320629]],
    visibility: false,
    isBaseLayer: false,
    attribution: '<a href="https://vk.com/olegmks">Oleg Artemjev</a>',
    opacity: 1.0
});

const colorado = new GeoImage("Colorado Lagoon from ISS", {
    src: "colorado-lagoon.jpg",
    corners: [[-67.53063210679933, -22.148203215209232], [-67.76790919786042, -22.472194951833597], [-67.98127275782282, -22.331289122713546], [-67.74288424259892, -21.991520350954644]],
    visibility: false,
    isBaseLayer: false,
    attribution: '<a href="https://vk.com/olegmks">Oleg Artemjev</a>',
    opacity: 1
});

const vector = new Vector("Vector Green Area", {
    'visibility': false,
    'isBaseLayer': false,
    'diffuse': [0, 0, 0],
    'ambient': [1, 1, 1],
    'entities': [{
        'geometry': {
            'type': "Polygon",
            'coordinates': [[[10, 20], [10, 30], [30, 30], [30, 20]]],
            'style': {
                'lineWidth': 8,
                'fillColor': "rgba(0, 190, 0, 0.6)",
                'lineColor': "green"
            }
        }
    }, {
        'lonlat': [20, 25],
        'label': {
            'text': "Green Area",
            'outline': 0.5,
            'outlineColor': "rgba(0,0,0,0.55)",
            'size': 43,
            'color': "#00ff00",
            'face': "verdana",
            'align': "center"
        }
    }]
});

const globe = new Globe({
    "target": "earth",
    "name": "Earth",
    "terrain": new GlobusTerrain(),
    "layers": [osm, sat1, sat2, light, dark, states, piramids, colorado, vector]
});

globe.planet.addControl(new LayerSwitcher());

