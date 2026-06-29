import { Handler } from "./Handler";

export interface IBaseFramebufferParams {
    width?: number;
    height?: number;
    useDepth?: boolean;
    depthComponent?: string;
    size?: number;
    filter?: string;
    sharedDepthFramebuffer?: BaseFramebuffer | null;
}

export class BaseFramebuffer {
    static __counter__: number = 0;

    protected __id: number;
    public handler: Handler;
    public _fbo: WebGLFramebuffer | null;
    protected _depthRenderbuffer: WebGLRenderbuffer | null;
    protected _sharedDepthFramebuffer: BaseFramebuffer | null;
    public _width: number;
    public _height: number;
    protected _depthComponent: string;
    protected _size: number;
    protected _active: boolean;
    protected _useDepth: boolean;
    protected _filter: string;

    constructor(handler: Handler, options: IBaseFramebufferParams = {}) {
        this.handler = handler;
        this.__id = BaseFramebuffer.__counter__++;
        this._fbo = null;
        this._width = options.width || handler.canvas!.width;
        this._height = options.height || handler.canvas!.height;
        this._depthComponent = options.depthComponent != undefined ? options.depthComponent : "DEPTH_COMPONENT24";
        this._useDepth = options.useDepth != undefined ? options.useDepth : true;
        this._active = false;
        this._size = options.size || 1;
        this._depthRenderbuffer = null;
        this._sharedDepthFramebuffer = options.sharedDepthFramebuffer || null;
        this._filter = options.filter || "NEAREST";
    }

    static blitTo(
        destFramebuffer: BaseFramebuffer,
        sourceFramebuffer: BaseFramebuffer,
        glAttachmentIndex: number | null,
        glMask: number,
        glFilter: number
    ) {
        let gl = sourceFramebuffer.handler.gl!;

        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, sourceFramebuffer._fbo);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, destFramebuffer._fbo);

        if (glAttachmentIndex !== null) {
            gl.readBuffer(gl.COLOR_ATTACHMENT0 + glAttachmentIndex);
            gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 1.0]);
        }

        gl.blitFramebuffer(
            0,
            0,
            sourceFramebuffer._width,
            sourceFramebuffer._height,
            0,
            0,
            destFramebuffer._width,
            destFramebuffer._height,
            glMask,
            glFilter
        );

        gl.bindFramebuffer(gl.FRAMEBUFFER, null!);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null!);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null!);
    }

    public blitDepthFrom(sourceFramebuffer: BaseFramebuffer, glFilter?: number) {
        const gl = this.handler.gl!;
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, sourceFramebuffer._fbo);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this._fbo);
        gl.blitFramebuffer(
            0,
            0,
            sourceFramebuffer._width,
            sourceFramebuffer._height,
            0,
            0,
            this._width,
            this._height,
            gl.DEPTH_BUFFER_BIT,
            glFilter ?? gl.NEAREST
        );
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null!);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null!);
    }

    public get width(): number {
        return this._width;
    }

    public get height(): number {
        return this._height;
    }

    public get depthRenderbuffer(): WebGLRenderbuffer | null {
        return this.sharedDepthRenderbuffer || this._depthRenderbuffer;
    }

    public get sharedDepthFramebuffer(): BaseFramebuffer | null {
        return this._sharedDepthFramebuffer;
    }

    public get sharedDepthRenderbuffer(): WebGLRenderbuffer | null {
        let current = this._sharedDepthFramebuffer;
        let guard = 0;

        while (current && guard++ < 32) {
            if (current === this) {
                return null;
            }
            if (!current._sharedDepthFramebuffer) {
                return current._depthRenderbuffer;
            }
            current = current._sharedDepthFramebuffer;
        }

        return null;
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

    public init() {}

    public destroy() {}

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
     * Checks active framebuffer completeness and logs readable status on failure.
     * @public
     * @param {string} [message] - Warning message prefix.
     * @returns {boolean} `true` when active framebuffer is complete.
     */
    public validateComplete(message?: string): boolean {
        const gl = this.handler.gl;

        if (!gl) {
            return false;
        }

        const status = this.checkStatus();

        if (status === gl.FRAMEBUFFER_COMPLETE) {
            return true;
        }

        const statusText = `status=${this.statusToText(status)}`;
        console.warn(
            message
                ? `${message} (${statusText})`
                : `BaseFramebuffer.validateComplete(): framebuffer incomplete (${statusText}).`
        );

        return false;
    }

    /**
     * Binds a 2D texture to the active framebuffer color attachment.
     * @public
     * @param {WebGLTexture} texture - Output texture.
     * @param {number} [glAttachment=COLOR_ATTACHMENT0] - GL color attachment.
     */
    public bindOutputTexture(texture: WebGLTexture, glAttachment?: number): void {
        const gl = this.handler.gl!;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, glAttachment || gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.bindTexture(gl.TEXTURE_2D, null!);
    }

    /**
     * Binds a texture array layer to the active framebuffer color attachment.
     * Activate framebuffer before calling this method.
     * @public
     * @param {WebGLTexture | null} texture - Output texture array.
     * @param {number} layer - Array layer index.
     * @param {number} [colorAttachmentIndex=0] - Color attachment index.
     * @param {number} [level=0] - Mipmap level.
     */
    public bindOutputTextureLayer(
        texture: WebGLTexture | null,
        layer: number,
        colorAttachmentIndex: number = 0,
        level: number = 0
    ): void {
        const gl = this.handler.gl!;
        gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + colorAttachmentIndex, texture, level, layer);
    }

    /**
     * Converts framebuffer status enum to readable text.
     */
    public statusToText(status: number): string {
        const gl = this.handler.gl;
        if (!gl) {
            return `0x${status.toString(16)}`;
        }

        switch (status) {
            case gl.FRAMEBUFFER_COMPLETE:
                return "FRAMEBUFFER_COMPLETE";
            case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                return "FRAMEBUFFER_INCOMPLETE_ATTACHMENT";
            case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                return "FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT";
            case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                return "FRAMEBUFFER_INCOMPLETE_DIMENSIONS";
            case gl.FRAMEBUFFER_UNSUPPORTED:
                return "FRAMEBUFFER_UNSUPPORTED";
            case gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE:
                return "FRAMEBUFFER_INCOMPLETE_MULTISAMPLE";
            default:
                return `0x${status.toString(16)}`;
        }
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
        gl.bindFramebuffer(gl.FRAMEBUFFER, null!);
        this._active = false;

        let f = this.handler.framebufferStack.popPrev();

        if (f) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, f._fbo);
            gl.viewport(0, 0, f._width, f._height);
        } else {
            gl.viewport(0, 0, h.canvas!.width, h.canvas!.height);
        }
    }

    public isEqual(framebuffer: BaseFramebuffer | null): boolean {
        return framebuffer ? this.__id === framebuffer.__id : false;
    }
}
