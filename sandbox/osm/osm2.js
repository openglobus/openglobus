import {
    math,
    Globe,
    Entity,
    GlobusTerrain,
    XYZ,
    webgl,
    LonLat,
    GeoImage,
    GeoVideo,
    GeoTexture2d,
    Vector,
    Vec2,
    Vec3,
    Quat,
    control
} from "../../dist/@openglobus/og.esm.js";

let osm = new XYZ("OpenStreetMap", {
    isBaseLayer: true,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
    attribution: 'Data @ OpenStreetMap contributors, ODbL'
});

let geoTex = new GeoTexture2d("Vector Field", {
    corners: [[-2.3565396747912852, 51.75253410564987], [2.173417790597063, 50.95010370686831], [1.26786087508808, 49.01434061915433], [-3.153942423073776, 49.72627636180551]],
    visibility: true,
    isBaseLayer: false,
    frameWidth: 1024,
    frameHeight: 1024,
    opacity: 1.0,
    attribution: '<a href="//www.shadertoy.com/view/4s23DG">2D vector field visualization</a> <a href="//casual-effects.com">by Morgan McGuire</a>'
});

let globus = new Globe({
    "target": "earth",
    "name": "Earth",
    "terrain": new GlobusTerrain(),
    "layers": [osm, geoTex]
});

let handler = globus.renderer.handler;

//Framebuffer that we want to render.
let frameBuffer = new webgl.Framebuffer(handler, {
    'width': 1024,
    'height': 1024
});

frameBuffer.init();

//Bind framebuffer texture to the geoTexture2d layer.
geoTex.bindTexture(frameBuffer.textures[0]);

//Attach vector field shader.
handler.addProgram(new webgl.Program("vectorMap", {
    uniforms: {
        'iGlobalTime': 'float',
        'iResolution': 'vec2'
    },
    attributes: {
        'aPos': 'vec2'
    },
    vertexShader: document.getElementById("shader-vs").innerHTML,
    fragmentShader: document.getElementById("shader-fs").innerHTML
}));

var animCounter = 0,
    vertBuffer = handler.createArrayBuffer(new Float32Array([1, 1, -1, 1, 1, -1, -1, -1]), 2, 4);

globus.renderer.events.on("draw", function (r) {

    //Rendering vector field to geoTexture2d buffer
    frameBuffer.activate();
    let gl = r.handler.gl;
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //Actually a better way to replace this function to native gl.
    r.handler.programs.vectorMap
        .set({
            'aPos': vertBuffer,
            'iGlobalTime': animCounter += 0.03,
            'iResolution': [1024, 1024]
        })
        .drawArrays(r.handler.gl.TRIANGLE_STRIP, vertBuffer.numItems);

    frameBuffer.deactivate();
});

globus.planet.flyExtent(geoTex.getExtent());
