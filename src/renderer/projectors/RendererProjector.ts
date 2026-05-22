import type { Camera } from "../../camera/Camera";
import type { NumberArray3 } from "../../math/Vec3";
import type { Framebuffer } from "../../webgl/Framebuffer";
import type { ProjectorManager } from "./ProjectorManager";

export type ProjectorMode = "light" | "decal";

export interface IRendererProjectorParams {
    enabled: boolean;
    camera: Camera;
    framebuffer: Framebuffer; // Framebuffer that renders the depth map for this projector.
    color: NumberArray3;
    intensity: number;
    opacity: number;
    bias: number;
    normalBias: number;
    depthEpsilon?: number;
    mode: ProjectorMode;
    priority: number;
}

export class RendererProjector {
    protected static __staticCounter__ = 0;

    public readonly id: number;
    public enabled: boolean;
    public camera: Camera;
    public framebuffer: Framebuffer;
    public color: NumberArray3;
    public intensity: number;
    public opacity: number;
    public bias: number;
    public normalBias: number;
    public depthEpsilon: number;
    public mode: ProjectorMode;
    public priority: number;

    /**
     * Layer index in the manager-owned depth array texture. -1 if not yet added.
     */
    public _slot: number = -1;

    /**
     * Manager that owns this projector. Set in ProjectorManager.add(), cleared on remove().
     */
    public _manager: ProjectorManager | null = null;

    constructor(params: IRendererProjectorParams) {
        this.id = RendererProjector.__staticCounter__++;
        this.enabled = params.enabled;
        this.camera = params.camera;
        this.framebuffer = params.framebuffer;
        this.color = [params.color[0], params.color[1], params.color[2]];
        this.intensity = params.intensity;
        this.opacity = params.opacity;
        this.bias = params.bias;
        this.normalBias = params.normalBias;
        this.depthEpsilon = params.depthEpsilon ?? 0.001;
        this.mode = params.mode;
        this.priority = params.priority;
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
        return this.framebuffer.textures[0] || null;
    }
}
