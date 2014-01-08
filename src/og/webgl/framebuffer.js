goog.provide('og.webgl.Framebuffer');

goog.require('og.webgl');

og.webgl.Framebuffer = function (handler) {
    this.handler = handler;
    this.fbo;
    this.width;
    this.height;
    this.texture = null;
};

og.webgl.Framebuffer.prototype.initialize = function () {
    var gl = this.handler.gl;
    this.fbo = gl.createFramebuffer();
    this.width = gl._viewportWidth;
    this.height = gl._viewportHeight;
    this._createTexture();
};

og.webgl.Framebuffer.prototype._createTexture = function () {
    var gl = this.handler.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

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
    var gl = this.handler.gl;
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status == gl.FRAMEBUFFER_COMPLETE)
        return true;
    return false;
};

og.webgl.Framebuffer.prototype.activate = function () {
    var gl = this.handler.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
};

og.webgl.Framebuffer.prototype.clear = function () {
    var gl = this.handler.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
};

og.webgl.Framebuffer.prototype.deactivate = function () {
    var gl = this.handler.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};