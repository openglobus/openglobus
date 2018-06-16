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

let townMarkers = new Vector("town markers", {
    'nodeCapacity': 100000,
    'maxZoom': 9,
    'scaleByDistance': [0, 1500000, 25000000],
    'fading': true
});

let townLabels = new Vector("town labels", {
    'nodeCapacity': 50,
    'scaleByDistance': [0, 350000, 25000000],
    'minZoom': 10,
    'fading': true
});

townLabels.events.on("mouseenter", function (e) {
    e.renderer.handler.canvas.style.cursor = "pointer";
});

townLabels.events.on("mouseleave", function (e) {
    e.renderer.handler.canvas.style.cursor = "default";
});

townMarkers.events.on("mouseenter", function (e) {
    e.renderer.handler.canvas.style.cursor = "pointer";
});

townMarkers.events.on("mouseleave", function (e) {
    e.renderer.handler.canvas.style.cursor = "default";
});

window.globe = new Globe({
    'name': "Earth",
    'target': "earth",
    'terrain': new GlobusTerrain(),
    'layers': [osm, townLabels, townMarkers],
    "sun": {
        "active": false
    }
});

//Set low quality
globe.planet.RATIO_LOD = 0.75;

//View at Germany
globe.planet.viewExtentArr([-0.895, 47.51, 21.84, 51.65]);

//Create font
globe.planet.fontAtlas.createFont("Lucida Console", "normal", "bold");

//globe.planet.events.on("draw", function () {
//    towns.setScaleByDistance(globe.planet.camera.getHeight(), globe.planet.camera.getHeight() * 2);
//});

//Load points
fetch("DE.json.txt", {
    credentials: 'include',
    method: 'GET'
})
    .then(function (resp) {
        return resp.json();
    })
    .then(function (resp) {
        let labels = [],
            markers = [];
        for (let i = 0; i < resp.length; i++) {
            let ri = resp[i];
            markers.push(new Entity({
                'lonlat': [parseFloat(ri.lon), parseFloat(ri.lat)],
                'billboard': {
                    'src': "./marker.png",
                    'width': 12,
                    'height': 12,
                    'offset': [0, 6]
                },
                'properties': {
                    'name': ri.name
                }
            }));

            labels.push(new Entity({
                'lonlat': [parseFloat(ri.lon), parseFloat(ri.lat)],
                'label': {
                    'text': ri.name,
                    'size': 26,
                    'outline': 0,
                    'face': "Lucida Console",
                    'weight': "bold",
                    'color': "black",
                    'align': "center"
                },
                'properties': {
                    'name': ri.name
                }
            }));
        }
        townLabels.setEntities(labels);
        townMarkers.setEntities(markers);
    });


$("#colorpicker").colpick({
    colorScheme: 'dark',
    layout: 'rgbhex',
    color: "black",
    flat: true,
    onChange: function (hsb, hex, rgb, el) {
        townLabels.each(function (e) {
            e.label.setColor(rgb.r / 255, rgb.g / 255, rgb.b / 255);
        });
    },
    onSubmit: function (hsb, hex, rgb, el) {
        //ndviFeature.setColor('#' + hex);
        //$(el).colpickHide();
    }
});