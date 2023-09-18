import {BaseFramebuffer, IBaseFramebufferParams} from "./BaseFramebuffer";
import {Handler} from "./Handler";

interface IMultisampleParams extends IBaseFramebufferParams {
    msaa?: number;
    internalFormat?: string;
}

/**
 * Class represents multisample framebuffer.
 * @class
 * @param {Handler} handler - WebGL handler.
 * @param {Object} [options] - Framebuffer options:
 */
export class Multisample extends BaseFramebuffer {
    protected _internalFormat: string;

    protected _msaa: number;

    protected _glFilter: number;

    public renderbuffers: WebGLRenderbuffer[];

    constructor(handler: Handler, options: IMultisampleParams = {}) {

        super(handler, options);

        this._internalFormat = options.internalFormat ? options.internalFormat.toUpperCase() : "RGBA8";

        this._msaa = options.msaa != undefined ? options.msaa : 4;

        this._glFilter = 0;

        this.renderbuffers = new Array(this._size);
    }

    public override destroy() {
        let gl = this.handler.gl;

        if (!gl) return;

        for (let i = 0; i < this.renderbuffers.length; i++) {
            gl.deleteRenderbuffer(this.renderbuffers[i]);
        }
        this.renderbuffers = new Array(this._size);

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

        this._glFilter = (gl as any)[this._filter];

        this._fbo = gl.createFramebuffer();

        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);

        let colorAttachments = [];
        for (let i = 0; i < this.renderbuffers.length; i++) {
            let rb = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, rb);

            if (this._msaa > 0) {
                gl.renderbufferStorageMultisample(
                    gl.RENDERBUFFER,
                    this._msaa,
                    (gl as any)[this._internalFormat],
                    this._width,
                    this._height
                );
            } else {
                gl.renderbufferStorage(
                    gl.RENDERBUFFER,
                    (gl as any)[this._internalFormat],
                    this._width,
                    this._height
                );
            }

            gl.framebufferRenderbuffer(
                gl.FRAMEBUFFER,
                gl.COLOR_ATTACHMENT0 + i,
                gl.RENDERBUFFER,
                rb
            );
            colorAttachments.push(gl.COLOR_ATTACHMENT0 + i);
            this.renderbuffers[i] = rb!;
            gl.bindRenderbuffer(gl.RENDERBUFFER, null!);
        }
        gl.drawBuffers(colorAttachments);

        if (this._useDepth) {
            this._depthRenderbuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, this._depthRenderbuffer);
            gl.renderbufferStorageMultisample(
                gl.RENDERBUFFER,
                this._msaa,
                (gl as any)[this._depthComponent],
                this._width,
                this._height
            );
            gl.framebufferRenderbuffer(
                gl.FRAMEBUFFER,
                gl.DEPTH_ATTACHMENT,
                gl.RENDERBUFFER,
                this._depthRenderbuffer
            );
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    public blitTo(framebuffer: BaseFramebuffer, attachmentIndex: number = 0) {
        let gl = this.handler.gl!;

        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this._fbo);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, framebuffer._fbo);
        gl.readBuffer(gl.COLOR_ATTACHMENT0 + attachmentIndex);

        gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 1.0]);

        gl.blitFramebuffer(
            0,
            0,
            this._width,
            this._height,
            0,
            0,
            framebuffer._width,
            framebuffer._height,
            gl.COLOR_BUFFER_BIT,
            this._glFilter
        );

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    }
}
