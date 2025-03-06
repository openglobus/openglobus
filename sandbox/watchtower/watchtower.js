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

window.Vec3 = Vec3;

async function main() {

    const tower = await Object3d.loadObj('./tower/tower.obj');
    const table = await Object3d.loadObj('./table/Table.obj');
    const chair = await Object3d.loadObj('./table/Chair.obj');
    const radio = await Object3d.loadObj('./radio/radio.obj');
    const trans = await Object3d.loadObj('./trans/trans.obj');
    const antenna = await Object3d.loadObj('./antenna/antenna.obj');

    let sat = new Bing();
    let osm = new OpenStreetMap();

    const globus = new Globe({
        frustums: [[0.01, 0.1 + 0.0075], [0.1, 1 + 0.075], [1, 100 + 0.075], [100, 1000 + 0.075], [1000, 1e6 + 10000], [1e6, 1e9]],
        target: "earth",
        name: "Earth",
        terrain: new GlobusRgbTerrain(),
        layers: [sat, osm],
        //atmosphereEnabled: true,
        fontsSrc: "../../res/fonts",
        sun: {
            stopped: false
        }
    });
    //
    globus.planet.addControl(new control.DebugInfo());
    globus.planet.addControl(new control.KeyboardNavigation());
    globus.planet.addControl(new control.LayerSwitcher());
    globus.planet.addControl(new control.TimelineControl());
    globus.planet.addControl(new control.GeoObjectEditor());
    globus.planet.addControl(new control.ToggleWireframe());
    globus.planet.addControl(new control.Lighting());
    globus.planet.addControl(new control.Object3dManager({
        collection: [
            { name: "tower", objects: tower },
            { name: "table", objects: table },
            { name: "chair", objects: chair },
            { name: "radio", objects: radio },
            { name: "trans", objects: trans },
            { name: "antenna", objects: antenna }
        ]
    }))

    let sceneLayer = new Vector("scene", {
        scaleByDistance: [1, 1, 1]
    });

    sceneLayer.addTo(globus.planet);

    globus.renderer.events.on("mousemove", (e) => {
        if (globus.renderer.events.isKeyPressed(input.KEY_SHIFT)) {
        }
    });

    globus.renderer.events.on("lclick", (e) => {

        let lonLat = globus.planet.getLonLatFromPixelTerrain(e.pos);

        if (lonLat) {
            globus.renderer.setRelativeCenter(globus.planet.camera.eye);
            if (globus.renderer.events.isKeyPressed(input.KEY_CTRL)) {

                let towerEntity = new Entity({
                    lonlat: lonLat,
                    scale: 1,
                    pitch: 0,
                    yaw: 0,
                    roll: 0,
                    geoObject: {
                        instanced: true,
                        tag: `tower`,
                        object3d: tower[0]
                    }
                });

                sceneLayer.add(towerEntity);

            }
        }
    })
}

main();

