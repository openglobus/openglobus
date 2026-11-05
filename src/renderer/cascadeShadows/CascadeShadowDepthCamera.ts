import { Camera, type ICameraParams } from "../../camera/Camera";
import { PlanetCamera } from "../../camera/PlanetCamera";
import { DepthCamera } from "../depthCamera/DepthCamera";
import type { Planet } from "../../scene/Planet";
import { Framebuffer } from "../../webgl";
import type { Renderer } from "../Renderer";
import type { CascadeShadowMap } from "./CascadeShadowMap";

/**
 * Depth camera of a cascade shadow map: one orthographic camera, a frustum per cascade. The planet collects
 * the nodes for all the cascades in one traversal, and every cascade is drawn into its own layer of the
 * cascade shadow map depth texture array.
 */
export class CascadeShadowDepthCamera extends DepthCamera {
    public readonly cascadeShadowMap: CascadeShadowMap;

    constructor(cascadeShadowMap: CascadeShadowMap) {
        super({
            width: cascadeShadowMap.size,
            height: cascadeShadowMap.size,
            verticalViewAngle: cascadeShadowMap.verticalViewAngle,
            isOrthographic: true,
            focusDistance: cascadeShadowMap.maxDistance,
            excludeLayers: cascadeShadowMap.excludeLayers,
            showFrustum: false,
            showFootprint: false
        });

        this.cascadeShadowMap = cascadeShadowMap;
    }

    /**
     * Fits the cascades to the main camera and the light, before the planets collect the nodes.
     */
    public override prepareFrame(): void {
        const cascades = this.cascadeShadowMap.cascades;

        let mask = 0;
        for (let i = 0; i < cascades.length; i++) {
            if (cascades[i].enabled) {
                mask |= 1 << i;
            }
        }
        this.frustumMask = mask;

        this.cascadeShadowMap._fitDepthCamera();
    }

    public override frame(): void {
        const csm = this.cascadeShadowMap;
        const depthArrayTexture = csm.depthArrayTexture;

        if (!this.enabled || !this._initialized || !this._renderer || !depthArrayTexture) return;

        const framebuffer = this.framebuffer;
        const gl = framebuffer.handler.gl!;
        const camera = this.camera;
        const cascades = csm.cascades;

        this._renderer.applyDepthForCamera(camera);

        framebuffer.activate();

        for (let i = 0; i < cascades.length; i++) {
            if (!cascades[i].enabled) continue;

            framebuffer.bindOutputTextureLayer(depthArrayTexture, i);
            camera.setCurrentFrustum(i);

            // 0 is an empty texel, it reads as lit.
            gl.clearColor(0.0, 0.0, 0.0, 0.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.disable(gl.BLEND);

            this._scenesPass(camera);

            gl.enable(gl.BLEND);
        }

        framebuffer.deactivate();

        this._renderer.applyDepthForCamera(this._renderer.activeCamera);
    }

    protected override _createCamera(planet: Planet | null): Camera {
        const csm = this.cascadeShadowMap;
        const frustums: [number, number][] = [];

        for (let i = 0; i < csm.cascades.length; i++) {
            frustums.push([csm.cascades[i].splitNear, csm.cascades[i].splitFar]);
        }

        const params: ICameraParams = {
            frustums,
            width: this.width,
            height: this.height,
            viewAngle: this.verticalViewAngle,
            isOrthographic: true,
            focusDistance: csm.maxDistance,
            reverseDepth: false
        };

        return planet
            ? new PlanetCamera(planet, {
                  ...params,
                  maxAltitude: Math.max(csm.maxDistance * 4.0, planet.ellipsoid.getEquatorialSize() * 8.0)
              })
            : new Camera(params);
    }

    protected override _createFramebuffer(renderer: Renderer): Framebuffer {
        return new Framebuffer(renderer.handler, {
            width: this.width,
            height: this.height,
            depthComponent: "DEPTH_COMPONENT32F",
            targets: [
                {
                    internalFormat: "R32F",
                    attachment: "COLOR_ATTACHMENT"
                }
            ],
            useDepth: true
        });
    }
}
