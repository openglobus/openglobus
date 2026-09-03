import {
    Globe,
    control,
    Vector,
    Entity,
    LonLat,
    OpenStreetMap,
    GlobusRgbTerrain,
    Bing,
    input,
    Object3d,
    ShadowMap,
    DepthCamera,
    XYZ,
    Vec3,
    CameraFootprint,
    ShadowCameraFit
} from "../../lib/og.es.js";

let myObjects = new Vector("myObjects", {
    scaleByDistance: [1, 1, 1]
});

let footprintDebug = new Vector("footprintDebug", {
    scaleByDistance: [1, 100000000, 0.003],
    receiveShadows: false
});

const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    layers: [
        new XYZ("white", {
            isBaseLayer: true
        }),
        new Bing(),
        new OpenStreetMap(),
        myObjects,
        footprintDebug
    ],
    atmosphereEnabled: true,
    fontsSrc: "../../res/fonts",
    sun: {
        localDateTime: new Date(2026, 7, 4, 18, 0)
    }
});

globus.planet.addControl(new control.TimelineControl());
globus.planet.addControl(new control.DebugInfo());
globus.planet.addControl(new control.LayerSwitcher());
globus.planet.addControl(new control.DrawingSwitcher());
globus.planet.addControl(new control.EntityEditor());

const skyCubeEntity = new Entity({
    name: "sky-cube",
    lonlat: new LonLat(9.0814898, 46.4864594, 10000),
    independentPicking: true,
    geoObject: {
        tag: "sky-cube",
        object3d: Object3d.createCube(10000, 10000, 10000).setColor("white")
    }
});
myObjects.add(skyCubeEntity);

const mediumSkyCubeEntity = new Entity({
    name: "sky-cube-medium",
    lonlat: new LonLat(9.2314898, 46.4864594, 6000),
    independentPicking: true,
    geoObject: {
        tag: "sky-cube-medium",
        object3d: Object3d.createCube(6000, 6000, 6000).setColor("white")
    }
});
myObjects.add(mediumSkyCubeEntity);

const smallSkyCubeEntity = new Entity({
    name: "sky-cube-small",
    lonlat: new LonLat(8.9514898, 46.4864594, 3000),
    independentPicking: true,
    geoObject: {
        tag: "sky-cube-small",
        object3d: Object3d.createCube(3000, 3000, 3000).setColor("white")
    }
});
myObjects.add(smallSkyCubeEntity);

const FOOTPRINT_POINT_COUNT = 4;

const footprintMarkers = [];
const footprintGroundRays = [];

for (let i = 0; i < FOOTPRINT_POINT_COUNT; i++) {
    footprintMarkers.push(
        new Entity({
            name: `footprint-marker-${i}`,
            visibility: false,
            independentPicking: true,
            geoObject: {
                tag: `footprint-marker-${i}`,
                object3d: Object3d.createSphere(16, 16, 3).setColor("yellow")
            }
        })
    );

    footprintGroundRays.push(
        new Entity({
            name: `footprint-ground-ray-${i}`,
            visibility: false,
            ray: {
                startPosition: new Vec3(),
                endPosition: new Vec3(),
                startColor: "rgba(0,255,255,0.9)",
                endColor: "rgba(0,255,255,0.15)",
                thickness: 2.5
            }
        })
    );

    footprintDebug.add(footprintMarkers[i]);
    footprintDebug.add(footprintGroundRays[i]);
}

const footprintContour = new Entity({
    name: "footprint-contour",
    visibility: false,
    polyline: {
        path3v: [],
        thickness: 3,
        color: "yellow"
    }
});
footprintDebug.add(footprintContour);

const depthPreviewShader = `void mainImage(out vec4 fragColor, in vec2 fragCoord){
                float depth = texture(inputTextureArray, vec3(fragCoord, float(u_arrayLayer))).r;
                float normalized = depth <= 0.0 ? 0.0 : pow(1.0 - depth, 0.65);
                fragColor = vec4(vec3(clamp(normalized, 0.0, 1.0)), 1.0);
            }`;

const depthCameraHandler = new control.DepthCameraHandler();
globus.planet.addControl(depthCameraHandler);

const depthCamera = new DepthCamera({
    enableSegmentSkirts: true,
    enableSegmentFaceCulling: false,
    width: 1024,
    height: 1024,
    excludeLayers: [footprintDebug],
    near: 1000,
    far: 500000,
    focusDistance: 100000,
    verticalViewAngle: 45,
    isOrthographic: true,
    showFrustum: true,
    showFootprint: false
});

depthCameraHandler.add(depthCamera);

const shadowCamera = depthCamera.camera;

const footprint = new CameraFootprint({
    screenMargin: 100
});

const shadowCameraFit = new ShadowCameraFit();

function updateFootprintDebug() {
    for (let i = 0; i < FOOTPRINT_POINT_COUNT; i++) {
        footprintMarkers[i].setVisibility(true);
        footprintMarkers[i].setAbsoluteCartesian3v(footprint.surfacePoints[i]);

        footprintGroundRays[i].setVisibility(true);
        footprintGroundRays[i].ray.setStartPosition3v(footprint.surfacePoints[i]);
        footprintGroundRays[i].ray.setEndPosition3v(footprint.points[i]);
    }

    footprintContour.setVisibility(true);
    footprintContour.polyline.setPath3v([[...footprint.points, footprint.points[0]]], undefined, true);
}

function hideFootprintDebug() {
    for (let i = 0; i < FOOTPRINT_POINT_COUNT; i++) {
        footprintMarkers[i].setVisibility(false);
        footprintGroundRays[i].setVisibility(false);
    }

    footprintContour.setVisibility(false);
}

function updateShadowCamera() {
    if (!footprint.update(globus.planet.camera)) {
        hideFootprintDebug();
        return;
    }

    shadowCameraFit.fit(depthCamera, footprint, globus.planet.sunPos);
    updateFootprintDebug();
}

globus.planet.renderer.events.on("predraw", updateShadowCamera, null, -1);

const shadowMap = new ShadowMap({
    enabled: true,
    depthCamera,
    color: [1.0, 1.0, 1.0, 1.0],
    priority: 0
});
globus.planet.renderer.shadows.add(shadowMap);

const depthPreview = new control.FramebufferPreview({
    title: `ShadowMap`,
    arrayTexture: shadowMap.arrayTexture,
    arrayLayer: shadowMap.slot,
    width: 400,
    height: 400,
    image: depthPreviewShader,
    flippedY: true
});
globus.planet.addControl(depthPreview);
globus.planet.addControl(new control.ToggleWireframe());

window.shadowMapSandbox = {
    depthCamera,
    shadowCamera,
    shadowMap,
    footprint,
    fit: shadowCameraFit,
    stats: shadowCameraFit.stats
};

// globus.planet.renderer.events.on("charkeypress", input.KEY_C, () => {
//     let mouseGroundPoint = globus.planet.getCartesianFromMouseTerrain();
//     if (mouseGroundPoint) {
//         const upNormal = globus.planet.ellipsoid.getSurfaceNormal3v(shadowCamera.eye);
//         shadowCamera.set(shadowCamera.eye, mouseGroundPoint, upNormal);
//         shadowCamera.update();
//     }
// });
