import { cons } from "../../cons";
import type { DepthCamera } from "../../control/depthCamera/DepthCamera";
import { varianceBlur } from "../../shaders/varianceBlur";
import type { ShaderProgram } from "../../webgl/ShaderProgram";
import type { Renderer } from "../Renderer";
import { ShadowMap } from "./ShadowMap";

export type { IShadowMapParams } from "./ShadowMap";
export { ShadowMap } from "./ShadowMap";

export const MAX_SHADOW_MAPS = 4;
export const DEFAULT_SHADOW_TEXTURE_UNIT_START = 10;
export const VARIANCE_SHADOW_ENABLED = false;

export class ShadowManager {
    protected _renderer: Renderer;
    protected _shadowMaps: ShadowMap[];
    protected _activeShadowMaps: ShadowMap[];

    protected _viewProjData: Float32Array;
    protected _eyeRelData: Float32Array;
    protected _paramsData: Float32Array;
    protected _layerData: Int32Array;
    protected _updateActiveShadowMaps: boolean;

    protected _depthArrayTexture: WebGLTexture | null;
    protected _depthSize: number;
    protected _varianceBlurArrayTexture: WebGLTexture | null;
    protected _varianceBlurArraySize: number;
    protected _freeSlots: number[];

    constructor(renderer: Renderer) {
        this._renderer = renderer;
        this._shadowMaps = [];
        this._activeShadowMaps = [];

        this._viewProjData = new Float32Array(MAX_SHADOW_MAPS * 16);
        this._eyeRelData = new Float32Array(MAX_SHADOW_MAPS * 3);
        this._paramsData = new Float32Array(MAX_SHADOW_MAPS * 4);
        this._layerData = new Int32Array(MAX_SHADOW_MAPS);
        this._updateActiveShadowMaps = true;

        this._depthArrayTexture = null;
        this._depthSize = 0;
        this._varianceBlurArrayTexture = null;
        this._varianceBlurArraySize = 0;
        this._freeSlots = [];

        if (VARIANCE_SHADOW_ENABLED) {
            this._renderer.addProgram(varianceBlur());
        }
    }

    public get activeCount(): number {
        return this._getActiveShadowMaps().length;
    }

    public get depthArrayTexture(): WebGLTexture | null {
        return this._depthArrayTexture;
    }

    public get active(): ShadowMap[] {
        return this._getActiveShadowMaps().slice();
    }

    public add(shadowMap: ShadowMap): number {
        if (shadowMap._slot !== -1) return shadowMap.id;

        if (this._freeSlots.length === 0 && this._shadowMaps.length >= MAX_SHADOW_MAPS) {
            console.warn(`ShadowManager.add(): max shadow map layers (${MAX_SHADOW_MAPS}) reached`);
            return -1;
        }

        const framebuffer = shadowMap.depthCamera.framebuffer;
        if (!framebuffer._fbo) {
            console.warn("ShadowManager.add(): shadowMap.depthCamera.framebuffer must be initialized before add()");
            return -1;
        }

        const fbW = framebuffer.width;
        const fbH = framebuffer.height;
        if (fbW !== fbH) {
            console.warn(`ShadowManager.add(): shadow map framebuffer must be square (${fbW}x${fbH})`);
            return -1;
        }

        if (!this._ensureDepthArrayTexture(fbW)) return -1;

        shadowMap._slot = this._freeSlots.pop()!;
        shadowMap._manager = this;

        if (!this._rebindFramebufferToLayer(shadowMap)) {
            this._restoreFramebufferAttachment(shadowMap);
            this._freeSlots.push(shadowMap._slot);
            shadowMap._slot = -1;
            shadowMap._manager = null;
            if (shadowMap.depthCamera.shadowMap === shadowMap) {
                shadowMap.depthCamera.shadowMap = null;
            }
            return -1;
        }

        this._shadowMaps.push(shadowMap);
        this._updateActiveShadowMaps = true;
        return shadowMap.id;
    }

    protected _rebindFramebufferToLayer(shadowMap: ShadowMap): boolean {
        const gl = this._renderer.handler.gl;
        if (!gl) return false;

        const fb = shadowMap.depthCamera.framebuffer;
        if (!fb._fbo) return false;

        fb.activate();
        fb.bindOutputTextureLayer(this._depthArrayTexture, shadowMap._slot);
        const status = fb.checkStatus();
        fb.deactivate();

        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            console.warn(`ShadowManager._rebindFramebufferToLayer(): framebuffer incomplete after framebufferTextureLayer
                (status=${fb.statusToText(status)}, slot=${shadowMap._slot}). Check float color-buffer support for RGBA32F.`);
            return false;
        }

        return true;
    }

    protected _restoreFramebufferAttachment(shadowMap: ShadowMap): void {
        const gl = this._renderer.handler.gl;
        if (!gl) return;

        const fb = shadowMap.depthCamera.framebuffer;
        if (!fb._fbo) return;

        const orig = shadowMap.depthTexture;
        fb.activate();
        if (orig) {
            fb.bindOutputTexture(orig);
        } else {
            fb.bindOutputTextureLayer(null, 0);
        }
        fb.deactivate();
    }

    public update(shadowMap: ShadowMap): boolean {
        const index = this._shadowMaps.findIndex((s) => s.id === shadowMap.id);
        if (index === -1) return false;
        this._shadowMaps[index] = shadowMap;
        this._updateActiveShadowMaps = true;
        return true;
    }

    public getByDepthCamera(depthCamera: DepthCamera): ShadowMap | null {
        for (let i = 0; i < this._shadowMaps.length; i++) {
            if (this._shadowMaps[i].depthCamera === depthCamera) {
                return this._shadowMaps[i];
            }
        }

        return null;
    }

    public remove(shadowMap: ShadowMap): boolean {
        const index = this._shadowMaps.findIndex((s) => s.id === shadowMap.id);
        if (index === -1) return false;

        this._restoreFramebufferAttachment(shadowMap);

        if (shadowMap._slot !== -1) {
            this._freeSlots.push(shadowMap._slot);
            shadowMap._slot = -1;
            shadowMap._manager = null;
        }

        if (shadowMap.depthCamera.shadowMap === shadowMap) {
            shadowMap.depthCamera.shadowMap = null;
        }

        this._shadowMaps.splice(index, 1);
        this._updateActiveShadowMaps = true;
        return true;
    }

    public clear(): void {
        for (let i = 0; i < this._shadowMaps.length; i++) {
            const s = this._shadowMaps[i];
            this._restoreFramebufferAttachment(s);
            s._slot = -1;
            s._manager = null;
            if (s.depthCamera.shadowMap === s) {
                s.depthCamera.shadowMap = null;
            }
        }
        this._shadowMaps.length = 0;
        this._activeShadowMaps.length = 0;
        this._updateActiveShadowMaps = false;

        this._freeSlots.length = 0;
        for (let i = MAX_SHADOW_MAPS - 1; i >= 0; i--) {
            this._freeSlots.push(i);
        }
    }

    public dispose(): void {
        this.clear();
        const gl = this._renderer.handler.gl;
        if (gl && this._depthArrayTexture) {
            gl.deleteTexture(this._depthArrayTexture);
        }
        if (gl && this._varianceBlurArrayTexture) {
            gl.deleteTexture(this._varianceBlurArrayTexture);
        }
        this._depthArrayTexture = null;
        this._depthSize = 0;
        this._varianceBlurArrayTexture = null;
        this._varianceBlurArraySize = 0;
        this._freeSlots.length = 0;
    }

    public blurShadowMap(shadowMap: ShadowMap): void {
        if (shadowMap._slot === -1 || !this._depthArrayTexture) return;

        const h = this._renderer.handler;
        const gl = h.gl!;
        const fb = shadowMap.depthCamera.framebuffer;
        const size = fb.width;

        if (!this._varianceBlurArrayTexture || this._varianceBlurArraySize !== size) {
            if (this._varianceBlurArrayTexture) {
                gl.deleteTexture(this._varianceBlurArrayTexture);
            }

            this._varianceBlurArrayTexture = h.createEmptyTexture2DArrayExt(
                size,
                size,
                MAX_SHADOW_MAPS,
                "LINEAR",
                "RGBA32F",
                "CLAMP_TO_EDGE",
                1
            );
            this._varianceBlurArraySize = this._varianceBlurArrayTexture ? size : 0;
        }

        const blurArrayTexture = this._varianceBlurArrayTexture;
        if (!blurArrayTexture) return;

        const program = h.programs.varianceBlur;
        const u = program.uniforms!;
        const a = program.attributes!;

        program.activate();

        gl.disable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.disable(gl.CULL_FACE);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._renderer.screenFramePositionBuffer);
        gl.vertexAttribPointer(a.corners, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1i(u.u_layer, shadowMap._slot);

        fb.activate();
        fb.bindOutputTextureLayer(blurArrayTexture, shadowMap._slot);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this._depthArrayTexture);
        gl.uniform1i(u.u_textureArray, 0);
        gl.uniform2f(u.u_direction, 1.0, 0.0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        fb.deactivate();

        fb.activate();
        fb.bindOutputTextureLayer(this._depthArrayTexture, shadowMap._slot);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, blurArrayTexture);
        gl.uniform2f(u.u_direction, 0.0, 1.0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        fb.deactivate();

        gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
        gl.activeTexture(gl.TEXTURE0);
        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.BLEND);
    }

    public bindForward(program: ShaderProgram, textureUnitStart: number = DEFAULT_SHADOW_TEXTURE_UNIT_START): number {
        const gl = this._renderer.handler.gl;
        if (!gl) return 0;

        const u = program.uniforms!;
        const active = this._getActiveShadowMaps();
        const total = active.length;

        if (total === 0) {
            gl.uniform1i(u.u_shadowMapCount!, 0);
            gl.uniform1i(u.u_shadowMapDepthArray!, textureUnitStart);
            return 0;
        }

        const size = total > MAX_SHADOW_MAPS ? MAX_SHADOW_MAPS : total;
        const activeCameraEye = this._renderer.activeCamera.eye;

        for (let i = 0; i < size; i++) {
            const sm = active[i];
            const camera = sm.depthCamera.camera;
            const frustum = camera.frustums[0];
            const mOffset = i * 16;
            const eOffset = i * 3;
            const vOffset = i * 4;
            const depthRange = Math.max(frustum.far - frustum.near, 1e-6);
            const depthScale = camera.isOrthographic ? 1.0 / depthRange : 1.0;
            const texelWorldSize = camera.isOrthographic
                ? Math.max(frustum.right - frustum.left, frustum.top - frustum.bottom) /
                  sm.depthCamera.framebuffer.width
                : 0.0;

            this._viewProjData.set(camera.getProjectionViewRTEMatrix(), mOffset);

            this._eyeRelData[eOffset] = camera.eye.x - activeCameraEye.x;
            this._eyeRelData[eOffset + 1] = camera.eye.y - activeCameraEye.y;
            this._eyeRelData[eOffset + 2] = camera.eye.z - activeCameraEye.z;

            this._paramsData[vOffset] = sm.depthCamera.bias * depthScale;
            this._paramsData[vOffset + 1] = sm.depthCamera.normalBias;
            this._paramsData[vOffset + 2] = texelWorldSize * depthScale;
            this._paramsData[vOffset + 3] = sm.depthCamera.depthEpsilon * depthScale;

            this._layerData[i] = sm._slot;
        }

        gl.uniform1i(u.u_shadowMapCount!, size);
        gl.uniform1iv(u.u_shadowMapLayer!, this._layerData);
        gl.uniformMatrix4fv(u.u_shadowMapViewProjRTE!, false, this._viewProjData);
        gl.uniform3fv(u.u_shadowMapEyeRel!, this._eyeRelData);
        gl.uniform4fv(u.u_shadowMapParams!, this._paramsData);

        gl.activeTexture(gl.TEXTURE0 + textureUnitStart);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this._depthArrayTexture);
        gl.uniform1i(u.u_shadowMapDepthArray!, textureUnitStart);
        gl.activeTexture(gl.TEXTURE0);

        return size;
    }

    public bindDeferred(
        program: ShaderProgram,
        textureUnitStart: number = DEFAULT_SHADOW_TEXTURE_UNIT_START,
        shadowMapIndex: number = 0
    ): number {
        const gl = this._renderer.handler.gl;
        if (!gl) return 0;

        const u = program.uniforms!;
        const active = this._getActiveShadowMaps();
        const total = active.length;

        if (total === 0 || shadowMapIndex < 0 || shadowMapIndex >= total) {
            gl.uniform1i(u.u_shadowMapCount!, 0);
            gl.uniform1i(u.u_shadowMapDepthArray!, textureUnitStart);
            return 0;
        }

        const sm = active[shadowMapIndex];
        const camera = sm.depthCamera.camera;
        const frustum = camera.frustums[0];
        const activeCameraEye = this._renderer.activeCamera.eye;
        const pvRTE = camera.getProjectionViewRTEMatrix();
        const depthRange = Math.max(frustum.far - frustum.near, 1e-6);
        const depthScale = camera.isOrthographic ? 1.0 / depthRange : 1.0;
        const texelWorldSize = camera.isOrthographic
            ? Math.max(frustum.right - frustum.left, frustum.top - frustum.bottom) / sm.depthCamera.framebuffer.width
            : 0.0;

        gl.uniform1i(u.u_shadowMapCount, 1);
        gl.uniform1i(u.u_shadowMapLayer, sm._slot);
        gl.uniformMatrix4fv(u.u_shadowMapViewProjRTE, false, pvRTE);
        gl.uniform3f(
            u.u_shadowMapEyeRel,
            camera.eye.x - activeCameraEye.x,
            camera.eye.y - activeCameraEye.y,
            camera.eye.z - activeCameraEye.z
        );
        gl.uniform4f(
            u.u_shadowMapParams,
            sm.depthCamera.bias * depthScale,
            sm.depthCamera.normalBias,
            texelWorldSize * depthScale,
            sm.depthCamera.depthEpsilon * depthScale
        );
        gl.activeTexture(gl.TEXTURE0 + textureUnitStart);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this._depthArrayTexture);
        gl.uniform1i(u.u_shadowMapDepthArray!, textureUnitStart);
        gl.activeTexture(gl.TEXTURE0);

        return 1;
    }

    protected _ensureDepthArrayTexture(size: number): boolean {
        if (this._depthArrayTexture) {
            if (this._depthSize !== size) {
                cons.logWrn(
                    `ShadowManager: depth array texture size mismatch (have ${this._depthSize}, got ${size}). ` +
                        `All shadow maps must share the same framebuffer size.`
                );
                return false;
            }
            return true;
        }

        return this._createDepthArrayTexture(size);
    }

    protected _createDepthArrayTexture(size: number): boolean {
        const gl = this._renderer.handler.gl as WebGL2RenderingContext;
        if (!gl) return false;

        const tex = VARIANCE_SHADOW_ENABLED
            ? this._renderer.handler.createEmptyTexture2DArrayExt(
                size,
                size,
                MAX_SHADOW_MAPS,
                "LINEAR",
                "RGBA32F",
                "CLAMP_TO_EDGE",
                1
            )
            : this._renderer.handler.createEmptyTexture2DArrayExt(
                size,
                size,
                MAX_SHADOW_MAPS,
                "LINEAR",
                "R32F",
                "CLAMP_TO_EDGE",
                1
            );
        if (!tex) return false;

        this._depthArrayTexture = tex;
        this._depthSize = size;
        this._freeSlots.length = 0;
        for (let i = MAX_SHADOW_MAPS - 1; i >= this._shadowMaps.length; i--) {
            this._freeSlots.push(i);
        }
        return true;
    }

    protected _collectActiveShadowMaps(): ShadowMap[] {
        const active: ShadowMap[] = [];

        for (let i = 0; i < this._shadowMaps.length; i++) {
            const shadowMap = this._shadowMaps[i];
            if (!shadowMap.enabled) continue;

            active.push(shadowMap);
        }

        return active;
    }

    protected _getActiveShadowMaps(): ShadowMap[] {
        if (!this._updateActiveShadowMaps) return this._activeShadowMaps;

        this._activeShadowMaps = this._collectActiveShadowMaps();
        this._updateActiveShadowMaps = false;

        return this._activeShadowMaps;
    }
}
