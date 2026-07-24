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

let uavLayer = new Vector("UAV.Layer", {
    scaleByDistance: [50, 50000, 1],
    receiveProjectors: false
});

let myObjects = new Vector("myObjects", {
    scaleByDistance: [1, 1, 1]
});

const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    layers: [new Bing(), new OpenStreetMap(), uavLayer, myObjects],
    atmosphereEnabled: true,
    fontsSrc: "../../res/fonts"
    //reverseDepth: false
});

globus.planet.addControl(new control.TimelineControl());
globus.planet.addControl(new control.DebugInfo());
globus.planet.addControl(new control.LayerSwitcher());
globus.planet.addControl(new control.DrawingSwitcher());
globus.planet.addControl(new control.EntityEditor());

const uavGltfPromise = Gltf.loadGlb("./uav.glb");
const cameraFrustumObject3d = Object3d.createFrustum();
const trackedCameraEntities = [];
const skyCubeObject3d = Object3d.createCube(10000, 10000, 10000).setColor("white");
const PROJECTOR_NEAR = 300.0;
const PROJECTOR_FAR = 100000.0;

myObjects.add(
    new Entity({
        name: "sky-cube",
        lonlat: new LonLat(9.0814898, 46.4864594, 10000),
        independentPicking: true,
        geoObject: {
            tag: "sky-cube",
            object3d: skyCubeObject3d
        }
    })
);

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

let cameraObjectCounter = 0;
const keyboardNavigation = new control.KeyboardNavigation();
globus.planet.addControl(keyboardNavigation);

const depthCameraHandler = new control.DepthCameraHandler();
globus.planet.addControl(depthCameraHandler);

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

globus.planet.renderer.events.on("predraw", syncTrackedCameras, null, -300);

async function createTrackedCameraEntity(cameraSnapshot) {
    const uavGltf = await uavGltfPromise;
    const uavObjects = uavGltf.getObjects3d();

    if (!uavObjects.length) {
        return;
    }

    const rootName = uavObjects[0].name || "root";
    const objectId = cameraObjectCounter++;

    const depthCamera = new DepthCamera({
        near: PROJECTOR_NEAR,
        far: PROJECTOR_FAR,
        showFrustum: false,
        showFootprint: false,
        excludeLayers: [uavLayer],
        bias: 0.00006, //0.00003 .. 0.00008 - 0.0005
        normalBias: 0.45, // 0.2 .. 1.0
        depthEpsilon: 0.0001 //0.00015 .. 0.0005 - 0.0015
    });
    depthCameraHandler.add(depthCamera);

    const projectorCamera = depthCamera.camera;
    projectorCamera.copy(cameraSnapshot);
    projectorCamera.update();

    const projector = new Projector({
        enabled: true,
        depthCamera,
        color: [1.0, 1.0, 0.0, 0.3],
        renderMode: "color",
        priority: 0
    });
    globus.planet.renderer.projectors.add(projector);

    const depthPreview = new control.FramebufferPreview({
        title: `depthCamera:${objectId}`,
        arrayTexture: projector.arrayTexture,
        arrayLayer: projector.slot,
        width: depthCamera.framebuffer.width,
        height: depthCamera.framebuffer.height,
        image: depthPreviewShader,
        flippedY: true
    });
    globus.planet.addControl(depthPreview);

    const uavModelRoot = new Entity({
        name: `uav:${objectId}`,
        cartesian: projectorCamera.eye.clone(),
        independentPicking: true,
        properties: {
            camera: projectorCamera,
            depthCamera,
            depthPreview,
            projector
        },
        geoObject: {
            tag: `uav:${rootName}`,
            object3d: uavObjects[0]
        }
    });
    uavModelRoot.setAbsoluteYaw(projectorCamera.getYaw());

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
            projectorCamera.horizontalViewAngle,
            projectorCamera.verticalViewAngle
        )
    );

    frustumEntity.setAbsolutePitch(projectorCamera.getPitch());
    frustumEntity.setAbsoluteYaw(projectorCamera.getYaw());
    frustumEntity.setAbsoluteRoll(projectorCamera.getRoll());

    uavModelRoot.properties.frustumEntity = frustumEntity;

    uavLayer.add(uavModelRoot);
    trackedCameraEntities.push(uavModelRoot);

    //keyboardNavigation.bindCamera(projectorCamera);
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
