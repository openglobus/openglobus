/**
 * @module og/webgl/Framebuffer
 */

"use strict";

import { ImageCanvas } from "../ImageCanvas.js";

/**
 * Class represents framebuffer.
 * @class
 * @param {Handler} handler - WebGL handler.
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
export class Framebuffer {
    constructor(handler, options = {}) {
        /**
         * WebGL handler.
         * @public
         * @type {Handler}
         */
        this.handler = handler;

        /**
         * Framebuffer object.
         * @private
         * @type {Object}
         */
        this._fbo = null;

        this._isBare = options.isBare || false;

        /**
         * Renderbuffer object.
         * @private
         * @type {Object}
         */
        this._depthRenderbuffer = null;

        this._filter = options.filter || "NEAREST";

        this._internalFormatArr = options.internalFormat instanceof Array ? options.internalFormat : [options.internalFormat || "RGBA"];

        this._formatArr = options.format instanceof Array ? options.format : [options.format || "RGBA"];

        this._typeArr = options.type instanceof Array ? options.type : [options.type || "UNSIGNED_BYTE"];

        this._attachmentArr = options.attachment instanceof Array ? options.attachment.map((a, i) => {
            let res = a.toUpperCase();
            if (res === "COLOR_ATTACHMENT") {
                return `${res}${i.toString()}`;
            }
            return res;
        }) : [options.attachment || "COLOR_ATTACHMENT0"];

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
    }

    static blit(sourceFramebuffer, destFramebuffer, glAttachment, glMask, glFilter) {
        let gl = sourceFramebuffer.handler.gl;

        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, sourceFramebuffer._fbo);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, destFramebuffer._fbo);
        gl.readBuffer(glAttachment);

        gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 1.0]);

        gl.blitFramebuffer(0, 0, sourceFramebuffer._width, sourceFramebuffer._height, 0, 0, destFramebuffer._width, destFramebuffer._height, glMask, glFilter);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    destroy() {
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
    }

    /**
     * Framebuffer initialization.
     * @private
     */
    init() {
        var gl = this.handler.gl;

        this._fbo = gl.createFramebuffer();

        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);

        if (!this._isBare) {
            let attachmentArr = [];
            for (var i = 0; i < this.textures.length; i++) {
                let ti = this.textures[i] || this.handler.createEmptyTexture2DExt(this._width, this._height, this._filter, this._internalFormatArr[i], this._formatArr[i], this._typeArr[i]);

                let att_i = gl[this._attachmentArr[i]];

                this.bindOutputTexture(ti, att_i);

                this.textures[i] = ti;

                if (this._attachmentArr[i] != "DEPTH_ATTACHMENT") {
                    attachmentArr.push(att_i);
                }
            }
            gl.drawBuffers && gl.drawBuffers(attachmentArr);
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
    }

    /**
     * Bind buffer texture.
     * @public
     * @param{Object} texture - Output texture.
     * @param {Number} [attachmentIndex=0] - color attachment index.
     */
    bindOutputTexture(texture, glAttachment) {
        var gl = this.handler.gl;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, glAttachment || gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    /**
     * Sets framebuffer viewport size.
     * @public
     * @param {number} width - Framebuffer width.
     * @param {number} height - Framebuffer height.
     */
    setSize(width, height, forceDestroy) {
        this._width = width;
        this._height = height;

        if (this._active) {
            this.handler.gl.viewport(0, 0, this._width, this._height);
        }

        if (this._useDepth || forceDestroy) {
            this.destroy();
            this.init();
        }
    }

    /**
     * Returns framebuffer completed.
     * @public
     * @returns {boolean} -
     */
    isComplete() {
        var gl = this.handler.gl;
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
            return true;
        }
        return false;
    }

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
    readPixels(res, nx, ny, index = 0, w = 1, h = 1) {
        var gl = this.handler.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
        gl.readBuffer && gl.readBuffer(gl.COLOR_ATTACHMENT0 + index || 0);
        gl.readPixels(nx * this._width, ny * this._height, w, h, gl.RGBA, gl[this._typeArr[index]], res);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /**
     * Reads all pixels(RGBA colors) from framebuffer.
     * @public
     * @param {Uint8Array} res - Result array.
     * @param {Number} [attachmentIndex=0] - color attachment index.
     */
    readAllPixels(res, attachmentIndex = 0) {
        var gl = this.handler.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
        gl.readBuffer && gl.readBuffer(gl.COLOR_ATTACHMENT0 + attachmentIndex);
        gl.readPixels(0, 0, this._width, this._height, gl.RGBA, gl[this._typeArr[attachmentIndex]], res);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /**
     * Activate framebuffer frame to draw.
     * @public
     * @returns {Framebuffer} Returns Current framebuffer.
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
        var h = this.handler, gl = h.gl;
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
     * @returns {Object} -
     */
    getImage() {
        var data = new Uint8Array(4 * this._width * this._height);
        this.readAllPixels(data);
        var imageCanvas = new ImageCanvas(this._width, this._height);
        imageCanvas.setData(data);
        return imageCanvas.getImage();
    }
}
