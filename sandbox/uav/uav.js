import {
    Globe,
    control,
    Vector,
    Entity,
    OpenStreetMap,
    GlobusRgbTerrain,
    Bing,
    PlanetCamera,
    input,
    Gltf,
    Object3d,
    RendererProjector
} from "../../lib/og.es.js";

let uavLayer = new Vector("UAV.Layer", {
    scaleByDistance: [50, 50000, 1]
});

const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    layers: [new Bing(), new OpenStreetMap(), uavLayer],
    atmosphereEnabled: true,
    fontsSrc: "../../res/fonts",
});

globus.planet.addControl(new control.TimelineControl());
globus.planet.addControl(new control.DebugInfo());
globus.planet.addControl(new control.LayerSwitcher());
globus.planet.addControl(new control.DrawingSwitcher());
globus.planet.addControl(new control.EntityEditor());

const uavGltfPromise = Gltf.loadGlb("./uav.glb");
const cameraFrustumObject3d = Object3d.createFrustum();
const trackedCameraEntities = [];

const depthPreviewShader = `float linearizeDepth(float z, float near, float far) {
                float ndcZ = z * 2.0 - 1.0;
                return (2.0 * near * far) / (far + near - ndcZ * (far - near));
            }

            void mainImage(out vec4 fragColor, in vec2 fragCoord){
                float near = 100.0;
                float far = 100000.0;
                float depth = texture(inputTexture, fragCoord).r;
                float linearDepth = linearizeDepth(depth, near, far);
                float normalized = pow(near / max(linearDepth, near), 0.35);
                fragColor = vec4(vec3(clamp(normalized, 0.0, 1.0)), 1.0);
            }`;

let cameraObjectCounter = 0;
const keyboardNavigation = new control.KeyboardNavigation();
globus.planet.addControl(keyboardNavigation);

function syncTrackedCameras() {
    for (let i = 0; i < trackedCameraEntities.length; i++) {
        const entity = trackedCameraEntities[i];
        const camera = entity?.properties?.camera;
        const frustumEntity = entity?.properties?.frustumEntity;

        if (!camera || !frustumEntity) {
            continue;
        }

        camera.eye.copy(frustumEntity.getAbsoluteCartesian());
        camera.setPitchYawRoll(
            frustumEntity.getAbsolutePitch(),
            frustumEntity.getAbsoluteYaw(),
            frustumEntity.getAbsoluteRoll()
        );

        camera.update();
    }
}

globus.planet.renderer.events.on("draw", syncTrackedCameras, null, -300);

async function createTrackedCameraEntity(cameraSnapshot) {
    const uavGltf = await uavGltfPromise;
    const uavObjects = uavGltf.getObjects3d();

    if (!uavObjects.length) {
        return;
    }

    const rootName = uavObjects[0].name || "root";
    const objectId = cameraObjectCounter++;

    const depthHandler = new control.CameraDepthHandler({
        showFrustum: false,
        showFootprint: false
    });
    globus.planet.addControl(depthHandler);

    const depthCamera = depthHandler.camera;
    if (!depthCamera) {
        return;
    }
    depthCamera.copy(cameraSnapshot);

    const projector = new RendererProjector({
        enabled: true,
        camera: depthCamera,
        depthTexture: depthHandler.getDepthTexture(),
        color: [1.0, 1.0, 0.1],
        intensity: 1.0,
        opacity: 0.45,
        bias: 0.0005,
        normalBias: 0.0,
        depthEpsilon: 0.0015,
        mode: "decal",
        priority: 0
    });
    globus.planet.renderer.projectors.add(projector);

    const framebuffer = depthHandler.framebuffer;

    const depthPreview = new control.FramebufferPreview({
        title: `depthHandler:${objectId}`,
        framebuffer,
        image: depthPreviewShader,
        flippedY: true
    });
    globus.planet.addControl(depthPreview);

    const uavModelRoot = new Entity({
        name: `uav:${objectId}`,
        cartesian: depthCamera.eye.clone(),
        independentPicking: true,
        properties: {
            camera: depthCamera,
            depthHandler,
            depthPreview,
            projector
        },
        geoObject: {
            tag: `uav:${rootName}`,
            object3d: uavObjects[0]
        }
    });
    uavModelRoot.setAbsoluteYaw(depthCamera.getYaw());

    const frustumEntity = new Entity({
        name: `uav-frustum:${objectId}`,
        relativePosition: true,
        independentPicking: true,
        geoObject: {
            tag: "camera-frustum",
            color: "rgba(0,255,0,0.1)",
            object3d: cameraFrustumObject3d
        }
    });

    uavModelRoot.appendChild(frustumEntity);

    frustumEntity.setScale3v(
        Object3d.getFrustumScaleByCameraAngles(
            3,
            depthCamera.horizontalViewAngle,
            depthCamera.verticalViewAngle
        )
    );

    frustumEntity.setAbsolutePitch(depthCamera.getPitch());
    frustumEntity.setAbsoluteYaw(depthCamera.getYaw());
    frustumEntity.setAbsoluteRoll(depthCamera.getRoll());

    uavModelRoot.properties.frustumEntity = frustumEntity;

    uavLayer.add(uavModelRoot);
    trackedCameraEntities.push(uavModelRoot);

    //keyboardNavigation.bindCamera(depthCamera);
}

let tempCamera = new PlanetCamera(globus.planet);

function saveCamera() {
    let cam = globus.planet.camera;
    const cameraSnapshot = new PlanetCamera(globus.planet);
    cameraSnapshot.copy(cam);
    tempCamera.copy(cam);
    createTrackedCameraEntity(cameraSnapshot).catch((error) => {
        console.error("Unable to create tracked UAV camera entity", error);
    });
}

function restoreCamera() {
    globus.planet.camera.copy(tempCamera);
}

globus.planet.renderer.events.on("charkeypress", input.KEY_C, () => {
    saveCamera();
});

globus.planet.renderer.events.on("charkeypress", input.KEY_V, () => {
    restoreCamera();
});

// function updateSkyBoxFrustum() {
//     const camera = globus.planet.camera;
//     const alt = camera.getAltitude();
//     camera.setNearFar(alt - alt * 0.9);
// }
//
// globus.planet.camera.events.on("viewchange", updateSkyBoxFrustum);
// updateSkyBoxFrustum();

// let toneMappingFramebufferPreview = new control.FramebufferPreview({
//     title: "toneMappingFramebuffer",
//     framebuffer: globus.renderer.toneMappingFramebuffer,
//     flippedUV: true
// });
// globus.planet.addControl(toneMappingFramebufferPreview);

// let pickingFramebufferPreview = new control.FramebufferPreview({
//     title: "pickingFramebuffer",
//     framebuffer: globus.renderer.pickingFramebuffer,
//     flippedUV: true
// });
// globus.planet.addControl(pickingFramebufferPreview);

// globus.planet.renderer.controls.SimpleSkyBackground.colorOne = "black";
// globus.planet.renderer.controls.SimpleSkyBackground.colorTwo = "black";
