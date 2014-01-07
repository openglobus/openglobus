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
    this.createBufferTexture();
};

og.webgl.Framebuffer.prototype.createBufferTexture = function () {
    var gl = this.handler.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

    this.fboTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.fboTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    var renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

og.webgl.Framebuffer.prototype.setSize = function (width, height) {
    this.width = width;
    this.height = height;
    this.createBufferTexture();
};

og.webgl.Framebuffer.prototype.startFrame = function () {
    var gl = this.handler.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
};

og.webgl.Framebuffer.prototype.endFrame = function () {
    var gl = this.handler.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};