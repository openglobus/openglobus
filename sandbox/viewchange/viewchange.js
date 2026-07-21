import { GlobusRgbTerrain, Globe, LonLat, OpenStreetMap } from "../../lib/og.es.js";

const globe = new Globe({
    target: "earth",
    name: "Viewchange Event",
    terrain: new GlobusRgbTerrain(),
    layers: [new OpenStreetMap()],
    atmosphereEnabled: true,
    fontsSrc: "../../res/fonts"
});

let viewchangeCounter = 0;

globe.planet.camera.events.on("viewchange", (camera) => {
    console.log("viewchange event fired", {
        count: ++viewchangeCounter
    });
});

globe.planet.camera.flyLonLat(new LonLat(7.4474, 46.948, 2000000), {
    duration: 3000,
    completeCallback: () => {
        console.log("flight completed", {
            viewchangeCount: viewchangeCounter
        });
    }
});


//globe.planet.camera.setLonLat(new LonLat(7.4474, 46.948, 2000000));
