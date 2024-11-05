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

    const dock = await Object3d.loadObj('./dock.obj');
    const crane = await Object3d.loadObj('./crane2.obj');

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

        let c1 = new Entity({
            lonlat: [33.2017379, 69.0821338, 19],
            geoObject: {
                color: "white",
                scale: 4.0,
                instanced: true,
                tag: `crane-${i}`,
                object3d: crane[i],
                yaw: 87,
                pitch: 0
            }
        });

        let c2 = new Entity({
            lonlat: [33.2037625, 69.0814592, 24],
            geoObject: {
                color: "white",
                scale: 4.0,
                instanced: true,
                tag: `crane-${i}`,
                object3d: crane[i],
                yaw: 24,
                pitch: 0
            }
        });

        let c3 = new Entity({
            lonlat: [33.2045480, 69.0818760, 20],
            geoObject: {
                color: "white",
                scale: 4.0,
                instanced: true,
                tag: `crane-${i}`,
                object3d: crane[i],
                yaw: -95,
                pitch: 0
            }
        });

        let c4 = new Entity({
            lonlat: [33.2024654, 69.0824443, 21],
            geoObject: {
                color: "white",
                scale: 4.0,
                instanced: true,
                tag: `crane-${i}`,
                object3d: crane[i],
                yaw: -160,
                pitch: 0
            }
        });

        let c5 = new Entity({
            lonlat: [33.2027773, 69.0817816, 21],
            geoObject: {
                color: "white",
                scale: 4.0,
                instanced: true,
                tag: `crane-${i}`,
                object3d: crane[i],
                yaw: 42,
                pitch: 0
            }
        });

        let c6 = new Entity({
            lonlat: [33.2035357, 69.0821616, 21],
            geoObject: {
                color: "white",
                scale: 4.0,
                instanced: true,
                tag: `crane-${i}`,
                object3d: crane[i],
                yaw: -229,
                pitch: 0
            }
        });

        cranesLayer.add(c1);
        cranesLayer.add(c2);
        cranesLayer.add(c3);
        cranesLayer.add(c4);
        cranesLayer.add(c5);
        cranesLayer.add(c6);
    }


    const globus = new Globe({
        target: "earth",
        name: "Earth",
        terrain: new GlobusRgbTerrain(),
        layers: [sat, dockLayer, cranesLayer],
        atmosphereEnabled: true,
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
    globus.planet.addControl(new control.TimelineControl());
}

main()
