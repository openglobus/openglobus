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
    frustums: [[1,101100],[100000,1000000000]],
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    layers: [osm],
    atmosphereEnabled: false,
    fontsSrc: "../../res/fonts",
    sun: {
        stopped: false
    }
});

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