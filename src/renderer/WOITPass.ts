import {Framebuffer} from "../webgl/Framebuffer";
import {weightedOITResolve} from "../shaders/weightedOITResolve";
import type {ITransparencyPass} from "./ITransparencyPass";
import type {Renderer} from "./Renderer";

export class WOITPass implements ITransparencyPass {

    protected _renderer: Renderer;
    protected _framebuffer: Framebuffer | null = null;
    protected _useSharedDepth: boolean = false;

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
            useDepth: true
        });

        this._framebuffer.init();
        this._configureDepthPath();
    }

    public beginPass() {
        let gl = this._renderer.handler.gl!;

        if (!this._useSharedDepth) {
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
        this._framebuffer?.setSize(width, height, true);
        this._configureDepthPath();
    }

    public dispose() {
        if (this._framebuffer) {
            this._framebuffer.destroy();
            this._framebuffer = null;
        }
        this._useSharedDepth = false;
        this._renderer.handler.removeProgram("weightedOITResolve");
    }

    protected _configureDepthPath() {
        this._useSharedDepth = false;

        if (!this._framebuffer || this._renderer.getMSAA() !== 0) {
            return;
        }

        const forwardDepth = this._renderer.forwardFramebuffer?.depthRenderbuffer;
        if (!forwardDepth) {
            return;
        }

        this._framebuffer.attachExternalDepthRenderbuffer(forwardDepth);
        this._useSharedDepth = true;
    }
}
