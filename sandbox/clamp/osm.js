import {
    Globe,
    Vector,
    GlobusRgbTerrain,
    OpenStreetMap,
    Bing,
    Object3d,
    Vec3,
    Entity,
    control,
    LonLat,
    Gltf
} from "../../lib/og.es.js";

let objLayer = new Vector("Obj.Layer", {
    scaleByDistance: [50, 50000, 1]
});

let globe = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    transitionOpacityEnabled: true,
    atmosphereEnabled: true,
    layers: [new OpenStreetMap()],
    transparentBackground: true,
    atmosphereParameters:{
        disableSunDisk: true
    }
});

globe.planet.addControls([
    new control.TimelineControl(),
    new control.LayerSwitcher(),
    new control.Lighting()
]);