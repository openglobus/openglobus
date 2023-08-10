"use strict";

import {Handler} from "./Handler";

export interface IBaseFramebufferParams {
    internalFormat?: string | string[];
    width?: number;
    height?: number;
    useDepth?: boolean;
    depthComponent?: string;
    size?: number;
    filter?: string;
}

export class BaseFramebuffer {
    public handler: Handler;
    protected _fbo: WebGLFramebuffer | null;
    protected _depthRenderbuffer: WebGLRenderbuffer | null;
    protected _width: number;
    protected _height: number;
    protected _depthComponent: string;
    protected _size: number;
    protected _active: boolean;
    protected _useDepth: boolean;
    protected _filter: string;

    constructor(handler: Handler, options: IBaseFramebufferParams = {}) {
        this.handler = handler;
        this._fbo = null;
        this._width = options.width || handler.canvas!.width;
        this._height = options.height || handler.canvas!.height;
        this._depthComponent = options.depthComponent != undefined ? options.depthComponent : "DEPTH_COMPONENT16";
        this._useDepth = options.useDepth != undefined ? options.useDepth : true;
        this._active = false;
        this._size = options.size || 1;
        this._depthRenderbuffer = null;
        this._filter = options.filter || "NEAREST";
    }

    public get width(): number {
        return this._width;
    }

    public get height(): number {
        return this._height;
    }

    /**
     * Sets framebuffer viewport size.
     * @public
     * @param {number} width - Framebuffer width.
     * @param {number} height - Framebuffer height.
     * @param {boolean} [forceDestroy] -
     */
    public setSize(width: number, height: number, forceDestroy: boolean = false) {
        this._width = width;
        this._height = height;

        if (this._active) {
            this.handler.gl!.viewport(0, 0, this._width, this._height);
        }

        if (this._useDepth || forceDestroy) {
            this.destroy();
            this.init();
        }
    }

    public init() {
    }

    public destroy() {
    }

    /**
     * Returns framebuffer completed.
     * @public
     * @returns {boolean} -
     */
    public isComplete(): boolean {
        let gl = this.handler.gl!;
        return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    }

    public checkStatus(): number {
        let gl = this.handler.gl!;
        return gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    }

    /**
     * Activate framebuffer frame to draw.
     * @public
     * @returns {Framebuffer} Returns Current framebuffer.
     */
    public activate() {
        let gl = this.handler.gl!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
        gl.viewport(0, 0, this._width, this._height);
        this._active = true;

        let c = this.handler.framebufferStack.current().data;
        c && (c._active = false);
        this.handler.framebufferStack.push(this);
        return this;
    }

    /**
     * Deactivate framebuffer frame.
     * @public
     */
    public deactivate() {
        let h = this.handler,
            gl = h.gl!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null as any);
        this._active = false;

        let f = this.handler.framebufferStack.popPrev();

        if (f) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, f._fbo);
            gl.viewport(0, 0, f._width, f._height);
        } else {
            gl.viewport(0, 0, h.canvas!.width, h.canvas!.height);
        }
    }
}