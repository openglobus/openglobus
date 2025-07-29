/* eslint-disable no-undef */
import {
    Globe,
    control,
    Vector,
    LonLat,
    Entity,
    OpenStreetMap,
    EmptyTerrain,
    RgbTerrain,
    GlobusRgbTerrain,
    Object3d,
    mercator,
    Bing,
    GeoVideo,
    XYZ,
    utils,
    PlanetCamera,
    Framebuffer,
    input,
    Program,
    Vec4,
    Vec2,
    GeoImage,
    Renderer,
    Vec3,
    Mat4,
    RenderNode,
    EntityCollection,
    scene,
    Gltf,
    Easing
} from "../../lib/og.es.js";

let renderer = new Renderer("frame", {
    msaa: 8,
    controls: [new control.SimpleNavigation({ speed: 0.01 }), new control.GeoObjectEditor()],
    autoActivate: true
});

class MyScene extends RenderNode {
    constructor() {
        super("MyScene");
    }

    init() {

        let collection = new EntityCollection({
            entities: []
        });

        collection.addTo(this);

        const cameraPositions = [
            [new Vec3(20, 21, 23), new Vec3(0, 2, 2), Vec3.UP, Easing.ElasticOut],
            [new Vec3(40, 10, 15), new Vec3(10, 0, 0), Vec3.LEFT, Easing.ElasticOut],
            [new Vec3(10, 30, 45), new Vec3(10, 0, 0), Vec3.DOWN, Easing.CubicInOut],
            [new Vec3(40, 10, 15), new Vec3(10, 10, 0), Vec3.RIGHT, Easing.BackInOut],
        ];
        let i = 0;
        setInterval(() => {
            this.renderer.activeCamera.flyCartesian(cameraPositions[i][0], {
                look: cameraPositions[i][1],
                up: cameraPositions[i][2],
                ease: cameraPositions[i][3],
            });
            i = (i + 1) % cameraPositions.length;
        }, 1500);
        console.log(this.renderer.activeCamera);

        DracoDecoderModule().then((decoderModule) => {
            Gltf.connectDracoDecoderModule(decoderModule);
            Gltf.loadGlb("./maxwell_the_cat.glb").then((gltf) => {
                const entities = gltf.toEntities();
                const cat = entities[0];
                cat.setScale(0.5);
                cat.setPitch(-90 * (Math.PI / 180));
                collection.add(cat);
            });
        });

        Gltf.loadGlb("./f22.glb").then((gltf) => {
            const entity = gltf.toEntities()[0];
            entity.setScale(1);
            entity.setCartesian(20, 5, 0);
            entity.setPitch(-90 * (Math.PI / 180));
            collection.add(entity);
        });
    }
}

renderer.addNodes([new scene.Axes(), new MyScene()]);
