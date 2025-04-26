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

let cameraLayer = new Vector("camera", {
    pickingEnabled: false,
    scaleByDistance: [100, 1000000, 1.0]
});

let camProj = new GeoImage("Cam.Proj", {
    src: "test4.jpg",
    corners: [[0, 1], [1, 1], [1, 0], [0, 0]],
    visibility: true,
    isBaseLayer: false,
    opacity: 0.7
});

const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain("mt"/*, {
        maxZoom: 17,
        imageSize: 256
    }*/),
    layers: [new OpenStreetMap(), new Bing(), cameraLayer, camProj],
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

let cameraObj = Object3d.createFrustum();
let frustumScale = Object3d.getFrustumScaleByCameraAspectRatio(1000, globus.planet.camera.getViewAngle(), globus.planet.camera.getAspectRatio());
//let frustumScale = Object3d.getFrustumScaleByCameraAngles(140, 35, 35);

let cameraEntity = new Entity({
    visibility: true,
    scale: frustumScale,
    geoObject: {
        //visibility: false,
        tag: "frustum",
        color: "rgba(255,255,30,0.25)",
        object3d: cameraObj
    }
});

cameraLayer.add(cameraEntity);


// function camera_depth() {
//     return new Program("camera_depth", {
//         uniforms: {
//             projectionMatrix: "mat4",
//             viewMatrix: "mat4",
//             height: "float",
//             eyePositionHigh: "vec3",
//             eyePositionLow: "vec3",
//         }, attributes: {
//             aVertexPositionHigh: "vec3",
//             aVertexPositionLow: "vec3"
//         },
//
//         vertexShader:
//             `#version 300 es
//
//             precision highp float;
//
//             in vec3 aVertexPositionHigh;
//             in vec3 aVertexPositionLow;
//
//             uniform mat4 projectionMatrix;
//             uniform mat4 viewMatrix;
//             uniform vec3 eyePositionHigh;
//             uniform vec3 eyePositionLow;
//             uniform float height;
//
//             void main(void) {
//
//                 mat4 viewMatrixRTE = viewMatrix;
//                 viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);
//
//                 mat4 m = projectionMatrix * viewMatrixRTE;
//
//                 vec3 nh = height * normalize(aVertexPositionHigh + aVertexPositionLow);
//
//                 vec3 eyePosition = eyePositionHigh + eyePositionLow;
//                 vec3 vertexPosition = aVertexPositionHigh + aVertexPositionLow;
//
//                 vec3 highDiff = aVertexPositionHigh - eyePositionHigh;
//                 vec3 lowDiff = aVertexPositionLow - eyePositionLow + nh;
//
//                 gl_Position =  m * vec4(highDiff * step(1.0, length(highDiff)) + lowDiff, 1.0);
//             }`,
//
//         fragmentShader:
//             `#version 300 es
//
//             precision highp float;
//
//
//             layout(location = 0) out vec4 depthColor;
//
//             void main(void) {
//                 depthColor = vec4(gl_FragCoord.z, gl_FragCoord.z, gl_FragCoord.z, 1.0);
//             }`
//     });
// }

// globus.planet.renderer.handler.addProgram(camera_depth());

// const CAM_WIDTH = 640;
// const CAM_HEIGHT = 480;
//
// let depthCamera = new PlanetCamera(globus.planet, {
//     frustums: [[10, 10000]],
//     width: CAM_WIDTH,
//     height: CAM_HEIGHT,
//     viewAngle: 45
// })
//
// let depthFramebuffer = new Framebuffer(globus.planet.renderer.handler, {
//     width: CAM_WIDTH,
//     height: CAM_HEIGHT,
//     targets: [{
//         internalFormat: "RGBA16F",
//         type: "FLOAT",
//         attachment: "COLOR_ATTACHMENT",
//         readAsync: true
//     }],
//     useDepth: true
// });

// function getDistanceFromPixel(x, y, camera, framebuffer) {
//
//     let px = new Vec2(x, y);
//
//     let nx = px.x / framebuffer.width;
//     let ny = (framebuffer.height - px.y) / framebuffer.height;
//
//     let ddd = new Float32Array(4);
//
//     let dist = 0;
//
//     framebuffer.readData(nx, ny, ddd, 0);
//
//
//     if (ddd[0] === 0) {
//         return 0;
//     }
//
//     let depth = ddd[0],
//         proj = camera.frustums[0].inverseProjectionMatrix;
//
//     let screenPos = new Vec4(nx * 2.0 - 1.0, ny * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
//     let viewPosition = proj.mulVec4(screenPos);
//
//     let dir = camera.unproject(nx * camera.width, (1 - ny) * camera.height);
//
//     dist = -(viewPosition.z / viewPosition.w) / dir.dot(camera.getForward());
//
//     return dist;
// }

// function getCartesianFromPixelTerrain(x, y, camera, framebuffer) {
//     let distance = getDistanceFromPixel(x, y, camera, framebuffer);
//     if (distance === 0) {
//         return;
//     }
//     let nx = x / framebuffer.width;
//     let ny = (framebuffer.height - y) / framebuffer.height;
//     let direction = camera.unproject(nx * camera.width, (1 - ny) * camera.height);
//     return direction.scaleTo(distance).addA(camera.eye);
// }
//
// function getLonLatFromPixelTerrain(x, y, camera, framebuffer) {
//     let coords = getCartesianFromPixelTerrain(x, y, camera, framebuffer);
//     if (coords) {
//         return __globus__.planet.ellipsoid.cartesianToLonLat(coords);
//     }
// }


globus.planet.addControl(new control.KeyboardNavigation({
    camera: depthCamera
}));

// let depthHandler = new control.CameraFrameHandler({
//         camera: depthCamera,
//         frameBuffer: depthFramebuffer,
//         handler: (cam, framebuffer, gl) => {
//
//             framebuffer.activate();
//
//             gl.clearColor(0.0, 0.0, 0.0, 1.0);
//             gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
//             gl.disable(gl.BLEND);
//
//             let sh;
//             let h = framebuffer.handler;
//             h.programs.camera_depth.activate();
//             sh = h.programs.camera_depth._program;
//             let shu = sh.uniforms;
//
//             gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
//             gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());
//
//             gl.uniform3fv(shu.eyePositionHigh, cam.eyeHigh);
//             gl.uniform3fv(shu.eyePositionLow, cam.eyeLow);
//
//             // drawing planet nodes
//             let rn = globus.planet._renderedNodes;
//
//             let i = rn.length;
//             while (i--) {
//                 if (rn[i].segment._transitionOpacity >= 1) {
//                     rn[i].segment.depthRendering(sh);
//                 }
//             }
//
//             for (let i = 0; i < globus.planet._fadingOpaqueSegments.length; ++i) {
//                 globus.planet._fadingOpaqueSegments[i].depthRendering(sh);
//             }
//
//             framebuffer.deactivate();
//
//             //gl.enable(gl.BLEND);
//
//             framebuffer.readPixelBuffersAsync();
//
//             let lt = getLonLatFromPixelTerrain(1, 1, cam, framebuffer),
//                 rt = getLonLatFromPixelTerrain(framebuffer.width - 1, 1, cam, framebuffer);
//
//             let rb = getLonLatFromPixelTerrain(framebuffer.width - 1, framebuffer.height - 1, cam, framebuffer),
//                 lb = getLonLatFromPixelTerrain(1, framebuffer.height - 1, cam, framebuffer);
//
//             if (lt && rt && rb && lb) {
//                 camProj.setCorners([[lt.lon, lt.lat], [rt.lon, rt.lat], [rb.lon, rb.lat], [lb.lon, lb.lat]]);
//             }
//
//             // let r = globus.renderer;
//             //
//             // // PASS to depth visualization
//             // r.screenDepthFramebuffer.activate();
//             // sh = h.programs.depth;
//             // let p = sh._program;
//             //
//             // gl.bindBuffer(gl.ARRAY_BUFFER, r.screenFramePositionBuffer);
//             // gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);
//             //
//             // sh.activate();
//             //
//             // gl.activeTexture(gl.TEXTURE0);
//             // gl.bindTexture(gl.TEXTURE_2D, framebuffer.textures[0]);
//             // gl.uniform1i(p.uniforms.depthTexture, 0);
//             //
//             // gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
//             //
//             // r.screenDepthFramebuffer.deactivate();
//             // gl.enable(gl.BLEND);
//
//
//             cameraEntity.setCartesian3v(depthCamera.eye);
//             cameraEntity.setPitch(depthCamera.getPitch());
//             cameraEntity.setYaw(depthCamera.getYaw());
//             cameraEntity.setRoll(depthCamera.getRoll());
//         }
//     }
// );


// globus.renderer.events.on("draw", () => {
//     let r = globus.renderer;
//     let h = globus.renderer.handler;
//     let gl = h.gl;
//
//     r.screenDepthFramebuffer.activate();
//     let sh = h.programs.depth;
//     let p = sh._program;
//
//     gl.bindBuffer(gl.ARRAY_BUFFER, r.screenFramePositionBuffer);
//     gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);
//
//     sh.activate();
//
//     gl.activeTexture(gl.TEXTURE0);
//     gl.bindTexture(gl.TEXTURE_2D, depthFramebuffer.textures[0]);
//     gl.uniform1i(p.uniforms.depthTexture, 0);
//
//     gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
//
//     r.screenDepthFramebuffer.deactivate();
//     gl.enable(gl.BLEND);
// });

// globus.planet.addControl(new control.CameraFrameComposer({
//         handlers: [depthHandler]
//     }
// ));