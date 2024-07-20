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


let myObjects = new Vector("MyObjects", {
    scaleByDistance: [200, 190000, 1]
});

async function main() {
    let sat = new Bing();
    let osm = new OpenStreetMap();

    const planeObj3d = await Object3d.loadObj('./airplane.obj');

    document.querySelector(".gpitch").addEventListener("change", (e) => {
        setPitch();
    });
    document.querySelector(".gyaw").addEventListener("change", (e) => {
        setYaw();
    });
    document.querySelector(".groll").addEventListener("change", (e) => {
        setRoll();
    });

    for (let i = -70; i < 70; i += 10) {
        for (let j = -180; j < 180; j += 10) {
            myObjects.add(new Entity({
                    lonlat: [j, i, 20000],
                    geoObject: {
                        color: "green",
                        scale: 10.0,
                        instanced: true,
                        tag: "plane",
                        object3d: planeObj3d[0],
                        yaw: 0,
                        pitch: 0
                    }
                })
            );
        }
    }

    const globus = new Globe({
        target: "earth",
        name: "Earth",
        terrain: new GlobusRgbTerrain(),
        layers: [osm, sat, myObjects],
        atmosphereEnabled: false,
        fontsSrc: "../../res/fonts",
        frustums: [[500000, 40000000]],
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