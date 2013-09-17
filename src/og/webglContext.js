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

function getShader(gl, id) {
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
}

/*
 * WebGLContext prototype
 */

og.webglContext = {};

og.webglContext.WebGLContext = function (htmlId) {
    this._lastAnimationFrameTime = 0;
    this._fps;
    this._delta;
    //Default animation speed
    this._animSpeed = 1.0;

    //Default background color
    this._backgroundColor = { r: 0.48, g: 0.48, b: 0.48, a: 1.0 };

    this._canvasHtml = htmlId;
    //gl context
    this.gl;

    //callback delegate for scene drawing
    this.drawback = function (x) { };

    //viewport matrixes
    this.mvMatrix = new og.math.glMatrixArrayType(16);//mat4.create();
    this.pMatrix = new og.math.glMatrixArrayType(16);//mat4.create();
    this.mvMatrixStack = [];
    this.shaderProgram;
    this._drawMode;

    //TODO: multitexturing(replace to array of binded textures)
    this.texture;
    this.anisotropicFilteringEnabled = false;
};

og.webglContext.vendorPrefixes = ["", "WEBKIT_", "MOZ_"];
og.webglContext.GL_POINTS = 0;
og.webglContext.GL_LINE_STRIP = 1;
og.webglContext.GL_LINE_LOOP = 2;
og.webglContext.GL_LINES = 3;
og.webglContext.GL_TRIANGLE_STRIP = 4;
og.webglContext.GL_TRIANGLES = 5;

og.webglContext.WebGLContext.prototype.createTextureFromImage = function (image) {
    var gl = this.gl;
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    if (!og.math.isPowerOfTwo(image.width) || !og.math.isPowerOfTwo(image.height)) {
        var canvas = document.createElement("canvas");
        canvas.width = og.math.nextHighestPowerOfTwo(image.width);
        canvas.height = og.math.nextHighestPowerOfTwo(image.height);
        var ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, image.width, image.height);
        image = canvas;
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    if (this.anisotropicFilteringEnabled) {
        gl.texParameterf(gl.TEXTURE_2D, gl.ext.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
};

og.webglContext.WebGLContext.prototype.initAnysotropicFiltering = function () {
    var ext = og.webglContext.getExtension(this.gl, "EXT_texture_filter_anisotropic");
    if (!ext) {
        return null;
    }
    this.anisotropicFilteringEnabled = true;
    return ext;
};

og.webglContext.WebGLContext.prototype.assignMatrices = function (pm, mvm) {
    og.webglContext.WebGLContext.copyMatrix(this.pMatrix, pm);
    og.webglContext.WebGLContext.copyMatrix(this.mvMatrix, mvm);
};

og.webglContext.getExtension = function (gl, name) {
    var i, ext;
    for (i in og.webglContext.vendorPrefixes) {
        ext = gl.getExtension(og.webglContext.vendorPrefixes[i] + name);
        if (ext) {
            return ext;
        }
    }
    return null;
};

og.webglContext.WebGLContext.copyMatrix = function (dst, src) {
    dst[0] = src[0];
    dst[1] = src[1];
    dst[2] = src[2];
    dst[3] = src[3];
    dst[4] = src[4];
    dst[5] = src[5];
    dst[6] = src[6];
    dst[7] = src[7];
    dst[8] = src[8];
    dst[9] = src[9];
    dst[10] = src[10];
    dst[11] = src[11];
    dst[12] = src[12];
    dst[13] = src[13];
    dst[14] = src[14];
    dst[15] = src[15];
};

og.webglContext.WebGLContext.prototype.mvPushMatrix = function () {
    var copy = new og.math.glMatrixArrayType(16);
    og.webglContext.WebGLContext.copyMatrix(copy, this.mvMatrix);
    this.mvMatrixStack.push(copy);
};

og.webglContext.WebGLContext.prototype.mvPopMatrix = function () {
    if (this.mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    this.mvMatrix = this.mvMatrixStack.pop();
};

og.webglContext.WebGLContext.prototype.initCanvas = function (htmlCanvasId) {
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
}

og.webglContext.WebGLContext.prototype.Init = function () {
    this.gl = this.initCanvas(this._canvasHtml);
    this.shaderProgram = this.initShaders(this.gl);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.applyViewport(this.gl.canvas.clientWidth, this.gl.canvas.clientHeight);
    this._drawMode = this.gl.TRIANGLE_STRIP;
    this.gl.frontFace(this.gl.CCW);
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.cullFace(this.gl.BACK);
    this.gl.ext = this.initAnysotropicFiltering();
}

og.webglContext.WebGLContext.prototype.initShaders = function (glCanvas) {
    var fragmentShader = getShader(glCanvas, "shader-fs");
    var vertexShader = getShader(glCanvas, "shader-vs");
    var shaderProgram = glCanvas.createProgram();

    glCanvas.attachShader(shaderProgram, vertexShader);
    glCanvas.attachShader(shaderProgram, fragmentShader);
    glCanvas.linkProgram(shaderProgram);

    if (!glCanvas.getProgramParameter(shaderProgram, glCanvas.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    glCanvas.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = glCanvas.getAttribLocation(shaderProgram, "aVertexPosition");
    glCanvas.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.textureCoordAttribute = glCanvas.getAttribLocation(shaderProgram, "aTextureCoord");
    glCanvas.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.pMatrixUniform = glCanvas.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = glCanvas.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.samplerUniform = glCanvas.getUniformLocation(shaderProgram, "uSampler");

    shaderProgram.texOffset = glCanvas.getUniformLocation(shaderProgram, "texOffset");
    shaderProgram.texScale = glCanvas.getUniformLocation(shaderProgram, "texScale");

    return shaderProgram;
}

og.webglContext.WebGLContext.prototype.setMatrixUniforms = function () {
    this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
    this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
}

og.webglContext.WebGLContext.prototype.setTextureBias = function (bias) {
    this.gl.uniform1f(this.shaderProgram.texScale, bias[2]);
    this.gl.uniform2f(this.shaderProgram.texOffset, bias[0], bias[1]);
}

og.webglContext.WebGLContext.prototype.createArrayBuffer = function (array, itemSize, numItems) {
    var buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, array, this.gl.STATIC_DRAW);
    buffer.itemSize = itemSize;
    buffer.numItems = numItems;
    return buffer;
}

og.webglContext.WebGLContext.prototype.createElementArrayBuffer = function (array, itemSize, numItems) {
    var buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, array, this.gl.STATIC_DRAW);
    buffer.itemSize = itemSize;
    buffer.numItems = numItems;
    return buffer;
}

og.webglContext.WebGLContext.prototype.bindTexture = function (texture) {
    this.texture = texture;
}

og.webglContext.WebGLContext.prototype.drawBuffer = function (coordsBuffer, texCoordsBuffer, vertexIndexBuffer) {

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, coordsBuffer);
    this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, coordsBuffer.itemSize, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordsBuffer);
    this.gl.vertexAttribPointer(this.shaderProgram.textureCoordAttribute, texCoordsBuffer.itemSize, this.gl.FLOAT, false, 0, 0);

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.uniform1i(this.shaderProgram.samplerUniform, 0);

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
    this.setMatrixUniforms();
    this.gl.drawElements(this._drawMode, vertexIndexBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);

}

og.webglContext.WebGLContext.prototype.setDrawMode = function (mode) {
    switch (mode) {
        case og.webglContext.GL_LINES:
            this._drawMode = this.gl.LINES;
            break;
        case og.webglContext.GL_LINE_STRIP:
            this._drawMode = this.gl.LINE_STRIP;
            break;
        case og.webglContext.GL_TRIANGLES:
            this._drawMode = this.gl.TRIANGLES;
            break;
        case og.webglContext.GL_TRIANGLE_STRIP:
            this._drawMode = this.gl.TRIANGLE_STRIP;
            break;
        case og.webglContext.GL_POINTS:
            this._drawMode = this.gl.POINTS;
            break;
        case og.webglContext.GL_LINE_LOOP:
            this._drawMode = this.gl.LINE_LOOP;
            break;
    }
}

og.webglContext.WebGLContext.prototype._fillBackGroundColor = function (color) {
    this.gl.clearColor(color.r, color.g, color.b, color.a);
}

og.webglContext.WebGLContext.prototype._showFPS = function (fps) {
    print2d("lbFps", fps.toFixed(1), this.gl._viewportWidth - 40, 0);
}

function print2d(id, text, x, y) {
    var el = document.getElementById(id);
    el.innerHTML = text;
    el.style.left = x;
    el.style.top = y;
}

og.webglContext.WebGLContext.prototype._calculateFPS = function (now) {
    this._fps = 1000 / (now - this._lastAnimationFrameTime);
    this._lastAnimationFrameTime = now;
    this._delta = this._animSpeed / this._fps;
}

og.webglContext.WebGLContext.prototype.setBackgroundColor = function (color) {
    this._backgroundColor.r = color.r;
    this._backgroundColor.g = color.g;
    this._backgroundColor.b = color.b;
    this._backgroundColor.a = color.a;
}

og.webglContext.WebGLContext.prototype.applyViewport = function (width, height) {
    var w = width, h = Math.max(1, height);
    this.gl.viewport(0, 0, w, h);
    this.gl.canvas.width = this.gl._viewportWidth = w;
    this.gl.canvas.height = this.gl._viewportHeight = h;
}

og.webglContext.WebGLContext.prototype.vpSizeChanged = function () {
    return this.gl.canvas.clientWidth != this.gl._viewportWidth || this.gl.canvas.clientHeight != this.gl._viewportHeight;
}

og.webglContext.WebGLContext.prototype._drawFrame = function (now, handle) {
    if (handle.vpSizeChanged()) {
        handle.applyViewport(handle.gl.canvas.clientWidth, handle.gl.canvas.clientHeight);
        handle.onCanvasResize();
    }
    handle._calculateFPS(now);
    handle._fillBackGroundColor(handle._backgroundColor);
    handle.gl.clear(handle.gl.COLOR_BUFFER_BIT | handle.gl.DEPTH_BUFFER_BIT);
    handle.drawback(handle);
    handle._showFPS(handle._fps);
    requestAnimationFrame(handle._drawFrame, handle);
}

og.webglContext.WebGLContext.prototype.Start = function () {
    requestAnimationFrame(this._drawFrame, this);
}