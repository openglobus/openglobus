"use strict";

import { Entity } from "../../src/og/entity/Entity.js";
import { Globe } from "../../src/og/Globe.js";
import { XYZ } from "../../src/og/layer/XYZ.js";
import { GlobusTerrain } from "../../src/og/terrain/GlobusTerrain.js";
import { EmptyTerrain } from "../../src/og/terrain/EmptyTerrain.js";
import { LonLat } from '../../src/og/LonLat.js';
import { Object3d } from '../../src/og/Object3d.js';
import { Vector } from '../../src/og/layer/Vector.js';
import { LayerSwitcher } from '../../src/og/control/LayerSwitcher.js';

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
    terrain: new EmptyTerrain()
});

globus.planet.addControl(new LayerSwitcher());

let obj3d = Object3d.createArrow();

let planes = [
    new Entity({
        lonlat: new LonLat(0, 0, 10000),
        geoObject: {
            scale: 10000,
            instanced: false,
            tag: "plane",
            color: "rgb(0,305,0)",
            vertices: obj3d.vertices,
            indices: obj3d.indexes,
            normals: obj3d.normals
        },
        properties: {
            name: "plane-1"
        }
    }),
    new Entity({
        lonlat: new LonLat(10, 10, 15000),
        geoObject: {
            scale: 10000,
            instanced: false,
            tag: "plane2",
            color: "rgb(255,0,0)",
            vertices: obj3d.vertices,
            indices: obj3d.indexes,
            normals: obj3d.normals
        },
        properties: {
            name: "plane-2"
        }
    })
];

let planeLayer = new Vector("my planes", {
    entities: planes
});

globus.planet.addLayer(planeLayer);

planes[0].geoObject.setYaw(45)
planes[0].geoObject.setRoll(75)

window.LonLat = LonLat;
window.planes = planes;



