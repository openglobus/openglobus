"use strict";

import { Entity } from "../../src/og/entity/Entity.js";
import { EntityCollection } from "../../src/og/entity/EntityCollection.js";
import { Globe } from "../../src/og/Globe.js";
import { XYZ } from "../../src/og/layer/XYZ.js";
import { GlobusTerrain } from "../../src/og/terrain/GlobusTerrain.js";
import * as utils from "../../src/og/utils/shared.js";
import { MAX32 } from "../../src/og/math.js";
import { KeyboardNavigation } from "../../src/og/control/KeyboardNavigation.js";
import { ToggleWireframe } from "../../src/og/control/ToggleWireframe.js";
import { RulerSwitcher } from "../../src/og/control/RulerSwitcher.js";
import { DebugInfo } from "../../src/og/control/DebugInfo.js";
import { Object3d } from "../../src/og/Object3d.js";


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

let colors = ["red", "orange", "yellow", "green", "lightblue", "darkblue", "purple"];

let geoObjects = new EntityCollection({
    entities: [],
    //scaleByDistance: [1.0, 1.0, MAX32]
    //scaleByDistance: [1.0, 4000000, 0.01]
    scaleByDistance: [100, 4000000, 1.0]
});


globus.planet.addControl(new ToggleWireframe());
globus.planet.addControl(new KeyboardNavigation());
globus.planet.addControl(new RulerSwitcher());
let di = new DebugInfo();
globus.planet.addControl(di);
di.addWatch({
    label: "distance",
    frame: () => {
        if (geoObjects.getEntities()[0]) {
            return globus.planet.camera.eye.distance(geoObjects.getEntities()[0].getCartesian())
        }
        return 0.0;
    }
});

fetch(`./cube.json`)
    .then((response) => response.json())
    .then((data) => {
        const entities = [];
        const { vertices, indices, normals } = data;

        let obj3d = new Object3d({
            vertices: vertices,
            indexes: indices,
            normals: normals
        });

        for (let i = 0; i < 10; i++) {
            let entity = new Entity({
                lonlat: [0, i, 20],
                name: "obj-" + i,
                geoObject: {
                    scale: 1.0,
                    instanced: true,
                    tag: "cube",
                    color: colors[i % 7],
                    object3d: obj3d
                }
            });

            entities.push(entity);
        }

        geoObjects.addEntities(entities);
    });

geoObjects.events.on("lclick", function (e) {
    //e.pickingObject.geoObject.remove();
});

geoObjects.events.on("mouseenter", function (e) {
    let en = e.pickingObject, b = en.geoObject;
    //b.setColor(1, 1, 1);
});
geoObjects.events.on("mouseleave", function (e) {
    let en = e.pickingObject,
        b = en.geoObject;
    //b.setColor4v(utils.htmlColorToRgba(en.properties.color));
});

geoObjects.addTo(globus.planet);

window.globus = globus;