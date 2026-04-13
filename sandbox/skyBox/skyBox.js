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
    Vec2,
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
    pickingEnabled: true,
    'entities':
        [{
            'polyline': {
                'pathLonLat': grid,
                'thickness': [12.5],
                'opacity': 0.8,
                'color': ["rgba(205,68,203,1)"]
            }
        }]
});

let objLayer = new Vector("Obj.Layer", {
    scaleByDistance: [50, 50000, 1]
});

const markerSrc = "../billboardsDragging/marker.png";

let pointLayer = new Vector("points", {
    clampToGround: true,
    async: false,
    entities: [{
        name: "Blue Marker",
        lonlat: [-105.6182, 39.6149],
        billboard: {
            src: markerSrc,
            size: [29, 48],
            offset: [0, 24],
            color: "rgba(255,255,255,0.7)"
        }
    }]
});

let globe = new Globe({
    target: "earth",
    name: "Earth",
    frustums: [[1, 1e12]],
    terrain: new GlobusRgbTerrain(),
    layers: [new OpenStreetMap(), new Bing(), objLayer, collection, pointLayer],
    msaa: 0
});

globe.planet.addControls([
    new control.GeoObjectEditor(),
    new control.LayerSwitcher(),
    new control.ToggleWireframe(),
    new control.TimelineControl(),
]);

//globe.planet.renderer.controls.SimpleSkyBackground.colorOne = "#555555";
//globe.planet.renderer.controls.SimpleSkyBackground.colorTwo = "#555555";

//const EPSILON_NEAR = 1e-3;
//const planetDiameter = globe.planet.ellipsoid.equatorialSize * 2.0;

function updateSkyBoxFrustum() {
    const camera = globe.planet.camera;
    const alt = camera.getAltitude();
    camera.setNearFar(alt - alt * 0.9);
}

globe.planet.camera.events.on("viewchange", updateSkyBoxFrustum);
updateSkyBoxFrustum();

let draggableObject = null;
let dragStartClick = new Vec2();
let dragStartPos = null;

pointLayer.events.on("mouseenter", function (e) {
    e.renderer.handler.canvas.style.cursor = "pointer";
});

pointLayer.events.on("mouseleave", function (e) {
    e.renderer.handler.canvas.style.cursor = "default";
});

pointLayer.events.on("ldown", function (e) {
    if (!e.pickingObject) {
        return;
    }
    e.renderer.controls.navigation?.deactivate();
    dragStartClick.set(e.x, e.y);
    draggableObject = e.pickingObject;
    dragStartPos = globe.planet.getPixelFromCartesian(draggableObject.getCartesian());
});

pointLayer.events.on("lup", function (e) {
    e.renderer.controls.navigation?.activate();
    draggableObject = null;
    dragStartPos = null;
});

globe.planet.renderer.events.on("mousemove", function (e) {
    if (!draggableObject || !dragStartPos) {
        return;
    }
    const d = new Vec2(e.x, e.y).sub(dragStartClick);
    const endPos = dragStartPos.add(d);
    const coords = this.getCartesianFromPixelTerrain(endPos);
    if (coords) {
        draggableObject.setCartesian3v(coords);
    }
}, globe.planet);

globe.renderer.events.on("lclick", function (e) {
    const pickingObject = e.pickingObject;
    const isPlanetLayerClick = !!(
        pickingObject &&
        pickingObject._planet === globe.planet &&
        typeof pickingObject.isBaseLayer === "function"
    );
    if (!isPlanetLayerClick) {
        return;
    }

    const ll = globe.planet.getLonLatFromPixelTerrain(e, true);
    if (!ll) {
        return;
    }

    const isCtrlPressed = !!(e.sys && e.sys.ctrlKey);
    if (isCtrlPressed) {
        pointLayer.add(new Entity({
            name: "New Label",
            lonlat: ll,
            label: {
                align: "center",
                text: "Hello world",
                size: 30,
                offset: [0, 50, 0],
                color: "rgba(255,255,255,1)",
                outlineColor: "rgba(255,0,0,1)",
                outline: 0.2
            }
        }));
    } else {
        pointLayer.add(new Entity({
            name: "New Marker",
            lonlat: ll,
            billboard: {
                src: markerSrc,
                size: [29, 48],
                offset: [0, 24],
                color: "rgba(255,255,255,1)"
            }
        }));
    }
});

pointLayer.events.on("rclick", function (e) {
    e.pickingObject && e.pickingObject.remove();
});


const baseObj = Object3d.createCube(0.4, 2, 0.4)
    .translate(new Vec3(0, 1, 0))
    .setColor("white");

const viewObj = Object3d.createFrustum(3, 2, 1)
    .setColor("#1cdd23");

const viewObj2 = Object3d.createFrustum(3, 2, 1)
    .setColor("#ef00ff");

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

// globe.planet.camera.setLonLat(
//     new LonLat(-105.61717175714179, 39.61567256262465, 4064.033358156039),
//     pos, // look point
// );


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
        color: "rgba(8,216,0,1)",
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

let d = Vec3.sub(b0, a0).cross(a0).getNormal().scaleTo(1200);
let z = (t, s) => [Vec3.lerp(a0, b0, t).add(d.scaleTo(s)), Vec3.lerp(a1, b1, t).add(d.scaleTo(s))];

let s2 = new Entity({
    strip: {
        gridSize: 10,
        path: [
            [a0, a1],
            z(0.25, 1),
            z(0.5, -1),
            z(0.75, 1),
            [b0, b1]
        ],
        color: "rgba(0,75,255,0.5)",
    }
});

var strips = new Vector("Strips", {
    entities: [s0, s1, s2]
});

globe.planet.addLayer(strips);

globe.planet.addControl(new control.ElevationProfileControl());
globe.planet.addControl(new control.DebugInfo());

let ruler = new control.RulerSwitcher({
    ignoreTerrain: false
});

globe.planet.addControl(ruler);
