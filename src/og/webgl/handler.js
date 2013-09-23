goog.provide('og.webgl.Handler');

goog.require('og.webgl');
goog.require('og.math');

og.webgl.Handler = function (htmlId) {
    this.lastAnimationFrameTime = 0;
    this.fps;
    this.delta;
    this.animSpeed = 1.0;
    this.backgroundColor = { r: 0.48, g: 0.48, b: 0.48, a: 1.0 };
    this.htmlCanvasId = htmlId;
    this.gl;
    this.drawback = function (x) { };

    //viewport matrixes
    this.mvMatrix = new og.math.GLArray(16);
    this.pMatrix = new og.math.GLArray(16);
    this.mvMatrixStack = [];
    this.shaderProgram;
    this._drawMode;

    //TODO: multitexturing(replace to array of binded textures)
    this.texture;
    this.anisotropicFilteringEnabled = false;
};

og.webgl.Handler.prototype.createTextureFromImage = function (image) {
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

og.webgl.Handler.prototype.initAnysotropicFiltering = function () {
    var ext = og.webgl.getExtension(this.gl, "EXT_texture_filter_anisotropic");
    if (!ext) {
        return null;
    }
    this.anisotropicFilteringEnabled = true;
    return ext;
};

og.webgl.Handler.prototype.assignMatrices = function (pm, mvm) {
    og.webgl.Handler.copyMatrix(this.pMatrix, pm);
    og.webgl.Handler.copyMatrix(this.mvMatrix, mvm);
};

og.webgl.Handler.copyMatrix = function (dst, src) {
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

og.webgl.Handler.prototype.mvPushMatrix = function () {
    var copy = new og.math.GLArray(16);
    og.webgl.Handler.copyMatrix(copy, this.mvMatrix);
    this.mvMatrixStack.push(copy);
};

og.webgl.Handler.prototype.mvPopMatrix = function () {
    if (this.mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    this.mvMatrix = this.mvMatrixStack.pop();
};

og.webgl.Handler.prototype.init = function () {
    this.gl = og.webgl.initCanvas(this.htmlCanvasId);
    this.shaderProgram = og.webgl.initShaders(this.gl);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.applyViewport(this.gl.canvas.clientWidth, this.gl.canvas.clientHeight);
    this._drawMode = this.gl.TRIANGLE_STRIP;
    this.gl.frontFace(this.gl.CCW);
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.cullFace(this.gl.BACK);
    this.gl.ext = this.initAnysotropicFiltering();
};

og.webgl.Handler.prototype.setMatrixUniforms = function () {
    this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
    this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
};

og.webgl.Handler.prototype.setTextureBias = function (bias) {
    this.gl.uniform1f(this.shaderProgram.texScale, bias[2]);
    this.gl.uniform2f(this.shaderProgram.texOffset, bias[0], bias[1]);
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

og.webgl.Handler.prototype.bindTexture = function (texture) {
    this.texture = texture;
};

og.webgl.Handler.prototype.drawBuffer = function (coordsBuffer, texCoordsBuffer, vertexIndexBuffer) {

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
};

og.webgl.Handler.prototype.setDrawMode = function (mode) {
    switch (mode) {
        case og.webgl.GL_LINES:
            this._drawMode = this.gl.LINES;
            break;
        case og.webgl.GL_LINE_STRIP:
            this._drawMode = this.gl.LINE_STRIP;
            break;
        case og.webgl.GL_TRIANGLES:
            this._drawMode = this.gl.TRIANGLES;
            break;
        case og.webgl.GL_TRIANGLE_STRIP:
            this._drawMode = this.gl.TRIANGLE_STRIP;
            break;
        case og.webgl.GL_POINTS:
            this._drawMode = this.gl.POINTS;
            break;
        case og.webgl.GL_LINE_LOOP:
            this._drawMode = this.gl.LINE_LOOP;
            break;
    }
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
        sender.onCanvasResize();
    }
    sender.calculateFPS(now);
    sender.fillBackGroundColor(sender.backgroundColor);
    sender.gl.clear(sender.gl.COLOR_BUFFER_BIT | sender.gl.DEPTH_BUFFER_BIT);
    sender.drawback(sender);
    requestAnimationFrame(sender.drawFrame, sender);
};

og.webgl.Handler.prototype.Start = function () {
    requestAnimationFrame(this.drawFrame, this);
};