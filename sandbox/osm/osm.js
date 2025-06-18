import {
    Globe,
    control,
    OpenStreetMap,
    GlobusRgbTerrain,
    Bing,
} from "../../lib/og.es.js";

const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    layers: [new OpenStreetMap(), new Bing()],
    atmosphereEnabled: false,
    fontsSrc: "../../res/fonts",
    sun: {
        stopped: false
    },
    //dpi: 0.8
});

globus.planet.addControl(new control.TimelineControl());
globus.planet.addControl(new control.LayerSwitcher());