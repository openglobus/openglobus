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

    let sceneLayer = new Vector("scene", {
        scaleByDistance: [1, 1, 1]
    });

    globus.planet.addControl(new control.DebugInfo());
    globus.planet.addControl(new control.KeyboardNavigation());
    globus.planet.addControl(new control.LayerSwitcher());
    globus.planet.addControl(new control.TimelineControl());
    globus.planet.addControl(new control.GeoObjectEditor());
    globus.planet.addControl(new control.ToggleWireframe());
    globus.planet.addControl(new control.Lighting());
    globus.planet.addControl(new control.Object3dManager({
        layer: sceneLayer,
        collection: [
            { name: "tower", objects: tower, scale: 1.1 },
            { name: "table", objects: table, scale: 0.8 },
            { name: "chair", objects: chair, scale: 0.8 },
            { name: "radio", objects: radio, scale: 0.04 },
            { name: "trans", objects: trans, scale: 0.01 },
            { name: "antenna", objects: antenna, scale: 0.01 }
        ]
    }))

    sceneLayer.addTo(globus.planet);
}

main();

