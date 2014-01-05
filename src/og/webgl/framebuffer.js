goog.provide('og.webgl.Framebuffer');

goog.require('og.webgl');

og.webgl.Framebuffer = function (handler) {
    this.handler = handler;
    this.fbo;
    this.width;
    this.height;
    this.fboTexture = null;
};

og.webgl.Framebuffer.prototype.initialize = function () {
    var gl = this.handler.gl;
    this.fbo = gl.createFramebuffer();
    this.width = gl._viewportWidth;
    this.height = gl._viewportHeight;
};

og.webgl.Framebuffer.prototype.setSize = function (width, height) {
    this.width = width;
    this.height = height;
    this.createTexture();
};

og.webgl.Framebuffer.prototype.createTexture = function () {
    var gl = this.handler.gl;
    this.fboTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.fboTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTexture, 0);
};

og.webgl.Framebuffer.prototype.bind = function () {
    var gl = this.handler.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
};

og.webgl.Framebuffer.prototype.clear = function () {
    var gl = this.handler.gl;
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};