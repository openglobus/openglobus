'use strict';

import { Entity } from '../../src/og/entity/Entity.js';
import { EntityCollection } from '../../src/og/entity/EntityCollection.js';
import { Globe } from '../../src/og/Globe.js';
import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';
import { LonLat } from '../../src/og/LonLat.js';
import { Vec3 } from '../../src/og/math/Vec3.js';
import { XYZ } from '../../src/og/layer/XYZ.js';
import { Ellipsoid } from '../../src/og/ellipsoid/Ellipsoid.js';

function rnd(min, max) {
    return Math.random() * (max - min) + min;
}

let entities = [],
    colors = ['red', 'orange', 'yellow', 'green', 'lightblue', 'darkblue', 'purple']

for (let i = 0; i < 5000; i++) {
    entities.push(new Entity({
        'name': 'sat-' + i,
        'lonlat': [rnd(-180, 180), rnd(-90, 90), rnd(100000, 5000000)],
        'billboard': {
            'src': './carrot.png',
            'size': [24, 24],
            'color': colors[i % 7],
            'rotation': rnd(0, 360)
        },
        'properties': {
            'bearing': rnd(0, 360),
            'color': colors[i % 7]
        }
    }));
}

let carrots = new EntityCollection({
    'entities': entities,
    'scaleByDistance': [6000000, 24000000, 10000000000]
});

carrots.events.on("mouseenter", function (e) {
    let b = e.pickingObject.billboard;
    b.setColor(1, 1, 1);
});

carrots.events.on("mouseleave", function (e) {
    let b = e.pickingObject.billboard;
    b.setColorHTML(e.pickingObject.properties.color);
});

carrots.events.on("lclick", function (e) {
    e.pickingObject.billboard.remove();
});

let sat = new XYZ("MapQuest Satellite", {
    shininess: 20,
    specular: new Vec3(0.00048, 0.00037, 0.00035),
    diffuse: new Vec3(0.88, 0.85, 0.8),
    ambient: new Vec3(0.15, 0.1, 0.23),
    isBaseLayer: true,
    url: "//tileproxy.cloud.mapquest.com/tiles/1.0.0/sat/{z}/{x}/{y}.png",
    visibility: true,
    attribution: '@2014 MapQuest - Portions @2014 "Map data @ <a target="_blank" href="//www.openstreetmap.org/">OpenStreetMap</a> and contributors, <a target="_blank" href="//opendatacommons.org/licenses/odbl/"> CC-BY-SA</a>"'
});


let globus = new Globe({
    "target": "globus",
    "name": "Earth",
    "terrain": new GlobusTerrain(),
    "layers": [sat]
});

globus.planet.events.on("draw", () => {
    carrots.each(function (e) {
        let c = e.getLonLat();
        let ll = globus.planet.ellipsoid.getBearingDestination(c, e.properties.bearing, 2000);
        e.properties.bearing = globus.planet.ellipsoid.inverse(c, ll).finalAzimuth;
        e.setLonLat(new LonLat(ll.lon, ll.lat, c.height));
        e.billboard.setRotation(e.billboard.getRotation() + 0.01);
    });
});

carrots.addTo(globus.planet);

globus.planet.flyLonLat(new LonLat(54.5, 43.5, 20108312));