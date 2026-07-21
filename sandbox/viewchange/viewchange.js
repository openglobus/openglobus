import { EmptyTerrain, Globe, LonLat, OpenStreetMap } from "../../lib/og.es.js";

const globe = new Globe({
    target: "earth",
    name: "Viewchange Event",
    terrain: new EmptyTerrain(),
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

globe.planet.camera.flyLonLat(new LonLat(37.6173, 55.7558, 1000000), {
    duration: 3000,
    completeCallback: () => {
        console.log("flight completed", {
            viewchangeCount: viewchangeCounter
        });
    }
});
