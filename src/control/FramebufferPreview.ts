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
}

export class FramebufferPreview extends Control {

    protected _dialog: Dialog<null>;
    public $canvas: HTMLCanvasElement;
    protected _framebuffer: Framebuffer | null;
    protected _screenFramebuffer: Framebuffer | null;

    public framebufferCurrentTexture: number;

    constructor(params: IFramebufferDialogParams) {
        super({
            autoActivate: true,
            ...params
        });

        this._dialog = new Dialog<null>({
            width: 580,
            height: 340,
            left: 100,
            top: 100,
        });
        this.$canvas = creteCanvas(this._dialog.width, this._dialog.height);
        this._framebuffer = params.framebuffer || null;
        this._screenFramebuffer = null;
        this.framebufferCurrentTexture = 0;
    }

    public bindFramebuffer(framebuffer: Framebuffer): void {
        if (!framebuffer.isEqual(this._framebuffer)) {
            this._framebuffer = framebuffer;
        }
    }

    public override oninit() {
        super.oninit();
        if (this.renderer) {
            this.renderer.handler.addProgram(framebuffer_dialog_screen());

            this._screenFramebuffer = new Framebuffer(this.renderer.handler, {
                width: this._framebuffer?.width,
                height: this._framebuffer?.height,
                useDepth: false
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
        if (this._framebuffer) {
            this._framebuffer.readPixelBuffersAsync();

            let r = this.renderer!;
            let h = r.handler;
            let gl = h.gl!;

            this._screenFramebuffer!.activate();
            let sh = h.programs.framebuffer_dialog_screen,
                p = sh._program;

            gl.bindBuffer(gl.ARRAY_BUFFER, r.screenFramePositionBuffer!);
            gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);

            sh.activate();

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this._framebuffer.textures[this.framebufferCurrentTexture]);
            gl.uniform1i(p.uniforms.depthTexture, 0);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            this._screenFramebuffer!.deactivate();
            gl.enable(gl.BLEND);

            console.log(this._framebuffer.getPixelBufferData(0));
        }
    }
}

function framebuffer_dialog_screen(): Program {
    return new Program("framebuffer_dialog_screen", {
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
            }`,
        fragmentShader:
            `#version 300 es

            precision highp float;

            uniform sampler2D inputTexture;
           
            in vec2 tc;

            layout(location = 0) out vec4 fragColor;
            
            void main(void) {
                fragColor = texture(inputTexture, tc);
            }`
    });
}