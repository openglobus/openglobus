import type { DepthCamera } from "../../control/depthCamera/DepthCamera";
import type { NumberArray3 } from "../../math/Vec3";
import type { NumberArray4 } from "../../math/Vec4";
import { linearToSrgbArr, srgbToLinear } from "../../utils/colorSpace";
import { htmlColorToRgba, rgbToStringHTML, TypedArray } from "../../utils/shared";
import type { ProjectorManager } from "./ProjectorManager";

export type ProjectorImageSource = TexImageSource | WebGLTexture;
export type ProjectorSourceKind = "image" | "video" | "texture";
export type ProjectorRenderMode = "color" | "light";
export type ProjectorColor = NumberArray3 | NumberArray4 | TypedArray | string;
export const PROJECTOR_RENDER_MODE_COLOR = 0;
export const PROJECTOR_RENDER_MODE_LIGHT = 1;

export interface IProjectorParams {
    enabled?: boolean;
    depthCamera: DepthCamera;
    /**
     * Solid color, or the tint and opacity multiplier applied on top of image/video/texture.
     */
    color?: ProjectorColor;
    renderMode?: ProjectorRenderMode;
    priority?: number;
    /**
     * Image, canvas, ImageBitmap or VideoFrame to project. A canvas is re-uploaded every frame;
     * other images once, or again when assigned to {@link Projector.imageSource} once more.
     */
    image?: TexImageSource;
    /**
     * Video element to project, uploaded on every new video frame.
     */
    video?: HTMLVideoElement;
    /**
     * Ready WebGL texture to project. It is sampled as is and never deleted by the projector manager.
     */
    texture?: WebGLTexture;
}

const SOURCE_PARAMS = ["image", "video", "texture"] as const;

export class Projector {
    protected static __staticCounter__ = 0;

    public readonly id: number;
    public depthCamera: DepthCamera;
    public color: Float32Array;
    protected _enabled: boolean;
    protected _renderMode: number;
    protected _priority: number;
    protected _imageSource: ProjectorImageSource | null = null;

    /**
     * Layer index in the manager-owned depth array texture. -1 if not yet added.
     */
    public _slot: number = -1;

    /**
     * Index in the manager source table. -1 when the projector renders a solid color.
     */
    public _sourceIndex: number = -1;

    /**
     * Manager that owns this projector. Set in ProjectorManager.add(), cleared on remove().
     */
    public _manager: ProjectorManager | null = null;

    constructor(params: IProjectorParams) {
        this.id = Projector.__staticCounter__++;
        this._enabled = params.enabled ?? true;
        this.depthCamera = params.depthCamera;
        this.color = Projector._resolveColor(params.color);
        this._renderMode = Projector._resolveRenderMode(params.renderMode);
        this._priority = params.priority || 0;
        this._imageSource = Projector._resolveImageSource(params);
    }

    public get enabled(): boolean {
        return this._enabled;
    }

    public set enabled(enabled: boolean) {
        if (this._enabled === enabled) return;

        this._enabled = enabled;
        this._manager?.update(this);
    }

    public get renderMode(): number {
        return this._renderMode;
    }

    public set renderMode(renderMode: ProjectorRenderMode | number) {
        const value = Projector._resolveRenderMode(renderMode);

        if (this._renderMode === value) return;

        this._renderMode = value;
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

    protected static _resolveRenderMode(renderMode?: ProjectorRenderMode | number): number {
        if (typeof renderMode === "number") return renderMode;

        return renderMode === "light" ? PROJECTOR_RENDER_MODE_LIGHT : PROJECTOR_RENDER_MODE_COLOR;
    }

    /**
     * The last of image/video/texture declared in params is the active source.
     */
    protected static _resolveImageSource(params: IProjectorParams): ProjectorImageSource | null {
        let source: ProjectorImageSource | null = null;
        const keys = Object.keys(params);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i] as (typeof SOURCE_PARAMS)[number];
            if (SOURCE_PARAMS.includes(key) && params[key]) {
                source = params[key]!;
            }
        }
        return source;
    }

    public static getSourceKind(source: ProjectorImageSource): ProjectorSourceKind {
        if (typeof HTMLVideoElement !== "undefined" && source instanceof HTMLVideoElement) return "video";
        if (typeof WebGLTexture !== "undefined" && source instanceof WebGLTexture) return "texture";
        return "image";
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
     * Image, video or texture projected onto the terrain, or null when the projector
     * only uses a solid {@link Projector.color}.
     */
    public get imageSource(): ProjectorImageSource | null {
        return this._imageSource;
    }

    /**
     * Sets (or clears, when null) the projected source. Assigning the current source again
     * re-uploads it on the next frame, e.g. after drawing on a canvas or for a new VideoFrame.
     */
    public set imageSource(source: ProjectorImageSource | null) {
        this._imageSource = source || null;
        this._manager?._setSource(this);
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
