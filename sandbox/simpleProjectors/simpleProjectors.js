import {
    control,
    Entity,
    EntityCollection,
    Object3d,
    Projector,
    Renderer,
    Scene,
    scene,
    Vec3
} from "../../lib/og.es.js";

const NEAR = 0.1;
const FAR = 30;

const renderer = new Renderer("frame", {
    msaa: 8,
    controls: [new control.SimpleNavigation({ speed: 0.01 }), new control.EntityEditor()],
    autoActivate: true
});

const objects = new EntityCollection({
    entities: [
        new Entity({
            name: "floor",
            cartesian: new Vec3(0, -0.05, 0),
            geoObject: {
                tag: "floor",
                color: "rgb(200,200,200)",
                object3d: Object3d.createCube(20, 0.1, 20)
            }
        }),
        new Entity({
            name: "cube1",
            cartesian: new Vec3(-1.5, 0.5, 0),
            geoObject: {
                tag: "cube1",
                color: "rgb(120,160,220)",
                object3d: Object3d.createCube(1, 1, 1)
            }
        }),
        new Entity({
            name: "cube2",
            cartesian: new Vec3(1.5, 1, 1),
            geoObject: {
                tag: "cube2",
                color: "rgb(220,140,120)",
                object3d: Object3d.createCube(1.5, 2, 1.5)
            }
        })
    ]
});

const objectsScene = new Scene("objects");
objects.addTo(objectsScene);

renderer.addScenes([new scene.Axes(), objectsScene]);

renderer.activeCamera.set(new Vec3(-6, 8, 12), new Vec3(0, 0, 0));
renderer.activeCamera.update();

const projector1 = new Projector({
    depthCamera: {
        near: NEAR,
        far: FAR,
        depthBiasWorld: 0.01,
        showFrustum: true,
        eye: [-6, 5, 4],
        look: [0, 0, 0],
        up: [0, 1, 0]
    },
    color: [1.0, 1.0, 0.0, 0.5],
    renderMode: "light"
});

const projector2 = new Projector({
    depthCamera: {
        near: NEAR,
        far: FAR,
        depthBiasWorld: 0.01,
        showFrustum: true,
        eye: [6, 6, -3],
        look: [0, 0, 1],
        up: [0, 1, 0]
    },
    color: [0.0, 1.0, 1.0, 0.5],
    renderMode: "light"
});

renderer.projectors.add(projector1);
renderer.projectors.add(projector2);

const depthCamera1 = projector1.depthCamera;
const depthCamera2 = projector2.depthCamera;

const depthPreviewShader = `float linearizeDepth(float z, float near, float far) {
                float ndcZ = z * 2.0 - 1.0;
                return (2.0 * near * far) / (far + near - ndcZ * (far - near));
            }

            void mainImage(out vec4 fragColor, in vec2 fragCoord){
                float near = ${NEAR.toFixed(2)};
                float far = ${FAR.toFixed(1)};
                float depth = texture(inputTextureArray, vec3(fragCoord, float(u_arrayLayer))).r;
                if (depth >= 1.0) {
                    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
                    return;
                }
                float linearDepth = linearizeDepth(depth, near, far);
                float normalized = 1.0 - (linearDepth - near) / (far - near);
                fragColor = vec4(vec3(clamp(normalized, 0.0, 1.0)), 1.0);
            }`;

[projector1, projector2].forEach((projector, i) => {
    renderer.addControl(
        new control.FramebufferPreview({
            title: `DepthCamera${i + 1}`,
            arrayTexture: projector.arrayTexture,
            arrayLayer: projector.slot,
            width: projector.depthCamera.framebuffer.width,
            height: projector.depthCamera.framebuffer.height,
            image: depthPreviewShader,
            flippedY: true
        })
    );
});

window.renderer = renderer;
window.depthCamera1 = depthCamera1;
window.depthCamera2 = depthCamera2;
