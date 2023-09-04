import {
    Entity,
    EntityCollection,
    Globe,
    XYZ,
    GlobusTerrain,
    utils,
    math,
    // KeyboardNavigation,
    // ToggleWireframe,
    // RulerSwitcher,
    // DebugInfo,
    Object3d,
    control
} from "../../dist/@openglobus/og.esm.js";


let plane3d = new Object3d({
    vertices: [
        //right main wing
        2, 5.5, -1.3,
        21, 6, -3,
        21, 6, -8,
        2, 5.5, -1.3,
        21, 6, -8,
        2, 5.5, -8.5,
        2, 5.5, -1.3,
        21, 6, -8,
        21, 6, -3,
        2, 5.5, -1.3,
        2, 5.5, -8.5,
        21, 6, -8,

        //left wing,
        -2, 5.5, -1.3,
        -21, 6, -3,
        -21, 6, -8,
        -2, 5.5, -1.3,
        -21, 6, -8,
        -2, 5.5, -8.5,
        -2, 5.5, -1.3,
        -21, 6, -8,
        -21, 6, -3,
        -2, 5.5, -1.3,
        -2, 5.5, -8.5,
        -21, 6, -8,

        //cockpit back
        2, 4, 0,
        2, 5.5, -1.3,
        -2, 5.5, -1.3,
        2, 4, 0,
        -2, 5.5, -1.3,
        -2, 4, 0,

        //cockpit front
        2, 5.5, -8.5,
        2, 3.6, -10,
        -2, 5.5, -8.5,
        -2, 5.5, -8.5,
        2, 3.6, -10,
        -2, 3.6, -10,

        //cockpit top
        2, 5.5, -1.3,
        2, 5.5, -8.5,
        -2, 5.5, -8.5,
        2, 5.5, -1.3,
        -2, 5.5, -8.5,
        -2, 5.5, -1.3,

        //cockpit right
        2, 5.5, -8.5,
        2, 5.5, -1.3,
        2, 3.6, -10,
        2, 5.5, -1.3,
        2, 4, 0,
        2, 3.6, -10,

        //cockpit left
        -2, 5.5, -8.5,
        -2, 3.6, -10,
        -2, 5.5, -1.3,
        -2, 3.6, -10,
        -2, 4, 0,
        -2, 5.5, -1.3,

        //cockpit nose
        2, 3.6, -10,
        2, 3.5, -13,
        -2, 3.5, -13,
        2, 3.6, -10,
        -2, 3.5, -13,
        -2, 3.6, -10,

        //propeller top
        2, 3.5, -13,
        0, 2.5, -15,
        -2, 3.5, -13,

        //propeller left
        -2, 3.5, -13,
        0, 2.5, -15,
        -1, 0, -13,

        //propeller right
        0, 2.5, -15,
        2, 3.5, -13,
        1, 0, -13,

        //propeller bottom
        0, 2.5, -15,
        1, 0, -13,
        -1, 0, -13,

        //cockpit hull left
        -2, 3.5, -13,
        -1, 0, -13,
        -1, 0, -3,
        -2, 3.5, -13,
        -1, 0, -3,
        -2, 4, 0,

        //cockpit hull right
        2, 3.5, -13,
        2, 4, 0,
        1, 0, -3,
        2, 3.5, -13,
        1, 0, -3,
        1, 0, -13,

        //cockpit hull bottom
        1, 0, -13,
        1, 0, -3,
        -1, 0, -3,
        1, 0, -13,
        -1, 0, -3,
        -1, 0, -13,

        //tail hull top
        2, 4, 0,
        -2, 4, 0,
        0, 2, 15,

        //tail hull left
        -2, 4, 0,
        -1, 0, -3,
        0, 2, 15,

        //tail hull right
        2, 4, 0,
        0, 2, 15,
        1, 0, -3,

        //tail hull bottom
        -1, 0, -3,
        1, 0, -3,
        0, 2, 15,

        //tail left
        0, 9, 15,
        0, 3, 7.5,
        0, 2.3, 12.5,
        0, 9, 15,
        0, 9, 13,
        0, 3, 7.5,

        //tail right
        0, 9, 15,
        0, 2.3, 12.5,
        0, 3, 7.5,
        0, 3, 7.5,
        0, 9, 13,
        0, 9, 15,

        //tail wing left
        -0.8, 2, 7.7,
        -6.5, 2, 8.7,
        -0.5, 2, 11.2,
        -0.5, 2, 11.2,
        -6.5, 2, 8.7,
        -6, 2, 11.6,
        -0.5, 2, 11.2,
        -6, 2, 11.6,
        -1.1, 2, 12.1,
        -0.8, 2, 7.7,
        -0.5, 2, 11.2,
        -6.5, 2, 8.7,
        -6.5, 2, 8.7,
        -0.5, 2, 11.2,
        -6, 2, 11.6,
        -6, 2, 11.6,
        -0.5, 2, 11.2,
        -1.1, 2, 12.1,

        //tail wing right
        0.8, 2, 7.7,
        6.5, 2, 8.7,
        0.5, 2, 11.2,
        0.5, 2, 11.2,
        6.5, 2, 8.7,
        6, 2, 11.6,
        0.5, 2, 11.2,
        6, 2, 11.6,
        1.1, 2, 12.1,
        0.8, 2, 7.7,
        0.5, 2, 11.2,
        6.5, 2, 8.7,
        6.5, 2, 8.7,
        0.5, 2, 11.2,
        6, 2, 11.6,
        6, 2, 11.6,
        0.5, 2, 11.2,
        1.1, 2, 12.1
    ]
});


let globus = new Globe({
    target: "globus",
    name: "Earth",
    layers: [
        new XYZ("OpenStreetMap", {
            isBaseLayer: true,
            url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            visibility: true,
            attribution: "Data @ OpenStreetMap contributors, ODbL"
        })
    ],
    terrain: new GlobusTerrain()
});

let colors = ["red", "orange", "yellow", "green", "lightblue", "darkblue", "purple"];

let geoObjects = new EntityCollection({
    entities: [],
    //scaleByDistance: [1.0, 1.0, MAX32]
    //scaleByDistance: [1.0, 4000000, 0.01]
    scaleByDistance: [100, 4000000, 1.0]
});

Object3d.loadObj("./cube.obj").then((objects)=>{
    let obj3d = objects[0];
})//Object3d.createSphere(16, 16, 5);

let obj3d2 = Object3d.createCylinder(3, 3, 10, 16, 16);

let entities = [];
for (let i = 0; i < 10; i++) {
    let entity = new Entity({
        lonlat: [1, i, 10000],
        name: "obj-" + i,
        geoObject: {
            pitch: Math.random(),
            yaw: Math.random(),
            roll: Math.random(),
            scale: 1.0,
            instanced: true,
            tag: "sphere",
            color: colors[i % 7],
            object3d: obj3d
        }
    });
    entities.push(entity);

    let entity2 = new Entity({
        lonlat: [-1, i, 0],
        name: "obj-" + i,
        geoObject: {
            pitch: Math.random(),
            yaw: Math.random(),
            roll: Math.random(),
            scale: 1.0,
            instanced: true,
            tag: "bigcube",
            color: colors[i % 7],
            object3d: obj3d2
        }
    });

    let entity3 = new Entity({
        lonlat: [2, i, 10000 * 2],
        name: "obj-" + i,
        geoObject: {
            pitch: Math.random(),
            yaw: Math.random(),
            roll: Math.random(),
            scale: 0.5,
            instanced: true,
            tag: "plane",
            color: colors[i % 7],
            object3d: plane3d
        }
    });

    entities.push(entity, entity2, entity3);
}

geoObjects.addEntities(entities);


globus.planet.addControl(new control.ToggleWireframe());
globus.planet.addControl(new control.KeyboardNavigation());
globus.planet.addControl(new control.RulerSwitcher());
let di = new control.DebugInfo();
globus.planet.addControl(di);
di.addWatch({
    label: "distance",
    frame: () => {
        if (geoObjects.getEntities()[0]) {
            return globus.planet.camera.eye.distance(geoObjects.getEntities()[0].getCartesian())
        }
        return 0.0;
    }
});

// fetch(`./fish.json`)
//     .then((response) => response.json())
//     .then((data) => {
//         const entities = [];
//         const { vertices, indices, normals, texCoords } = data;
//
//         let obj3d = new Object3d({
//             center: true,
//             vertices: vertices,
//             indices: indices,
//             normals: normals,
//             texCoords: texCoords,
//             src: "./fish.png"
//         });
//
//         for (let i = 0; i < 10; i++) {
//             let entity = new Entity({
//                 lonlat: [0, i, 0],
//                 name: "obj-" + i,
//                 geoObject: {
//                     pitch: Math.random(),
//                     yaw: Math.random(),
//                     roll: Math.random(),
//                     scale: 5.0,
//                     instanced: true,
//                     tag: "cube",
//                     color: colors[i % 7],
//                     object3d: obj3d
//                 }
//             });
//
//             entities.push(entity);
//         }
//
//         geoObjects.addEntities(entities);
//     });

geoObjects.events.on("lclick", function (e) {
    //e.pickingObject.geoObject.remove();
});

geoObjects.events.on("mouseenter", function (e) {
    let en = e.pickingObject, b = en.geoObject;
    //b.setColor(1, 1, 1);
});
geoObjects.events.on("mouseleave", function (e) {
    let en = e.pickingObject,
        b = en.geoObject;
    //b.setColor4v(utils.htmlColorToRgba(en.properties.color));
});

let counter = 0;
globus.planet.renderer.events.on("draw", () => {
    let e = geoObjects.getEntities();
    for (let i = 0; i < e.length; i++) {
        let gi = e[i].geoObject;
        gi.setYaw(counter * Math.PI / 180);
        gi.setPitch(counter * Math.PI / 180);
        gi.setRoll(counter * Math.PI / 180);
        counter += 0.01;
    }
})

geoObjects.addTo(globus.planet);

window.globus = globus;