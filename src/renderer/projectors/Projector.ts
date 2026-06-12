import type { DepthCamera } from "../../control/depthCamera/DepthCamera";
import type { NumberArray3 } from "../../math/Vec3";
import type { NumberArray4 } from "../../math/Vec4";
import { linearToSrgbArr, srgbToLinear } from "../../utils/colorSpace";
import { htmlColorToRgba, rgbToStringHTML, TypedArray } from "../../utils/shared";
import type { ProjectorManager } from "./ProjectorManager";

export type ProjectorSourceType = "color" | "image" | "video" | "texture";
export type ProjectorRenderMode = "color" | "light";
export type ProjectorColor = NumberArray3 | NumberArray4 | TypedArray | string;
export const PROJECTOR_RENDER_MODE_COLOR = 0;
export const PROJECTOR_RENDER_MODE_LIGHT = 1;

export interface IProjectorParams {
    enabled?: boolean;
    depthCamera: DepthCamera;
    color?: ProjectorColor;
    sourceType?: ProjectorSourceType;
    renderMode?: ProjectorRenderMode;
    priority?: number;
}

export class Projector {
    protected static __staticCounter__ = 0;

    public readonly id: number;
    public depthCamera: DepthCamera;
    public color: Float32Array;
    public sourceType: ProjectorSourceType;
    public renderMode: number = PROJECTOR_RENDER_MODE_COLOR;
    public priority: number;
    protected _enabled: boolean;

    /**
     * Layer index in the manager-owned depth array texture. -1 if not yet added.
     */
    public _slot: number = -1;

    /**
     * Manager that owns this projector. Set in ProjectorManager.add(), cleared on remove().
     */
    public _manager: ProjectorManager | null = null;

    constructor(params: IProjectorParams) {
        this.id = Projector.__staticCounter__++;
        this._enabled = params.enabled ?? true;
        this.depthCamera = params.depthCamera;
        this.color = Projector._resolveColor(params.color);
        this.sourceType = params.sourceType || "color";
        this.renderMode = params.renderMode === "light" ? PROJECTOR_RENDER_MODE_LIGHT : PROJECTOR_RENDER_MODE_COLOR;
        this.priority = params.priority || 0;
    }

    public get enabled(): boolean {
        return this._enabled;
    }

    public set enabled(enabled: boolean) {
        if (this._enabled === enabled) return;

        this._enabled = enabled;
        this._manager?.update(this);
    }

    protected static _resolveColor(color?: ProjectorColor): Float32Array {
        if (typeof color === "string") {
            const c = htmlColorToRgba(color);
            return new Float32Array([srgbToLinear(c.x), srgbToLinear(c.y), srgbToLinear(c.z), c.w]);
        }

        if (color) {
            return new Float32Array([
                srgbToLinear(color[0] ?? 1.0),
                srgbToLinear(color[1] ?? 1.0),
                srgbToLinear(color[2] ?? 1.0),
                color[3] ?? 1.0
            ]);
        }

        return new Float32Array([1.0, 1.0, 1.0, 1.0]);
    }

    public setColorHTML(color: string): void {
        const c = htmlColorToRgba(color);
        this.setColor(c.x, c.y, c.z, c.w);
    }

    public setColor(r: number, g: number, b: number, a?: number): void {
        this.color[0] = srgbToLinear(r);
        this.color[1] = srgbToLinear(g);
        this.color[2] = srgbToLinear(b);
        a !== undefined && (this.color[3] = a);
    }

    public setOpacity(a: number): void {
        this.color[3] = a;
    }

    public getColor(): string {
        const srgb = linearToSrgbArr([this.color[0], this.color[1], this.color[2]]);
        const htmlColor: NumberArray3 = [
            Math.round(srgb[0] * 255),
            Math.round(srgb[1] * 255),
            Math.round(srgb[2] * 255)
        ];
        return rgbToStringHTML(htmlColor);
    }

    public getOpacity(): number {
        return this.color[3];
    }

    /**
     * @public
     * @return number
     * Gets allocated layer index inside the depth array texture.
     */
    public get slot(): number {
        return this._slot;
    }

    /**
     * Gets Manager-owned TEXTURE_2D_ARRAY used as the depth target.
     * @return WebGLTexture | null
     */
    public get arrayTexture(): WebGLTexture | null {
        return this._manager ? this._manager.depthArrayTexture : null;
    }

    /**
     * Gets original framebuffer color texture (TEXTURE_2D) used by projector depth pass.
     * ProjectorManager temporarily rebinds framebuffer attachment to array-layer,
     * but framebuffer.textures[0] remains the original texture reference.
     */
    public get depthTexture(): WebGLTexture | null {
        return this.depthCamera.framebuffer.textures[0] || null;
    }
}
