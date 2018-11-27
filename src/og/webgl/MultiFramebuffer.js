/**
 * @module og/webgl/Framebuffer
 */

'use strict';

import { ImageCanvas } from '../ImageCanvas.js';

/**
 * Class represents multiple render framebuffer.
 * @class
 * @param {og.webgl.Handler} handler - WebGL handler.
 * @param {Object} [options] - Framebuffer options:
 * @param {number} [options.width] - Framebuffer width. Default is handler canvas width.
 * @param {number} [options.height] - Framebuffer height. Default is handler canvas height.
 * @param {number} [options.size] - Buffer quantity.
 */
const MultiFramebuffer = function (handler, options) {

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
     * Render buffer object.
     * @private
     */
    this._rbo = null;

    this._size = options.size || 1;

    /**
     * Framebuffer width.
     * @private
     * @type {number}
     */
    this._width = options.width || 256;

    /**
     * Framebuffer width.
     * @private
     * @type {number}
     */
    this._height = options.height || 256;

    /**
     * Buffer textures.
     * @public
     */
    this.textures = [];

    /**
     * Framebuffer activity. 
     * @private
     * @type {boolean}
     */
    this._active = false;
};

/**
 * Destroy framebuffer instance.
 * @public
 */
MultiFramebuffer.prototype.destroy = function () {
    var gl = this.handler.gl;
    gl.deleteFramebuffer(this._fbo);
    this._fbo = null;
    gl.deleteRenderbuffer(this._rbo);
    this._rbo = null;
    for (var i = 0; i < this._size; i++) {
        gl.deleteTexture(this.textures[i]);
    }
    this.textures.length = 0;
    this.textures = [];
};

/**
 * Framebuffer initialization.
 * @virtual
 */
MultiFramebuffer.prototype.init = function () {
    
    var gl = this.handler.gl;


    this._fbo = gl.createFramebuffer();

    gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
    this._rbo = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this._rbo);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this._width, this._height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this._rbo);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);


    var colorAttachments = [];

    gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);

    for (let i = 0; i < this._size; i++) {
        this.textures[i] = this.handler.createEmptyTexture_l(this._width, this._height);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, this.textures[i], 0);
        gl.bindTexture(gl.TEXTURE_2D, null);
        colorAttachments[i] = gl.COLOR_ATTACHMENT0 + i;
    }

    gl.drawBuffers(colorAttachments);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

/**
 * Sets framebuffer size. Must be before the activate method.
 * @public
 * @param {number} width - Framebuffer width.
 * @param {number} height - Framebuffer height.
 */
MultiFramebuffer.prototype.setSize = function (width, height) {
    this._width = width;
    this._height = height;
    this.destroy();
    this.init();
};

/**
 * Gets pixel RBGA color from framebuffer by coordinates.
 * @public
 * @param {UInt8Array} res - Result out array.
 * @param {number} nx - Normalized x - coordinate.
 * @param {number} ny - Normalized y - coordinate.
 * @param {number} [index=0] - Normalized x - coordinate.
 * @param {number} [w=1] - Normalized x - coordinate.
 * @param {number} [h=1] - Normalized y - coordinate.
 */
MultiFramebuffer.prototype.readPixels = function (res, nx, ny, index, w, h) {
    var gl = this.handler.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
    gl.readBuffer(gl.COLOR_ATTACHMENT0 + index || 0);
    gl.readPixels(nx * this._width, ny * this._height, w || 1, h || 1, gl.RGBA, gl.UNSIGNED_BYTE, res);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

/**
 * Reads all pixels(RGBA colors) from framebuffer.
 * @public
 * @param {UInt8Array} res - Result array
 * @param {Number} [index] - Buffer index to read
 */
MultiFramebuffer.prototype.readAllPixels = function (res, index) {
    var gl = this.handler.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
    gl.readBuffer(gl.COLOR_ATTACHMENT0 + index || 0);
    gl.readPixels(0, 0, this._width, this._height, gl.RGBA, gl.UNSIGNED_BYTE, res);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

/**
 * Returns framebuffer completed.
 * @public
 * @returns {boolean} -
 */
MultiFramebuffer.prototype.isComplete = function () {
    var gl = this.handler.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return true;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return false;
};

/**
 * Activate framebuffer frame to draw.
 * @public
 * @returns {og.webgl.MultiFramebuffer} Returns current framebuffer.
 */
MultiFramebuffer.prototype.activate = function () {
    var h = this.handler,
        gl = h.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
    gl.viewport(0, 0, this._width, this._height);
    this._active = true;
    var c = this.handler.framebufferStack.current().data;
    c && (c._active = false);
    h.framebufferStack.push(this);
    return this;
}

/**
 * Deactivate framebuffer frame.
 * @public
 */
MultiFramebuffer.prototype.deactivate = function () {
    var h = this.handler,
        gl = h.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, h.canvas.width, h.canvas.height);
    this._active = false;

    var f = h.framebufferStack.popPrev();
    if (f) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, f._fbo);
        gl.viewport(0, 0, f._width, f._height);
    } else {
        gl.viewport(0, 0, h.canvas.width, h.canvas.height);
    }
}

/**
 * Gets JavaScript image object that framebuffer has drawn.
 * @public
 * @param {number} [index] - Buffer index
 * @returns {Image} -
 */
MultiFramebuffer.prototype.getImage = function (index) {
    var data = new Uint8Array(4 * this._width * this._height);
    this.readAllPixels(data, index);
    var imageCanvas = new ImageCanvas(this._width, this._height);
    imageCanvas.setData(data);
    return imageCanvas.getImage();
}

/**
 * Open dialog window with framebuffer image.
 * @public
 * @param {number} [index] - Buffer index
 */
MultiFramebuffer.prototype.openImage = function (index) {
    var img = this.getImage(index);
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
}

export { MultiFramebuffer };