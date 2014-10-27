goog.provide('og.webgl.Framebuffer');

goog.require('og.webgl');
goog.require('og.ImageCanvas');

og.webgl.Framebuffer = function (gl, width, height) {
    this.gl = gl;
    this.fbo;
    this.width = width || 256;
    this.height = height || 256;
    this.texture = null;
};

og.webgl.Framebuffer.prototype.initialize = function () {
    var gl = this.gl;
    this.fbo = gl.createFramebuffer();
    this.width = gl.canvas.clientWidth || this.width;
    this.height = gl.canvas.clientHeight || this.height;
    this._createTexture();
};

og.webgl.Framebuffer.prototype._createTexture = function () {
    var gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  //  gl.generateMipmap(gl.TEXTURE_2D);
  //  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

    var renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

og.webgl.Framebuffer.prototype.setSize = function (width, height) {
    this.width = width;
    this.height = height;
    this._createTexture();
};

og.webgl.Framebuffer.prototype.isComplete = function () {
    var gl = this.gl;
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status == gl.FRAMEBUFFER_COMPLETE)
        return true;
    return false;
};

og.webgl.Framebuffer.prototype.readAllPixels = function () {
    var res;
    var gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    //if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE) {
    var pixelValues = new Uint8Array(4 * this.width * this.height);
    gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, pixelValues);
    res = pixelValues;
    //}
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return res;
};

og.webgl.Framebuffer.prototype.readPixel = function (x, y) {
    var res;
    var gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    //if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE) {
    var pixelValues = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelValues);
    res = pixelValues;
    //}
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return res;
};

og.webgl.Framebuffer.prototype.activate = function () {
    var gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
};

og.webgl.Framebuffer.prototype.clear = function () {
    var gl = this.gl;
    //gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
};

og.webgl.Framebuffer.prototype.deactivate = function () {
    var gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

og.webgl.Framebuffer.prototype.getImage = function () {
    var data = this.readAllPixels();
    var imageCanvas = new og.ImageCanvas(this.width, this.height);
    imageCanvas.setData(data);
    return imageCanvas.getImage();
};