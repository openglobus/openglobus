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
    controls: [new control.SimpleNavigation({ speed: 0.01 })],
    autoActivate: true
});

class MyScene extends RenderNode {
    constructor() {
        super("MyScene");
    }

    init() {

        let e1 = new Entity({
            polyline: {
                path3v: [[[1, 0, 1], [3, 5, 3], [0, 10, 0]]],
                thickness: 5.5,
                src: "./template3.png",
                isClosed: false
            }
        });

        let e2 = new Entity({
            polyline: {
                path3v: [[[5, 0, 5], [5, 15, 5], [0, 15, 0], [5, 150, 5]]],
                thickness: 2.5,
                src: "./template2.png",
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