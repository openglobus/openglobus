goog.provide('og.webgl');

og.webgl.vendorPrefixes = ["", "WEBKIT_", "MOZ_"];

if (COMPILED) {
    og.webgl.RESOURCES_URL = "/resources/";
} else {
    og.webgl.RESOURCES_URL = "../../resources/";
}

og.webgl.getExtension = function (gl, name) {
    var i, ext;
    for (i in og.webgl.vendorPrefixes) {
        ext = gl.getExtension(og.webgl.vendorPrefixes[i] + name);
        if (ext) {
            return ext;
        }
    }
    return null;
};

og.webgl.initWebGLContext = function (canvas, params) {
    var ctx;
    try {
        ctx = canvas.getContext("experimental-webgl", params);
        ctx.canvas = canvas;
    }
    catch (ex) {
        og.console.logErr("exception during the GL context initialization");
    }
    if (!ctx) {
        og.console.logErr("could not initialise WebGL");
    }
    return ctx;
};
