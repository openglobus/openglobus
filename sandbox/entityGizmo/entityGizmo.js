import {
    Bing,
    Entity,
    Globe,
    GlobusRgbTerrain,
    LonLat,
    Object3d,
    OpenStreetMap,
    Vec3,
    Vector,
    control
} from "../../lib/og.es.js";

let objLayer = new Vector("Obj.Layer", {
    scaleByDistance: [50, 50000, 1]
});

let globe = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    layers: [new OpenStreetMap(), new Bing(), objLayer]
});

const baseObj = Object3d.createCube(0.4, 2, 0.4).translate(new Vec3(0, 1, 0)).setColor("#ff5252");

const viewObj = Object3d.createFrustum(3, 2, 1).setColor("#1cdd23");

const pos = new LonLat(-105.6173319876, 39.615583413, 4057.9466);

let parentEntity = new Entity({
    name: "parent",
    lonlat: pos,
    independentPicking: true,
    geoObject: {
        instanced: true,
        tag: "baseObj",
        object3d: baseObj
    }
});

// A nested entity positioned relative to its parent.
let childEntity = new Entity({
    name: "child",
    cartesian: new Vec3(0, 3, 0),
    independentPicking: true,
    relativePosition: true,
    geoObject: {
        instanced: true,
        tag: "viewObj",
        object3d: viewObj
    }
});

parentEntity.appendChild(childEntity);
objLayer.add(parentEntity);

const gizmo = new control.EntityGizmo({
    tools: "translate",
    autoSelect: false
});

globe.planet.addControl(gizmo);

const $log = document.getElementById("log");

function describe(entity) {
    const ll = entity.getLonLat();
    const cart = entity.getCartesian();
    const absCart = entity.getAbsoluteCartesian();
    return [
        `entity:    ${entity.name}`,
        `lonLat:    ${ll.lon.toFixed(8)}, ${ll.lat.toFixed(8)}, ${ll.height.toFixed(3)}`,
        `local:     ${cart.x.toFixed(3)}, ${cart.y.toFixed(3)}, ${cart.z.toFixed(3)}`,
        `absolute:  ${absCart.x.toFixed(3)}, ${absCart.y.toFixed(3)}, ${absCart.z.toFixed(3)}`
    ].join("\n");
}

// transformstart -> transformchange* -> transformend | transformcancel
gizmo.events.on("transformstart", ({ entity, kind, handle }) => {
    $log.textContent = `transformstart ${kind}/${handle}\n${describe(entity)}`;
});

gizmo.events.on("transformchange", ({ entity, kind, handle }) => {
    $log.textContent = `transformchange ${kind}/${handle}\n${describe(entity)}`;
});

// One drag gives exactly one end or one cancel: the right place to push a single undo command.
gizmo.events.on("transformend", ({ entity, kind, handle }) => {
    $log.textContent = `transformend ${kind}/${handle}\n${describe(entity)}`;
});

gizmo.events.on("transformcancel", ({ entity, kind, handle }) => {
    $log.textContent = `transformcancel ${kind}/${handle}\n${describe(entity)}`;
});

document.getElementById("selectParent").addEventListener("click", () => {
    gizmo.selectEntity(parentEntity);
});

document.getElementById("selectChild").addEventListener("click", () => {
    gizmo.selectEntity(childEntity);
});

document.getElementById("unselect").addEventListener("click", () => {
    gizmo.unselectEntity();
});

document.getElementById("cancel").addEventListener("mousedown", (e) => {
    e.preventDefault();
    gizmo.cancelTransform();
});

globe.planet.camera.setLonLat(new LonLat(-105.61717175714179, 39.61567256262465, 4064.033358156039), pos);
