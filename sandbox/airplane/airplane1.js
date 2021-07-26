"use strict";

import { Entity } from "../../src/og/entity/Entity.js";
import { EntityCollection } from "../../src/og/entity/EntityCollection.js";
import { Globe } from "../../src/og/Globe.js";
import { XYZ } from "../../src/og/layer/XYZ.js";
import { GlobusTerrain } from "../../src/og/terrain/GlobusTerrain.js";
import { LonLat } from '../../src/og/LonLat.js';

function rnd(min, max) {
    return Math.random() * (max - min) + min;
}

function getShapesData(i) {
    if (i % 2) {
        return {
            tag: "quad",
            vertices: [
                1.0, 0.0, 0.0,
                0.0, 0.0, -1.0,
                0.0, 0.0, 1.0,
                -1.0, 0.0, 0.0
            ],
            indices: [
                0, 1, 2,
                0, 2, 1,
                2, 1, 3,
                1, 2, 3
            ]
        };
    } else {
        return {
            tag: "triangle",
            vertices: [-1.0, 0.0, 0.5, 0.0, 0.0, -0.5, 1.0, 0.0, 0.5],
            indices: [
                0, 1, 2,
                0, 2, 1
            ]
        };
    }
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

for (let i = 0; i < 10; i++) {
    entities.push(
        new Entity({
            name: "sat-" + i,
            lonlat: [rnd(-5, 5), rnd(-5, 5), 20000],
            geoObject: {
                scale: 100000,
                instanced: true,
                color: colors[i % 7],
                ...getShapesData(i)
            }
        })
    );
}
//custom entity without instancing
entities.push(
    new Entity({
        name: "sat-" + 11,
        lonlat: [rnd(-5, 5), rnd(-5, 5), 30000],
        geoObject: {
            scale: 50000,
            color: 'salmon',
            vertices: [
                // Передняя грань
                -1.0, -1.0,  1.0,
                1.0, -1.0,  1.0,
                1.0,  1.0,  1.0,
                -1.0,  1.0,  1.0,

                // Задняя грань
                -1.0, -1.0, -1.0,
                -1.0,  1.0, -1.0,
                1.0,  1.0, -1.0,
                1.0, -1.0, -1.0,

                // Верхняя грань
                -1.0,  1.0, -1.0,
                -1.0,  1.0,  1.0,
                1.0,  1.0,  1.0,
                1.0,  1.0, -1.0,

                // Нижняя грань
                -1.0, -1.0, -1.0,
                1.0, -1.0, -1.0,
                1.0, -1.0,  1.0,
                -1.0, -1.0,  1.0,

                // Правая грань
                1.0, -1.0, -1.0,
                1.0,  1.0, -1.0,
                1.0,  1.0,  1.0,
                1.0, -1.0,  1.0,

                // Левая грань
                -1.0, -1.0, -1.0,
                -1.0, -1.0,  1.0,
                -1.0,  1.0,  1.0,
                -1.0,  1.0, -1.0
            ],
            indices: [
                0,  1,  2,      0,  2,  3,    // front
                4,  5,  6,      4,  6,  7,    // back
                8,  9,  10,     8,  10, 11,   // top
                12, 13, 14,     12, 14, 15,   // bottom
                16, 17, 18,     16, 18, 19,   // right
                20, 21, 22,     20, 22, 23
            ]
        }
    })
);

let geoObjects = new EntityCollection({
    entities,
    scaleByDistance: [6000000, 24000000, 10000000000]
});

// globus.planet.events.on("draw", () => {
// for (let i = 0; i < geoObjects._entities.length; i++) {
//     let e = geoObjects._entities[i],
//         c = e.getLonLat();
// e.setLonLat(new LonLat(c.lon + 0.1, c.lat > 89 ? -90 : c.lat + 0.1, c.height));
// e.geoObject.setYaw(e.geoObject._yaw + 1);
// e.geoObject.setPitch(e.geoObject._pitch + 1);
// e.geoObject.setRoll(e.geoObject._roll + 1);
// }
// });
geoObjects.addTo(globus.planet);
window.globus = globus;
globus.planet.flyLonLat(new LonLat(0, 0, 2000000));
