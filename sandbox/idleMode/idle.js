import {
    Globe,
    GlobusRgbTerrain,
    OpenStreetMap,
    control,
    Entity,
    LonLat,
    Object3d,
    Vec3,
    Vector
} from "../../lib/og.es.js";

// Geodetic grid
const grid = [];
for (let i = -180; i < 180; i += 10) {
    const meridian = [];
    for (let j = -90; j <= 90; j++) {
        meridian.push(new LonLat(i, j, 20000));
    }
    grid.push(meridian);
}
for (let i = -90; i < 90; i += 10) {
    const parallel = [];
    for (let j = -180; j <= 180; j++) {
        parallel.push(new LonLat(j, i, 20000));
    }
    grid.push(parallel);
}

const gridLayer = new Vector("Grid", {
    pickingEnabled: true,
    entities: [
        {
            polyline: {
                pathLonLat: grid,
                thickness: [12.5],
                opacity: 0.8,
                color: ["rgba(205,68,203,1)"]
            }
        }
    ]
});

const markerSrc = "../polyline/green.png";

const pointLayer = new Vector("Points", {
    clampToGround: true,
    async: false,
    entities: [
        {
            name: "Marker",
            lonlat: [-105.6182, 39.6149],
            billboard: {
                src: markerSrc,
                size: [29, 48],
                offset: [0, 24],
                color: "rgba(255,255,255,0.7)"
            },
            label: {
                text: "Idle mode",
                size: 16,
                offset: [0, 50, 0],
                color: "rgba(255,255,255,1)",
                outlineColor: "rgba(0,0,0,0.5)",
                outline: 0.2
            }
        }
    ]
});

// Nested instanced geo objects
const objLayer = new Vector("Objects", {
    scaleByDistance: [50, 50000, 1]
});

const objPos = new LonLat(-105.6173319876, 39.615583413, 4057.9466);

const parentEntity = new Entity({
    lonlat: objPos,
    independentPicking: true,
    geoObject: {
        instanced: true,
        tag: "baseObj",
        object3d: Object3d.createCube(0.4, 2, 0.4).translate(new Vec3(0, 1, 0)).setColor("white")
    }
});

const childEntity = new Entity({
    cartesian: new Vec3(0, 1, 0),
    independentPicking: true,
    relativePosition: true,
    geoObject: {
        instanced: true,
        tag: "viewObj",
        object3d: Object3d.createFrustum(3, 2, 1).setColor("#1cdd23")
    }
});

const childChildEntity = new Entity({
    cartesian: new Vec3(0, 3, -1),
    independentPicking: true,
    relativePosition: true,
    geoObject: {
        instanced: true,
        tag: "viewObj2",
        object3d: Object3d.createFrustum(3, 2, 1).setColor("#ef00ff")
    }
});

childEntity.appendChild(childChildEntity);
parentEntity.appendChild(childEntity);
objLayer.add(parentEntity);

const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    layers: [new OpenStreetMap(), gridLayer, pointLayer, objLayer],
    atmosphereEnabled: true,
    fontsSrc: "../../res/fonts",
    idleMode: true
});

const ell = globus.planet.ellipsoid;

const makeStrip = (lat0, lat1, color) => {
    const a0 = ell.lonLatToCartesian(new LonLat(-105.6164781, lat0, 3714));
    const a1 = ell.lonLatToCartesian(new LonLat(-105.6164781, lat0, 3714 + 500));
    const b0 = ell.lonLatToCartesian(new LonLat(-105.6444247, lat1, 3924 - 500));
    const b1 = ell.lonLatToCartesian(new LonLat(-105.6444247, lat1, 3924 + 500));

    return new Entity({
        strip: {
            gridSize: 10,
            path: [
                [a0, a1],
                [b0, b1]
            ],
            color
        }
    });
};

globus.planet.addLayer(
    new Vector("Strips", {
        entities: [
            makeStrip(39.6094186, 39.6166427, "rgba(8,216,0,1)"),
            makeStrip(39.6077287, 39.6150294, "rgba(220,0,0,0.5)"),
            makeStrip(39.6060457, 39.6132437, "rgba(0,75,255,0.5)")
        ]
    })
);

globus.planet.addControl(new control.ShowFps());
globus.planet.addControl(new control.DebugInfo());


const controls = [
    new control.LayerSwitcher(),
    new control.ToggleWireframe(),
    new control.EntityEditor(),
    new control.ElevationProfileControl(),
    new control.RulerSwitcher({ ignoreTerrain: false }),
    new control.AtmosphereConfig(),
    new control.Lighting(),
    new control.FreeNavigation({ autoActivate: false, showInfo: true }),
    new control.TimelineControl()
];

if (control.OrthoSwitcher) {
    controls.unshift(new control.OrthoSwitcher());
}

globus.planet.addControls(controls);
