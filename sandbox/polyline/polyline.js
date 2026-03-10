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
                path3v: [[[5, 0, 5], [5, 5, 5]], [[-5, 0, -5], [-5, 5, -5]]],
                thickness: 2.5,
                src: ["./template3.png", null],
                color: "white",
                isClosed: false
            }
        });

        let e2 = new Entity({
            polyline: {
                path3v: [[[10, 0, 10], [10, 15, 10], [0, 15, 0], [10, 25, 10]]],
                thickness: 5.5,
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

function test(i = 0) {
    collection.getEntities()[i].polyline.appendPath3v([[15, 10, 15], [15, 15, 15], [10, 15, 10], [15, 50, 15]]);
}

function test2(i = 0, poi, segIndex) {
    collection.getEntities()[i].polyline.addPoint3v(new Vec3(poi[0], poi[1], poi[2]), segIndex);
}

window.test = test;
window.test2 = test2;
