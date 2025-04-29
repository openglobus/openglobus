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
    GeoImage
} from "../../lib/og.es.js";

const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain("mt"/*, {
        maxZoom: 17,
        imageSize: 256
    }*/),
    layers: [new OpenStreetMap(), new Bing()],
    atmosphereEnabled: false,
    fontsSrc: "../../res/fonts",
    sun: {
        stopped: false
    },
    //dpi: 0.8
});

globus.planet.addControl(new control.TimelineControl());
globus.planet.addControl(new control.CompassButton());
globus.planet.addControl(new control.DebugInfo());
globus.planet.addControl(new control.LayerSwitcher());
globus.planet.addControl(new control.DrawingSwitcher());

let tempCamera = new PlanetCamera(globus.planet);

function saveCamera() {

    let cam = globus.planet.camera
    tempCamera.copy(cam);
    depthHandler.camera.copy(cam);

    const length = 100;

    const vert = cam.verticalViewAngle;
    const horiz = cam.horizontalViewAngle;

    const aspect = cam.getAspectRatio();

    let frustumScale = Object3d.getFrustumScaleByCameraAngles(length, horiz, vert);
    cameraEntity.setScale3v(frustumScale);

    cameraEntity.setCartesian3v(cam.eye);

    cameraEntity.setPitch(cam.getPitch());
    cameraEntity.setYaw(cam.getYaw());
    cameraEntity.setRoll(cam.getRoll());
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

globus.planet.addControl(new control.CameraDepthHandler());

globus.planet.renderer.controls.SimpleSkyBackground.colorOne = "black";
globus.planet.renderer.controls.SimpleSkyBackground.colorTwo = "black";