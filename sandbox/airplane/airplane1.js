"use strict";

import { Entity } from "../../src/og/entity/Entity.js";
import { EntityCollection } from "../../src/og/entity/EntityCollection.js";
import { Globe } from "../../src/og/Globe.js";
import { XYZ } from "../../src/og/layer/XYZ.js";
import { GlobusTerrain } from "../../src/og/terrain/GlobusTerrain.js";
import { LonLat } from "../../src/og/LonLat.js";

function rnd(min, max) {
    return Math.random() * (max - min) + min;
}

let globus = new Globe({
    target: "globus",
    name: "Earth",
    layers: [
        new XYZ("OpenStreetMap", {
            isBaseLayer: true,
            url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            visibility: true,
            attribution: "Data @ OpenStreetMap contributors, ODbL"
        })
    ],
    terrain: new GlobusTerrain()
});
let entities = [],
    colors = ["red", "orange", "yellow", "green", "lightblue", "darkblue", "purple"];

for (let i = 0; i < 10000; i++) {
    entities.push(
        new Entity({
            name: "sat-" + i,
            lonlat: [rnd(-180, 180), rnd(-90, 90), rnd(10000, 200000)],
            geoObject: {
                scale: 100000,
                vertices: [-1.0, 0.0, 0.5, 0.0, 0.0, -0.5, 1.0, 0.0, 0.5],
                indices: [0, 1, 2, 0, 2, 1],
                color: colors[i % 7]
            }
        })
    );
}

let geoObjects = new EntityCollection({
    entities,
    scaleByDistance: [6000000, 24000000, 10000000000]
});

globus.planet.events.on("draw", () => {
    for (let i = 0; i < geoObjects._entities.length; i++) {
        let e = geoObjects._entities[i],
            c = e.getLonLat();
        // e.setLonLat(new LonLat(c.lon + 0.1, c.lat > 89 ? -90 : c.lat + 0.1, c.height));
        e.geoObject.setYaw(e.geoObject._yaw + 1);
        e.geoObject.setPitch(e.geoObject._pitch + 1);
        e.geoObject.setRoll(e.geoObject._roll + 1);
    }
});
geoObjects.addTo(globus.planet);
window.globus = globus;
