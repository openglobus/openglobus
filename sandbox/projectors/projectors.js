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
    Projector
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

const projector1 = new Projector({
    enabled: true,
    depthCamera: {
        showFrustum: true,
        showFootprint: true,
        depthBiasWorld: 1, // meters
        normalBias: 0.45, // 0.2 .. 1.0
        horizontalViewAngle: 90,
        lonLat: [10.0814898, 46.4864594, 10000],
        lookLonLat: [9.0814898, 46.4864594, 0]
    },
    color: [1.0, 1.0, 0.0, 0.3],
    renderMode: "light",
    priority: 0
});
globus.planet.renderer.projectors.add(projector1);

const projector2 = new Projector({
    enabled: true,
    depthCamera: {
        showFrustum: true,
        showFootprint: true,
        depthBiasWorld: 1, // meters
        normalBias: 0.45, // 0.2 .. 1.0
        horizontalViewAngle: 60,
        lonLat: [10.0814898, 46.5864594, 5000],
        lookLonLat: [9.0814898, 41.4864594, 0]
    },
    color: [1.0, 1.0, 0.0, 0.3],
    renderMode: "light",
    priority: 0
});
globus.planet.renderer.projectors.add(projector2);

const depthCamera1 = projector1.depthCamera;
const depthCamera2 = projector2.depthCamera;

const projectorCamera1 = depthCamera1.camera;
window.depthCamera1 = projectorCamera1;

// A 16:9 frustum, the depth framebuffer itself stays square.
const projectorCamera2 = depthCamera2.camera;
projectorCamera2.setViewportSize(1920, 1080);
projectorCamera2.update();
window.depthCamera2 = projectorCamera2;

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
