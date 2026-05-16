import type { Camera } from "../camera/Camera";
import type { NumberArray3 } from "../math/Vec3";
import type { ShaderProgram } from "../webgl/ShaderProgram";
import type { Renderer } from "./Renderer";
import { srgbToLinearArr } from "../utils/colorSpace";

export const MAX_PROJECTORS = 4;
export const DEFAULT_PROJECTOR_TEXTURE_UNIT_START = 6;

export type ProjectorMode = "light" | "decal";

export interface IRendererProjectorParams {
    enabled: boolean;
    camera: Camera;
    depthTexture: WebGLTexture;
    color: NumberArray3;
    intensity: number;
    opacity: number;
    bias: number;
    normalBias: number;
    mode: ProjectorMode;
    priority: number;
}

export class RendererProjector {
    protected static __staticCounter__ = 0;

    public readonly id: number;
    public enabled: boolean;
    public camera: Camera;
    public depthTexture: WebGLTexture;
    public color: NumberArray3;
    public intensity: number;
    public opacity: number;
    public bias: number;
    public normalBias: number;
    public mode: ProjectorMode;
    public priority: number;

    constructor(params: IRendererProjectorParams) {
        this.id = RendererProjector.__staticCounter__++;
        this.enabled = params.enabled;
        this.camera = params.camera;
        this.depthTexture = params.depthTexture;
        this.color = [params.color[0], params.color[1], params.color[2]];
        this.intensity = params.intensity;
        this.opacity = params.opacity;
        this.bias = params.bias;
        this.normalBias = params.normalBias;
        this.mode = params.mode;
        this.priority = params.priority;
    }
}

type ActiveProjector = {
    projector: RendererProjector;
    camera: Camera;
    depthTexture: WebGLTexture;
};

export class ProjectorManager {
    protected _renderer: Renderer;
    protected _projectors: RendererProjector[];
    protected _activeProjectors: ActiveProjector[];

    protected _viewProjData: Float32Array;
    protected _colorIntensityData: Float32Array;
    protected _paramsData: Float32Array;
    protected _updateActiveProjectors: boolean;

    constructor(renderer: Renderer) {
        this._renderer = renderer;
        this._projectors = [];
        this._activeProjectors = [];

        this._viewProjData = new Float32Array(MAX_PROJECTORS * 16);
        this._colorIntensityData = new Float32Array(MAX_PROJECTORS * 4);
        this._paramsData = new Float32Array(MAX_PROJECTORS * 4);
        this._updateActiveProjectors = true;
    }

    public add(projector: RendererProjector): number {
        this._projectors.push(this._prepareProjector(projector));
        this._updateActiveProjectors = true;
        return projector.id;
    }

    public update(projector: RendererProjector): boolean {
        const index = this._projectors.findIndex((p) => p.id === projector.id);
        if (index === -1) return false;
        this._projectors[index] = this._prepareProjector(projector);
        this._updateActiveProjectors = true;
        return true;
    }

    public remove(projector: RendererProjector): boolean {
        const index = this._projectors.findIndex((p) => p.id === projector.id);
        if (index === -1) return false;
        this._projectors.splice(index, 1);
        this._updateActiveProjectors = true;
        return true;
    }

    public clear(): void {
        this._projectors.length = 0;
        this._activeProjectors.length = 0;
        this._updateActiveProjectors = false;
    }

    public bind(program: ShaderProgram, textureUnitStart: number = DEFAULT_PROJECTOR_TEXTURE_UNIT_START): number {
        const gl = this._renderer.handler.gl;
        if (!gl) return 0;

        const u = program.uniforms!;

        const active = this._getActiveProjectors();
        const count = active.length;

        gl.uniform1i(u.u_projectorCount!, count);

        if (count > 0) {
            for (let i = 0; i < count; i++) {
                const pi = active[i];
                const mOffset = i * 16;

                this._viewProjData.set(pi.camera.getProjectionViewMatrix(), mOffset);
            }

            gl.uniformMatrix4fv(u.u_projectorViewProj!, false, this._viewProjData.subarray(0, count * 16));
            gl.uniform4fv(u.u_projectorColorIntensity!, this._colorIntensityData.subarray(0, count * 4));
            gl.uniform4fv(u.u_projectorParams!, this._paramsData.subarray(0, count * 4));
        }

        for (let i = 0; i < MAX_PROJECTORS; i++) {
            const textureUnit = textureUnitStart + i;
            gl.activeTexture(gl.TEXTURE0 + textureUnit);
            gl.bindTexture(gl.TEXTURE_2D, active[i] ? active[i].depthTexture : this._renderer.handler.defaultTexture);
        }

        gl.uniform1i(u.u_projectorDepth0!, textureUnitStart);
        gl.uniform1i(u.u_projectorDepth1!, textureUnitStart + 1);
        gl.uniform1i(u.u_projectorDepth2!, textureUnitStart + 2);
        gl.uniform1i(u.u_projectorDepth3!, textureUnitStart + 3);

        gl.activeTexture(gl.TEXTURE0);

        return count;
    }

    protected _collectActiveProjectors(): ActiveProjector[] {
        const active: ActiveProjector[] = [];

        for (let i = 0; i < this._projectors.length; i++) {
            const projector = this._projectors[i];
            if (!projector.enabled) continue;

            const candidate: ActiveProjector = {
                projector,
                camera: projector.camera,
                depthTexture: projector.depthTexture
            };
            active.push(candidate);
        }

        active.sort((a, b) => b.projector.priority - a.projector.priority);
        if (active.length > MAX_PROJECTORS) {
            active.length = MAX_PROJECTORS;
        }

        for (let i = 0; i < active.length; i++) {
            this._writeStaticProjectorData(i, active[i].projector);
        }

        return active;
    }

    protected _getActiveProjectors(): ActiveProjector[] {
        if (!this._updateActiveProjectors) return this._activeProjectors;

        this._activeProjectors = this._collectActiveProjectors();
        this._updateActiveProjectors = false;

        return this._activeProjectors;
    }

    protected _prepareProjector(projector: RendererProjector): RendererProjector {
        const linearColor = srgbToLinearArr(projector.color);
        projector.color = [linearColor[0], linearColor[1], linearColor[2]];
        return projector;
    }

    protected _writeStaticProjectorData(index: number, projector: RendererProjector): void {
        const vOffset = index * 4;
        const color = projector.color;

        this._colorIntensityData[vOffset] = color[0] ?? 1.0;
        this._colorIntensityData[vOffset + 1] = color[1] ?? 1.0;
        this._colorIntensityData[vOffset + 2] = color[2] ?? 1.0;
        this._colorIntensityData[vOffset + 3] = projector.intensity;

        this._paramsData[vOffset] = projector.bias;
        this._paramsData[vOffset + 1] = projector.normalBias;
        this._paramsData[vOffset + 2] = projector.opacity;
        this._paramsData[vOffset + 3] = 0.0;
    }
}
