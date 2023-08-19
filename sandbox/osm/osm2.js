import {
    math,
    Globe,
    Entity,
    GlobusTerrain,
    XYZ,
    LonLat,
    Vector,
    Vec2,
    Vec3,
    Quat,
    control
} from "../../dist/@openglobus/og.esm.js";

var osm = new XYZ("OpenStreetMap", {
    specular: [0.0003, 0.00012, 0.00001],
    shininess: 20,
    diffuse: [0.89, 0.9, 0.83],
    isBaseLayer: true,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
    attribution: 'Data @ OpenStreetMap contributors, ODbL'
});

var globus = new Globe({
    "target": "earth",
    "name": "Earth",
    "terrain": new GlobusTerrain(),
    "layers": [osm]
});

globus.planet.addControl(new control.Lighting());
globus.planet.addControl(new control.RulerSwitcher());
