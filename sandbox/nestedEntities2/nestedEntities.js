import {
    Globe,
    Vector,
    GlobusRgbTerrain,
    OpenStreetMap,
    Bing,
    Object3d,
    Vec3,
    Entity,
    control,
    LonLat
} from "../../lib/og.es.js";

let objLayer = new Vector("Obj.Layer", {
    scaleByDistance: [50, 50000, 1]
});

let globe = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    layers: [new OpenStreetMap(), new Bing(), objLayer],
});

globe.planet.addControls([
    new control.GeoObjectEditor(),
    new control.LayerSwitcher()
]);

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