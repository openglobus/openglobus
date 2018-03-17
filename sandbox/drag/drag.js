'use strict';

import { Globe } from '../../src/og/Globe.js';
import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';
import { XYZ } from '../../src/og/layer/XYZ.js';
import { WMS } from '../../src/og/layer/WMS.js';
import { Vector } from '../../src/og/layer/Vector.js';
import { GeoImage } from '../../src/og/layer/GeoImage.js';
import { LayerSwitcher } from '../../src/og/control/LayerSwitcher.js';
import { GeoImageDragControl } from '../../src/og/control/GeoImageDragControl.js';
import { Vec2 } from '../../src/og/math/Vec2.js';

const pointLayer = new Vector("points", {
    'clampToGround': true,
    'entities': [{
        'name': 'Blue Marker',
        'lonlat': [8.19, 46.73],
        'billboard': {
            'src': 'marker.png',
            'size': [29, 48],
            'offset': [0, 24]
        }
    }, {
        'name': 'label',
        'lonlat': [8.25, 46.74],
        'label': {
            'text': 'Touch me',
            'size': [35],
            'outlineColor': "rgba(0,0,0,.5)"
        }
    }],
    'async': false
});

let pickingObject = null;
let startClick = new Vec2(),
    startPos;

pointLayer.events.on("mouseenter", function (e) {
    e.renderer.handler.canvas.style.cursor = "pointer";
});

pointLayer.events.on("mouseleave", function (e) {
    e.renderer.handler.canvas.style.cursor = "default";
});

pointLayer.events.on("ldown", function (e) {
    e.renderer.controls.mouseNavigation.deactivate();
    startClick.set(e.x, e.y);
    pickingObject = e.pickingObject;
    startPos = e.pickingObject.layer.planet.getPixelFromCartesian(pickingObject.getCartesian());
});

pointLayer.events.on("lup", function (e) {
    e.renderer.controls.mouseNavigation.activate();
    pickingObject = null;
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

const colorado = new GeoImage("Colorado Lagoon from ISS", {
    src: "colorado-lagoon.jpg",
    corners: [[-67.53063210679933, -22.148203215209232], [-67.76790919786042, -22.472194951833597], [-67.98127275782282, -22.331289122713546], [-67.74288424259892, -21.991520350954644]],
    visibility: false,
    isBaseLayer: false,
    attribution: '<a href="https://vk.com/olegmks">Oleg Artemjev</a>',
    opacity: 1
});

const globe = new Globe({
    "target": "earth",
    "name": "Earth",
    "terrain": new GlobusTerrain(),
    "layers": [osm, pointLayer, colorado]
});

globe.planet.renderer.events.on("mousemove", function (e) {
    if (pickingObject) {
        var d = new Vec2(e.x, e.y).sub(startClick);
        var endPos = startPos.add(d);
        var coords = this.getCartesianFromPixelTerrain(endPos);
        if (coords) {
            pickingObject.setCartesian3v(coords);
        }
    }
}, globe.planet);

globe.planet.addControls([new LayerSwitcher(), new GeoImageDragControl()]);
globe.planet.viewExtentArr([8.08, 46.72, 8.31, 46.75]);

