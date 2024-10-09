import {
    Globe,
    control,
    GlobusRgbTerrain,
    Vector,
    OpenStreetMap,
    Entity,
    Bing,
    Object3d
} from "../../lib/@openglobus/og.esm.js";


let myObjects = new Vector("MyObjects", {
    //scaleByDistance: [200, 190000, 1]
    scaleByDistance: [1, 1, 1]
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

async function main() {
    let sat = new Bing();
    let osm = new OpenStreetMap();

    const dock = await Object3d.loadObj('./dock.obj');

    document.querySelector(".gpitch").addEventListener("input", (e) => {
        setPitch(Number(e.target.value));
    });
    document.querySelector(".gyaw").addEventListener("input", (e) => {
        setYaw(Number(e.target.value));
    });
    document.querySelector(".groll").addEventListener("input", (e) => {
        setRoll(Number(e.target.value));
    });

    for (let i = 0; i < dock.length; i++) {
        myObjects.add(new Entity({
            lonlat: [-1.7559520, 4.8787764, 34], geoObject: {
                color: "white",
                scale: 250.0,
                instanced: true,
                tag: `dock-${i}`,
                object3d: dock[i],
                yaw: 0,
                pitch: 0
            }
        }));
    }
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
