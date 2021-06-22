'use strict';

import { Entity } from '../../src/og/entity/Entity.js';
import { EntityCollection } from '../../src/og/entity/EntityCollection.js';
import { Globe } from '../../src/og/Globe.js';
import { XYZ } from "../../src/og/layer/XYZ.js";
import { GlobusTerrain } from "../../src/og/terrain/GlobusTerrain.js";

let go = new Entity({
    name: 'geoObject',
    lonlat: [0, 0, 200],
    geoObject: {
        color: [1, 1, 0, 1]
    }
});
let geoObjects = new EntityCollection({
    'entities': [
        go
    ],
    'scaleByDistance': [6000000, 24000000, 10000000000]
});

let globus = new Globe({
    "target": "globus",
    "name": "Earth",
    layers: [
        new XYZ("OpenStreetMap", {
            isBaseLayer: true,
            url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            visibility: true,
            attribution: 'Data @ OpenStreetMap contributors, ODbL'
        })
    ],
    terrain: new GlobusTerrain()
});

geoObjects.addTo(globus.planet);
window.globus = globus;
window.go = go;