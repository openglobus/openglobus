import {Dialog} from "../ui/Dialog";
import {Framebuffer} from "../webgl/Framebuffer";
import {Control, IControlParams} from "./Control";
import {Program} from "../webgl/Program";

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
    title?: string;
    common?: string;
    image?: string;
    flippedUV?: boolean;
}

export class FramebufferPreview extends Control {

    protected _dialog: Dialog<null>;
    public $canvas: HTMLCanvasElement;
    protected _framebuffer: Framebuffer | null;
    protected _screenFramebuffer: Framebuffer | null;

    public framebufferCurrentTexture: number;

    protected _program: Program;

    constructor(params: IFramebufferDialogParams) {
        super({
            autoActivate: true,
            ...params
        });

        this._dialog = new Dialog<null>({
            title: params.title || "",
            width: 580,
            height: 340,
            left: 100,
            top: 100,
        });
        this.$canvas = creteCanvas(this._dialog.width, this._dialog.height);
        this._framebuffer = params.framebuffer || null;
        this._screenFramebuffer = null;
        this.framebufferCurrentTexture = 0;

        this._program = framebuffer_dialog_screen(this.__id, params.common, params.image, params.flippedUV);
    }

    public bindFramebuffer(framebuffer: Framebuffer): void {
        if (!framebuffer.isEqual(this._framebuffer)) {
            this._framebuffer = framebuffer;
        }
    }

    public override oninit() {
        super.oninit();
        if (this.renderer) {

            this.renderer.handler.addProgram(this._program);

            this._screenFramebuffer = new Framebuffer(this.renderer.handler, {
                width: this._framebuffer?.width,
                height: this._framebuffer?.height,
                useDepth: false,
                targets: [{
                    internalFormat: "RGBA",
                    type: "UNSIGNED_BYTE",
                    attachment: "COLOR_ATTACHMENT",
                    readAsync: true
                }],
            });
            this._screenFramebuffer.init();
        }
    }

    public override activate() {
        super.activate();
        this._dialog.appendTo(document.body);
        this._dialog.container?.appendChild(this.$canvas);
        this.renderer?.events.on("draw", this._onDraw);
    }

    public override deactivate() {
        super.deactivate();
        this._dialog.remove();
        this.renderer?.events.off("draw", this._onDraw);
    }

    protected _onDraw = () => {
        if (this._framebuffer && this._screenFramebuffer) {

            let r = this.renderer!;
            let h = r.handler;
            let gl = h.gl!;

            gl.disable(gl.BLEND);
            this._screenFramebuffer.activate();
            let sh = this._program._programController!,//h.programs.framebuffer_dialog_screen,
                p = sh._program;

            gl.bindBuffer(gl.ARRAY_BUFFER, r.screenFramePositionBuffer!);
            gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);

            sh.activate();

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this._framebuffer.textures[this.framebufferCurrentTexture]);
            gl.uniform1i(p.uniforms.inputTexture, 0);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            this._screenFramebuffer.deactivate();
            gl.enable(gl.BLEND);

            this._screenFramebuffer.readPixelBuffersAsync((f) => {
                let pixels = f.getPixelBufferData();
                if (pixels) {
                    let width = f.width;
                    let height = f.height;
                    let ctx = this.$canvas.getContext("2d")!;

                    let clamped = new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.byteLength);
                    let imageData = new ImageData(clamped, width, height);

                    createImageBitmap(imageData).then(bitmap => {
                        ctx.clearRect(0, 0, this.$canvas.width, this.$canvas.height);
                        ctx.drawImage(bitmap, 0, 0, this.$canvas.width, this.$canvas.height);
                    });
                }
            });
        }
    }
}

function framebuffer_dialog_screen(id: number = 0, common?: string | null, mainImage?: string | null, flippedUV?: boolean): Program {
    return new Program(`framebuffer_dialog_screen:${id.toString()}`, {
        uniforms: {
            inputTexture: "sampler2D"
        },
        attributes: {
            corners: "vec2"
        },
        vertexShader:
            `#version 300 es
            
            in vec2 corners;
            
            out vec2 tc;

            void main(void) {
                gl_Position = vec4(corners, 0.0, 1.0);
                tc = corners * 0.5 + 0.5;
                ${flippedUV ? `tc.y = 1.0 - tc.y;` : ``}               
            }`,
        fragmentShader:
            `#version 300 es

            precision highp float;

            uniform sampler2D inputTexture;
           
            in vec2 tc;

            layout(location = 0) out vec4 fragColor;

            ${common || ""}
            
            ${mainImage ||
            `void mainImage(out vec4 fragColor, in vec2 fragCoord) { 
                fragColor = texture(inputTexture, fragCoord);
            }`}
            
            void main(void) {                              
               mainImage(fragColor, tc);
            }`
    });
}