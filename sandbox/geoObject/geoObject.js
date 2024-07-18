import {
    Globe,
    control,
    utils,
    LonLat,
    GlobusTerrain,
    Vector,
    OpenStreetMap,
    Entity,
    Bing,
    GlobusRgbTerrain, Object3d
} from "../../lib/@openglobus/og.esm.js";


async function main() {
    let sat = new Bing();
    let osm = new OpenStreetMap();

    const planeObj3d = await Object3d.loadObj('./airplane.obj');

    let myObjects = new Vector("MyObjects", {
        scaleByDistance: [200, 60000, 1]
    });

    new Entity({
        lonlat: [0, 0, 100000],
        geoObject: {
            scale: 0.2,
            instanced: true,
            tag: "plane",
            object3d: planeObj3d,
            yaw: 0,
            pitch: 0
        }
    })

    const globus = new Globe({
        target: "earth",
        name: "Earth",
        terrain: new GlobusRgbTerrain(),
        layers: [osm, sat, myObjects],
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
}

main()