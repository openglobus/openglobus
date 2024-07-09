import {
    Globe,
    RgbTerrain,
    XYZ,
    control,
    utils,
    LonLat,
    GlobusTerrain,
    OpenStreetMap,
    Bing,
    GlobusRgbTerrain
} from "../../lib/@openglobus/og.esm.js";


let sat = new Bing();
let osm = new OpenStreetMap();

const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    //terrain: new GlobusTerrain(),
    layers: [osm, sat],
    atmosphereEnabled: false,
    fontsSrc: "../../res/fonts",
    sun: {
        stopped: false
    }
});

globus.planet.addControl(new control.DebugInfo());
globus.planet.addControl(new control.KeyboardNavigation());
globus.planet.addControl(new control.TimelineControl());
globus.planet.addControl(new control.Lighting());
globus.planet.addControl(new control.ElevationProfileControl());
globus.planet.addControl(new control.ToggleWireframe());
globus.planet.addControl(new control.LayerSwitcher());
globus.planet.addControl(new control.AtmosphereConfig());