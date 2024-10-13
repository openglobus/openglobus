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


let dockLayer = new Vector("dock", {
    scaleByDistance: [1, 1, 1]
});

let cranesLayer = new Vector("crane", {
    scaleByDistance: [1, 1, 1]
});

function setPitch(a) {
    cranesLayer.each((e) => {
        e.geoObject.setPitch(a)
    });
}

function setYaw(a) {
    cranesLayer.each((e) => {
        e.geoObject.setYaw(a);
    });
}

function setRoll(a) {
    cranesLayer.each((e) => {
        e.geoObject.setRoll(a);
    });
}

async function main() {
    let sat = new Bing();
    let osm = new OpenStreetMap();

    const dock = await Object3d.loadObj('./dockxxx.obj');
    const crane = await Object3d.loadObj('./crane.obj');

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
        dockLayer.add(new Entity({
            lonlat: [33.2017379, 69.0821338, 19],
            geoObject: {
                color: "white",
                scale: 3.0,
                instanced: true,
                tag: `dock-${i}`,
                object3d: dock[i],
                yaw: -52,
                pitch: 0
            }
        }));
    }


    for (let i = 0; i < crane.length; i++) {
        cranesLayer.add(new Entity({
            lonlat: [33.2017379, 69.0821338, 19],
            geoObject: {
                color: "white",
                scale: 3.0,
                instanced: true,
                tag: `crane-${i}`,
                object3d: crane[i],
                yaw: -52,
                pitch: 0
            }
        }));
    }

    const globus = new Globe({
        target: "earth",
        name: "Earth",
        terrain: new GlobusRgbTerrain(),
        layers: [osm, sat, dockLayer, cranesLayer],
        atmosphereEnabled: false,
        fontsSrc: "../../res/fonts",
        sun: {
            stopped: false
        },
        viewExtent: [33.1758537, 69.0755299, 33.2251571, 69.08960050]
    });

    globus.planet.addControl(new control.DebugInfo());
    globus.planet.addControl(new control.KeyboardNavigation());
    globus.planet.addControl(new control.ToggleWireframe());
    globus.planet.addControl(new control.LayerSwitcher());
    globus.planet.addControl(new control.RulerSwitcher());
}

main()
