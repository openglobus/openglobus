"use strict";

import { Globe } from "../../src/og/Globe.js";
import { GlobusTerrain } from "../../src/og/terrain/GlobusTerrain.js";
import { XYZ } from "../../src/og/layer/XYZ.js";
import { Lighting } from "../../src/og/control/Lighting.js";

var osm = new XYZ("OpenStreetMap", {
    isBaseLayer: true,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
    attribution: "Data @ OpenStreetMap contributors, ODbL"
});

var globe = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusTerrain(),
    layers: [osm]
});

globe.planet.addControl(new Lighting());

window.globe = globe;
