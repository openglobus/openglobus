import {Framebuffer} from "../webgl/Framebuffer";
import {weightedOITResolve} from "../shaders/weightedOITResolve";
import type {ITransparencyPass} from "./ITransparencyPass";
import type {Renderer} from "./Renderer";

export class WOITPass implements ITransparencyPass {

    protected _renderer: Renderer;
    protected _framebuffer: Framebuffer | null = null;

    constructor(renderer: Renderer) {
        this._renderer = renderer;
    }

    public init() {
        let h = this._renderer.handler;

        h.addProgram(weightedOITResolve());

        this._framebuffer = new Framebuffer(h, {
            targets: [{
                internalFormat: "RGBA16F",
                attachment: "COLOR_ATTACHMENT",
                filter: "NEAREST"
            }, {
                internalFormat: "R16F",
                attachment: "COLOR_ATTACHMENT",
                filter: "NEAREST"
            }],
            depthComponent: this._renderer.depthComponent,
            sharedDepthRenderbuffer: this._renderer.getMSAA() == 0 ? this._renderer.forwardFramebuffer!.depthRenderbuffer : null,
            useDepth: true
        });

        this._framebuffer.init();
    }

    public beginPass() {
        let gl = this._renderer.handler.gl!;

        if (!this._framebuffer!.sharedDepthRenderbuffer) {
            this._framebuffer!.blitDepthFrom(this._renderer.forwardFramebuffer!);
        }

        this._framebuffer!.activate();
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    public endPass() {
        this._framebuffer!.deactivate();
    }

    public resolve() {
        let r = this._renderer;
        let h = r.handler,
            gl = h.gl!,
            sh = h.programs.weightedOITResolve,
            p = sh._program;

        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);

        // Output is premultiplied alpha
        r.enableBlendOneSrcAlpha();

        gl.bindBuffer(gl.ARRAY_BUFFER, r.screenFramePositionBuffer!);
        gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);

        sh.activate();

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._framebuffer!.textures[0]);
        gl.uniform1i(p.uniforms.uAccumulate, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this._framebuffer!.textures[1]);
        gl.uniform1i(p.uniforms.uAccumulateAlpha, 1);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        r.enableBlendDefault();
        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
    }

    public resize(width: number, height: number) {
        if (!this._framebuffer) return;
        this._framebuffer.setSize(width, height, true);
        if(this._renderer.getMSAA() == 0 ) {
            this._framebuffer.attachExternalDepthRenderbuffer(this._renderer.forwardFramebuffer!.depthRenderbuffer);
        }
    }

    public dispose() {
        if (this._framebuffer) {
            this._framebuffer.destroy();
            this._framebuffer = null;
        }
        this._renderer.handler.removeProgram("weightedOITResolve");
    }
}
