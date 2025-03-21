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
    Framebuffer
} from "../../lib/@openglobus/og.esm.js";

const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain("mt", {
        maxZoom: 17,
        imageSize: 256
    }),
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
globus.planet.addControl(new control.CameraFrameComposer({
        handlers: [
            new control.CameraFrameHandler({
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

                        let data = framebuffer.pixelBuffers[0].data;
                        console.log(data[0], data[1], data[2], data[3]);
                    }
                }
            )
        ]
    }
));