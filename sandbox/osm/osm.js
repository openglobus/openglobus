import {
    Globe,
    control,
    Vector,
    LonLat,
    Entity,
    OpenStreetMap,
    RgbTerrain,
    Object3d,
    mercator
} from "../../lib/@openglobus/og.esm.js";

let osm = new OpenStreetMap();

let dockLayer = new Vector("dock", {
    scaleByDistance: [1, 1, 1]
});

dockLayer.add(new Entity({
    lonlat: [0, 0, 10000],
    geoObject: {
        color: "red",
        scale: 1.0,
        instanced: true,
        tag: `dock`,
        object3d: Object3d.createCube(10000, 10000, 10000),
        yaw: -52,
        pitch: 0
    }
}));

const globus = new Globe({
    //frustums: [[1,101100],[100000,1000000000]],
    target: "earth",
    name: "Earth",
    terrain: new RgbTerrain("",{
        maxNativeZoom: 13,
        maxZoom: 13,
        url: "https://{s}.terrain.openglobus.org/arctic/{z}/{x}/{y}.png",
    }),
    layers: [osm, dockLayer],
    atmosphereEnabled: false,
    fontsSrc: "../../res/fonts",
    sun: {
        stopped: false
    }
});

globus.planet.addControl(new control.DebugInfo());
globus.planet.addControl(new control.KeyboardNavigation());
globus.planet.addControl(new control.ToggleWireframe());
globus.planet.addControl(new control.LayerSwitcher());