import type { DepthCamera } from "../../control/depthCamera/DepthCamera";
import type { NumberArray3 } from "../../math/Vec3";
import type { NumberArray4 } from "../../math/Vec4";
import { linearToSrgbArr, srgbToLinear } from "../../utils/colorSpace";
import { htmlColorToRgba, rgbToStringHTML, TypedArray } from "../../utils/shared";
import type { ShadowManager } from "./ShadowManager";

export type ShadowMapColor = NumberArray3 | NumberArray4 | TypedArray | string;

export interface IShadowMapParams {
    enabled?: boolean;
    depthCamera: DepthCamera;
    color?: ShadowMapColor;
    priority?: number;
}

export class ShadowMap {
    protected static __staticCounter__ = 0;

    public readonly id: number;
    public depthCamera: DepthCamera;
    public color: Float32Array;
    protected _enabled: boolean;
    protected _priority: number;

    public _slot: number = -1;
    public _manager: ShadowManager | null = null;

    constructor(params: IShadowMapParams) {
        this.id = ShadowMap.__staticCounter__++;
        this._enabled = params.enabled ?? true;
        this.depthCamera = params.depthCamera;
        this.color = ShadowMap._resolveColor(params.color);
        this._priority = params.priority || 0;
    }

    public get enabled(): boolean {
        return this._enabled;
    }

    public set enabled(enabled: boolean) {
        if (this._enabled === enabled) return;

        this._enabled = enabled;
        this._manager?.update(this);
    }

    public get priority(): number {
        return this._priority;
    }

    public set priority(priority: number) {
        if (this._priority === priority) return;

        this._priority = priority;
        this._manager?.update(this);
    }

    protected static _resolveColor(color?: ShadowMapColor): Float32Array {
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

    public setIntensity(a: number): void {
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

    public getIntensity(): number {
        return this.color[3];
    }

    public get slot(): number {
        return this._slot;
    }

    public get arrayTexture(): WebGLTexture | null {
        return this._manager ? this._manager.depthArrayTexture : null;
    }

    public get depthTexture(): WebGLTexture | null {
        return this.depthCamera.framebuffer.textures[0] || null;
    }
}
