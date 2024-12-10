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

let cranesLayer = new Vector("crane", {
    scaleByDistance: [1, 1, 1]
});

async function main() {


    let sat = new Bing();
    let osm = new OpenStreetMap();

    const dock = await Object3d.loadObj('./dock.obj');
    const crane = await Object3d.loadObj('./crane.obj');

    let c1 = new Entity({
        lonlat: [33.2017379, 69.0821338, 19],
    });

    let c2 = new Entity({
        lonlat: [33.2037625, 69.0814592, 24],
    });

    let c3 = new Entity({
        lonlat: [33.2045480, 69.0818760, 20],
    });

    let c4 = new Entity({
        lonlat: [33.2024654, 69.0824443, 21],
    });

    let c5 = new Entity({
        lonlat: [33.2027773, 69.0817816, 21],
    });

    let c6 = new Entity({
        lonlat: [33.2035357, 69.0821616, 21],
    });

    for (let i = 0; i < crane.length; i++) {

        c1.appendChild(new Entity({
            geoObject: {
                //color: "white",
                scale: 1.0,
                instanced: true,
                tag: `crane-${i}`,
                object3d: crane[i],
                yaw: 87,
                pitch: 0
            }
        }));

        c2.appendChild(new Entity({
            geoObject: {
                //color: "white",
                scale: 1.0,
                instanced: true,
                tag: `crane-${i}`,
                object3d: crane[i],
                yaw: 24,
                pitch: 0
            }
        }));

        c3.appendChild(new Entity({
            geoObject: {
                //color: "white",
                scale: 4.0,
                instanced: true,
                tag: `crane-${i}`,
                object3d: crane[i],
                yaw: -95,
                pitch: 0
            }
        }));

        c4.appendChild(new Entity({
            geoObject: {
                //color: "white",
                scale: 1.0,
                instanced: true,
                tag: `crane-${i}`,
                object3d: crane[i],
                yaw: -160,
                pitch: 0
            }
        }));

        c5.appendChild(new Entity({
            geoObject: {
                //color: "white",
                scale: 1.0,
                instanced: true,
                tag: `crane-${i}`,
                object3d: crane[i],
                yaw: 42,
                pitch: 0
            }
        }));

        c6.appendChild(new Entity({
            geoObject: {
                //color: "white",
                scale: 1.0,
                instanced: true,
                tag: `crane-${i}`,
                object3d: crane[i],
                yaw: -229,
                pitch: 0
            }
        }));
    }

    cranesLayer.add(c1);
    cranesLayer.add(c2);
    cranesLayer.add(c3);
    cranesLayer.add(c4);
    cranesLayer.add(c5);
    cranesLayer.add(c6);

    const globus = new Globe({
        frustums: [[0.01, 0.1 + 0.0075], [0.1, 1 + 0.075], [1, 100 + 0.075], [100, 1000 + 0.075], [1000, 1e6 + 10000], [1e6, 1e9]],
        target: "earth",
        name: "Earth",
        terrain: new GlobusRgbTerrain(),
        layers: [sat, osm, cranesLayer],
        //atmosphereEnabled: true,
        fontsSrc: "../../res/fonts",
        sun: {
            stopped: false
        },
        viewExtent: [33.1758537, 69.0755299, 33.2251571, 69.08960050]
    });

    for (let i = 0; i < dock.length; i++) {

        let layer = new Vector(dock[i].name, {
            scaleByDistance: [1, 1, 1],
            entities: [
                new Entity({
                    lonlat: [33.2017379, 69.0821338, 19],
                    geoObject: {
                        scale: 3.0,
                        instanced: true,
                        tag: `dock-${i}`,
                        object3d: dock[i],
                        yaw: -52,
                        pitch: 0
                    }
                })
            ]
        });

        layer.addTo(globus.planet);
    }

    globus.planet.addControl(new control.DebugInfo());
    globus.planet.addControl(new control.KeyboardNavigation());
    globus.planet.addControl(new control.LayerSwitcher());
    globus.planet.addControl(new control.TimelineControl());
    globus.planet.addControl(new control.GeoObjectEditor());
    globus.planet.addControl(new control.ToggleWireframe());

    let cubeObj = Object3d.createCube(0.01, 0.01, 0.01);

    let cubeLayer = new Vector("Cubes", {
        scaleByDistance: [1, 1, 1]
    });

    cubeLayer.addTo(globus.planet);

    globus.renderer.events.on("lclick", (e) => {
        let cart = globus.planet.getCartesianFromMouseTerrain();
        if (cart) {
            let dist = globus.planet.camera.eye.distance(cart);
            let cube = new Entity({
                cartesian: cart,
                geoObject: {
                    color: "white",
                    scale: 1.0,
                    instanced: true,
                    tag: `cube`,
                    object3d: cubeObj,
                    yaw: 0,
                    pitch: 0
                }
            });
            cubeLayer.add(cube);
            console.log(dist);
        }
    })
}

main();

