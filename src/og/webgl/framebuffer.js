/**
 * @module og/webgl/Framebuffer
 */

'use strict';

import { ImageCanvas } from '../ImageCanvas.js';

/**
 * Class represents framebuffer.
 * @class
 * @param {og.webgl.Handler} handler - WebGL handler.
 * @param {number} [width] - Framebuffer width. Default is handler canvas width.
 * @param {number} [height] - Framebuffer height. Default is handler canvas height.
 */
class Framebuffer {
    constructor(handler, options) {
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
        this._rbo = null;

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

        this._useDepth = options.useDepth != undefined ? options.useDepth : true;

        /**
         * Framebuffer activity. 
         * @private
         * @type {boolean}
         */
        this._active = false;

        /**
         * Framebuffer texture.
         * @public
         * @type {number}
         */
        this.texture = options.texture || null;

        this._initialize();
    }

    destroy = function () {
        var gl = this.handler.gl;
        gl.deleteTexture(this.texture);
        gl.deleteFramebuffer(this._fbo);
        gl.deleteRenderbuffer(this._rbo);

        this.texture = null;
        this._rbo = null;
        this._fbo = null;

        this._active = false;
    }

    /**
     * Framebuffer initialization.
     * @private
     */
    _initialize = function () {
        var gl = this.handler.gl;

        this._fbo = gl.createFramebuffer();

        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
        !this.texture && this.bindOutputTexture(this.handler.createEmptyTexture_l(this._width, this._height));

        if (this._useDepth) {
            this._rbo = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, this._rbo);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this._width, this._height);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this._rbo);
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /**
     * Bind buffer texture.
     * @public
     * @param{Object} texture - Output texture.
     */
    bindOutputTexture(texture) {
        var gl = this.handler.gl;
        this.texture = texture;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    /**
     * Sets framebuffer viewport size.
     * @public
     * @param {number} width - Framebuffer width.
     * @param {number} height - Framebuffer height.
     */
    setSize(width, height) {
        this._width = width;
        this._height = height;
        if (this._active) {
            this.handler.gl.viewport(0, 0, this._width, this._height);
        }
        if (this._useDepth) {
            this.destroy();
            this._initialize();
        }
    };

    /**
     * Returns framebuffer completed.
     * @public
     * @returns {boolean}
     */
    isComplete() {
        var gl = this.handler.gl;
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE)
            return true;
        return false;
    }

    /**
     * Reads all pixels(RGBA colors) from framebuffer.
     * @public
     * @returns {Array.<number>}
     */
    readAllPixels() {
        var gl = this.handler.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
        var pixelValues = new Uint8Array(4 * this._width * this._height);
        gl.readPixels(0, 0, this._width, this._height, gl.RGBA, gl.UNSIGNED_BYTE, pixelValues);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return pixelValues;
    }

    /**
     * Gets pixel RBGA color from framebuffer by coordinates.
     * @public
     * @param {number} x - Normalized x - coordinate.
     * @param {number} y - Normalized y - coordinate.
     * @returns {Array.<number,number,number,number>}
     */
    readPixel(nx, ny) {
        var gl = this.handler.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
        var pixelValues = new Uint8Array(4);
        gl.readPixels(nx * this._width, ny * this._height, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelValues);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return pixelValues;
    }

    /**
     * Activate framebuffer frame to draw.
     * @public
     * @returns {og.webgl.Framebuffer} Returns Current framebuffer.
     */
    activate() {
        var gl = this.handler.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
        gl.viewport(0, 0, this._width, this._height);
        this._active = true;
        var c = this.handler.framebufferStack.current().data;
        c && (c._active = false);
        this.handler.framebufferStack.push(this);
        return this;
    }

    /**
     * Deactivate framebuffer frame.
     * @public
     */
    deactivate() {
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
    }

    /**
     * Gets JavaScript image object that framebuffer has drawn.
     * @public
     * @returns {Object}
     */
    getImage() {
        var data = this.readAllPixels();
        var imageCanvas = new ImageCanvas(this._width, this._height);
        imageCanvas.setData(data);
        return imageCanvas.getImage();
    }

    /**
     * Open dialog window with framebuffer image.
     * @public
     */
    openImage() {
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
    }
};

export { Framebuffer };