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

let horizonMarkers = new Vector("horizonMarkers", {
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
        horizonMarkers
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

const horizonMarkerLt = new Entity({
    name: "horizon-marker-lt",
    visibility: false,
    independentPicking: true,
    geoObject: {
        tag: "horizon-marker-lt",
        object3d: Object3d.createSphere(16, 16, 3).setColor("red")
    }
});
horizonMarkers.add(horizonMarkerLt);

const horizonMarkerRt = new Entity({
    name: "horizon-marker-rt",
    visibility: false,
    independentPicking: true,
    geoObject: {
        tag: "horizon-marker-rt",
        object3d: Object3d.createSphere(16, 16, 3).setColor("red")
    }
});
horizonMarkers.add(horizonMarkerRt);

const horizonMarkerLb = new Entity({
    name: "horizon-marker-lb",
    visibility: false,
    independentPicking: true,
    geoObject: {
        tag: "horizon-marker-lb",
        object3d: Object3d.createSphere(16, 16, 3).setColor("red")
    }
});
horizonMarkers.add(horizonMarkerLb);

const horizonMarkerRb = new Entity({
    name: "horizon-marker-rb",
    visibility: false,
    independentPicking: true,
    geoObject: {
        tag: "horizon-marker-rb",
        object3d: Object3d.createSphere(16, 16, 3).setColor("red")
    }
});
horizonMarkers.add(horizonMarkerRb);

const horizonLineTop = new Entity({
    name: "horizon-line-top",
    visibility: false,
    polyline: {
        path3v: [],
        thickness: 3,
        color: "red"
    }
});
horizonMarkers.add(horizonLineTop);

const horizonLineRight = new Entity({
    name: "horizon-line-right",
    visibility: false,
    polyline: {
        path3v: [],
        thickness: 3,
        color: "red"
    }
});
horizonMarkers.add(horizonLineRight);

const horizonLineBottom = new Entity({
    name: "horizon-line-bottom",
    visibility: false,
    polyline: {
        path3v: [],
        thickness: 3,
        color: "red"
    }
});
horizonMarkers.add(horizonLineBottom);

const horizonLineLeft = new Entity({
    name: "horizon-line-left",
    visibility: false,
    polyline: {
        path3v: [],
        thickness: 3,
        color: "red"
    }
});
horizonMarkers.add(horizonLineLeft);

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

const HORIZON_SCREEN_MARGIN = 100;

function getEllipsoidHit(mcam, x, y) {
    let ray = mcam.getRay(x, y);
    return globus.planet.ellipsoid.hitRay(ray.origin, ray.direction);
}

function getHorizonPointByDirection(mcam, direction) {
    let up = mcam.eye.getNormal();
    let horizonDirection = Vec3.proj_b_to_plane(direction, up);

    if (horizonDirection.length2() < 1e-8) {
        return undefined;
    }

    horizonDirection.normalize();

    let distanceToCamera = mcam.eye.length();
    let radius = distanceToCamera - mcam.getHeight();

    if (distanceToCamera <= radius) {
        return undefined;
    }

    let tangentDistance = Math.sqrt(distanceToCamera * distanceToCamera - radius * radius);
    let upDistance = (radius * radius) / distanceToCamera;
    let horizonDistance = (radius * tangentDistance) / distanceToCamera;

    return up.scaleTo(upDistance).addA(horizonDirection.scaleTo(horizonDistance));
}

function updateShadowCamera() {
    let mcam = globus.planet.camera;
    let sunDir = globus.planet.sun.getPosition().normal().scale(-1.0);
    let up = mcam.eye.getNormal();
    let alt = mcam.getHeight() - 8000;
    let eye = mcam.eye.sub(up.scaleTo(alt));

    let fov_h = (0.5 * mcam.verticalViewAngle * Math.PI) / 180.0;
    let slope = Math.max(-1.0, Math.min(1.0, mcam.slope));
    let upSide = mcam.getUp().dot(up) < 0.0 ? -1.0 : 1.0;
    let a = Math.acos(slope) - upSide * fov_h;

    let f = Vec3.proj_b_to_plane(mcam.getForward(), up);
    if (f.length2() < 1e-8) {
        f = Vec3.proj_b_to_plane(mcam.getUp().scaleTo(upSide), up);
    }
    f.normalize();

    let forward = mcam.getForward();
    let right = mcam.getRight();

    let screenLeft = HORIZON_SCREEN_MARGIN;
    let screenRight = mcam.width - HORIZON_SCREEN_MARGIN;
    let screenTop = HORIZON_SCREEN_MARGIN;
    let screenBottom = mcam.height - HORIZON_SCREEN_MARGIN;

    let rawHitLt = getEllipsoidHit(mcam, screenLeft, screenTop);
    let rawHitRt = getEllipsoidHit(mcam, screenRight, screenTop);
    let rawHitLb = getEllipsoidHit(mcam, screenLeft, screenBottom);
    let rawHitRb = getEllipsoidHit(mcam, screenRight, screenBottom);
    let rayLt = mcam.getRay(screenLeft, screenTop);
    let rayRt = mcam.getRay(screenRight, screenTop);

    let hitLt = rawHitLt;
    let hitRt = rawHitRt;
    let hitLb = rawHitLb;
    let hitRb = rawHitRb;

    if (!hitLt && hitLb) {
        hitLt = getHorizonPointByDirection(mcam, rayLt.direction);
    }

    if (!hitRt && hitRb) {
        hitRt = getHorizonPointByDirection(mcam, rayRt.direction);
    }

    horizonMarkerLt.setVisibility(Boolean(hitLt));
    if (hitLt) {
        horizonMarkerLt.setAbsoluteCartesian3v(hitLt);
    }

    horizonMarkerRt.setVisibility(Boolean(hitRt));
    if (hitRt) {
        horizonMarkerRt.setAbsoluteCartesian3v(hitRt);
    }

    horizonMarkerLb.setVisibility(Boolean(hitLb));
    if (hitLb) {
        horizonMarkerLb.setAbsoluteCartesian3v(hitLb);
    }

    horizonMarkerRb.setVisibility(Boolean(hitRb));
    if (hitRb) {
        horizonMarkerRb.setAbsoluteCartesian3v(hitRb);
    }

    horizonLineTop.setVisibility(Boolean(hitLt && hitRt));
    if (hitLt && hitRt) {
        horizonLineTop.polyline.setPath3v([[hitLt, hitRt]], undefined, true);
    }

    horizonLineRight.setVisibility(Boolean(hitRt && hitRb));
    if (hitRt && hitRb) {
        horizonLineRight.polyline.setPath3v([[hitRt, hitRb]], undefined, true);
    }

    horizonLineBottom.setVisibility(Boolean(hitRb && hitLb));
    if (hitRb && hitLb) {
        horizonLineBottom.polyline.setPath3v([[hitRb, hitLb]], undefined, true);
    }

    horizonLineLeft.setVisibility(Boolean(hitLb && hitLt));
    if (hitLb && hitLt) {
        horizonLineLeft.polyline.setPath3v([[hitLb, hitLt]], undefined, true);
    }

    let isHorizonOnScreen = rawHitLt ? !rawHitRt || !rawHitLb || !rawHitRb : rawHitRt || rawHitLb || rawHitRb;
    //console.log(isHorizonOnScreen);

    let offset_f = Math.tan(a) * alt;
    eye.addA(f.scale(offset_f));

    let d = eye.sub(mcam.eye).dot(forward);
    let eye_left = eye;
    let eye_right = eye;
    if (d > 0.0) {
        let halfW = Math.tan(((mcam.horizontalViewAngle * Math.PI) / 180.0) * 0.5) * d;
        eye_left = eye.add(right.scaleTo(-halfW));
        eye_right = eye.add(right.scaleTo(halfW));
        eye = eye_left.add(eye_right).scale(0.5);
        let orthoHalfSize = eye_left.distance(eye_right) * 0.5;
        shadowCamera.frustum.setOrthoBounds(-orthoHalfSize, orthoHalfSize, -orthoHalfSize, orthoHalfSize);
    }

    shadowCamera.set(eye, eye.add(sunDir), up);
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
