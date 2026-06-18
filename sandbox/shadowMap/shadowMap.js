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
    Vec3
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
    textureSize: 1024,
    near: 1000,
    far: 150000,
    focusDistance: 100000,
    viewAngle: 45,
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
shadowCamera.setLonLat(new LonLat(10.0814898, 46.4864594, 10000), new LonLat(9.0814898, 46.4864594, 0));
shadowCamera.update();

timelineControl.events.on("setcurrent", () => {
    const direction = globus.planet.sun.getPosition().normal().scale(-1.0);
    const look = shadowCamera.eye.add(direction);
    let up = globus.planet.ellipsoid.getSurfaceNormal3v(shadowCamera.eye);

    if (Math.abs(up.dot(direction)) > 0.999) {
        up = Vec3.proj_b_to_plane(Vec3.NORTH, up, Vec3.UNIT_X).normalize();
    }

    shadowCamera.set(shadowCamera.eye, look, up);
    shadowCamera.update();
});

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
    width: depthCamera.framebuffer.width,
    height: depthCamera.framebuffer.height,
    image: depthPreviewShader,
    flippedY: true
});
globus.planet.addControl(depthPreview);

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
