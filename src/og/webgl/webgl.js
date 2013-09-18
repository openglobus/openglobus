og.webgl = { };

(function () {
    var lastTime = 0;
    window.requestAnimationFrame = function (callback, element) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(15, 16 - (currTime - lastTime));
        var id = window.setTimeout(function () { callback(currTime + timeToCall, element); },
          timeToCall);
        lastTime = currTime + timeToCall;
        return id;
    };

    window.cancelAnimationFrame = function (id) {
        clearTimeout(id);
    };
}());

og.webgl.vendorPrefixes = ["", "WEBKIT_", "MOZ_"];

og.webgl.GL_POINTS = 0;
og.webgl.GL_LINE_STRIP = 1;
og.webgl.GL_LINE_LOOP = 2;
og.webgl.GL_LINES = 3;
og.webgl.GL_TRIANGLE_STRIP = 4;
og.webgl.GL_TRIANGLES = 5;

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

og.webgl.getShader = function (gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3)
            str += k.textContent;
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
};

og.webgl.initShaders = function (gl) {
    var fragmentShader = og.webgl.getShader(gl, "shader-fs");
    var vertexShader = og.webgl.getShader(gl, "shader-vs");
    var shaderProgram = gl.createProgram();

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");

    shaderProgram.texOffset = gl.getUniformLocation(shaderProgram, "texOffset");
    shaderProgram.texScale = gl.getUniformLocation(shaderProgram, "texScale");

    return shaderProgram;
};

og.webgl.initCanvas = function (htmlCanvasId) {
    var canvas = document.getElementById(htmlCanvasId);
    var ctx;
    try {
        ctx = canvas.getContext("experimental-webgl");
        ctx.canvas = canvas;
        canvas.width = canvas.scrollWidth;
        canvas.height = canvas.scrollHeight;
        ctx._viewportWidth = canvas.width;
        ctx._viewportHeight = canvas.height;
    }
    catch (ex) {
        alert("Exception during the GL context initialization");
    }
    if (!ctx) {
        alert("Could not initialise WebGL, sorry :-(");
    }
    return ctx;
};