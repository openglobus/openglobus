goog.provide('og.webgl.Framebuffer');

goog.require('og.webgl');
goog.require('og.ImageCanvas');

og.webgl.Framebuffer = function (handler, width, height) {
    this.handler = handler;
    this.fbo = null;
    this.width = width || handler.canvas.width;
    this.height = height || handler.canvas.width;
    this.texture = null;
    this._initialize();
};

og.webgl.Framebuffer.prototype._initialize = function () {
    this.fbo = this.handler.gl.createFramebuffer();
    this._createTexture();
};

og.webgl.Framebuffer.prototype._createTexture = function () {
    var gl = this.handler.gl;
    gl.deleteTexture(this.texture);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    //gl.generateMipmap(gl.TEXTURE_2D);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

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
    this.handler.gl.deleteFramebuffer(this.fbo);
    this._initialize();
};

og.webgl.Framebuffer.prototype.isComplete = function () {
    var gl = this.handler.gl;
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status == gl.FRAMEBUFFER_COMPLETE)
        return true;
    return false;
};

og.webgl.Framebuffer.prototype.readAllPixels = function () {
    var res;
    var gl = this.handler.gl;
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
    var gl = this.handler.gl;
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
    var gl = this.handler.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
};

og.webgl.Framebuffer.prototype.clear = function () {
    var gl = this.handler.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
};

og.webgl.Framebuffer.prototype.deactivate = function () {
    var gl = this.handler.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

og.webgl.Framebuffer.prototype.getImage = function () {
    var data = this.readAllPixels();
    var imageCanvas = new og.ImageCanvas(this.width, this.height);
    imageCanvas.setData(data);
    return imageCanvas.getImage();
};

og.webgl.Framebuffer.prototype.openImage = function () {
    var img = this.getImage();
    var dataUrl = img.src;
    var windowContent = '<!DOCTYPE html>';
    windowContent += '<html>'
    windowContent += '<head><title>Print</title></head>';
    windowContent += '<body>'
    windowContent += '<img src="' + dataUrl + '">';
    windowContent += '</body>';
    windowContent += '</html>';
    var printWin = window.open('', '', 'width=' + img.width + 'px ,height=' + img.height + 'px');
    printWin.document.open();
    printWin.document.write(windowContent);
    printWin.document.close();
    printWin.focus();
};