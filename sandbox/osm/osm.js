import {
    Globe,
    control,
    Vector,
    LonLat,
    Entity,
    OpenStreetMap,
    GlobusRgbTerrain,
    Object3d,
    mercator
} from "../../lib/@openglobus/og.esm.js";

let osm = new OpenStreetMap();

let dockLayer = new Vector("dock", {
    scaleByDistance: [1, 1, 1]
});

dockLayer.add(new Entity({
    lonlat: [0, 0, 10000],
    geoObject: {
        color: "red",
        scale: 1.0,
        instanced: true,
        tag: `dock`,
        object3d: Object3d.createCube(10000, 10000, 10000),
        yaw: -52,
        pitch: 0
    }
}));

const globus = new Globe({
    //frustums: [[1,101100],[100000,1000000000]],
    target: "earth",
    name: "Earth",
    terrain: new RgbTerrain("",{
        maxNativeZoom: 13,
        maxZoom: 13,
        url: "http://127.0.0.1:8080/sandbox/osm/dest_geoid/{z}/{x}/{y}.png",
    }),
    layers: [osm, dockLayer],
    atmosphereEnabled: false,
    fontsSrc: "../../res/fonts",
    sun: {
        stopped: false
    }
});

function m_px_merc(x, y, z, PX = 128) {
    let ext = mercator.getTileExtent(x, y, z);
    let b0 = ext.getSouthWest().inverseMercator(),
        b1 = ext.getNorthEast().inverseMercator();
    let width = globus.planet.ellipsoid.getGreatCircleDistance(b0, new LonLat(b1.lon, b0.lat)),
        height = globus.planet.ellipsoid.getGreatCircleDistance(b0, new LonLat(b0.lon, b1.lat));

    return [width / PX, height / PX];
}

console.log(1, m_px_merc(0, 0, 1));
console.log(7, m_px_merc(66, 44, 7));
console.log(10, m_px_merc(536, 358, 10));
console.log(12, m_px_merc(2149, 1446, 12));
console.log(13, m_px_merc(4301, 2892, 13));
console.log(14, m_px_merc(8582, 5736, 14));
console.log(15, m_px_merc(17205, 11569, 15));
console.log(16, m_px_merc(34419, 23138, 16));
console.log(17, m_px_merc(68661, 45892, 17));
console.log(18, m_px_merc(137650, 92555, 18));

globus.planet.addControl(new control.DebugInfo());
globus.planet.addControl(new control.KeyboardNavigation());
globus.planet.addControl(new control.ToggleWireframe());
globus.planet.addControl(new control.LayerSwitcher());