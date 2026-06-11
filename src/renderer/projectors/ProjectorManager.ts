import { Mat4 } from "../../math/Mat4";
import { cons } from "../../cons";
import type { ShaderProgram } from "../../webgl/ShaderProgram";
import type { Renderer } from "../Renderer";
import { Projector } from "./Projector";

export type { ProjectorSourceType, ProjectorRenderMode, IProjectorParams } from "./Projector";
export { Projector } from "./Projector";

/**
 * Maximum number of depth layers allocated in manager-owned projector array texture.
 * Defines how many projectors can be added to the manager at once.
 */
export const MAX_PROJECTOR_LAYERS = 64;
const INITIAL_PROJECTOR_LAYERS = 8;

/**
 * Maximum number of projectors processed in a single shader invocation.
 * Used by forward / WOIT paths as top-K by priority per draw call.
 * Deferred projector pass binds one projector per draw (`chunkSize = 1`).
 */
export const MAX_FORWARD_PROJECTORS = 8;

/** Default texture unit where the depth array sampler is bound. */
export const DEFAULT_PROJECTOR_TEXTURE_UNIT_START = 6;

export class ProjectorManager {
    protected _renderer: Renderer;
    protected _projectors: Projector[];
    protected _activeProjectors: Projector[];

    protected _viewProjData: Float32Array;
    protected _invViewProjData: Float32Array;
    protected _eyeRelData: Float32Array;
    protected _colorIntensityData: Float32Array;
    protected _paramsData: Float32Array;
    protected _layerData: Int32Array;
    protected _updateActiveProjectors: boolean;

    protected _depthArrayTexture: WebGLTexture | null;
    /** Layer size of `_depthArrayTexture`. Determined by the first projector added. */
    protected _depthSize: number;
    protected _depthCapacity: number;
    protected _freeSlots: number[];

    protected _tmpInverse: Mat4;

    constructor(renderer: Renderer) {
        this._renderer = renderer;
        this._projectors = [];
        this._activeProjectors = [];

        this._viewProjData = new Float32Array(MAX_FORWARD_PROJECTORS * 16);
        this._invViewProjData = new Float32Array(MAX_FORWARD_PROJECTORS * 16);
        this._eyeRelData = new Float32Array(MAX_FORWARD_PROJECTORS * 3);
        this._colorIntensityData = new Float32Array(MAX_FORWARD_PROJECTORS * 4);
        this._paramsData = new Float32Array(MAX_FORWARD_PROJECTORS * 4);
        this._layerData = new Int32Array(MAX_FORWARD_PROJECTORS);
        this._updateActiveProjectors = true;

        this._depthArrayTexture = null;
        this._depthSize = 0;
        this._depthCapacity = 0;
        this._freeSlots = [];

        this._tmpInverse = new Mat4();
    }

    /** Total active projectors count (used by consumers to choose _proj / _noproj programs). */
    public get activeCount(): number {
        return this._getActiveProjectors().length;
    }

    /** Manager-owned TEXTURE_2D_ARRAY containing depth maps for all projectors. */
    public get depthArrayTexture(): WebGLTexture | null {
        return this._depthArrayTexture;
    }

    /** Snapshot of currently active projectors (sorted by priority desc). */
    public get active(): Projector[] {
        return this._getActiveProjectors().slice();
    }

    public add(projector: Projector): number {
        if (projector._slot !== -1) return projector.id;

        if (this._freeSlots.length === 0 && this._depthCapacity >= MAX_PROJECTOR_LAYERS) {
            console.warn(`ProjectorManager.add(): max projector layers (${MAX_PROJECTOR_LAYERS}) reached`);
            return -1;
        }

        const framebuffer = projector.depthCamera.framebuffer;
        if (!framebuffer._fbo) {
            console.warn("ProjectorManager.add(): projector.depthCamera.framebuffer must be initialized before add()");
            return -1;
        }

        const fbW = framebuffer.width;
        const fbH = framebuffer.height;
        if (fbW !== fbH) {
            console.warn(`ProjectorManager.add(): projector framebuffer must be square (${fbW}x${fbH})`);
            return -1;
        }

        if (!this._ensureDepthArrayTexture(fbW, this._depthCapacity || INITIAL_PROJECTOR_LAYERS)) return -1;
        if (this._freeSlots.length === 0 && !this._growDepthArrayTexture()) return -1;

        projector._slot = this._freeSlots.pop()!;
        projector._manager = this;

        if (!this._rebindFramebufferToLayer(projector)) {
            this._restoreFramebufferAttachment(projector);
            this._freeSlots.push(projector._slot);
            projector._slot = -1;
            projector._manager = null;
            return -1;
        }

        this._projectors.push(projector);
        projector.depthCamera.projector = projector;
        this._updateActiveProjectors = true;
        return projector.id;
    }

    /**
     * Rebinds projector.depthCamera.framebuffer COLOR_ATTACHMENT0 from its own TEXTURE_2D
     * to (this._depthArrayTexture, projector._slot) so renders go directly into
     * the array layer without any per-frame copy. The original TEXTURE_2D stays
     * referenced inside framebuffer.textures[0] so framebuffer.destroy() can free it
     * normally — we never overwrite that slot with the shared array texture.
     */
    protected _rebindFramebufferToLayer(projector: Projector): boolean {
        const gl = this._renderer.handler.gl;
        if (!gl) return false;

        const fb = projector.depthCamera.framebuffer;
        if (!fb._fbo) return false;

        const status = fb.attachLayer(this._depthArrayTexture, projector._slot);

        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            console.warn(`ProjectorManager._rebindFramebufferToLayer(): framebuffer incomplete after framebufferTextureLayer
                (status=${fb.statusToText(status)}, slot=${projector._slot}). Check float color-buffer support for R32F.`);
            return false;
        }

        return true;
    }

    /**
     * Restores projector.depthCamera.framebuffer COLOR_ATTACHMENT0 back to its original TEXTURE_2D
     * so subsequent depth renders no longer touch the freed array layer.
     */
    protected _restoreFramebufferAttachment(projector: Projector): void {
        const gl = this._renderer.handler.gl;
        if (!gl) return;

        const fb = projector.depthCamera.framebuffer;
        if (!fb._fbo) return;

        const orig = projector.depthTexture;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb._fbo);
        if (orig) {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, orig, 0);
        } else {
            // No original recorded — detach the array layer.
            gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, null, 0, 0);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    public update(projector: Projector): boolean {
        const index = this._projectors.findIndex((p) => p.id === projector.id);
        if (index === -1) return false;
        this._projectors[index] = projector;
        this._updateActiveProjectors = true;
        return true;
    }

    public remove(projector: Projector): boolean {
        const index = this._projectors.findIndex((p) => p.id === projector.id);
        if (index === -1) return false;

        this._restoreFramebufferAttachment(projector);

        if (projector._slot !== -1) {
            this._freeSlots.push(projector._slot);
            projector._slot = -1;
            projector._manager = null;
        }

        if (projector.depthCamera.projector === projector) {
            projector.depthCamera.projector = null;
        }

        this._projectors.splice(index, 1);
        this._updateActiveProjectors = true;
        return true;
    }

    public clear(): void {
        for (let i = 0; i < this._projectors.length; i++) {
            const p = this._projectors[i];
            this._restoreFramebufferAttachment(p);
            p._slot = -1;
            p._manager = null;
            if (p.depthCamera.projector === p) {
                p.depthCamera.projector = null;
            }
        }
        this._projectors.length = 0;
        this._activeProjectors.length = 0;
        this._updateActiveProjectors = false;

        this._freeSlots.length = 0;
        for (let i = this._depthCapacity - 1; i >= 0; i--) {
            this._freeSlots.push(i);
        }
    }

    public dispose(): void {
        this.clear();
        const gl = this._renderer.handler.gl;
        if (gl && this._depthArrayTexture) {
            gl.deleteTexture(this._depthArrayTexture);
        }
        this._depthArrayTexture = null;
        this._depthSize = 0;
        this._depthCapacity = 0;
        this._freeSlots.length = 0;
    }

    /**
     * Binds forward/WOIT projectors to the given shader program.
     * Uses top-K projectors by priority for current draw call.
     *
     * @returns Actual projector count uploaded (0..MAX_FORWARD_PROJECTORS).
     */
    public bindForward(
        program: ShaderProgram,
        textureUnitStart: number = DEFAULT_PROJECTOR_TEXTURE_UNIT_START
    ): number {
        const gl = this._renderer.handler.gl;
        if (!gl) return 0;

        const u = program.uniforms!;
        const active = this._getActiveProjectors();
        const total = active.length;

        if (total === 0) {
            gl.uniform1i(u.u_projectorCount!, 0);
            // Keep sampler2DArray on its dedicated unit even when projectors are disabled.
            // Prevents sampler type conflicts with sampler2D bound to texture unit 0.
            gl.uniform1i(u.u_projectorDepthArray!, textureUnitStart);
            return 0;
        }

        const size = total > MAX_FORWARD_PROJECTORS ? MAX_FORWARD_PROJECTORS : total;
        const activeCameraEye = this._renderer.activeCamera.eye;

        for (let i = 0; i < size; i++) {
            const pi = active[i];
            const camera = pi.depthCamera.camera;
            const mOffset = i * 16;
            const eOffset = i * 3;
            const vOffset = i * 4;

            const pvRTE = camera.getProjectionViewRTEMatrix();
            this._viewProjData.set(pvRTE, mOffset);

            this._tmpInverse.set(pvRTE).inverseTo(this._tmpInverse);
            this._invViewProjData.set(this._tmpInverse._m, mOffset);

            this._eyeRelData[eOffset] = camera.eye.x - activeCameraEye.x;
            this._eyeRelData[eOffset + 1] = camera.eye.y - activeCameraEye.y;
            this._eyeRelData[eOffset + 2] = camera.eye.z - activeCameraEye.z;

            const color = pi.color;
            this._colorIntensityData[vOffset] = color[0] ?? 1.0;
            this._colorIntensityData[vOffset + 1] = color[1] ?? 1.0;
            this._colorIntensityData[vOffset + 2] = color[2] ?? 1.0;
            this._colorIntensityData[vOffset + 3] = color[3] ?? 1.0;

            this._paramsData[vOffset] = pi.bias;
            this._paramsData[vOffset + 1] = pi.normalBias;
            this._paramsData[vOffset + 2] = pi.renderMode;
            this._paramsData[vOffset + 3] = pi.depthEpsilon;

            this._layerData[i] = pi._slot;
        }

        gl.uniform1i(u.u_projectorCount!, size);
        gl.uniform1iv(u.u_projectorLayer!, this._layerData);
        gl.uniformMatrix4fv(u.u_projectorViewProjRTE!, false, this._viewProjData);
        gl.uniform3fv(u.u_projectorEyeRel!, this._eyeRelData);
        gl.uniform4fv(u.u_projectorColor!, this._colorIntensityData);
        gl.uniform4fv(u.u_projectorParams!, this._paramsData);

        gl.activeTexture(gl.TEXTURE0 + textureUnitStart);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this._depthArrayTexture);
        gl.uniform1i(u.u_projectorDepthArray!, textureUnitStart);
        gl.activeTexture(gl.TEXTURE0);

        return size;
    }

    /**
     * Binds exactly one projector for deferred frustum-geometry draw call.
     *
     * @param projectorIndex - Active projector index in priority-sorted array.
     * @returns 1 if projector was bound, 0 if index is out of range.
     */
    public bindDeferred(
        program: ShaderProgram,
        textureUnitStart: number = DEFAULT_PROJECTOR_TEXTURE_UNIT_START,
        projectorIndex: number = 0
    ): number {
        const gl = this._renderer.handler.gl;
        if (!gl) return 0;

        const u = program.uniforms!;
        const active = this._getActiveProjectors();
        const total = active.length;

        if (total === 0 || projectorIndex < 0 || projectorIndex >= total) {
            gl.uniform1i(u.u_projectorCount!, 0);
            gl.uniform1i(u.u_projectorDepthArray!, textureUnitStart);
            return 0;
        }

        const pi = active[projectorIndex];
        const camera = pi.depthCamera.camera;
        const activeCameraEye = this._renderer.activeCamera.eye;
        const pvRTE = camera.getProjectionViewRTEMatrix();

        this._tmpInverse.set(pvRTE).inverseTo(this._tmpInverse);

        const color = pi.color;

        gl.uniform1i(u.u_projectorCount, 1);
        gl.uniform1i(u.u_projectorLayer, pi._slot);
        gl.uniformMatrix4fv(u.u_projectorViewProjRTE, false, pvRTE);
        gl.uniform3f(
            u.u_projectorEyeRel,
            camera.eye.x - activeCameraEye.x,
            camera.eye.y - activeCameraEye.y,
            camera.eye.z - activeCameraEye.z
        );
        gl.uniform4f(u.u_projectorColor, color[0], color[1], color[2], color[3]);
        gl.uniform4f(u.u_projectorParams, pi.bias, pi.normalBias, pi.renderMode, pi.depthEpsilon);
        gl.uniformMatrix4fv(u.u_projectorInvViewProjRTE, false, this._tmpInverse._m);

        gl.activeTexture(gl.TEXTURE0 + textureUnitStart);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this._depthArrayTexture);
        gl.uniform1i(u.u_projectorDepthArray!, textureUnitStart);
        gl.activeTexture(gl.TEXTURE0);

        return 1;
    }

    /**
     * Lazily allocates the manager-owned TEXTURE_2D_ARRAY at the size of the first
     * projector to be added. All subsequent projectors must use the same size.
     * Returns false if a size mismatch is detected.
     */
    protected _ensureDepthArrayTexture(size: number, capacity: number): boolean {
        if (this._depthArrayTexture) {
            if (this._depthSize !== size) {
                cons.logWrn(
                    `ProjectorManager: depth array texture size mismatch (have ${this._depthSize}, got ${size}). ` +
                        `All projectors must share the same framebuffer size.`
                );
                return false;
            }
            return true;
        }

        return this._createDepthArrayTexture(size, Math.min(capacity, MAX_PROJECTOR_LAYERS));
    }

    protected _createDepthArrayTexture(size: number, capacity: number): boolean {
        const gl = this._renderer.handler.gl as WebGL2RenderingContext;
        if (!gl) return false;

        const tex = this._renderer.handler.createEmptyTexture2DArrayExt(
            size,
            size,
            capacity,
            "NEAREST",
            "R32F",
            "CLAMP_TO_EDGE",
            1
        );
        if (!tex) return false;

        this._depthArrayTexture = tex;
        this._depthSize = size;
        this._depthCapacity = capacity;
        this._freeSlots.length = 0;
        for (let i = capacity - 1; i >= this._projectors.length; i--) {
            this._freeSlots.push(i);
        }
        return true;
    }

    protected _growDepthArrayTexture(): boolean {
        if (!this._depthArrayTexture || !this._depthSize || this._depthCapacity >= MAX_PROJECTOR_LAYERS) {
            return false;
        }

        const gl = this._renderer.handler.gl as WebGL2RenderingContext;
        if (!gl) return false;

        const oldTexture = this._depthArrayTexture;
        const oldCapacity = this._depthCapacity;
        const nextCapacity = Math.min(oldCapacity * 2, MAX_PROJECTOR_LAYERS);

        if (!this._createDepthArrayTexture(this._depthSize, nextCapacity)) {
            this._depthArrayTexture = oldTexture;
            this._depthCapacity = oldCapacity;
            return false;
        }

        for (let i = 0; i < this._projectors.length; i++) {
            if (!this._rebindFramebufferToLayer(this._projectors[i])) {
                gl.deleteTexture(this._depthArrayTexture);
                this._depthArrayTexture = oldTexture;
                this._depthCapacity = oldCapacity;
                this._freeSlots.length = 0;
                for (let j = 0; j < this._projectors.length; j++) {
                    this._rebindFramebufferToLayer(this._projectors[j]);
                }
                return false;
            }
        }

        gl.deleteTexture(oldTexture);

        this._freeSlots.length = 0;
        for (let i = nextCapacity - 1; i >= oldCapacity; i--) {
            this._freeSlots.push(i);
        }

        return true;
    }

    protected _collectActiveProjectors(): Projector[] {
        const active: Projector[] = [];

        for (let i = 0; i < this._projectors.length; i++) {
            const projector = this._projectors[i];
            if (!projector.enabled) continue;

            active.push(projector);
        }

        active.sort((a, b) => b.priority - a.priority);

        return active;
    }

    protected _getActiveProjectors(): Projector[] {
        if (!this._updateActiveProjectors) return this._activeProjectors;

        this._activeProjectors = this._collectActiveProjectors();
        this._updateActiveProjectors = false;

        return this._activeProjectors;
    }
}
