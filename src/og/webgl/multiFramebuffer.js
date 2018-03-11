/**
 * @module og/webgl/Framebuffer
 */

'use strict';

import { ImageCanvas } from '../ImageCanvas.js';

/**
 * Class represents multiple render framebuffer.
 * @class
 * @param {og.webgl.Handler} handler - WebGL handler.
 */
class MultiFramebuffer {
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
         * Picking color framebuffers.
         * @private
         * @type {Object}
         */
        this._pFbo = [];

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
    }

    /**
     * Destroy framebuffer instance.
     * @public
     */
    destroy() {
        var gl = this.handler.gl;
        gl.deleteFramebuffer(this._fbo);
        this._fbo = null;
        gl.deleteRenderbuffer(this._rbo);
        this._rbo = null;
        for (var i = 0; i < this._size; i++) {
            gl.deleteTexture(this.textures[i]);
            gl.deleteFramebuffer(this._pFbo[i]);
        }
        this.textures.length = 0;
        this.textures = [];
        this._pFbo.length = 0;
        this._pFbo = [];
    }

    /**
     * Framebuffer initialization.
     * @virtual
     */
    init() {
        var gl = this.handler.gl;
        var ext = this.handler.extensions.WEBGL_draw_buffers;

        this._fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);

        var fragDataArr = [];
        for (var i = 0; i < this._size; i++) {
            fragDataArr[i] = ext.COLOR_ATTACHMENT0_WEBGL + i;
        }
        ext.drawBuffersWEBGL(fragDataArr);

        for (var i = 0; i < this._size; i++) {
            this.textures[i] = this.handler.createEmptyTexture_l(this._width, this._height);
            gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, ext.COLOR_ATTACHMENT0_WEBGL + i, gl.TEXTURE_2D, this.textures[i], 0);
            gl.bindTexture(gl.TEXTURE_2D, null);
            fragDataArr[i] = ext.COLOR_ATTACHMENT0_WEBGL + i;
        }

        this._rbo = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this._rbo);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this._width, this._height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this._rbo);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        for (var i = 0; i < this._size; i++) {
            this._pFbo[i] = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._pFbo[i]);
            gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textures[i], 0);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /**
     * Sets framebuffer size. Must be before the activate method.
     * @public
     * @param {number} width - Framebuffer width.
     * @param {number} height - Framebuffer height.
     */
    setSize(width, height) {
        this._width = width;
        this._height = height;
        this.destroy();
        this.init();
    }

    /**
     * Reads all pixels(RGBA colors) from framebuffer.
     * @public
     * @returns {Array.<number>}
     */
    readAllPixels(index) {
        var gl = this.handler.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._pFbo[index || 0]);
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
    readPixel(nx, ny, index) {
        var gl = this.handler.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._pFbo[index || 0]);
        var pixelValues = new Uint8Array(4);
        gl.readPixels(nx * this._width, ny * this._height, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelValues);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return pixelValues;
    }

    /**
     * Returns framebuffer completed.
     * @public
     * @returns {boolean}
     */
    isComplete() {
        var gl = this.handler.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            return true;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return false;
    }

    /**
     * Activate framebuffer frame to draw.
     * @public
     * @returns {og.webgl.MultiFramebuffer} Returns current framebuffer.
     */
    activate() {
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
    deactivate() {
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
     * @returns {Object}
     */
    getImage(index) {
        var data = this.readAllPixels(index);
        var imageCanvas = new ImageCanvas(this._width, this._height);
        imageCanvas.setData(data);
        return imageCanvas.getImage();
    }

    /**
     * Open dialog window with framebuffer image.
     * @public
     */
    openImage(index) {
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
};

export { MultiFramebuffer };