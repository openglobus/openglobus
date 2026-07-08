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
    Vec3
} from "../../lib/og.es.js";

let myObjects = new Vector("myObjects", {
    scaleByDistance: [1, 1, 1]
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
        myObjects
    ],
    atmosphereEnabled: true,
    fontsSrc: "../../res/fonts"
    //reverseDepth: false
});

let timelineControl = new control.TimelineControl();

globus.planet.addControl(timelineControl);
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
    near: 1000,
    far: 500000,
    focusDistance: 100000,
    verticalViewAngle: 45,
    bias: 1000,
    normalBias: 0,
    depthEpsilon: 1000,
    geoObjectDepthPolygonOffsetFactor: 3,
    geoObjectDepthPolygonOffsetUnits: 4,
    intensity: 1,
    //position: new LonLat(10.0814898, 46.4864594, 10000),
    //look: new LonLat(9.0814898, 46.4864594, 0),
    isOrthographic: true,
    geoObjectDepthCullFace: "back",
    showFrustum: true,
    showFootprint: true
});

depthCameraHandler.add(depthCamera);

const shadowCamera = depthCamera.camera;

function updateShadowCamera() {
    let mc = globus.planet.camera;
    let direction = globus.planet.sun.getPosition().normal().scale(-1.0);
    let up = mc.eye.getNormal();
    let alt = mc.getHeight() - 8000;
    let eye = mc.eye.sub(up.scaleTo(alt));
    let look = eye.add(direction);

    shadowCamera.set(eye, look, up);
    shadowCamera.update();
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
    width: 400, //depthCamera.framebuffer.width,
    height: 400, //depthCamera.framebuffer.height,
    image: depthPreviewShader,
    flippedY: true
});
globus.planet.addControl(depthPreview);
globus.planet.addControl(new control.ToggleWireframe());

window.shadowMapSandbox = {
    globus,
    depthCamera,
    shadowCamera,
    shadowMap
};

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
        const upNormal = globus.planet.ellipsoid.getSurfaceNormal3v(shadowCamera.eye);
        shadowCamera.set(shadowCamera.eye, mouseGroundPoint, upNormal);
        shadowCamera.update();
    }
});

globus.planet.renderer.events.on("charkeypress", input.KEY_V, () => {});
