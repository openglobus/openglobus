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
    Program
} from "../../lib/@openglobus/og.esm.js";

let cameraLayer = new Vector("camera", {
    pickingEnabled: false,
    scaleByDistance: [100, 1000000, 1.0]
});

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
globus.planet.addControl(new control.DrawingSwitcher());

let tempCamera = new PlanetCamera(globus.planet);

function saveCamera() {

    let cam = globus.planet.camera
    tempCamera.copy(cam);
    depthHandler.camera.copy(cam);

    const length = 1000;

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

// let aspectRatio = payload['image-width'] / payload['image-height'];
// let hAngle = Math.atan(Math.pow(2, 1 - zoom / 100)) * 360 / Math.PI;
// let vAngle = math.DEGREES_DOUBLE * Math.atan(Math.tan(hAngle * math.RADIANS_HALF) / aspectRatio);

let cameraObj = Object3d.createFrustum();
let frustumScale = Object3d.getFrustumScaleByCameraAspectRatio(1000, globus.planet.camera.getViewAngle(), globus.planet.camera.getAspectRatio());
//let frustumScale = Object3d.getFrustumScaleByCameraAngles(140, 35, 35);

let cameraEntity = new Entity({
    visibility: true,
    scale: frustumScale,
    geoObject: {
        //visibility: false,
        tag: "frustum",
        color: "rgba(100,255,100,0.1)",
        object3d: cameraObj
    }
});

cameraLayer.add(cameraEntity);


function camera_depth() {
    return new Program("camera_depth", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            height: "float",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
        }, attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3"
        },

        vertexShader:
            `#version 300 es
            
            precision highp float;

            in vec3 aVertexPositionHigh;
            in vec3 aVertexPositionLow;

            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;
            uniform float height;

            void main(void) {

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                mat4 m = projectionMatrix * viewMatrixRTE;

                vec3 nh = height * normalize(aVertexPositionHigh + aVertexPositionLow);

                vec3 eyePosition = eyePositionHigh + eyePositionLow;
                vec3 vertexPosition = aVertexPositionHigh + aVertexPositionLow;

                vec3 highDiff = aVertexPositionHigh - eyePositionHigh;
                vec3 lowDiff = aVertexPositionLow - eyePositionLow + nh;
                
                gl_Position =  m * vec4(highDiff * step(1.0, length(highDiff)) + lowDiff, 1.0);    
            }`,

        fragmentShader:
            `#version 300 es
            
            precision highp float;
            

            layout(location = 0) out vec4 depthColor;

            void main(void) {
                depthColor = vec4(gl_FragCoord.z, gl_FragCoord.z, gl_FragCoord.z, 1.0);
            }`
    });
}

globus.planet.renderer.handler.addProgram(camera_depth());

let depthHandler = new control.CameraFrameHandler({
        camera: new PlanetCamera(globus.planet, {
            frustums: [[1, 1000000]],
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
        handler: (cam, framebuffer, gl) => {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.disable(gl.BLEND);

            let sh;
            let h = framebuffer.handler;
            h.programs.camera_depth.activate();
            sh = h.programs.camera_depth._program;
            let shu = sh.uniforms;

            gl.disable(gl.BLEND);
            gl.disable(gl.POLYGON_OFFSET_FILL);

            gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
            gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());

            gl.uniform3fv(shu.eyePositionHigh, cam.eyeHigh);
            gl.uniform3fv(shu.eyePositionLow, cam.eyeLow);

            gl.uniform1f(shu.frustumPickingColor, cam.frustumColorIndex);

            // drawing planet nodes
            let rn = globus.planet._renderedNodes;

            let i = rn.length;
            while (i--) {
                if (rn[i].segment._transitionOpacity >= 1) {
                    rn[i].segment.depthRendering(sh);
                }
            }

            for (let i = 0; i < globus.planet._fadingOpaqueSegments.length; ++i) {
                globus.planet._fadingOpaqueSegments[i].depthRendering(sh);
            }

            gl.enable(gl.BLEND);

            framebuffer.readPixelBuffersAsync();

            console.log(framebuffer.pixelBuffers[0].data);
        }
    }
);

globus.planet.addControl(new control.CameraFrameComposer({
        handlers: [depthHandler]
    }
));