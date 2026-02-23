import {
    control,
    Entity,
    Object3d,
    Renderer,
    Vec3,
    Mat4,
    RenderNode,
    EntityCollection,
    scene,
} from "../../lib/og.es.js";

let renderer = new Renderer("frame", {
    msaa: 8,
    controls: [new control.SimpleNavigation({speed: 0.01})],
    autoActivate: true
});

class MyScene extends RenderNode {
    constructor() {
        super("MyScene");
    }

    init() {

        let e1 = new Entity({
            polyline: {
                path3v: [[[5, 0, 5], [5, 5, 5], [0, 5, 0]], [[-5, 0, -5], [-5, 5, -5]]],
                thickness: 12.5,
                src: [null, null],
                color: "white",
                isClosed: false
            }
        });

        let e2 = new Entity({
            polyline: {
                path3v: [[[10, 0, 10], [10, 15, 10], [0, 15, 0], [10, 25, 10]]],
                thickness: 25.5,
                src: "./template2.png",
                color: "white",
                isClosed: false
            }
        });

        let collection = new EntityCollection({
            entities: [e1, e2]
        });

        collection.addTo(this);

        window.collection = collection;

        this.renderer.activeCamera.set(new Vec3(-4, 11, 13), new Vec3(1, 0, 0));
        this.renderer.activeCamera.update();
    }
}

renderer.addNodes([
    new scene.Axes(),
    new MyScene()
]);

function test_appendPath3v(i = 0) {
    collection.getEntities()[i].polyline.appendPath3v([[15, 10, 15], [15, 15, 15], [10, 15, 10], [15, 50, 15]]);
}

function test_setPath3v(i, path3v, pathColors, forceEqual, segmentIndex) {
    collection.getEntities()[i].polyline.setPath3v(path3v, pathColors, forceEqual, segmentIndex);
}

function test_removePath(i, segmentIndex) {
    collection.getEntities()[i].polyline.removePath(segmentIndex);
}

function test_setPath3vEXT() {
    collection.getEntities()[0].polyline.setPath3v([new Vec3(2, 0, 2), new Vec3(2, 2, 2)], [[0, 1, 0], [1, 0, 0]], true, 0);
    collection.getEntities()[0].polyline.setPath3v([new Vec3(-2, 0, -2), new Vec3(-2, 2, -2), new Vec3(10, 10, 10)], [[0, 1, 0], [1, 0, 0], [1,1,1]], true, 1);
}

function test_setPath3vEXT2() {
    collection.getEntities()[0].polyline.setPath3v(
        [[new Vec3(7, 0, 7), new Vec3(7, 7, 7)], [new Vec3(-7, 0, -7), new Vec3(-7, 7, -7)]],
        null, false
    );
}

function test_addPoint3v(i = 0, poi, segIndex) {
    collection.getEntities()[i].polyline.addPoint3v(new Vec3(poi[0], poi[1], poi[2]), segIndex);
}

function test_removePoint(i, index, segmentIndex) {
    collection.getEntities()[i].polyline.removePoint(index, segmentIndex);
}

function test_setPoint3v(i, coords, index, segmentIndex) {
    collection.getEntities()[i].polyline.setPoint3v(new Vec3(coords[0], coords[1], coords[2]), index, segmentIndex);
}

// function test_start() {
//     let counter = 0
//     renderer.events.on("draw", () => {
//         if (counter % 2) {
//             test_appendPath3v(1);
//         } else {
//             test_removePath(1, 1);
//         }
//         counter++;
//     });
// }

Object.assign(window, {
    //test_start,
    test_appendPath3v,
    test_addPoint3v,
    test_setPath3v,
    test_setPath3vEXT,
    test_removePoint,
    test_removePath,
    test_setPoint3v,
    test_setPath3vEXT2
});
