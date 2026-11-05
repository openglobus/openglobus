import { Sphere } from "../../bv/Sphere";
import type { Camera } from "../../camera/Camera";
import type { Vector } from "../../layer/Vector";
import { RADIANS_HALF } from "../../math";
import { Vec3 } from "../../math/Vec3";
import type { Renderer } from "../../renderer/Renderer";
import type { Framebuffer } from "../../webgl";
import type { CascadeShadowManager } from "./CascadeShadowManager";
import { CascadeShadowDepthCamera } from "./CascadeShadowDepthCamera";

const DEFAULT_CASCADE_SHADOW_SIZE = 1024;
const DEFAULT_CASCADE_COUNT = 4;
const DEFAULT_CASCADE_MAX_DISTANCE = 10000000;
const DEFAULT_CASCADE_SPLIT_LAMBDA = 0.65;
const DEFAULT_VERTICAL_VIEW_ANGLE = 45;
const DEFAULT_CASCADE_BIAS = 0;
const DEFAULT_CASCADE_NORMAL_BIAS = 0;
const DEFAULT_CASCADE_ORTHOGRAPHIC_MARGIN_FACTOR = 0.02;
const DEFAULT_CASCADE_CASTER_MARGIN = 0.0;
const DEFAULT_CASCADE_CASTER_MARGIN_FACTOR = 0.25;
const MIN_CASCADE_SPLIT_DISTANCE = 1e-6;
const MIN_CASCADE_LIGHT_DISTANCE = 1e-3;
const MIN_CASCADE_LIGHT_SIZE = 1e-3;

/**
 * Cascade shadow map split configuration.
 * @property enabled - Enables the cascade.
 * @property splitNear - Near split distance.
 * @property splitFar - Far split distance.
 * @property depthBiasWorld - Occlusion bias in meters, 0 by default.
 * @property normalBias - Surface normal offset in RTC/world units, 0 by default.
 */
export interface CascadeParams {
    enabled: boolean;
    splitNear: number;
    splitFar: number;
    depthBiasWorld: number;
    normalBias: number;
}

/**
 * Cascade shadow map configuration options.
 * @property enabled - Enables cascade shadow rendering.
 * @property size - Shadow map texture size in pixels.
 * @property cascadeCount - Number of generated cascade splits when cascades is not provided.
 * @property maxDistance - Maximum camera distance covered by all cascade splits.
 * @property splitLambda - Blend factor between uniform and logarithmic split distribution.
 * @property verticalViewAngle - Vertical view angle for the orthographic cascade camera.
 * @property casterMargin - Minimum light-space depth margin for shadow casters in world units.
 * @property excludeLayers - Vector layers excluded from cascade shadow rendering.
 * @property cascades - Per-cascade parameter overrides. When provided, its length defines cascade count.
 */
export interface ICascadeShadowMapParams {
    enabled?: boolean;
    size?: number;
    cascadeCount?: number;
    maxDistance?: number;
    splitLambda?: number;
    verticalViewAngle?: number;
    casterMargin?: number;
    excludeLayers?: Vector[];
    cascades?: Partial<CascadeParams>[];
}

export class CascadeShadowMap {
    protected static __counter__ = 0;

    public readonly id: number;
    public readonly size: number;
    public readonly maxDistance: number;
    public readonly splitLambda: number;
    public readonly verticalViewAngle: number;
    public readonly casterMargin: number;
    public readonly excludeLayers: Vector[];
    public readonly cascades: CascadeParams[];
    public readonly depthCamera: CascadeShadowDepthCamera;

    public _manager: CascadeShadowManager | null;

    protected _renderer: Renderer | null;
    protected _initialized: boolean;
    protected _enabled: boolean;
    protected _depthArrayTexture: WebGLTexture | null;
    protected _cascadeBoundingSpheres: Sphere[];
    protected _depthCameraBoundingSphere: Sphere;

    constructor(params: ICascadeShadowMapParams = {}) {
        this.id = CascadeShadowMap.__counter__++;

        this._enabled = params.enabled ?? true;

        this.size = params.size || DEFAULT_CASCADE_SHADOW_SIZE;

        const cascadeCount =
            params.cascades && params.cascades.length > 0
                ? params.cascades.length
                : params.cascadeCount || DEFAULT_CASCADE_COUNT;

        this.maxDistance = params.maxDistance || DEFAULT_CASCADE_MAX_DISTANCE;
        this.splitLambda = Math.max(0.0, Math.min(params.splitLambda ?? DEFAULT_CASCADE_SPLIT_LAMBDA, 1.0));
        this.verticalViewAngle = params.verticalViewAngle || DEFAULT_VERTICAL_VIEW_ANGLE;
        this.casterMargin = params.casterMargin ?? DEFAULT_CASCADE_CASTER_MARGIN;
        this.excludeLayers = params.excludeLayers ? [...params.excludeLayers] : [];
        this.cascades = this._createCascadeParams(params, cascadeCount);

        this._cascadeBoundingSpheres = this._createCascadeBoundingSpheres();
        this._depthCameraBoundingSphere = new Sphere();

        this._manager = null;
        this._renderer = null;
        this._initialized = false;
        this._depthArrayTexture = null;

        this.depthCamera = new CascadeShadowDepthCamera(this);
        this.depthCamera.enabled = this._enabled;
    }

    public get initialized(): boolean {
        return this._initialized;
    }

    public get enabled(): boolean {
        return this._enabled;
    }

    public set enabled(enabled: boolean) {
        if (this._enabled === enabled) return;

        this._enabled = enabled;
        this.depthCamera.enabled = enabled;
        this._manager?.update(this);
    }

    public get depthArrayTexture(): WebGLTexture | null {
        return this._depthArrayTexture;
    }

    public get camera(): Camera {
        return this.depthCamera.camera;
    }

    public get framebuffer(): Framebuffer | null {
        return this.depthCamera.initialized ? this.depthCamera.framebuffer : null;
    }

    public init(renderer: Renderer): void {
        if (this._initialized) return;

        this._renderer = renderer;
        renderer.depthCameraHandler.add(this.depthCamera);

        this._depthArrayTexture = this._createDepthArrayTexture(renderer);
        this._validateFramebufferLayers();

        this._initialized = true;
    }

    public destroy(): void {
        if (!this._initialized) return;

        const renderer = this._renderer!;
        const gl = renderer.handler.gl;
        const framebuffer = this.framebuffer;

        if (this._depthArrayTexture && framebuffer?._fbo) {
            framebuffer.activate();
            framebuffer.bindOutputTextureLayer(null, 0);
            framebuffer.deactivate();
        }

        renderer.depthCameraHandler.remove(this.depthCamera);

        if (gl && this._depthArrayTexture) {
            gl.deleteTexture(this._depthArrayTexture);
        }

        this._depthArrayTexture = null;
        this._renderer = null;
        this._initialized = false;
    }

    public _fitDepthCamera(): void {
        this._updateCascadeBounds();
        this._updateDepthCamera();
    }

    protected _createCascadeParams(params: ICascadeShadowMapParams, cascadeCount: number): CascadeParams[] {
        const cascades: CascadeParams[] = [];
        const splitDistributionNear =
            params.cascades && params.cascades.length > 0 ? (params.cascades[0].splitNear ?? 1.0) : 1.0;

        for (let i = 0; i < cascadeCount; i++) {
            const splitNear = this._computeCascadeSplitDistance(i, splitDistributionNear, cascadeCount);
            const splitFar = this._computeCascadeSplitDistance(i + 1, splitDistributionNear, cascadeCount);
            const cascade: CascadeParams = {
                enabled: true,
                splitNear,
                splitFar,
                depthBiasWorld: DEFAULT_CASCADE_BIAS,
                normalBias: DEFAULT_CASCADE_NORMAL_BIAS,
                ...params.cascades?.[i]
            };

            cascades.push(cascade);
        }

        return cascades;
    }

    protected _computeCascadeSplitDistance(
        splitIndex: number,
        splitDistributionNear: number,
        cascadeCount: number
    ): number {
        if (splitIndex <= 0) {
            return splitDistributionNear;
        }

        if (splitIndex >= cascadeCount) {
            return this.maxDistance;
        }

        const t = splitIndex / cascadeCount;
        const near = splitDistributionNear;
        const far = this.maxDistance;
        const uniform = near + (far - near) * t;
        const logarithmic = near * Math.pow(far / near, t);
        const distance = uniform * (1.0 - this.splitLambda) + logarithmic * this.splitLambda;

        return Math.max(0.0, Math.min(distance, this.maxDistance));
    }

    protected _createCascadeBoundingSpheres(): Sphere[] {
        const spheres: Sphere[] = [];

        for (let i = 0; i < this.cascades.length; i++) {
            spheres.push(new Sphere());
        }

        return spheres;
    }

    protected _createDepthArrayTexture(renderer: Renderer): WebGLTexture | null {
        return renderer.handler.createEmptyTexture2DArrayExt(
            this.size,
            this.size,
            this.cascades.length,
            renderer.handler.floatTextureFilter,
            "R32F",
            "CLAMP_TO_EDGE",
            1
        );
    }

    protected _validateFramebufferLayers(): void {
        const framebuffer = this.framebuffer;
        if (!framebuffer) {
            return;
        }

        const gl = framebuffer.handler.gl;

        if (!gl || !this._depthArrayTexture || !framebuffer._fbo) {
            return;
        }

        framebuffer.activate();
        for (let i = 0; i < this.cascades.length; i++) {
            framebuffer.bindOutputTextureLayer(this._depthArrayTexture, i);
            if (
                !framebuffer.validateComplete(`CascadeShadowMap._validateFramebufferLayers(): framebuffer incomplete
                (layer=${i}). Check float color-buffer support for R32F.`)
            ) {
                break;
            }
        }
        framebuffer.deactivate();
    }

    protected _updateCascadeBounds(): void {
        for (let i = 0; i < this.cascades.length; i++) {
            this._computeCascadeBoundingSphere(this.cascades[i], this._cascadeBoundingSpheres[i]);
        }
    }

    protected _updateDepthCamera(): void {
        const camera = this.depthCamera.camera;
        const maxCascadeRadius = this._computeDepthCameraBoundingSphere(this._depthCameraBoundingSphere);
        if (maxCascadeRadius < 0.0) {
            camera.update();
            return;
        }

        const lightPosition = this._renderer!._lightPosition;
        const lightLenSq =
            lightPosition[0] * lightPosition[0] +
            lightPosition[1] * lightPosition[1] +
            lightPosition[2] * lightPosition[2];

        let lightDirection: Vec3;
        if (lightLenSq > 0.0) {
            const lightLen = 1.0 / Math.sqrt(lightLenSq);
            lightDirection = new Vec3(
                lightPosition[0] * lightLen,
                lightPosition[1] * lightLen,
                lightPosition[2] * lightLen
            );
        } else {
            lightDirection = new Vec3(1.0, 1.0, 1.0).normalize();
        }

        const bounds = this._depthCameraBoundingSphere;
        const maxCasterMargin = Math.max(maxCascadeRadius * DEFAULT_CASCADE_CASTER_MARGIN_FACTOR, this.casterMargin);
        const lightDistance = bounds.radius + maxCascadeRadius + maxCasterMargin + MIN_CASCADE_LIGHT_DISTANCE;
        const target = bounds.center;
        const eye = target.add(lightDirection.scaleTo(lightDistance));
        const up = this._getDepthCameraUp(lightDirection);

        camera.set(eye, target, up);

        for (let i = 0; i < this.cascades.length; i++) {
            const sphere = this._cascadeBoundingSpheres[i];
            const radius = Math.max(sphere.radius, MIN_CASCADE_LIGHT_SIZE);
            const xyMargin = Math.max(radius * DEFAULT_CASCADE_ORTHOGRAPHIC_MARGIN_FACTOR, MIN_CASCADE_LIGHT_SIZE);
            const zMargin = Math.max(
                radius * DEFAULT_CASCADE_CASTER_MARGIN_FACTOR,
                this.casterMargin,
                MIN_CASCADE_LIGHT_SIZE
            );
            const halfSize = radius + xyMargin;
            const rel = sphere.center.sub(camera.eye);
            const centerDistance = -rel.dot(camera._b);
            const near = Math.max(MIN_CASCADE_SPLIT_DISTANCE, centerDistance - radius - zMargin);
            const far = Math.max(near + MIN_CASCADE_LIGHT_DISTANCE, centerDistance + radius + zMargin);

            const texel = (2.0 * halfSize) / this.size;
            const eyeX = camera.eye.dot(camera._r);
            const eyeY = camera.eye.dot(camera._u);
            const centerX = Math.floor((eyeX + rel.dot(camera._r)) / texel) * texel - eyeX;
            const centerY = Math.floor((eyeY + rel.dot(camera._u)) / texel) * texel - eyeY;

            camera.frustums[i].setOrthoProjection(
                centerX - halfSize,
                centerX + halfSize,
                centerY - halfSize,
                centerY + halfSize,
                near,
                far
            );
        }

        camera.update();
    }

    protected _computeDepthCameraBoundingSphere(outSphere: Sphere): number {
        let hasBounds = false;
        let maxRadius = 0.0;

        for (let i = 0; i < this.cascades.length; i++) {
            const cascade = this.cascades[i];
            if (!cascade.enabled) {
                continue;
            }

            const sphere = this._cascadeBoundingSpheres[i];
            maxRadius = Math.max(maxRadius, sphere.radius);

            if (!hasBounds) {
                outSphere.center.copy(sphere.center);
                outSphere.radius = sphere.radius;
                hasBounds = true;
            } else {
                this._extendSphereBySphere(outSphere, sphere);
            }
        }

        return hasBounds ? maxRadius : -1.0;
    }

    protected _extendSphereBySphere(outSphere: Sphere, sphere: Sphere): void {
        const dx = sphere.center.x - outSphere.center.x;
        const dy = sphere.center.y - outSphere.center.y;
        const dz = sphere.center.z - outSphere.center.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const radius = sphere.radius;

        if (distSq <= 0.0) {
            outSphere.radius = Math.max(outSphere.radius, radius);
            return;
        }

        const dist = Math.sqrt(distSq);

        if (outSphere.radius >= dist + radius) {
            return;
        }

        if (radius >= dist + outSphere.radius) {
            outSphere.center.copy(sphere.center);
            outSphere.radius = radius;
            return;
        }

        const newRadius = 0.5 * (dist + outSphere.radius + radius);
        const centerOffset = (newRadius - outSphere.radius) / dist;

        outSphere.center.x += dx * centerOffset;
        outSphere.center.y += dy * centerOffset;
        outSphere.center.z += dz * centerOffset;
        outSphere.radius = newRadius;
    }

    protected _getDepthCameraUp(lightDirection: Vec3): Vec3 {
        const candidates = [Vec3.NORTH, Vec3.UNIT_Y, Vec3.UNIT_X];

        for (let i = 0; i < candidates.length; i++) {
            const projected = candidates[i].sub(lightDirection.scaleTo(candidates[i].dot(lightDirection)));
            if (projected.length2() > 1e-4) {
                return projected.normalize();
            }
        }

        return Vec3.UNIT_Y;
    }

    /**
     * Computes a minimum bounding sphere for the main camera perspective frustum slice.
     * Cascade split distances are linear distances from the main camera eye.
     */
    protected _computeCascadeBoundingSphere(cascade: CascadeParams, outSphere: Sphere): void {
        const mainCamera = this._renderer!.activeCamera;
        const eye = mainCamera.eye;
        const direction = mainCamera._f;
        const mainNear = mainCamera.frustums[0].near || MIN_CASCADE_SPLIT_DISTANCE;
        const dMin = Math.max(cascade.splitNear, mainNear, MIN_CASCADE_SPLIT_DISTANCE);
        const dMax = cascade.splitFar;

        const dirLenSq = direction.x * direction.x + direction.y * direction.y + direction.z * direction.z;

        const invDirLen = 1.0 / Math.sqrt(dirLenSq);
        const dirX = direction.x * invDirLen;
        const dirY = direction.y * invDirLen;
        const dirZ = direction.z * invDirLen;

        const halfHeightAtNear = dMin * Math.tan(mainCamera.viewAngle * RADIANS_HALF);
        const halfWidthAtNear = halfHeightAtNear * mainCamera.getAspectRatio();
        const invDMin = 1.0 / dMin;
        const r = halfWidthAtNear * invDMin;
        const u = halfHeightAtNear * invDMin;
        const slopeSq = r * r + u * u;

        let sphereCenterDistance = 0.5 * (dMin + dMax) * (1.0 + slopeSq);
        let radius: number;

        if (sphereCenterDistance >= dMax) {
            sphereCenterDistance = dMax;
            radius = dMax * Math.sqrt(slopeSq);
        } else {
            const diff = 1.0 - sphereCenterDistance / dMax;
            radius = dMax * Math.sqrt(diff * diff + slopeSq);
        }

        outSphere.center.set(
            eye.x + sphereCenterDistance * dirX,
            eye.y + sphereCenterDistance * dirY,
            eye.z + sphereCenterDistance * dirZ
        );
        outSphere.radius = radius;
    }
}
