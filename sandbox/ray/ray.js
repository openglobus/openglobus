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

        let rayEntity1 = new Entity({
            ray: {
                thickness: 10,
                startPosition: [1, 0, 1],
                endPosition: [1, 10, 1],
                startColor: "white",
                endColor: "white",
                src: "./template.png",
                //src: "data:image/png;base64,R0lGODlhAQABAIAAAP7//wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="
            }
        });

        let rayEntity2 = new Entity({
            ray: {
                thickness: 20,
                startPosition: [2, 0, 0],
                endPosition: [2, 5, 0],
                startColor: "white",
                endColor: "white",
                src: "./template2.png",
                //src: "data:image/png;base64,R0lGODlhAQABAIAAAP7//wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="
            }
        });

        let collection = new EntityCollection({
            entities: [rayEntity1, rayEntity2]
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