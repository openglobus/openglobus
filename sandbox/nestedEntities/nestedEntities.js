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
    controls: [new control.SimpleNavigation({ speed: 0.01 }), new control.GeoObjectEditor()],
    autoActivate: true
});

window.renderer = renderer;

class MyScene extends RenderNode {
    constructor() {
        super("MyScene");
    }

    init() {
        const baseObj = Object3d.createCube(1, 1, 1).translate(new Vec3(0, 0, 0)).setMaterial({
            ambient: "#c2c2c2",
            diffuse: "#ffffff",
            shininess: 1
        });

        let parentEntity = new Entity({
            cartesian: new Vec3(0, 0, 0),
            independentPicking: true,
            geoObject: {
                color: "rgb(90,90,90)",
                scale: 1,
                instanced: true,
                tag: `baseObj`,
                object3d: baseObj
            }
        });

        let collection = new EntityCollection({
            entities: [parentEntity]
        });

        collection.addTo(this);

        this.renderer.activeCamera.set(new Vec3(10, 0, 0), new Vec3(0, 0, 0));
        this.renderer.activeCamera.isOrthographic = true;

        this.renderer.activeCamera.update();

        this.renderer.events.on("rclick", (e) => {
            //let dist = this.renderer.getDistanceFromPixel(e.pos);
            //let dir = this.renderer.activeCamera.unproject(e.x, e.y, dist);
            //console.log(dir);
        })
    }
}

renderer.addNodes([new scene.Axes(), new MyScene()]);

