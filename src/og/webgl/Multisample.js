/**
 * @module og/webgl/Multisample
 */

'use strict';

/**
 * Class represents multisample framebuffer.
 * @class
 * @param {og.webgl.Handler} handler - WebGL handler.
 * @param {Object} [options] - Framebuffer options:
 * @param {number} [options.width] - Framebuffer width. Default is handler canvas width.
 * @param {number} [options.height] - Framebuffer height. Default is handler canvas height.
 * @param {Object} [options.texture] - Texture to render.
 * @param {Boolean} [options.useDepth] - Using depth buffer during the rendering.
 */
const Multisample = function (handler, options) {

    options = options || {};

    /**
     * WebGL handler.
     * @public
     * @type {og.webgl.Handler}
     */
    this.handler = handler;

    this._internalFormat = options.format ? options.format.toUpperCase() : "RGBA8";

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

    this._msaa = options.msaa != undefined ? options.msaa : 4;

    this._useDepth = options.useDepth != undefined ? options.useDepth : true;

    /**
     * Framebuffer activity. 
     * @private
     * @type {boolean}
     */
    this._active = false;

    this._size = options.size || 1;

    this.renderbuffers = new Array(this._size);
};

Multisample.prototype.destroy = function () {
    var gl = this.handler.gl;

    for (var i = 0; i < this.renderbuffers.length; i++) {
        gl.deleteRenderbuffer(this.renderbuffers[i]);
    }
    this.renderbuffers = new Array(this._size);

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
Multisample.prototype.init = function () {

    var gl = this.handler.gl;

    this._fbo = gl.createFramebuffer();

    gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);

    if (this.renderbuffers.length === 0) {
        let rb = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
        gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this._msaa, gl[this._internalFormat], this._width, this._height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rb);
        this.renderbuffers.push(rb);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    } else {
        let colorAttachments = [];
        for (var i = 0; i < this.renderbuffers.length; i++) {
            let rb = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
            gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this._msaa, gl[this._internalFormat], this._width, this._height);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.RENDERBUFFER, rb);
            colorAttachments.push(gl.COLOR_ATTACHMENT0 + i);
            this.renderbuffers[i] = rb;
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        }
        gl.drawBuffers(colorAttachments);
    }

    if (this._useDepth) {
        this._depthRenderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this._depthRenderbuffer);
        gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this._msaa, gl.DEPTH_COMPONENT16, this._width, this._height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this._depthRenderbuffer);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

Multisample.prototype.blit = function (framebuffer, attachmentIndex = 0) {

    let gl = this.handler.gl;

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this._fbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, framebuffer._fbo);
    gl.readBuffer(gl.COLOR_ATTACHMENT0 + attachmentIndex);

    gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 1.0]);

    gl.blitFramebuffer(
        0, 0, this._width, this._height,
        0, 0, framebuffer._width, framebuffer._height,
        gl.COLOR_BUFFER_BIT, gl.NEAREST
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
};

/**
 * Sets framebuffer viewport size.
 * @public
 * @param {number} width - Framebuffer width.
 * @param {number} height - Framebuffer height.
 */
Multisample.prototype.setSize = function (width, height, forceDestroy) {
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
Multisample.prototype.isComplete = function () {
    var gl = this.handler.gl;
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE)
        return true;
    return false;
};

/**
 * Activate framebuffer frame to draw.
 * @public
 * @returns {og.webgl.Framebuffer} Returns Current framebuffer.
 */
Multisample.prototype.activate = function () {
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
Multisample.prototype.deactivate = function () {
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

export { Multisample };