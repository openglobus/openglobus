import {
    Globe,
    control,
    LonLat,
    OpenStreetMap,
    GlobusRgbTerrain,
    Bing,
    Projector,
    DepthCamera,
    input,
    Vector,
    Entity,
    Object3d
} from "../../lib/og.es.js";

// ?forward renders with forward shaders, where at most 3 distinct sources are sampled per draw.
const forward = new URLSearchParams(window.location.search).has("forward");

let myObjects = new Vector("myObjects", {
    scaleByDistance: [1, 1, 1]
});

const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    layers: [new Bing(), new OpenStreetMap(), myObjects],
    atmosphereEnabled: false,
    fontsSrc: "../../res/fonts",
    deferredDisabled: forward,
    idleMode: true
});

globus.planet.addControl(new control.TimelineControl());
globus.planet.addControl(new control.DebugInfo());
globus.planet.addControl(new control.LayerSwitcher());
globus.planet.addControl(new control.EntityEditor());

const skyCubeEntity = new Entity({
    name: "sky-cube",
    lonlat: new LonLat(9.08, 46.455, 5000),
    independentPicking: true,
    geoObject: {
        tag: "sky-cube",
        object3d: Object3d.createCube(1000, 1000, 1000).setColor("white")
    }
});
myObjects.add(skyCubeEntity);

const depthCameraHandler = new control.DepthCameraHandler();
globus.planet.addControl(depthCameraHandler);

function createVideo(src) {
    const video = document.createElement("video");
    video.src = src;
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.play().catch((error) => {
        console.warn(`Unable to autoplay ${src}`, error);
    });
    return video;
}

function createImage(src) {
    const image = new Image();
    image.src = src;
    return image;
}

const CHECKER_CELLS = 8;

function drawChecker(canvas, offset) {
    const ctx = canvas.getContext("2d");
    const cell = canvas.width / CHECKER_CELLS;
    for (let y = 0; y < CHECKER_CELLS; y++) {
        for (let x = 0; x < CHECKER_CELLS; x++) {
            ctx.fillStyle = (x + y + offset) % 2 ? "#ff6a00" : "#1e90ff";
            ctx.fillRect(x * cell, y * cell, cell, cell);
        }
    }
}

const checkerCanvas = document.createElement("canvas");
checkerCanvas.width = checkerCanvas.height = 512;
drawChecker(checkerCanvas, 0);

const renderer = globus.planet.renderer;
const canvas = renderer.handler.canvas;

const sources = [
    {
        params: { video: createVideo("./smpte_360p.mp4") },
        width: 640,
        height: 360,
        eye: [9.08, 46.45],
        look: [9.08, 46.46]
    },
    {
        params: { image: checkerCanvas },
        width: 512,
        height: 512,
        eye: [9.17, 46.45],
        look: [9.17, 46.46]
    },
    {
        params: { image: createImage("./grid.jpg") },
        width: 640,
        height: 448,
        eye: [9.26, 46.45],
        look: [9.26, 46.46]
    },
    {
        params: { texture: renderer.screenTexture.screen },
        width: canvas.width,
        height: canvas.height,
        eye: [9.35, 46.45],
        look: [9.35, 46.46]
    }
];

const projectors = sources.map(({ params, width, height, eye, look }) => {
    const depthCamera = new DepthCamera({
        showFrustum: true,
        // The footprint reads the depth map back to the CPU every frame, too slow on Ultra (Mali).
        showFootprint: false,
        depthBiasWorld: 1,
        normalBias: 0.45
    });
    depthCameraHandler.add(depthCamera);

    const camera = depthCamera.camera;
    camera.setLonLat(new LonLat(eye[0], eye[1], 9000), new LonLat(look[0], look[1], 0));
    camera.setHorizontalViewAngle(30);
    // Matches the clip aspect ratio, so the picture is not stretched.
    camera.setViewportSize(width, height);
    camera.update();

    const projector = new Projector({
        depthCamera,
        color: [1.0, 1.0, 1.0, 1.0],
        renderMode: "color",
        ...params
    });
    globus.planet.renderer.projectors.add(projector);

    return projector;
});

let checkerOffset = 0;
setInterval(() => {
    drawChecker(checkerCanvas, ++checkerOffset);
    projectors[1].source = checkerCanvas;
}, 500);

// The screen texture is recreated on resize.
renderer.events.on("resizeend", () => {
    const camera = projectors[3].depthCamera.camera;
    camera.setViewportSize(canvas.width, canvas.height);
    camera.update();
    projectors[3].source = renderer.screenTexture.screen;
});

globus.planet.viewLonLat(new LonLat(9.215, 46.28, 24000), new LonLat(9.215, 46.47, 0));

// C aims the first projector at the terrain point under the mouse.
globus.planet.renderer.events.on("charkeypress", input.KEY_C, () => {
    const mouseGroundPoint = globus.planet.getCartesianFromMouseTerrain();
    if (!mouseGroundPoint) return;

    const camera = projectors[0].depthCamera.camera;
    const upNormal = globus.planet.ellipsoid.getSurfaceNormal3v(camera.eye);
    camera.set(camera.eye, mouseGroundPoint, upNormal);
    camera.update();
});
