import {
    Globe,
    Vector,
    GlobusRgbTerrain,
    OpenStreetMap,
    Bing,
    Object3d,
    Vec3,
    Entity,
    control,
    LonLat,
    Gltf,
    GeoTexture2d,
    Framebuffer,
    Program, EmptyTerrain
} from "../../lib/og.es.js";

let geoTex = new GeoTexture2d("Vector Field", {
    corners: [[-180, 90], [180, 90], [180, -90], [-180, -90]],
    visibility: true,
    isBaseLayer: false,
    frameWidth: 4096,
    frameHeight: 4096,
    opacity: 1.0,
    attribution: '<a href="//www.shadertoy.com/view/4s23DG">2D vector field visualization</a> <a href="//casual-effects.com">by Morgan McGuire</a>'
});

let globe = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new EmptyTerrain(),
    //transitionOpacityEnabled: false,
    atmosphereEnabled: true,
    layers: [new OpenStreetMap(), geoTex],
    //transparentBackground: true,
    atmosphereParameters:{
        disableSunDisk: true
    }
});

__globus__.planet.layers[1].setHeight(100000);

globe.planet.addControls([
    new control.TimelineControl(),
    new control.LayerSwitcher(),
    new control.Lighting()
]);

let handler = globe.renderer.handler;

let frameBuffer = new Framebuffer(handler, {
    'width': 4096,
    'height': 4096
});

frameBuffer.init();

//Bind framebuffer texture to the geoTexture2d layer.
geoTex.bindTexture(frameBuffer.textures[0]);

//Attach vector field shader.
handler.addProgram(new Program("vectorMap", {
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

globe.renderer.events.on("draw", function (r) {

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
            'iResolution': [4096, 4096]
        })
        .drawArrays(r.handler.gl.TRIANGLE_STRIP, vertBuffer.numItems);

    frameBuffer.deactivate();
});
