import {
    control,
    Entity,
    Object3d,
    Renderer,
    Vec3,
    Mat4,
    Scene,
    EntityCollection,
    scene,
} from "../../lib/og.es.js";

let renderer = new Renderer("frame", {
    msaa: 8,
    controls: [new control.SimpleNavigation({ speed: 0.01 })],
    autoActivate: true
});

class MyScene extends Scene {
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
                src: "./template3.png",
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

        let rayEntity3 = new Entity({
            ray: {
                thickness: 10,
                startPosition: [5, 0, 0],
                endPosition: [5, 15, 0],
                startColor: "rgba(255,0,0,0.5)",
                endColor: "rgba(255,0,0,0.5)",
                //src: "./template2.png",
                //src: "data:image/png;base64,R0lGODlhAQABAIAAAP7//wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="
            }
        });

        let collection = new EntityCollection({
            entities: [rayEntity1, rayEntity2, rayEntity3]
        });

        collection.addTo(this);

        window.collection = collection;

        this.renderer.activeCamera.set(new Vec3(-4, 11, 13), new Vec3(1, 0, 0));
        this.renderer.activeCamera.update();
    }
}

renderer.addScenes([
    new scene.Axes(),
    new MyScene()
]);
