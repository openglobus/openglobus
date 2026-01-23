import {
    Globe,
    LonLat,
    OpenStreetMap,
    scene,
    control,
    GlobusRgbTerrain
} from "../../lib/og.es.js";


const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    layers: [new OpenStreetMap()],
})