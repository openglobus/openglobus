import {BaseFramebuffer} from "./BaseFramebuffer";
import type {IBaseFramebufferParams} from "./BaseFramebuffer";
import {ImageCanvas} from "../ImageCanvas";
import {Handler} from "./Handler";
import type {TypedArray} from "../utils/shared";
import type {NumberArray4} from "../math/Vec4";

export interface ITargetParams {
    internalFormat?: string;
    format?: string;
    type?: string;
    attachment?: string;
    filter?: string;
    readAsync?: boolean;
}

export interface IFrameBufferParams extends IBaseFramebufferParams {
    isBare?: boolean;
    renderbufferTarget?: string;
    textures?: WebGLTexture[];
    targets?: ITargetParams[];
}

type TypedArrayConstructor = Uint8ArrayConstructor | Float32ArrayConstructor;

interface ITarget {
    internalFormat: string;
    format: string;
    type: string;
    attachment: string;
    filter: string;
    pixelBufferIndex: number;
    TypeArrayConstructor: TypedArrayConstructor
}

interface IPixelBuffer {
    buffer: WebGLBuffer | null;
    data: TypedArray | null;
    glType: number;
    glAttachment: number;
}

const TypeArrayConstructor: Record<string, TypedArrayConstructor> = {
    "UNSIGNED_BYTE": Uint8Array,
    "FLOAT": Float32Array
}

export function clientWaitAsync(gl: WebGL2RenderingContext, sync: WebGLSync, flags: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        function check() {
            const res = gl.clientWaitSync(sync, flags, 0);
            if (res == gl.WAIT_FAILED) {
                reject();
            } else if (res == gl.TIMEOUT_EXPIRED) {
                requestAnimationFrame(check);
            } else {
                resolve();
            }
        }

        check();
    });
}

/**
 * Class represents framebuffer.
 * @class
 * @param {Handler} handler - WebGL handler.
 * @param {IFrameBufferParams} [options] - Framebuffer options:
 */
export class Framebuffer extends BaseFramebuffer {

    protected _renderbufferTarget: string;

    protected _targets: ITarget[];

    /**
     * Framebuffer texture.
     * @public
     * @type {number}
     */
    public textures: WebGLTexture[];

    public pixelBuffers: IPixelBuffer[];

    protected _skipFrame: boolean;

    constructor(handler: Handler, options: IFrameBufferParams = {}) {

        super(handler, options);

        this._targets = Framebuffer.createTargets(options.targets);

        this._size = this._targets.length;

        this._renderbufferTarget = options.renderbufferTarget != undefined ? options.renderbufferTarget : "DEPTH_ATTACHMENT";

        this.textures = options.textures || new Array(this._size);

        this.pixelBuffers = [];

        this._skipFrame = false;
    }

    static createTargets(targets?: ITargetParams[]): ITarget[] {
        let attInd = 0;
        let pbInd = 0;
        if (targets) {
            return targets.map<ITarget>((ti): ITarget => {
                let attachment = ti.attachment || "COLOR_ATTACHMENT";
                if (attachment === "COLOR_ATTACHMENT") {
                    attachment = `COLOR_ATTACHMENT${attInd++}`;
                }
                let type = ti.type || "UNSIGNED_BYTE";
                return {
                    internalFormat: ti.internalFormat || "RGBA",
                    format: ti.format || "RGBA",
                    type,
                    attachment,
                    filter: ti.filter || "NEAREST",
                    pixelBufferIndex: ti.readAsync ? pbInd++ : -1,
                    TypeArrayConstructor: TypeArrayConstructor[type]
                }
            });
        }

        return [{
            internalFormat: "RGBA",
            format: "RGBA",
            type: "UNSIGNED_BYTE",
            attachment: "COLOR_ATTACHMENT0",
            filter: "NEAREST",
            pixelBufferIndex: -1,
            TypeArrayConstructor: TypeArrayConstructor.UNSIGNED_BYTE
        }];
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
    //     gl.bindFramebuffer(gl.FRAMEBUFFER, null!);
    //     gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null!);
    //     gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null!);
    // }

    public override destroy() {
        let gl = this.handler.gl;

        if (!gl) return;

        for (let i = 0; i < this.textures.length; i++) {
            gl.deleteTexture(this.textures[i]);
        }
        this.textures = new Array(this._size);

        for (let i = 0; i < this.pixelBuffers.length; i++) {
            this.pixelBuffers[i].data = null;
            gl.deleteBuffer(this.pixelBuffers[i].buffer);
        }
        this.pixelBuffers = [];

        gl.deleteFramebuffer(this._fbo);
        gl.deleteRenderbuffer(this._depthRenderbuffer);

        this._depthRenderbuffer = null;
        this._fbo = null;

        this._active = false;
    }

    /**
     * Framebuffer initialization.
     * @public
     * @override
     */
    public override init() {
        let gl = this.handler.gl;

        if (!gl) return;

        this._fbo = gl.createFramebuffer();

        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);

        let attachmentArr = [];
        for (let i = 0; i < this._targets.length; i++) {
            let tr = this._targets[i];
            let ti = this.textures[i] || this.handler.createEmptyTexture2DExt(this._width, this._height, tr.filter, tr.internalFormat, tr.format, tr.type);
            let att_i = (gl as any)[tr.attachment];

            if (ti) {
                this.bindOutputTexture(ti, att_i);
                this.textures[i] = ti;
            }

            if (tr.attachment !== "DEPTH_ATTACHMENT") {
                attachmentArr.push(att_i);
            }

            if (tr.pixelBufferIndex !== -1) {
                this._createPixelBuffer(tr);
            }
        }

        gl.drawBuffers && gl.drawBuffers(attachmentArr);

        if (this._useDepth) {
            this._depthRenderbuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, this._depthRenderbuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, (gl as any)[this._depthComponent], this._width, this._height);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, (gl as any)[this._renderbufferTarget], gl.RENDERBUFFER, this._depthRenderbuffer);
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null!);
    }

    /**
     * Check your constructor has targets like this
     * targets: [{
     *  internalFormat: "RGBA",
     *  type: "UNSIGNED_BYTE",
     *  attachment: "COLOR_ATTACHMENT",
     *  readAsync: true
     * }],
     **/
    public readPixelBuffersAsync = (callback?: (buf: this) => void) => {

        const gl = this.handler.gl!;

        if (this._skipFrame) return;

        this._skipFrame = true;

        let w = this.width,
            h = this.height;

        let pb = this.pixelBuffers;

        this.activate();

        for (let i = 0; i < pb.length; i++) {
            let pbi = pb[i];
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbi.buffer);
            gl.bufferData(gl.PIXEL_PACK_BUFFER, pbi.data!.byteLength, gl.STREAM_READ);
            gl.readBuffer(pbi.glAttachment);
            gl.readPixels(0, 0, w, h, gl.RGBA, pbi.glType, 0);
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        }

        this.deactivate();

        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)!;
        gl.flush();

        clientWaitAsync(gl, sync, 0).then(() => {
            this._skipFrame = false;
            gl.deleteSync(sync);
            for (let i = 0; i < pb.length; i++) {
                let pbi = pb[i];
                if (pbi.data) {
                    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbi.buffer);
                    gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, pbi.data!);
                }
            }
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
            callback && callback(this);
        });
    }

    public getPixelBufferData(targetIndex: number = 0): TypedArray | null {
        let pbInd = this._targets[targetIndex].pixelBufferIndex;
        return pbInd !== -1 ? this.pixelBuffers[pbInd].data : null;
    }

    protected _createPixelBuffer(target: ITarget) {
        let gl = this.handler.gl!;
        let pbInd = target.pixelBufferIndex;
        let pb = this.pixelBuffers[pbInd];

        if (!pb) {
            pb = this.pixelBuffers[pbInd] = {
                buffer: null,
                data: null,
                glType: -1,
                glAttachment: -1
            };
        }

        let size = this.width * this.height * 4;

        // clear current pixel buffer
        pb.data = null;
        pb.data = new target.TypeArrayConstructor(size);

        //gl.deleteBuffer(pb.buffer);
        pb.buffer = gl.createBuffer();
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pb.buffer);
        gl.bufferData(gl.PIXEL_PACK_BUFFER, size, gl.STREAM_READ);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

        pb.glType = (gl as any)[target.type];
        pb.glAttachment = (gl as any)[target.attachment];
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
        gl.bindTexture(gl.TEXTURE_2D, null!);
    }

    /**
     * Gets pixel RGBA color from framebuffer by coordinates.
     * @public
     * @param {TypedArray} res - Normalized x - coordinate.
     * @param {number} nx - Normalized x - coordinate.
     * @param {number} ny - Normalized y - coordinate.
     * @param {number} [w=1] - Normalized width.
     * @param {number} [h=1] - Normalized height.
     * @param {number} [index=0] - color attachment index.
     */
    public readPixels(res: TypedArray, nx: number, ny: number, index: number = 0, w: number = 1, h: number = 1) {
        let gl = this.handler.gl!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
        gl.readBuffer && gl.readBuffer(gl.COLOR_ATTACHMENT0 + index || 0);
        gl.readPixels(nx * this._width, ny * this._height, w, h, gl.RGBA, (gl as any)[this._targets[index].type], res);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null!);
    }

    /**
     * Reads all pixels(RGBA colors) from framebuffer.
     * @public
     * @param {TypedArray} res - Result array.
     * @param {number} [attachmentIndex=0] - color attachment index.
     */
    public readAllPixels(res: TypedArray, attachmentIndex: number = 0) {
        let gl = this.handler.gl!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
        gl.readBuffer && gl.readBuffer(gl.COLOR_ATTACHMENT0 + attachmentIndex);
        gl.readPixels(0, 0, this._width, this._height, gl.RGBA, (gl as any)[this._targets[attachmentIndex].type], res);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null!);
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

    /**
     * Reads pixel data from the buffer at the specified normalized coordinates.
     *
     * @param {number} nx - Normalized X coordinate in the range [0, 1], multiplied by the buffer width.
     * @param {number} ny - Normalized Y coordinate in the range [0, 1], multiplied by the buffer height.
     * @param {NumberArray4 | Float32Array} outData - Output array where the RGBA pixel values will be written.
     * @param {number} [attachmentIndex=0] - Index of the color attachment (buffer) to read from.
     *
     * @returns {void}
     *
     * @example
     * const color = new Float32Array(4);
     * framebuffer.readData(0.5, 0.5, color); // Reads the color at the center of the buffer
     */
    public readData(nx: number, ny: number, outData: NumberArray4 | TypedArray, attachmentIndex: number = 0) {
        const w = this.width;
        const h = this.height;

        const x = Math.floor(nx * (w - 1));
        const y = Math.floor(ny * (h - 1));

        const ind = (y * w + x) * 4;

        const data = this.pixelBuffers[attachmentIndex].data;

        if (data) {
            outData[0] = data[ind];
            outData[1] = data[ind + 1];
            outData[2] = data[ind + 2];
            outData[3] = data[ind + 3];
        }
    }
}
