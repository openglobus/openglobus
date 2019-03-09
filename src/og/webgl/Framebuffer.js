/**
 * @module og/webgl/Framebuffer
 */

'use strict';

import { ImageCanvas } from '../ImageCanvas.js';

/**
 * Class represents framebuffer.
 * @class
 * @param {og.webgl.Handler} handler - WebGL handler.
 * @param {Object} [options] - Framebuffer options:
 * @param {number} [options.width] - Framebuffer width. Default is handler canvas width.
 * @param {number} [options.height] - Framebuffer height. Default is handler canvas height.
 * @param {number} [options.size] - Color attachment size.
 * @param {String} [options.internalFormat="RGBA"] - Specifies the color components in the texture.
 * @param {String} [options.format="RGBA"] - Specifies the format of the texel data.
 * @param {String} [options.type="UNSIGNED_BYTE"] - Specifies the data type of the texel data.
 * @param {String} [options.depthComponent="DEPTH_COMPONENT16"] - Specifies depth buffer size.
 * @param {Boolean} [options.useDepth] - Using depth buffer during the rendering.
 */
const Framebuffer = function (handler, options) {

    options = options || {};

    /**
     * WebGL handler.
     * @public
     * @type {og.webgl.Handler}
     */
    this.handler = handler;

    /**
     * Framebuffer object.
     * @private
     * @type {Object}
     */
    this._fbo = null;

    /**
     * Renderbuffer object.
     * @private
     * @type {Object}
     */
    this._depthRenderbuffer = null;

    this._filter = options.filter || "NEAREST";

    this._internalFormat = options.internalFormat || "RGBA";

    this._format = options.format || "RGBA";

    this._type = options.type || "UNSIGNED_BYTE";

    /**
     * Framebuffer width.
     * @private
     * @type {number}
     */
    this._width = options.width || handler.canvas.width;

    /**
     * Framebuffer width.
     * @private
     * @type {number}
     */
    this._height = options.height || handler.canvas.height;

    this._depthComponent = options.depthComponent != undefined ? options.depthComponent : "DEPTH_COMPONENT16";

    this._useDepth = options.useDepth != undefined ? options.useDepth : true;

    /**
     * Framebuffer activity. 
     * @private
     * @type {boolean}
     */
    this._active = false;

    this._size = options.size || 1;

    /**
     * Framebuffer texture.
     * @public
     * @type {number}
     */
    this.textures = options.textures || new Array(this._size);
};

Framebuffer.prototype.destroy = function () {
    var gl = this.handler.gl;

    for (var i = 0; i < this.textures.length; i++) {
        gl.deleteTexture(this.textures[i]);
    }
    this.textures = new Array(this._size);

    gl.deleteFramebuffer(this._fbo);
    gl.deleteRenderbuffer(this._depthRenderbuffer);

    this._depthRenderbuffer = null;
    this._fbo = null;

    this._active = false;
};

/**
 * Framebuffer initialization.
 * @private
 */
Framebuffer.prototype.init = function () {
    var gl = this.handler.gl;

    this._fbo = gl.createFramebuffer();

    gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);

    if (this.textures.length === 0) {
        this.bindOutputTexture(this.handler.createEmptyTexture2DExt(
            this._width,
            this._height,
            this._filter,
            this._internalFormat,
            this._format,
            this._type
        ));
        gl.drawBuffers && gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    } else {
        let colorAttachments = [];
        for (var i = 0; i < this.textures.length; i++) {
            this.bindOutputTexture(
                this.textures[i] ||
                this.handler.createEmptyTexture2DExt(
                    this._width,
                    this._height,
                    this._filter,
                    this._internalFormat,
                    this._format,
                    this._type
                ), i);
            colorAttachments.push(gl.COLOR_ATTACHMENT0 + i);
        }
        gl.drawBuffers && gl.drawBuffers(colorAttachments);
    }

    if (this._useDepth) {
        this._depthRenderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this._depthRenderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl[this._depthComponent], this._width, this._height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this._depthRenderbuffer);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return this;
};

/**
 * Bind buffer texture.
 * @public
 * @param{Object} texture - Output texture.
 * @param {Number} [attachmentIndex=0] - color attachment index.
 */
Framebuffer.prototype.bindOutputTexture = function (texture, attachmentIndex = 0) {
    var gl = this.handler.gl;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + attachmentIndex, gl.TEXTURE_2D, texture, 0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.textures[attachmentIndex] = texture;
};

/**
 * Sets framebuffer viewport size.
 * @public
 * @param {number} width - Framebuffer width.
 * @param {number} height - Framebuffer height.
 */
Framebuffer.prototype.setSize = function (width, height, forceDestroy) {
    this._width = width;
    this._height = height;

    if (this._active) {
        this.handler.gl.viewport(0, 0, this._width, this._height);
    }

    if (this._useDepth || forceDestroy) {
        this.destroy();
        this.init();
    }
};

/**
 * Returns framebuffer completed.
 * @public
 * @returns {boolean} -
 */
Framebuffer.prototype.isComplete = function () {
    var gl = this.handler.gl;
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE)
        return true;
    return false;
};

/**
 * Gets pixel RBGA color from framebuffer by coordinates.
 * @public
 * @param {Uint8Array} res - Normalized x - coordinate.
 * @param {number} nx - Normalized x - coordinate.
 * @param {number} ny - Normalized y - coordinate.
 * @param {number} [w=1] - Normalized width.
 * @param {number} [h=1] - Normalized height.
 * @param {Number} [attachmentIndex=0] - color attachment index.
 */
Framebuffer.prototype.readPixels = function (res, nx, ny, index = 0, w = 1, h = 1) {
    var gl = this.handler.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
    gl.readBuffer && gl.readBuffer(gl.COLOR_ATTACHMENT0 + index || 0);
    gl.readPixels(nx * this._width, ny * this._height, w, h, gl.RGBA, gl[this._type], res);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

/**
 * Reads all pixels(RGBA colors) from framebuffer.
 * @public
 * @param {Uint8Array} res - Result array.
 * @param {Number} [attachmentIndex=0] - color attachment index.
 */
Framebuffer.prototype.readAllPixels = function (res, attachmentIndex = 0) {
    var gl = this.handler.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
    gl.readBuffer && gl.readBuffer(gl.COLOR_ATTACHMENT0 + attachmentIndex);
    gl.readPixels(0, 0, this._width, this._height, gl.RGBA, gl[this._type], res);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

/**
 * Activate framebuffer frame to draw.
 * @public
 * @returns {og.webgl.Framebuffer} Returns Current framebuffer.
 */
Framebuffer.prototype.activate = function () {
    var gl = this.handler.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
    gl.viewport(0, 0, this._width, this._height);
    this._active = true;
    var c = this.handler.framebufferStack.current().data;
    c && (c._active = false);
    this.handler.framebufferStack.push(this);
    return this;
};

/**
 * Deactivate framebuffer frame.
 * @public
 */
Framebuffer.prototype.deactivate = function () {
    var h = this.handler,
        gl = h.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this._active = false;

    var f = this.handler.framebufferStack.popPrev();

    if (f) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, f._fbo);
        gl.viewport(0, 0, f._width, f._height);
    } else {
        gl.viewport(0, 0, h.canvas.width, h.canvas.height);
    }
};

/**
 * Gets JavaScript image object that framebuffer has drawn.
 * @public
 * @returns {Object} -
 */
Framebuffer.prototype.getImage = function () {
    var data = new Uint8Array(4 * this._width * this._height);
    this.readAllPixels(data);
    var imageCanvas = new ImageCanvas(this._width, this._height);
    imageCanvas.setData(data);
    return imageCanvas.getImage();
};

/**
 * Open dialog window with framebuffer image.
 * @public
 */
Framebuffer.prototype.openImage = function () {
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


export { Framebuffer };