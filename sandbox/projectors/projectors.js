import {
    Globe,
    control,
    Vector,
    Entity,
    LonLat,
    OpenStreetMap,
    GlobusRgbTerrain,
    Bing,
    PlanetCamera,
    input,
    Gltf,
    Object3d,
    Projector,
    DepthCamera
} from "../../lib/og.es.js";

let myObjects = new Vector("myObjects", {
    scaleByDistance: [1, 1, 1]
});

const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    layers: [new Bing(), new OpenStreetMap(), myObjects],
    atmosphereEnabled: true,
    fontsSrc: "../../res/fonts"
    //reverseDepth: false
});

globus.planet.addControl(new control.TimelineControl());
globus.planet.addControl(new control.DebugInfo());
globus.planet.addControl(new control.LayerSwitcher());
globus.planet.addControl(new control.DrawingSwitcher());
globus.planet.addControl(new control.EntityEditor());

const skyCubeObject3d = Object3d.createCube(10000, 10000, 10000).setColor("white");

const skyCubeEntity = new Entity({
    name: "sky-cube",
    lonlat: new LonLat(9.0814898, 46.4864594, 10000),
    independentPicking: true,
    geoObject: {
        tag: "sky-cube",
        object3d: skyCubeObject3d
    }
});
myObjects.add(skyCubeEntity);

const depthPreviewShader = `float linearizeDepth(float z, float near, float far) {
                float ndcZ = z * 2.0 - 1.0;
                return (2.0 * near * far) / (far + near - ndcZ * (far - near));
            }

            void mainImage(out vec4 fragColor, in vec2 fragCoord){
                float near = 100.0;
                float far = 100000.0;
                float depth = texture(inputTextureArray, vec3(fragCoord, float(u_arrayLayer))).r;
                float linearDepth = linearizeDepth(depth, near, far);
                float normalized = pow(near / max(linearDepth, near), 0.35);
                fragColor = vec4(vec3(clamp(normalized, 0.0, 1.0)), 1.0);
            }`;

const depthCameraHandler = new control.DepthCameraHandler();
globus.planet.addControl(depthCameraHandler);

const depthCamera1 = new DepthCamera({
    showFrustum: true,
    showFootprint: true,
    bias: 0.00006, //0.00003 .. 0.00008 - 0.0005
    normalBias: 0.45, // 0.2 .. 1.0
    depthEpsilon: 0.0001 //0.00015 .. 0.0005 - 0.0015
});
depthCameraHandler.add(depthCamera1);

const depthCamera2 = new DepthCamera({
    showFrustum: true,
    showFootprint: true,
    bias: 0.00006, //0.00003 .. 0.00008 - 0.0005
    normalBias: 0.45, // 0.2 .. 1.0
    depthEpsilon: 0.0001 //0.00015 .. 0.0005 - 0.0015
});
depthCameraHandler.add(depthCamera2);

const projectorCamera1 = depthCamera1.camera;
projectorCamera1.setLonLat(new LonLat(10.0814898, 46.4864594, 10000), new LonLat(9.0814898, 46.4864594, 0));
projectorCamera1.setHorizontalViewAngle(90);
projectorCamera1.setViewportSize(1024, 1024);
projectorCamera1.update();

window.depthCamera1 = projectorCamera1;

const projectorCamera2 = depthCamera2.camera;
projectorCamera2.setLonLat(new LonLat(10.0814898, 46.5864594, 5000), new LonLat(9.0814898, 41.4864594, 0));
projectorCamera2.setHorizontalViewAngle(60);
projectorCamera2.setViewportSize(1920, 1080);
projectorCamera2.update();

window.depthCamera2 = projectorCamera2;

const projector1 = new Projector({
    enabled: true,
    depthCamera: depthCamera1,
    color: [1.0, 1.0, 0.0, 0.3],
    renderMode: "light",
    priority: 0
});
globus.planet.renderer.projectors.add(projector1);

const projector2 = new Projector({
    enabled: true,
    depthCamera: depthCamera2,
    color: [1.0, 1.0, 0.0, 0.3],
    renderMode: "light",
    priority: 0
});
globus.planet.renderer.projectors.add(projector2);

const depthPreview1 = new control.FramebufferPreview({
    title: `DepthCamera1`,
    arrayTexture: projector1.arrayTexture,
    arrayLayer: projector1.slot,
    width: depthCamera1.framebuffer.width,
    height: depthCamera1.framebuffer.height,
    image: depthPreviewShader,
    flippedY: true
});
globus.planet.addControl(depthPreview1);

const depthPreview2 = new control.FramebufferPreview({
    title: `DepthCamera2`,
    arrayTexture: projector2.arrayTexture,
    arrayLayer: projector2.slot,
    width: depthCamera2.framebuffer.width,
    height: depthCamera2.framebuffer.height,
    image: depthPreviewShader,
    flippedY: true
});
globus.planet.addControl(depthPreview2);

// const frustumEntity = new Entity({
//     name: `frustum`,
//     relativePosition: true,
//     independentPicking: true,
//     geoObject: {
//         tag: "camera-frustum",
//         color: "rgba(0,255,0,0.1)",
//         object3d: cameraFrustumObject3d
//     }
// });
//
// uavModelRoot.appendChild(frustumEntity);
//
// frustumEntity.setScale3v(
//     Object3d.getFrustumScaleByCameraAngles(3, depthCamera.horizontalViewAngle, depthCamera.verticalViewAngle)
// );
//
// frustumEntity.setAbsolutePitch(depthCamera.getPitch());
// frustumEntity.setAbsoluteYaw(depthCamera.getYaw());
// frustumEntity.setAbsoluteRoll(depthCamera.getRoll());

globus.planet.renderer.events.on("charkeypress", input.KEY_C, (e) => {
    let mouseGroundPoint = globus.planet.getCartesianFromMouseTerrain();
    if (mouseGroundPoint) {
        const upNormal = globus.planet.ellipsoid.getSurfaceNormal3v(projectorCamera1.eye);
        projectorCamera1.set(projectorCamera1.eye, mouseGroundPoint, upNormal);
        projectorCamera1.update();
    }
});

globus.planet.renderer.events.on("charkeypress", input.KEY_V, () => {});
