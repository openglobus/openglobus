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

// ?forward renders with forward shaders, where at most 3 distinct video sources are sampled per draw.
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

// Each clip has its own resolution, so each gets a texture of its own size.
const sources = [
    { src: "./smpte_360p.mp4", width: 640, height: 360, eye: [9.08, 46.45], look: [9.08, 46.46] },
    { src: "./mandelbrot_512.mp4", width: 512, height: 512, eye: [9.26, 46.45], look: [9.26, 46.46] }
];

const projectors = sources.map(({ src, width, height, eye, look }) => {
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
        video: createVideo(src)
    });
    globus.planet.renderer.projectors.add(projector);

    return projector;
});

globus.planet.viewLonLat(new LonLat(9.17, 46.28, 22000), new LonLat(9.17, 46.47, 0));

// 1, 2 toggle the projectors.
projectors.forEach((projector, i) => {
    globus.planet.renderer.events.on("charkeypress", 49 + i, () => {
        projector.enabled = !projector.enabled;
    });
});

// C aims the first projector at the terrain point under the mouse.
globus.planet.renderer.events.on("charkeypress", input.KEY_C, () => {
    const mouseGroundPoint = globus.planet.getCartesianFromMouseTerrain();
    if (!mouseGroundPoint) return;

    const camera = projectors[0].depthCamera.camera;
    const upNormal = globus.planet.ellipsoid.getSurfaceNormal3v(camera.eye);
    camera.set(camera.eye, mouseGroundPoint, upNormal);
    camera.update();
});
