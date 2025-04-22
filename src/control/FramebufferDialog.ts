import {Dialog, IDialogParams} from "../ui/Dialog";
import {Framebuffer} from "../webgl/Framebuffer";
import {Program} from "../../lib/og.es";


function framebuffer_dialog_screen() {
    return new Program("framebuffer_dialog_screen", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            height: "float",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
        }, attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3"
        },

        vertexShader:
            `#version 300 es
            
            precision highp float;

            in vec3 aVertexPositionHigh;
            in vec3 aVertexPositionLow;

            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;
            uniform float height;

            void main(void) {

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                mat4 m = projectionMatrix * viewMatrixRTE;

                vec3 nh = height * normalize(aVertexPositionHigh + aVertexPositionLow);

                vec3 eyePosition = eyePositionHigh + eyePositionLow;
                vec3 vertexPosition = aVertexPositionHigh + aVertexPositionLow;

                vec3 highDiff = aVertexPositionHigh - eyePositionHigh;
                vec3 lowDiff = aVertexPositionLow - eyePositionLow + nh;
                
                gl_Position =  m * vec4(highDiff * step(1.0, length(highDiff)) + lowDiff, 1.0);    
            }`,

        fragmentShader:
            `#version 300 es
            
            precision highp float;
            

            layout(location = 0) out vec4 depthColor;

            void main(void) {
                depthColor = vec4(gl_FragCoord.z, gl_FragCoord.z, gl_FragCoord.z, 1.0);
            }`
    });
}

export interface IFrameBufferDialogParams extends IDialogParams {
}

export class FramebufferDialog extends Dialog<Framebuffer | null> {
    public $canvas: HTMLCanvasElement | null = null;

    constructor(params: IFrameBufferDialogParams) {
        super(params);
    }

    protected _initScreenFramebuffer(): void {
        this.toneMappingFramebuffer = new Framebuffer(this.handler, {
            useDepth: false
        });

        this.toneMappingFramebuffer.init();
    }

    public override render(params: any): this {
        super.render(params);
        this.$canvas = new HTMLCanvasElement();
        this.$canvas.width = this.width;
        this.$canvas.height = this.height;
        this.$canvas.style.position = "absolute";
        this.$canvas.style.width = "100%";
        this.$canvas.style.height = "100%";
        this.$container?.appendChild(this.$canvas);
        return this;
    }

    public bindFramebuffer(framebuffer: Framebuffer): void {
        if (!framebuffer.isEqual(framebuffer)) {
            this.model = framebuffer;
        }
    }

    protected _screenPass() {

        let r = this.renderer;
        let h = r.handler;
        let sh = h.programs.screenFrame,
            p = sh._program,
            gl = h.gl!;

        gl.disable(gl.DEPTH_TEST);
        sh.activate();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.toneMappingFramebuffer!.textures[0]);
        gl.uniform1i(p.uniforms.texture, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, r.screenFramePositionBuffer!);
        gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.enable(gl.DEPTH_TEST);
    }

    public refresh() {
        if (this.model) {

            //this.model.readPixelBuffersAsync()
        }
    }
}