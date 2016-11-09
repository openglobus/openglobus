goog.provide('og.webgl');

og.webgl.vendorPrefixes = ["", "WEBKIT_", "MOZ_"];

/**
 * The return value is null if the extension is not supported, or an extension object otherwise.
 * @param {Object} gl - WebGl context pointer.
 * @param {String} name - Extension name.
 * @returns {Object}
 */
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

/**
 * Returns a drawing context on the canvas, or null if the context identifier is not supported.
 * @param {Object} canvas - HTML canvas object.
 * @params {Object} [contextAttributes] - See canvas.getContext contextAttributes.
 * @returns {Object}
 */
og.webgl.getContext = function (canvas, contextAttributes) {
    var ctx;
    try {
        ctx = canvas.getContext("experimental-webgl", contextAttributes);
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
