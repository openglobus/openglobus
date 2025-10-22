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

        let rayEntity = new Entity({
            cartesian: new Vec3(1, 1, 1),
            independentPicking: true,
            ray: {
                thickness: 5,
                startPosition: [0, 0, 0],
                endPosition: [10, 10, 10],
                startColor: "red",
                endColor: "green",
            }
        });

        let collection = new EntityCollection({
            entities: [rayEntity]
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