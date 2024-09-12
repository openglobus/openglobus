import {
    Globe,
    control,
    Vector,
    LonLat,
    Entity,
    Geometry,
    OpenStreetMap,
    Bing,
    GlobusRgbTerrain,
    RgbTerrain,
    mercator
} from "../../lib/@openglobus/og.esm.js";

let osm = new OpenStreetMap();

let vec = new Vector("", { isBaseLayer: false, visibility: true });

const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new RgbTerrain("", {
        url: "https://terrain.openglobus.org/nz/{z}/{x}/{y}.png",
        maxNativeZoom: 17,
        maxZoom: 17
    }),
    //terrain: new GlobusTerrain(),
    layers: [osm],
    atmosphereEnabled: false,
    fontsSrc: "../../res/fonts",
    sun: {
        stopped: false
    }
});
let counter = 1;

let entity = new Entity({
    'geometry': {
        type: "LINESTRING",
        coordinates: [[0, 0], [0, 1]]
    }
});

vec.add(entity);

setInterval(() => {
    entity.setGeometry(new Geometry({
            type: "LINESTRING",
            coordinates: [[0, 0], [0, counter += 0.1]]
        })
    );
}, 100);

let b0 = new LonLat(650234.4081999999471009, 5725428.4599000001326203).inverseMercator();
let b1 = new LonLat(1175988.1869000000879169, 6084292.2588999997824430).inverseMercator();

let width = globus.planet.ellipsoid.getGreatCircleDistance(b0, new LonLat(b1.lon, b0.lat));
let height = globus.planet.ellipsoid.getGreatCircleDistance(b0, new LonLat(b0.lon, b1.lat));

console.log(width / 36030, height / 24593);


function m_px(x, y, z) {
    const PX = 33;
    let ext = mercator.getTileExtent(x, y, z);
    let b0 = ext.getSouthWest().inverseMercator(),
        b1 = ext.getNorthEast().inverseMercator();
    let width = globus.planet.ellipsoid.getGreatCircleDistance(b0, new LonLat(b1.lon, b0.lat)),
        height = globus.planet.ellipsoid.getGreatCircleDistance(b0, new LonLat(b0.lon, b1.lat));

    return [width / PX, height / PX];
}

console.log(1, m_px(0, 0, 1));
console.log(7, m_px(66, 44, 7));
console.log(10, m_px(536, 358, 10));
console.log(12, m_px(2149, 1446, 12));
console.log(13, m_px(4301, 2892, 13));
console.log(14, m_px(8582, 5736, 14));
console.log(15, m_px(17205, 11569, 15));
console.log(16, m_px(34419, 23138, 16));
console.log(17, m_px(68661, 45892, 17));
console.log(18, m_px(137650, 92555, 18));

globus.planet.addControl(new control.DebugInfo());
globus.planet.addControl(new control.KeyboardNavigation());
globus.planet.addControl(new control.ToggleWireframe());
globus.planet.addControl(new control.LayerSwitcher());