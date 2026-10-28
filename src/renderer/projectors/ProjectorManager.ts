import { Mat4 } from "../../math/Mat4";
import { cons } from "../../cons";
import type { ShaderProgram } from "../../webgl/ShaderProgram";
import type { DepthCamera } from "../../control/depthCamera/DepthCamera";
import type { Renderer } from "../Renderer";
import { DEFAULT_PROJECTOR_TEXTURE_UNIT_START } from "../textureUnits";
import { Projector } from "./Projector";
import type { ProjectorSource, ProjectorSourceKind } from "./Projector";

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

/**
 * Maximum number of distinct image/video/texture sources sampled in one forward draw call
 * (`u_projectorSource[]`, PROJECTOR_MAX_SOURCES in projectors.glsl). Projectors beyond it render
 * their solid color. Limited by the free texture units between the projector depth array and shadows.
 */
export const MAX_FORWARD_PROJECTOR_SOURCES = 3;

interface IProjectorSource {
    source: ProjectorSource;
    kind: ProjectorSourceKind;
    /** TEXTURE_2D sized to the source. The user texture itself for the "texture" kind. */
    texture: WebGLTexture | null;
    /** False for user textures, which the manager never deletes. */
    owned: boolean;
    width: number;
    height: number;
    dirty: boolean;
    refCount: number;
    /** requestVideoFrameCallback handle, -1 when not watching frames. */
    frameCallbackId: number;
    /** Last frame this source was updated in, so shared sources upload once per frame. */
    updateFrame: number;
    /** Upload threw (e.g. a cross-origin source without CORS); retried when the source is assigned again. */
    failed: boolean;
}

function isDynamicCanvas(source: ProjectorSource): boolean {
    return (
        (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) ||
        (typeof OffscreenCanvas !== "undefined" && source instanceof OffscreenCanvas)
    );
}

function getSourceSize(source: TexImageSource, out: number[]): void {
    if (typeof HTMLVideoElement !== "undefined" && source instanceof HTMLVideoElement) {
        out[0] = source.videoWidth;
        out[1] = source.videoHeight;
    } else if (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement) {
        const loaded = source.complete;
        out[0] = loaded ? source.naturalWidth : 0;
        out[1] = loaded ? source.naturalHeight : 0;
    } else if (typeof VideoFrame !== "undefined" && source instanceof VideoFrame) {
        out[0] = source.displayWidth;
        out[1] = source.displayHeight;
    } else {
        out[0] = (source as ImageBitmap).width;
        out[1] = (source as ImageBitmap).height;
    }
}

/**
 * Assigns forward sampler slots to the sources of the first `count` projectors (priority order).
 * Each distinct ready source takes the next slot, a repeated source reuses its slot, and projectors
 * without a source, with a not yet uploaded one, or past `maxSlots` distinct sources get -1 (color).
 *
 * @param sourceIndices - Source table index per projector, -1 for color.
 * @param outSlots - Sampler slot per projector.
 * @param outSlotSources - Source table index per used slot.
 * @returns Number of used slots.
 */
export function assignSourceSlots(
    sourceIndices: ArrayLike<number>,
    count: number,
    isReady: (sourceIndex: number) => boolean,
    maxSlots: number,
    outSlots: Int32Array,
    outSlotSources: Int32Array
): number {
    let used = 0;

    for (let i = 0; i < count; i++) {
        const sourceIndex = sourceIndices[i];
        outSlots[i] = -1;

        if (sourceIndex === -1 || !isReady(sourceIndex)) continue;

        for (let s = 0; s < used; s++) {
            if (outSlotSources[s] === sourceIndex) {
                outSlots[i] = s;
                break;
            }
        }

        if (outSlots[i] === -1 && used < maxSlots) {
            outSlotSources[used] = sourceIndex;
            outSlots[i] = used++;
        }
    }

    return used;
}

/** Default texture unit where the depth array sampler is bound. */
export class ProjectorManager {
    protected _renderer: Renderer;
    protected _projectors: Projector[];
    protected _activeProjectors: Projector[];

    protected _viewProjData: Float32Array;
    protected _invViewProjData: Float32Array;
    protected _eyeRelData: Float32Array;
    protected _colorIntensityData: Float32Array;
    protected _paramsData: Float32Array;
    protected _depthRangeData: Float32Array;
    protected _layerData: Int32Array;
    protected _updateActiveProjectors: boolean;

    protected _depthArrayTexture: WebGLTexture | null;
    /** Layer size of `_depthArrayTexture`. Determined by the first projector added. */
    protected _depthSize: number;
    protected _depthCapacity: number;
    protected _freeSlots: number[];

    /**
     * Image/video/texture sources referenced by projectors, one TEXTURE_2D each at its own size.
     * Projectors sharing a source object share its entry (`projector._sourceIndex`).
     */
    protected _sources: (IProjectorSource | null)[];
    protected _sourceIndexMap: Map<ProjectorSource, number>;
    protected _freeSourceIndices: number[];
    protected _frame: number;
    protected _sourceSize: number[];

    protected _projectorSourceData: Int32Array;
    protected _sourceSlotData: Int32Array;
    protected _slotSourceData: Int32Array;
    protected _sourceUnitData: Int32Array;
    protected _placeholderTexture: WebGLTexture | null;

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
        this._depthRangeData = new Float32Array(MAX_FORWARD_PROJECTORS * 3);
        this._layerData = new Int32Array(MAX_FORWARD_PROJECTORS);
        this._updateActiveProjectors = true;

        this._depthArrayTexture = null;
        this._depthSize = 0;
        this._depthCapacity = 0;
        this._freeSlots = [];

        this._sources = [];
        this._sourceIndexMap = new Map();
        this._freeSourceIndices = [];
        this._frame = 0;
        this._sourceSize = [0, 0];

        this._projectorSourceData = new Int32Array(MAX_FORWARD_PROJECTORS);
        this._sourceSlotData = new Int32Array(MAX_FORWARD_PROJECTORS);
        this._slotSourceData = new Int32Array(MAX_FORWARD_PROJECTOR_SOURCES);
        this._sourceUnitData = new Int32Array(MAX_FORWARD_PROJECTOR_SOURCES);
        this._placeholderTexture = null;

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
        this._updateActiveProjectors = true;

        this._attachSource(projector);

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

        fb.activate();
        fb.bindOutputTextureLayer(this._depthArrayTexture, projector._slot);
        const status = fb.checkStatus();
        fb.deactivate();

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
        fb.activate();
        if (orig) {
            fb.bindOutputTexture(orig);
        } else {
            fb.bindOutputTextureLayer(null, 0);
        }
        fb.deactivate();
    }

    public update(projector: Projector): boolean {
        const index = this._projectors.findIndex((p) => p.id === projector.id);
        if (index === -1) return false;
        this._projectors[index] = projector;
        this._updateActiveProjectors = true;
        return true;
    }

    public getByDepthCamera(depthCamera: DepthCamera): Projector | null {
        for (let i = 0; i < this._projectors.length; i++) {
            if (this._projectors[i].depthCamera === depthCamera) {
                return this._projectors[i];
            }
        }

        return null;
    }

    public remove(projector: Projector): boolean {
        const index = this._projectors.findIndex((p) => p.id === projector.id);
        if (index === -1) return false;

        this._restoreFramebufferAttachment(projector);
        this._releaseSource(projector);

        if (projector._slot !== -1) {
            this._freeSlots.push(projector._slot);
            projector._slot = -1;
            projector._manager = null;
        }

        this._projectors.splice(index, 1);
        this._updateActiveProjectors = true;
        return true;
    }

    public clear(): void {
        for (let i = 0; i < this._projectors.length; i++) {
            const p = this._projectors[i];
            this._restoreFramebufferAttachment(p);
            this._releaseSource(p);
            p._slot = -1;
            p._manager = null;
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
        if (gl && this._placeholderTexture) {
            gl.deleteTexture(this._placeholderTexture);
        }
        this._depthArrayTexture = null;
        this._placeholderTexture = null;
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
            this._bindSourceSamplers(program, textureUnitStart, 0);
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

            const frustum = camera.frustums[0];

            this._paramsData[vOffset] = pi.depthCamera.depthBiasWorld;
            this._paramsData[vOffset + 1] = pi.depthCamera.normalBias;
            this._paramsData[vOffset + 2] = pi.renderMode;
            this._paramsData[vOffset + 3] = camera.isOrthographic ? 1.0 : 0.0;

            const rOffset = i * 3;
            this._depthRangeData[rOffset] = frustum.near;
            this._depthRangeData[rOffset + 1] = frustum.far;
            this._depthRangeData[rOffset + 2] = pi.depthCamera.texelScale;

            this._layerData[i] = pi._slot;
            this._projectorSourceData[i] = pi._sourceIndex;
        }

        const usedSlots = assignSourceSlots(
            this._projectorSourceData,
            size,
            this._isSourceReady,
            MAX_FORWARD_PROJECTOR_SOURCES,
            this._sourceSlotData,
            this._slotSourceData
        );

        gl.uniform1i(u.u_projectorCount!, size);
        gl.uniform1iv(u.u_projectorLayer!, this._layerData);
        gl.uniform1iv(u.u_projectorSourceIndex!, this._sourceSlotData);
        gl.uniformMatrix4fv(u.u_projectorViewProjRTE!, false, this._viewProjData);
        gl.uniform3fv(u.u_projectorEyeRel!, this._eyeRelData);
        gl.uniform4fv(u.u_projectorColor!, this._colorIntensityData);
        gl.uniform4fv(u.u_projectorParams!, this._paramsData);
        gl.uniform3fv(u.u_projectorDepthRange!, this._depthRangeData);

        gl.activeTexture(gl.TEXTURE0 + textureUnitStart);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this._depthArrayTexture);
        gl.uniform1i(u.u_projectorDepthArray!, textureUnitStart);

        for (let s = 0; s < usedSlots; s++) {
            gl.activeTexture(gl.TEXTURE0 + textureUnitStart + 1 + s);
            gl.bindTexture(gl.TEXTURE_2D, this._sources[this._slotSourceData[s]]!.texture);
        }
        this._bindSourceSamplers(program, textureUnitStart, usedSlots);

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
            this._bindSourceSamplers(program, textureUnitStart, 0);
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
        const hasSource = pi._sourceIndex !== -1 && this._isSourceReady(pi._sourceIndex);
        gl.uniform1i(u.u_projectorSourceIndex, hasSource ? 0 : -1);
        gl.uniformMatrix4fv(u.u_projectorViewProjRTE, false, pvRTE);
        gl.uniform3f(
            u.u_projectorEyeRel,
            camera.eye.x - activeCameraEye.x,
            camera.eye.y - activeCameraEye.y,
            camera.eye.z - activeCameraEye.z
        );
        gl.uniform4f(u.u_projectorColor, color[0], color[1], color[2], color[3]);
        const frustum = camera.frustums[0];

        gl.uniform4f(
            u.u_projectorParams,
            pi.depthCamera.depthBiasWorld,
            pi.depthCamera.normalBias,
            pi.renderMode,
            camera.isOrthographic ? 1.0 : 0.0
        );
        gl.uniform3f(u.u_projectorDepthRange, frustum.near, frustum.far, pi.depthCamera.texelScale);
        gl.uniformMatrix4fv(u.u_projectorInvViewProjRTE, false, this._tmpInverse._m);

        gl.activeTexture(gl.TEXTURE0 + textureUnitStart);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this._depthArrayTexture);
        gl.uniform1i(u.u_projectorDepthArray!, textureUnitStart);

        if (hasSource) {
            gl.activeTexture(gl.TEXTURE0 + textureUnitStart + 1);
            gl.bindTexture(gl.TEXTURE_2D, this._sources[pi._sourceIndex]!.texture);
        }
        this._bindSourceSamplers(program, textureUnitStart, hasSource ? 1 : 0);

        gl.activeTexture(gl.TEXTURE0);

        return 1;
    }

    /**
     * Points `u_projectorSource[]` at the units right after the depth array, so the sampler2D array
     * never shares unit 0 or the depth sampler2DArray unit, and fills the slots from `usedSlots` on
     * with a 1x1 placeholder, since drawing with an empty sampler unit is a WebGL warning.
     */
    protected _bindSourceSamplers(program: ShaderProgram, textureUnitStart: number, usedSlots: number): void {
        const gl = this._renderer.handler.gl!;

        if (usedSlots < MAX_FORWARD_PROJECTOR_SOURCES) {
            const placeholder = this._getPlaceholderTexture(gl);
            for (let s = usedSlots; s < MAX_FORWARD_PROJECTOR_SOURCES; s++) {
                gl.activeTexture(gl.TEXTURE0 + textureUnitStart + 1 + s);
                gl.bindTexture(gl.TEXTURE_2D, placeholder);
            }
            gl.activeTexture(gl.TEXTURE0);
        }

        for (let s = 0; s < MAX_FORWARD_PROJECTOR_SOURCES; s++) {
            this._sourceUnitData[s] = textureUnitStart + 1 + s;
        }
        gl.uniform1iv(program.uniforms.u_projectorSource!, this._sourceUnitData);
    }

    protected _getPlaceholderTexture(gl: WebGL2RenderingContext): WebGLTexture | null {
        if (!this._placeholderTexture) {
            this._placeholderTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this._placeholderTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        }
        return this._placeholderTexture;
    }

    protected _isSourceReady = (sourceIndex: number): boolean => {
        const source = this._sources[sourceIndex];
        return !!source && source.texture !== null;
    };

    /**
     * Lazily allocates the manager-owned TEXTURE_2D_ARRAY at the size of the first
     * projector to be added.
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
        const h = this._renderer.handler;
        if (!h.gl) return false;

        const tex = h.createEmptyTexture2DArrayExt(
            size,
            size,
            capacity,
            h.floatTextureFilter,
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

    /**
     * Called by Projector.source and Projector.sourceEnabled setters. Assigning the current source again
     * marks it for re-upload.
     */
    public _setSource(projector: Projector): void {
        const index = projector._sourceIndex;
        if (index !== -1 && projector.sourceEnabled && this._sources[index]!.source === projector.source) {
            this._sources[index]!.dirty = true;
            this._sources[index]!.failed = false;
            return;
        }

        this._releaseSource(projector);
        this._attachSource(projector);
        this._updateActiveProjectors = true;
    }

    protected _attachSource(projector: Projector): void {
        const source = projector.source;
        if (!source || !projector.sourceEnabled) return;

        let index = this._sourceIndexMap.get(source);

        if (index === undefined) {
            const kind = Projector.getSourceKind(source);
            const entry: IProjectorSource = {
                source,
                kind,
                texture: kind === "texture" ? (source as WebGLTexture) : null,
                owned: kind !== "texture",
                width: 0,
                height: 0,
                dirty: true,
                refCount: 0,
                frameCallbackId: -1,
                updateFrame: -1,
                failed: false
            };

            index = this._freeSourceIndices.length ? this._freeSourceIndices.pop()! : this._sources.length;
            this._sources[index] = entry;
            this._sourceIndexMap.set(source, index);

            if (kind === "video") {
                this._watchVideoFrames(entry);
            }
        }

        this._sources[index]!.refCount++;
        projector._sourceIndex = index;
    }

    protected _releaseSource(projector: Projector): void {
        const index = projector._sourceIndex;
        if (index === -1) return;

        projector._sourceIndex = -1;

        const entry = this._sources[index];
        if (!entry || --entry.refCount > 0) return;

        if (entry.frameCallbackId !== -1) {
            (entry.source as HTMLVideoElement).cancelVideoFrameCallback(entry.frameCallbackId);
            entry.frameCallbackId = -1;
        }

        const gl = this._renderer.handler.gl;
        if (gl && entry.owned && entry.texture) {
            gl.deleteTexture(entry.texture);
        }
        entry.texture = null;

        this._sourceIndexMap.delete(entry.source);
        this._sources[index] = null;
        this._freeSourceIndices.push(index);
    }

    /**
     * Marks the video source dirty on every presented frame. Without requestVideoFrameCallback,
     * updateSources() re-uploads a playing video every frame instead.
     */
    protected _watchVideoFrames(entry: IProjectorSource): void {
        const video = entry.source as HTMLVideoElement;
        if (typeof video.requestVideoFrameCallback !== "function") return;

        const onFrame = () => {
            if (entry.refCount <= 0) return;
            entry.dirty = true;
            entry.frameCallbackId = video.requestVideoFrameCallback(onFrame);
        };

        entry.frameCallbackId = video.requestVideoFrameCallback(onFrame);
    }

    /**
     * Uploads new pixels of the sources used by enabled projectors. Called by the renderer once
     * per frame, before scene rendering, so every pass of the frame samples the same picture.
     */
    public updateSources(): void {
        const active = this._getActiveProjectors();
        if (active.length === 0) return;

        const gl = this._renderer.handler.gl as WebGL2RenderingContext;
        if (!gl) return;

        this._frame++;

        for (let i = 0; i < active.length; i++) {
            const index = active[i]._sourceIndex;
            if (index === -1) continue;

            const entry = this._sources[index];
            if (!entry || entry.updateFrame === this._frame) continue;

            entry.updateFrame = this._frame;
            this._updateSource(gl, entry);
        }
    }

    protected _updateSource(gl: WebGL2RenderingContext, entry: IProjectorSource): void {
        if (entry.kind === "texture" || entry.failed) {
            return;
        }

        const source = entry.source as TexImageSource;

        if (entry.kind === "video") {
            const video = source as HTMLVideoElement;
            if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
            if (entry.frameCallbackId === -1 && !video.paused) entry.dirty = true;
        } else if (isDynamicCanvas(source)) {
            entry.dirty = true;
        }

        if (!entry.dirty) return;

        getSourceSize(source, this._sourceSize);
        const width = this._sourceSize[0];
        const height = this._sourceSize[1];
        if (!width || !height) return;

        if (!entry.texture) {
            entry.texture = gl.createTexture();
            if (!entry.texture) return;

            gl.bindTexture(gl.TEXTURE_2D, entry.texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        } else {
            gl.bindTexture(gl.TEXTURE_2D, entry.texture);
        }

        // Projector UV is derived from the depth render target (v=0 at the bottom), while the
        // uploaded canvas/image/video source has v=0 at the top (HTML convention) — flip on
        // upload rather than in the shader, and restore the engine-wide default right after.
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        try {
            // Always a full texImage2D into RGBA8: Chromium copies video frames on the GPU only on that path.
            // texSubImage2D or an SRGB8_ALPHA8 target falls back to a CPU copy, ~5x slower on Ultra
            // (Mali-G57, Chromium 100). The shader converts the sRGB sample to linear instead.
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
            entry.width = width;
            entry.height = height;
            entry.dirty = false;
        } catch (err) {
            console.warn("ProjectorManager: unable to upload projector source, rendering color instead.", err);
            gl.deleteTexture(entry.texture);
            entry.texture = null;
            entry.failed = true;
        } finally {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
    }

    protected _collectActiveProjectors(): Projector[] {
        const active: Projector[] = [];

        for (let i = 0; i < this._projectors.length; i++) {
            const projector = this._projectors[i];
            if (!projector.enabled) continue;

            active.push(projector);
        }

        // On equal priority, projectors with a source go first to get the forward source slots.
        active.sort((a, b) => b.priority - a.priority || Number(b._sourceIndex !== -1) - Number(a._sourceIndex !== -1));

        return active;
    }

    protected _getActiveProjectors(): Projector[] {
        if (!this._updateActiveProjectors) return this._activeProjectors;

        this._activeProjectors = this._collectActiveProjectors();
        this._updateActiveProjectors = false;

        return this._activeProjectors;
    }
}
