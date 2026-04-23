import { deferredShadingAtmos } from "../shaders/deferredShading/deferredShadingAtmos";
import { PhongDeferredShading } from "./PhongDeferredShading";
import type { Renderer } from "./Renderer";
import type { Atmosphere } from "../control/atmosphere/Atmosphere";
import type { AtmosphereParameters } from "../shaders/atmos/atmos";

export class AtmosphereDeferredShading extends PhongDeferredShading {
    protected _atmosphere: Atmosphere;
    protected _atmosParams: AtmosphereParameters;

    constructor(renderer: Renderer, atmosphere: Atmosphere, atmosParams: AtmosphereParameters) {
        super(renderer);
        this._atmosphere = atmosphere;
        this._atmosParams = atmosParams;
    }

    public override init() {
        super.init();
        this._renderer.handler.addProgram(deferredShadingAtmos(this._atmosParams));
    }

    public override dispose() {
        this._renderer.handler.removeProgram("deferredShadingAtmos");
        super.dispose();
    }

    protected override _deferredShadingPASS() {
        if (!this._atmosphere.isReady) {
            //super._deferredShadingPASS();
            return;
        }

        let r = this._renderer;
        let h = r.handler;
        let sh = h.programs.deferredShadingAtmos,
            p = sh,
            gl = h.gl!;

        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);

        gl.bindBuffer(gl.ARRAY_BUFFER, r.screenFramePositionBuffer!);
        gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);

        sh.activate();

        // Common uniforms (same as Phong)
        gl.uniformMatrix3fv(p.uniforms.normalMatrix, false, r.activeCamera.getNormalMatrix());
        gl.uniform3fv(p.uniforms.lightPosition, r.lightPosition);
        gl.uniform3fv(p.uniforms.lightAmbient, r.lightAmbient);
        gl.uniform3fv(p.uniforms.lightDiffuse, r.lightDiffuse);
        gl.uniform4fv(p.uniforms.lightSpecular, r.lightSpecular);
        gl.uniform3f(p.uniforms.cameraPosition, r.activeCamera.eye.x, r.activeCamera.eye.y, r.activeCamera.eye.z);
        gl.uniform2fv(p.uniforms.atmosFadeDist, this._atmosphere.planet!.atmosphereFadeDist);

        // G-buffer textures
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
        gl.uniform1i(p.uniforms.viewPositionTexture, 3);

        // Atmosphere LUT textures
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, this._atmosphere._transmittanceBuffer!.textures[0]);
        gl.uniform1i(p.uniforms.transmittanceTexture, 4);

        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, this._atmosphere._scatteringBuffer!.textures[0]);
        gl.uniform1i(p.uniforms.scatteringTexture, 5);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
    }
}
