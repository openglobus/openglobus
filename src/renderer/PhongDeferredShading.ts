import {Framebuffer} from "../webgl/Framebuffer";
import {deferredShading} from "../shaders/deferredShading/deferredShading";
import {applyDeferredDepth} from "../shaders/applyDeferredDepth";
import type {IDeferredShadingPass} from "./IDeferredShadingPass";
import type {Renderer} from "./Renderer";

export class PhongDeferredShading implements IDeferredShadingPass {

    protected _renderer: Renderer;
    protected _framebuffer: Framebuffer | null = null;

    constructor(renderer: Renderer) {
        this._renderer = renderer;
    }

    public init() {
        let h = this._renderer.handler;

        h.addProgram(deferredShading());
        h.addProgram(applyDeferredDepth());

        this._framebuffer = new Framebuffer(h, {
            useDepth: false,
            targets: [{
                internalFormat: this._renderer.internalFormat,
                filter: "NEAREST"
            }, {
                internalFormat: this._renderer.internalFormat,
                filter: "NEAREST"
            }, {
                internalFormat: this._renderer.internalFormat,
                filter: "NEAREST"
            }, {
                internalFormat: "RGBA32F",
                filter: "NEAREST"
            }, {
                attachment: "DEPTH_ATTACHMENT",
                internalFormat: this._renderer.depthComponent,
                filter: "NEAREST"
            }]
        });

        this._framebuffer.init();
    }

    public beginPass() {
        let gl = this._renderer.handler.gl!;
        this._framebuffer!.activate();
        gl.clearColor(0, 0, 0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.BLEND);
    }

    public endPass() {
        this._framebuffer!.deactivate();
    }

    public applyLighting() {
        this._applyDeferredDepth();
        this._deferredShadingPASS();
    }

    public resize(width: number, height: number) {
        this._framebuffer?.setSize(width, height, true);
    }

    public dispose() {
        if (this._framebuffer) {
            this._framebuffer.destroy();
            this._framebuffer = null;
        }
        this._renderer.handler.removeProgram("deferredShading");
        this._renderer.handler.removeProgram("applyDeferredDepth");
    }

    protected _applyDeferredDepth() {
        let r = this._renderer;
        let h = r.handler,
            gl = h.gl!,
            sh = h.programs.applyDeferredDepth,
            p = sh._program;

        gl.disable(gl.BLEND);
        gl.colorMask(false, false, false, false);
        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.ALWAYS);
        gl.clear(gl.DEPTH_BUFFER_BIT);

        gl.bindBuffer(gl.ARRAY_BUFFER, r.screenFramePositionBuffer!);
        gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);

        sh.activate();

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._framebuffer!.textures[4]);
        gl.uniform1i(p.uniforms.depthTexture, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.colorMask(true, true, true, true);
        gl.depthFunc(gl.LESS);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
    }

    protected _deferredShadingPASS() {
        let r = this._renderer;
        let h = r.handler;
        let sh = h.programs.deferredShading,
            p = sh._program,
            gl = h.gl!;

        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);

        gl.bindBuffer(gl.ARRAY_BUFFER, r.screenFramePositionBuffer!);
        gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);

        sh.activate();

        gl.uniform3fv(p.uniforms.lightPosition, r.lightPosition);
        gl.uniform3fv(p.uniforms.lightAmbient, r.lightAmbient);
        gl.uniform3fv(p.uniforms.lightDiffuse, r.lightDiffuse);
        gl.uniform4fv(p.uniforms.lightSpecular, r.lightSpecular);
        gl.uniform3f(p.uniforms.cameraPosition, r.activeCamera.eye.x, r.activeCamera.eye.y, r.activeCamera.eye.z);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._framebuffer!.textures[0]);
        gl.uniform1i(p.uniforms.baseTexture, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this._framebuffer!.textures[1]);
        gl.uniform1i(p.uniforms.materialsTexture, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this._framebuffer!.textures[2]);
        gl.uniform1i(p.uniforms.normalTexture, 2);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this._framebuffer!.textures[3]);
        gl.uniform1i(p.uniforms.positionTexture, 3);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
    }
}
