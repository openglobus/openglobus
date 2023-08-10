"use strict";

import {BaseFramebuffer, IBaseFramebufferParams} from "./BaseFramebuffer";
import {ImageCanvas} from "../ImageCanvas";
import {Handler} from "./Handler";

export interface IFrameBufferParams extends IBaseFramebufferParams {
    isBare?: boolean;
    format?: string | string[];
    type?: string | string[];
    attachment?: string | string[];
    renderbufferTarget?: string;
    textures?: WebGLTexture[];
}

/**
 * Class represents framebuffer.
 * @class
 * @param {Handler} handler - WebGL handler.
 * @param {IFrameBufferParams} [options] - Framebuffer options:
 */
export class Framebuffer extends BaseFramebuffer {

    protected _isBare: boolean;

    protected _internalFormatArr: string[];

    protected _formatArr: string[];

    protected _typeArr: string[];

    protected _attachmentArr: string[];

    protected _renderbufferTarget: string;

    /**
     * Framebuffer texture.
     * @public
     * @type {number}
     */
    public textures: WebGLTexture[];

    constructor(handler: Handler, options: IFrameBufferParams = {}) {

        super(handler, options);

        this._isBare = options.isBare || false;

        this._internalFormatArr = options.internalFormat instanceof Array ? options.internalFormat : [options.internalFormat || "RGBA"];

        this._formatArr = options.format instanceof Array ? options.format : [options.format || "RGBA"];

        this._typeArr = options.type instanceof Array ? options.type : [options.type || "UNSIGNED_BYTE"];

        // @ts-ignore
        this._attachmentArr = options.attachment instanceof Array ? options.attachment.map((a: string, i: number) => {
            let res = a.toUpperCase();
            if (res === "COLOR_ATTACHMENT") {
                return `${res}${i.toString()}`;
            }
            return res;
        }) : [options.attachment || "COLOR_ATTACHMENT0"];


        this._renderbufferTarget = options.renderbufferTarget != undefined ? options.renderbufferTarget : "DEPTH_ATTACHMENT";


        this.textures = options.textures || new Array(this._size);
    }

    // static blit(sourceFramebuffer: Framebuffer, destFramebuffer: Framebuffer, glAttachment: number, glMask: number, glFilter: number) {
    //     let gl = sourceFramebuffer.handler.gl!;
    //
    //     gl.bindFramebuffer(gl.READ_FRAMEBUFFER, sourceFramebuffer._fbo);
    //     gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, destFramebuffer._fbo);
    //     gl.readBuffer(glAttachment);
    //
    //     gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 1.0]);
    //
    //     gl.blitFramebuffer(0, 0, sourceFramebuffer._width, sourceFramebuffer._height, 0, 0, destFramebuffer._width, destFramebuffer._height, glMask, glFilter);
    //
    //     gl.bindFramebuffer(gl.FRAMEBUFFER, null as any);
    //     gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null as any);
    //     gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null as any);
    // }

    public override destroy() {
        let gl = this.handler.gl;

        if (!gl) return;

        for (let i = 0; i < this.textures.length; i++) {
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
     * @public
     */
    public override init() {
        let gl = this.handler.gl;

        if (!gl) return;

        this._fbo = gl.createFramebuffer();

        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);

        if (!this._isBare) {
            let attachmentArr = [];
            for (let i = 0; i < this.textures.length; i++) {
                let ti = this.textures[i] || this.handler.createEmptyTexture2DExt(this._width, this._height, this._filter, this._internalFormatArr[i], this._formatArr[i], this._typeArr[i]);

                // @ts-ignore
                let att_i = gl[this._attachmentArr[i]];

                if (ti) {
                    this.bindOutputTexture(ti, att_i);
                    this.textures[i] = ti;
                }

                if (this._attachmentArr[i] != "DEPTH_ATTACHMENT") {
                    attachmentArr.push(att_i);
                }
            }
            gl.drawBuffers && gl.drawBuffers(attachmentArr);
        }

        if (this._useDepth) {
            this._depthRenderbuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, this._depthRenderbuffer);
            // @ts-ignore
            gl.renderbufferStorage(gl.RENDERBUFFER, gl[this._depthComponent], this._width, this._height);
            // @ts-ignore
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl[this._renderbufferTarget], gl.RENDERBUFFER, this._depthRenderbuffer);
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /**
     * Bind buffer texture.
     * @public
     * @param {WebGLTexture} texture - Output texture.
     * @param {number} [glAttachment=0] - color attachment index.
     */
    public bindOutputTexture(texture: WebGLTexture, glAttachment?: number) {
        let gl = this.handler.gl!;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, glAttachment || gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.bindTexture(gl.TEXTURE_2D, null as any);
    }

    /**
     * Gets pixel RGBA color from framebuffer by coordinates.
     * @public
     * @param {Uint8Array} res - Normalized x - coordinate.
     * @param {number} nx - Normalized x - coordinate.
     * @param {number} ny - Normalized y - coordinate.
     * @param {number} [w=1] - Normalized width.
     * @param {number} [h=1] - Normalized height.
     * @param {Number} [index=0] - color attachment index.
     */
    public readPixels(res: Uint8Array, nx: number, ny: number, index: number = 0, w: number = 1, h: number = 1) {
        let gl = this.handler.gl!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
        gl.readBuffer && gl.readBuffer(gl.COLOR_ATTACHMENT0 + index || 0);
        // @ts-ignore
        gl.readPixels(nx * this._width, ny * this._height, w, h, gl.RGBA, gl[this._typeArr[index]], res);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null as any);
    }

    /**
     * Reads all pixels(RGBA colors) from framebuffer.
     * @public
     * @param {Uint8Array} res - Result array.
     * @param {Number} [attachmentIndex=0] - color attachment index.
     */
    public readAllPixels(res: Uint8Array, attachmentIndex: number = 0) {
        let gl = this.handler.gl!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
        gl.readBuffer && gl.readBuffer(gl.COLOR_ATTACHMENT0 + attachmentIndex);
        // @ts-ignore
        gl.readPixels(0, 0, this._width, this._height, gl.RGBA, gl[this._typeArr[attachmentIndex]], res);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null as any);
    }

    /**
     * Gets JavaScript image that in the framebuffer.
     * @public
     * @returns {HTMLImageElement} -
     */
    public getImage(): HTMLImageElement {
        let data = new Uint8Array(4 * this._width * this._height);
        this.readAllPixels(data);
        let imageCanvas = new ImageCanvas(this._width, this._height);
        imageCanvas.setData(data);
        return imageCanvas.getImage();
    }
}
