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

window.renderer = renderer;

class MyScene extends RenderNode {
    constructor() {
        super("MyScene");
    }

    init() {
        const baseObj = Object3d.createCube(10, 10, 10).translate(new Vec3(0, 0, 0)).setMaterial({
            ambient: "#c2c2c2",
            diffuse: "#ffffff",
            shininess: 1
        });

        window.test = () => {
            parentEntity.setPitch(0);
            cube2.setPitch(0);
            cube3.setPitch(0);

            parentEntity.setYaw(0);
            cube2.setYaw(0);
            cube3.setYaw(0);

            this.renderer.activeCamera.set(new Vec3(10.5, 0, 0), new Vec3(0, 0, 0), new Vec3(0, 1, 0));
        }

        let parentEntity = new Entity({
            cartesian: new Vec3(0, 0, 0),
            independentPicking: true,
            //yaw: 45 * Math.PI / 180,
            //pitch: 45 * Math.PI / 180,
            geoObject: {
                color: "rgb(90,90,90)",
                scale: 1,
                instanced: true,
                tag: `baseObj`,
                object3d: baseObj
            }
        });

        let cube2 = new Entity({
            cartesian: new Vec3(45, 0, 5),
            independentPicking: true,
            //yaw: 45 * Math.PI / 180,
            //pitch: 45 * Math.PI / 180,
            geoObject: {
                color: "rgb(90,90,90)",
                scale: 1,
                instanced: true,
                tag: `baseObj`,
                object3d: baseObj
            }
        });

        let cube3 = new Entity({
            cartesian: new Vec3(-1, 3, 1),
            independentPicking: true,
            //yaw: 45 * Math.PI / 180,
            pitch: 45 * Math.PI / 180,
            geoObject: {
                color: "rgb(90,90,90)",
                scale: 1,
                instanced: true,
                tag: `baseObj`,
                object3d: baseObj
            }
        });

        let collection = new EntityCollection({
            entities: [parentEntity, cube2]
        });

        collection.addTo(this);

        this.renderer.activeCamera.set(new Vec3(0, 100, 100), new Vec3(0, 0, 0));
        this.renderer.activeCamera.update();
        this.renderer.activeCamera.isOrthographic = true;

        this.renderer.getDepthMinDistanceAsync().then((dist) => {
            if (!dist) {
                dist = this.renderer.activeCamera.eye.length();
            }
            this.renderer.activeCamera.focusDistance = dist;
            this.renderer.activeCamera.isOrthographic = true;
        });


        this.renderer.events.on("rclick", (e) => {
            //let dist = this.renderer.getDistanceFromPixel(e.pos);
            //let dir = this.renderer.activeCamera.unproject(e.x, e.y, dist);
            //console.log(dir);
        })
    }
}

renderer.addNodes([new scene.Axes(), new MyScene()]);

