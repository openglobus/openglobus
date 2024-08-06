import {
    math, Globe, control, utils, LonLat, GlobusTerrain, Vector, OpenStreetMap, Entity, Bing, GlobusRgbTerrain, Object3d
} from "../../lib/@openglobus/og.esm.js";


let myObjects = new Vector("MyObjects", {
    scaleByDistance: [1, math.MAX32, 1]
});

function setPitch(a) {
    myObjects.each((e) => {
        e.geoObject.setPitch(a)
    });
}

function setYaw(a) {
    myObjects.each((e) => {
        e.geoObject.setYaw(a);
    });
}

function setRoll(a) {
    myObjects.each((e) => {
        e.geoObject.setRoll(a);
    });
}

function main() {
    let osm = new OpenStreetMap();

    const obj = Object3d.createCylinder(0.01, 0.01, 1);

    document.querySelector(".gpitch").addEventListener("input", (e) => {
        setPitch(Number(e.target.value));
    });
    document.querySelector(".gyaw").addEventListener("input", (e) => {
        setYaw(Number(e.target.value));
    });
    document.querySelector(".groll").addEventListener("input", (e) => {
        setRoll(Number(e.target.value));
    });

    for (let i = -80; i < 80; i += 10) {
        for (let j = -180; j < 180; j += 10) {
            myObjects.add(new Entity({
                lonlat: [j, i, 20000],
                geoObject: {
                    color: "green",
                    scale: 0.1,
                    instanced: true,
                    tag: "plane",
                    object3d: obj,
                    yaw: 0,
                    pitch: 0
                }
            }));
        }
    }

    const globus = new Globe({
        target: "earth",
        name: "Earth",
        terrain: new GlobusRgbTerrain(),
        layers: [osm, myObjects],
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