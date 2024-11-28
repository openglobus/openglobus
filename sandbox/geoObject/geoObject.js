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

    const dock = await Object3d.loadObj('./piano.obj');

    let piano = new Entity({
        lonlat: [33.2017379, 69.0821338, 19],
    });

    for (let i = 0; i < dock.length; i++) {
        piano.appendChild(new Entity({
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

    piano.addTo(dockLayer);

    const globus = new Globe({
        target: "earth",
        name: "Earth",
        terrain: new GlobusRgbTerrain(),
        layers: [sat, dockLayer],
        atmosphereEnabled: true,
        fontsSrc: "../../res/fonts",
        sun: {
            stopped: false
        },
        viewExtent: [33.1758537, 69.0755299, 33.2251571, 69.08960050]
    });

    globus.planet.addControl(new control.DebugInfo());
    globus.planet.addControl(new control.KeyboardNavigation());
    globus.planet.addControl(new control.LayerSwitcher());
    globus.planet.addControl(new control.TimelineControl());
    globus.planet.addControl(new control.GeoObjectEditor());
}

main()
