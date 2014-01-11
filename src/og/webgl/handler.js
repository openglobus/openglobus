goog.provide('og.webgl.Handler');

goog.require('og.webgl');
goog.require('og.math');
goog.require('og.webgl.ShaderController');

og.webgl.Handler = function (htmlId) {
    this.lastAnimationFrameTime = 0;
    this.fps;
    this.delta;
    this.animSpeed = 1.0;
    this.backgroundColor = { r: 0.48, g: 0.48, b: 0.48, a: 1.0 };
    this.htmlCanvasId = htmlId;
    this.gl;
    this._initialized = false;
    this.drawback = function (x) { };
    this.shaderPrograms = {};
    this.activeShaderProgram = null;
    this.anisotropicFilteringEnabled = false;
};

og.webgl.Handler.prototype.createTextureFromImage = function (image) {
    var gl = this.gl;
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    //if (!og.math.isPowerOfTwo(image.width) || !og.math.isPowerOfTwo(image.height)) {
    //    var canvas = document.createElement("canvas");
    //    canvas.width = og.math.nextHighestPowerOfTwo(image.width);
    //    canvas.height = og.math.nextHighestPowerOfTwo(image.height);
    //    var ctx = canvas.getContext("2d");
    //    ctx.drawImage(image, 0, 0, image.width, image.height);
    //    image = canvas;
    //}
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

og.webgl.Handler.prototype.addShaderProgram = function (program) {
    if (!this.shaderPrograms[program.name]) {
        var sc = new og.webgl.ShaderController(this, program);
        this.shaderPrograms[program.name] = sc;
        this._initShaderController(sc);
    } else {
        alert(program.name + " is allready exists.");
    }
};

og.webgl.Handler.prototype._initShaderController = function (sc) {
    if (this._initialized) {
        sc.initialize();
        if (!this.activeShaderProgram) {
            this.activeShaderProgram = sc;
            sc.activate();
        }
    }
};

og.webgl.Handler.prototype.addShaderPrograms = function (programsArr) {
    for (var i = 0; i < programsArr.length; i++) {
        this.addShaderProgram(programsArr[i]);
    }
};

og.webgl.Handler.prototype.initAnysotropicFiltering = function () {
    var ext = og.webgl.getExtension(this.gl, "EXT_texture_filter_anisotropic");
    if (!ext) {
        return null;
    }
    this.anisotropicFilteringEnabled = true;
    return ext;
};

og.webgl.Handler.prototype.initShaderPrograms = function () {
    for (var p in this.shaderPrograms) {
        this._initShaderController(this.shaderPrograms[p]);
    }
};

og.webgl.Handler.prototype.init = function () {
    this.gl = og.webgl.initCanvas(this.htmlCanvasId);
    this._initialized = true;
    this.initShaderPrograms();
    this.setDefaults();
};

og.webgl.Handler.prototype.setDefaults = function () {
    this.gl.enable(this.gl.DEPTH_TEST);
    this.applyViewport(this.gl.canvas.clientWidth, this.gl.canvas.clientHeight);
    this.gl.frontFace(this.gl.CCW);
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.cullFace(this.gl.BACK);
    // this.gl.enable(this.gl.BLEND);
    this.gl.ext = this.initAnysotropicFiltering();
};

og.webgl.Handler.prototype.createArrayBuffer = function (array, itemSize, numItems) {
    var buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, array, this.gl.STATIC_DRAW);
    buffer.itemSize = itemSize;
    buffer.numItems = numItems;
    return buffer;
};

og.webgl.Handler.prototype.createElementArrayBuffer = function (array, itemSize, numItems) {
    var buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, array, this.gl.STATIC_DRAW);
    buffer.itemSize = itemSize;
    buffer.numItems = numItems;
    return buffer;
};

og.webgl.Handler.prototype.fillBackGroundColor = function (color) {
    this.gl.clearColor(color.r, color.g, color.b, color.a);
};

function print2d(id, text, x, y) {
    var el = document.getElementById(id);
    el.innerHTML = text;
    el.style.left = x;
    el.style.top = y;
};

og.webgl.Handler.prototype.calculateFPS = function (now) {
    this.fps = 1000 / (now - this.lastAnimationFrameTime);
    this.lastAnimationFrameTime = now;
    this.delta = this.animSpeed / this.fps;
};

og.webgl.Handler.prototype.setBackgroundColor = function (color) {
    this.backgroundColor.r = color.r;
    this.backgroundColor.g = color.g;
    this.backgroundColor.b = color.b;
    this.backgroundColor.a = color.a;
};

og.webgl.Handler.prototype.applyViewport = function (width, height) {
    var w = width, h = Math.max(1, height);
    this.gl.viewport(0, 0, w, h);
    this.gl.canvas.width = this.gl._viewportWidth = w;
    this.gl.canvas.height = this.gl._viewportHeight = h;
};

og.webgl.Handler.prototype.viewportResized = function () {
    return this.gl.canvas.clientWidth != this.gl._viewportWidth || this.gl.canvas.clientHeight != this.gl._viewportHeight;
};

og.webgl.Handler.prototype.drawFrame = function (now, sender) {
    if (sender.viewportResized()) {
        sender.applyViewport(sender.gl.canvas.clientWidth, sender.gl.canvas.clientHeight);
        sender.onCanvasResize(sender.gl.canvas);
    }
    sender.calculateFPS(now);
    sender.clearFrame();
    sender.drawback(sender);
    og.webgl.requestAnimationFrame(sender.drawFrame, sender);
};

og.webgl.Handler.prototype.clearFrame = function () {
    var gl = this.gl;
    this.fillBackGroundColor(this.backgroundColor);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
};

og.webgl.Handler.prototype.Start = function () {
    og.webgl.requestAnimationFrame(this.drawFrame, this);
};