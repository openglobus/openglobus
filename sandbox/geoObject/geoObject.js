import {
    Globe,
    control,
    GlobusRgbTerrain,
    Vector,
    OpenStreetMap,
    Entity,
    Bing,
    Object3d,
    input,
    Vec3
} from "../../lib/@openglobus/og.esm.js";

let cranesLayer = new Vector("crane", {
    scaleByDistance: [1, 1, 1]
});

async function main() {

    let sat = new Bing();
    let osm = new OpenStreetMap();

    const base = Object3d.createCube(0.4, 2, 0.4).translate(new Vec3(0, 1, 0));
    const view = Object3d.createFrustum(3, 2, 1);
    const view2 = Object3d.createFrustum(3, 2, 1);

    let parentEntity = new Entity({
        cartesian: new Vec3(1, 1, 1),
        independentPicking: true,
        geoObject: {
            scale: 1,
            instanced: true,
            tag: `base`,
            object3d: base,
            yaw: 0,
            pitch: 0,
            roll: 0
        }
    });

    let childEntity = new Entity({
        cartesian: new Vec3(0, 1, 0),
        independentPicking: true,
        relativePosition: true,
        geoObject: {
            instanced: true,
            tag: `view`,
            object3d: view,
            yaw: 0,
            pitch: 0,
            roll: 0
        }
    });

    let childChildEntity = new Entity({
        cartesian: new Vec3(0, 3, -1),
        independentPicking: true,
        relativePosition: true,
        geoObject: {
            instanced: true,
            tag: `view2`,
            object3d: view2,
            yaw: 0,
            pitch: 0,
            roll: 0
        }
    });

    childEntity.appendChild(childChildEntity);
    parentEntity.appendChild(childEntity);


    const globus = new Globe({
        //frustums: [[0.01, 0.1 + 0.0075], [0.1, 1 + 0.075], [1, 100 + 0.075], [100, 1000 + 0.075], [1000, 1e6 + 10000], [1e6, 1e9]],
        target: "earth",
        name: "Earth",
        terrain: new GlobusRgbTerrain(),
        layers: [sat, osm, cranesLayer],
        //atmosphereEnabled: true,
        fontsSrc: "../../res/fonts",
        sun: {
            stopped: false
        },
        //viewExtent: [33.1758537, 69.0755299, 33.2251571, 69.08960050]
    });

    globus.planet.addControl(new control.DebugInfo());
    globus.planet.addControl(new control.KeyboardNavigation());
    globus.planet.addControl(new control.LayerSwitcher());
    globus.planet.addControl(new control.TimelineControl());
    globus.planet.addControl(new control.GeoObjectEditor());
    globus.planet.addControl(new control.ToggleWireframe());


    let cubeLayer = new Vector("Cubes", {
        scaleByDistance: [1, 1, 1]
    });

    cubeLayer.addTo(globus.planet);

    globus.renderer.events.on("lclick", (e) => {
        //if (e.pickingObject.geoObject) return;

        let cart = globus.planet.getCartesianFromMouseTerrain();

        if (cart) {
            globus.renderer.setRelativeCenter(globus.planet.camera.eye);

            if (globus.renderer.events.isKeyPressed(input.KEY_CTRL)) {

                let parentEntity = new Entity({
                    cartesian: cart,
                    independentPicking: true,
                    geoObject: {
                        scale: 1,
                        instanced: true,
                        tag: `base`,
                        object3d: base,
                        yaw: 0,
                        pitch: 0,
                        roll: 0
                    }
                });

                let childEntity = new Entity({
                    cartesian: new Vec3(0, 1, 0),
                    independentPicking: true,
                    relativePosition: true,
                    geoObject: {
                        instanced: true,
                        tag: `view`,
                        object3d: view,
                        yaw: 0,
                        pitch: 0,
                        roll: 0
                    }
                });

                let childChildEntity = new Entity({
                    cartesian: new Vec3(0, 3, -1),
                    independentPicking: true,
                    relativePosition: true,
                    geoObject: {
                        instanced: true,
                        tag: `view2`,
                        object3d: view2,
                        yaw: 0,
                        pitch: 0,
                        roll: 0
                    }
                });

                childEntity.appendChild(childChildEntity);
                parentEntity.appendChild(childEntity);

                cubeLayer.add(parentEntity);
            }
        }
    })
}

main();

