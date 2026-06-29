import { Dialog } from "../ui/Dialog";
import { Framebuffer } from "../webgl/Framebuffer";
import { Control, IControlParams } from "./Control";
import { ShaderProgram } from "../webgl/ShaderProgram";

function creteCanvas(width: number, height: number) {
    let canvas = document.createElement("canvas") as HTMLCanvasElement;
    canvas.width = width;
    canvas.height = height;
    canvas.style.position = "absolute";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    return canvas;
}

export interface IFramebufferDialogParams extends IControlParams {
    framebuffer?: Framebuffer;
    arrayTexture?: WebGLTexture;
    arrayLayer?: number;
    width?: number;
    height?: number;
    left?: number;
    top?: number;
    title?: string;
    common?: string;
    image?: string;
    flippedY?: boolean;
}

export class FramebufferPreview extends Control {
    protected _dialog: Dialog<null>;

    protected _framebuffer: Framebuffer | null;
    protected _arrayTexture: WebGLTexture | null;
    protected _arrayLayer: number;
    protected _width: number;
    protected _height: number;
    protected _isArrayMode: boolean;
    protected _screenFramebuffer: Framebuffer | null;
    protected _program: ShaderProgram;

    public $canvas: HTMLCanvasElement;
    public framebufferCurrentTexture: number;

    constructor(params: IFramebufferDialogParams) {
        super({
            autoActivate: true,
            ...params
        });

        this._dialog = new Dialog<null>({
            title: params.title || "",
            width: 580,
            height: 340,
            left: params.left || 100,
            top: params.top || 100,
            useHide: true
        });
        this._dialog.events.on("visibility", this._onDialogVisibilityChange);
        this.$canvas = creteCanvas(this._dialog.width, this._dialog.height);

        this._arrayTexture = params.arrayTexture || null;
        this._arrayLayer = params.arrayLayer ?? 0;
        this._isArrayMode = !!this._arrayTexture;

        this._framebuffer = params.framebuffer || null;
        this._screenFramebuffer = null;
        this.framebufferCurrentTexture = 0;

        this._width = params.width ?? this._framebuffer?.width ?? 512;
        this._height = params.height ?? this._framebuffer?.height ?? 512;

        this._program = framebuffer_dialog_screen(
            this.__id,
            params.common,
            params.image,
            params.flippedY,
            this._isArrayMode
        );
    }

    public bindFramebuffer(framebuffer: Framebuffer): void {
        if (!framebuffer.isEqual(this._framebuffer)) {
            this._framebuffer = framebuffer;
        }
    }

    public bindArrayTexture(texture: WebGLTexture, layer: number): void {
        this._arrayTexture = texture;
        this._arrayLayer = layer;
        this._isArrayMode = true;
    }

    public override oninit() {
        super.oninit();
        if (this.renderer) {
            this.renderer.handler.addProgram(this._program);

            this._screenFramebuffer = new Framebuffer(this.renderer.handler, {
                width: this._width,
                height: this._height,
                useDepth: false,
                targets: [
                    {
                        internalFormat: "RGBA8",
                        attachment: "COLOR_ATTACHMENT",
                        readAsync: true
                    }
                ]
            });
            this._screenFramebuffer.init();
        }
    }

    public override activate() {
        super.activate();
        this._dialog.appendTo(document.body);
        this._dialog.container?.appendChild(this.$canvas);
        this._dialog.show();
        this._subscribeDraw();
    }

    public override deactivate() {
        super.deactivate();
        this._unsubscribeDraw();
        this._dialog.remove();
    }

    protected _isDrawSubscribed: boolean = false;

    protected _subscribeDraw() {
        if (!this.renderer || this._isDrawSubscribed) return;
        this.renderer.events.on("predraw", this._onDraw);
        this._isDrawSubscribed = true;
    }

    protected _unsubscribeDraw() {
        if (!this.renderer || !this._isDrawSubscribed) return;
        this.renderer.events.off("predraw", this._onDraw);
        this._isDrawSubscribed = false;
    }

    protected _onDialogVisibilityChange = (isVisible: boolean) => {
        if (isVisible) {
            this._subscribeDraw();
        } else {
            this._unsubscribeDraw();
        }
    };

    protected _onDraw = () => {
        if (!this._dialog.getVisibility()) return;

        const hasSource = this._isArrayMode ? !!this._arrayTexture : !!this._framebuffer;

        if (!hasSource || !this._screenFramebuffer) return;

        let r = this.renderer!;
        let h = r.handler;
        let gl = h.gl!;

        gl.disable(gl.BLEND);
        this._screenFramebuffer.activate();
        let p = this._program;

        gl.bindBuffer(gl.ARRAY_BUFFER, r.screenFramePositionBuffer!);
        gl.vertexAttribPointer(p.corners, 2, gl.FLOAT, false, 0, 0);

        p.activate();

        gl.activeTexture(gl.TEXTURE0);
        if (this._isArrayMode) {
            gl.bindTexture(gl.TEXTURE_2D_ARRAY, this._arrayTexture);
            gl.uniform1i(p.uniforms.inputTextureArray, 0);
            gl.uniform1i(p.uniforms.u_arrayLayer, this._arrayLayer);
        } else {
            gl.bindTexture(gl.TEXTURE_2D, this._framebuffer!.textures[this.framebufferCurrentTexture]);
            gl.uniform1i(p.uniforms.inputTexture, 0);
        }

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        this._screenFramebuffer.deactivate();
        gl.enable(gl.BLEND);

        this._screenFramebuffer.readPixelBuffersAsync((f) => {
            let pixels = f.getPixelBufferData();
            if (pixels) {
                let width = f.width;
                let height = f.height;
                let ctx = this.$canvas.getContext("2d")!;

                let clamped = new Uint8ClampedArray(pixels.buffer as ArrayBuffer, pixels.byteOffset, pixels.byteLength);
                let imageData = new ImageData(clamped, width, height);

                createImageBitmap(imageData).then((bitmap) => {
                    ctx.clearRect(0, 0, this.$canvas.width, this.$canvas.height);
                    ctx.drawImage(bitmap, 0, 0, this.$canvas.width, this.$canvas.height);
                });
            }
        });
    };
}

function framebuffer_dialog_screen(
    id: number = 0,
    common?: string | null,
    mainImage?: string | null,
    flippedY?: boolean,
    isArrayMode: boolean = false
): ShaderProgram {
    const uniforms: Record<string, string> = isArrayMode
        ? { inputTextureArray: "sampler2DArray", u_arrayLayer: "int" }
        : { inputTexture: "sampler2D" };

    const samplerDecl = isArrayMode
        ? `precision highp sampler2DArray;\nuniform sampler2DArray inputTextureArray;\nuniform int u_arrayLayer;`
        : `uniform sampler2D inputTexture;`;

    const defaultMainImage = isArrayMode
        ? `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
                fragColor = texture(inputTextureArray, vec3(fragCoord, float(u_arrayLayer)));
            }`
        : `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
                fragColor = texture(inputTexture, fragCoord);
            }`;

    return new ShaderProgram(`framebuffer_dialog_screen:${id.toString()}`, {
        uniforms,
        attributes: {
            corners: "vec2"
        },
        vertexShader: `#version 300 es

            in vec2 corners;

            out vec2 tc;

            void main(void) {
                gl_Position = vec4(corners, 0.0, 1.0);
                tc = corners * 0.5 + 0.5;
                ${flippedY ? `tc.y = 1.0 - tc.y;` : ``}
            }`,
        fragmentShader: `#version 300 es

            precision highp float;

            ${samplerDecl}

            in vec2 tc;

            layout(location = 0) out vec4 fragColor;

            ${common || ""}

            ${mainImage || defaultMainImage}

            void main(void) {
               mainImage(fragColor, tc);
            }`
    });
}
