import {
    Globe,
    control,
    Vector,
    LonLat,
    Entity,
    OpenStreetMap,
    EmptyTerrain,
    RgbTerrain,
    GlobusRgbTerrain,
    Object3d,
    mercator,
    Bing,
    GeoVideo,
    XYZ,
    utils
} from "../../lib/@openglobus/og.esm.js";

const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain("mt", {
        maxZoom: 17,
        imageSize: 256
    }),
    layers: [new OpenStreetMap(), new Bing()],
    atmosphereEnabled: false,
    fontsSrc: "../../res/fonts",
    sun: {
        stopped: false
    },
});

globus.planet.addControl(new control.TimelineControl());
globus.planet.addControl(new control.CompassButton());
globus.planet.addControl(new control.DebugInfo());
globus.planet.addControl(new control.LayerSwitcher());