import {
    Globe,
    LonLat,
    OpenStreetMap,
    scene,
    control,
    GlobusRgbTerrain,
    Object3d,
    Vector,
    Bing,
    Vec3,
    Entity
} from "../../lib/og.es.js";


//
// Geodetic grid
//
var grid = [];
//meridians
for (let i = -180; i < 180; i += 10) {
    var mer = [];
    for (let j = -90; j <= 90; j++) {
        mer.push(new LonLat(i, j, 20000));
    }
    grid.push(mer);
}

//parallels
for (let i = -90; i < 90; i += 10) {
    var mer = [];
    for (let j = -180; j <= 180; j++) {
        mer.push(new LonLat(j, i, 20000));
    }
    grid.push(mer);
}

var collection = new Vector("Collection", {
    'entities':
        [{
            'polyline': {
                'pathLonLat': grid,
                'thickness': 2.5,
                'color': "rgba(68, 157, 205, 0.92)"
            }
        }]
});

let objLayer = new Vector("Obj.Layer", {
    scaleByDistance: [50, 50000, 1]
});

let globe = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    layers: [new OpenStreetMap(), new Bing(), objLayer, collection],
    msaa: 8
});

globe.planet.addControls([
    new control.GeoObjectEditor(),
    new control.LayerSwitcher(),
    new control.ToggleWireframe()
]);

globe.planet.renderer.controls.SimpleSkyBackground.colorOne = "#555555";
globe.planet.renderer.controls.SimpleSkyBackground.colorTwo = "#555555";


const baseObj = Object3d.createCube(0.4, 2, 0.4)
    .translate(new Vec3(0, 1, 0))
    .setMaterial({
        ambient: "#802727",
        diffuse: "#ff5252",
    });

const viewObj = Object3d.createFrustum(3, 2, 1)
    .setMaterial({
        ambient: "#28552b",
        diffuse: "#1cdd23",
    });

const viewObj2 = Object3d.createFrustum(3, 2, 1)
    .setMaterial({
        ambient: "#5f2563",
        diffuse: "#ef00ff",
    });

const pos = new LonLat(-105.6173319876, 39.615583413, 4057.9466);

let parentEntity = new Entity({
    lonlat: pos,
    independentPicking: true,
    geoObject: {
        instanced: true,
        tag: `baseObj`,
        object3d: baseObj,
    }
});

let childEntity = new Entity({
    cartesian: new Vec3(0, 1, 0),
    independentPicking: true,
    relativePosition: true,
    geoObject: {
        instanced: true,
        tag: `viewObj`,
        object3d: viewObj,
    }
});

let childChildEntity = new Entity({
    cartesian: new Vec3(0, 3, -1),
    independentPicking: true,
    relativePosition: true,
    geoObject: {
        instanced: true,
        tag: `viewObj2`,
        object3d: viewObj2,
    }
});

childEntity.appendChild(childChildEntity);
parentEntity.appendChild(childEntity);

objLayer.add(parentEntity);

globe.planet.camera.setLonLat(
    new LonLat(-105.61717175714179, 39.61567256262465, 4064.033358156039),
    pos, // look point
);


let ell = globe.planet.ellipsoid;

let a0 = ell.lonLatToCartesian(new LonLat(-105.6164781, 39.6094186, 3714));
let a1 = ell.lonLatToCartesian(new LonLat(-105.6164781, 39.6094186, 3714 + 500));

let b0 = ell.lonLatToCartesian(new LonLat(-105.6444247, 39.6166427, 3924 - 500));
let b1 = ell.lonLatToCartesian(new LonLat(-105.6444247, 39.6166427, 3924 + 500));

let s0 = new Entity({
    strip: {
        gridSize: 10,
        path: [
            [a0, a1],
            [b0, b1]
        ],
        color: "rgba(8,216,0,0.5)",
    }
});

a0 = ell.lonLatToCartesian(new LonLat(-105.6164781, 39.6077287, 3714));
a1 = ell.lonLatToCartesian(new LonLat(-105.6164781, 39.6077287, 3714 + 500));

b0 = ell.lonLatToCartesian(new LonLat(-105.6444247, 39.6150294, 3924 - 500));
b1 = ell.lonLatToCartesian(new LonLat(-105.6444247, 39.6150294, 3924 + 500));

let s1 = new Entity({
    strip: {
        gridSize: 10,
        path: [
            [a0, a1],
            [b0, b1]
        ],
        color: "rgba(220,0,0,0.5)",
    }
});

a0 = ell.lonLatToCartesian(new LonLat(-105.6164781, 39.6060457, 3714));
a1 = ell.lonLatToCartesian(new LonLat(-105.6164781, 39.6060457, 3714 + 500));

b0 = ell.lonLatToCartesian(new LonLat(-105.6444247, 39.6132437, 3924 - 500));
b1 = ell.lonLatToCartesian(new LonLat(-105.6444247, 39.6132437, 3924 + 500));

let s2 = new Entity({
    strip: {
        gridSize: 10,
        path: [
            [a0, a1],
            [b0, b1]
        ],
        color: "rgba(0,75,255,0.5)",
    }
});

var strips = new Vector("Strips", {
    entities: [s0, s1, s2]
});

globe.planet.addLayer(strips);
