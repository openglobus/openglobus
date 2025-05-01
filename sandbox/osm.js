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
    terrain: new GlobusRgbTerrain(),
    layers: [new OpenStreetMap(), new Bing()],
    atmosphereEnabled: false,
    fontsSrc: "../../res/fonts",
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
    depthFrameHandler.camera.copy(cam);
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

let depthFrameHandler = new control.CameraDepthHandler();

globus.planet.addControl(depthFrameHandler);

globus.planet.renderer.controls.SimpleSkyBackground.colorOne = "black";
globus.planet.renderer.controls.SimpleSkyBackground.colorTwo = "black";