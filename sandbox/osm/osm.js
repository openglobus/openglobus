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
    input
} from "../../lib/@openglobus/og.esm.js";

let cameraLayer = new Vector("camera");

const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain("mt", {
        maxZoom: 17,
        imageSize: 256
    }),
    layers: [new OpenStreetMap(), new Bing(), cameraLayer],
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

let tempCamera = new PlanetCamera(globus.planet);

function saveCamera() {
    tempCamera.copy(globus.planet.camera);
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


let cameraObj = Object3d.createFrustum();
let frustumScale = Object3d.getFrustumScaleByCameraAspectRatio(1000, globus.planet.camera.getViewAngle(), globus.planet.camera.getAspectRatio());

let entity = new Entity({
    visibility: true,
    geoObject: {
        scale: Object3d.getFrustumScaleByCameraAngles(len, hAngle, vAngle),
        visibility: false,
        instanced: true,
        tag: "gimbalCamera",
        color: "rgba(100,255,100,0.3)",
        object3d: Object3d.createFrustum()
    }
});


let depthHandler = new control.CameraFrameHandler({
        camera: new PlanetCamera(globus.planet, {
            width: 640,
            height: 480,
            viewAngle: 45
        }),
        frameBuffer: new Framebuffer(globus.planet.renderer.handler, {
            width: 640,
            height: 480,
            targets: [{
                internalFormat: "RGBA16F",
                type: "FLOAT",
                attachment: "COLOR_ATTACHMENT",
                readAsync: true
            }],
            useDepth: true
        }),
        handler: (camera, framebuffer, gl) => {
            gl.clearColor(1.0, 1.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.disable(gl.BLEND);
            framebuffer.readPixelBuffersAsync();
        }
    }
)

globus.planet.addControl(new control.CameraFrameComposer({
        handlers: [depthHandler]
    }
));