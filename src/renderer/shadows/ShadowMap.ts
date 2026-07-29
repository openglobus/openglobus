import type { DepthCamera } from "../../control/depthCamera/DepthCamera";
import type { ShadowManager } from "./ShadowManager";

export interface IShadowMapParams {
    enabled?: boolean;
    depthCamera: DepthCamera;
}

export class ShadowMap {
    protected static __staticCounter__ = 0;

    public readonly id: number;
    public depthCamera: DepthCamera;
    protected _enabled: boolean;

    public _slot: number = -1;
    public _manager: ShadowManager | null = null;

    constructor(params: IShadowMapParams) {
        this.id = ShadowMap.__staticCounter__++;
        this._enabled = params.enabled ?? true;
        this.depthCamera = params.depthCamera;
        this.depthCamera.shadowMap = this;
    }

    public get enabled(): boolean {
        return this._enabled;
    }

    public set enabled(enabled: boolean) {
        if (this._enabled === enabled) return;

        this._enabled = enabled;
        this._manager?.update(this);
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

    public blur(): void {
        this._manager?.blurShadowMap(this);
    }
}
