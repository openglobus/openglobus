import { Sphere } from "../../bv/Sphere";
import { Camera } from "../../camera/Camera";
import { PlanetCamera } from "../../camera/PlanetCamera";
import { Vector } from "../../layer/Vector";
import { RADIANS_HALF } from "../../math";
import { Vec3 } from "../../math/Vec3";
import { QuadTreeStrategy } from "../../quadTree";
import type { Node } from "../../quadTree/Node";
import type { Renderer } from "../../renderer/Renderer";
import type { Planet } from "../../scene/Planet";
import type { Segment } from "../../segment/Segment";
import { Framebuffer } from "../../webgl";
import type { CascadeShadowManager } from "./CascadeShadowManager";

const DEFAULT_CASCADE_SHADOW_SIZE = 1024;
const DEFAULT_CASCADE_COUNT = 4;
const DEFAULT_CASCADE_MAX_DISTANCE = 1000;
const DEFAULT_CASCADE_SPLIT_LAMBDA = 0.65;
const DEFAULT_VERTICAL_VIEW_ANGLE = 45;
const DEFAULT_CASCADE_BIAS = 10000;
const DEFAULT_CASCADE_NORMAL_BIAS = 100;
const DEFAULT_CASCADE_DEPTH_EPSILON = 10000;
const DEFAULT_CASCADE_ORTHOGRAPHIC_MARGIN_FACTOR = 0.02;
const DEFAULT_CASCADE_CASTER_MARGIN = 0.0;
const DEFAULT_CASCADE_CASTER_CLEARANCE = 1000.0;
const DEFAULT_CASCADE_BIAS_TEXELS = 1.0;
const DEFAULT_CASCADE_DEPTH_EPSILON_TEXELS = 1.0;
const DEFAULT_CASCADE_NORMAL_BIAS_TEXELS = 1.5;
const DEFAULT_CASCADE_CASTER_MARGIN_FACTOR = 0.25;
const RENDER_SKIRTS_SLOPE = 0.3;
const MIN_CASCADE_SPLIT_DISTANCE = 1e-6;
const MIN_CASCADE_LIGHT_DISTANCE = 1e-3;
const MIN_CASCADE_LIGHT_SIZE = 1e-3;

/**
 * Cascade shadow map split configuration.
 * @property enabled - Enables the cascade.
 * @property splitNear - Near split distance.
 * @property splitFar - Far split distance.
 * @property bias - Shadow depth bias. Converted to normalized depth by CascadeShadowManager.
 * @property normalBias - Surface normal offset in RTC/world units.
 * @property depthEpsilon - Shadow depth transition width. Converted to normalized depth by CascadeShadowManager.
 */
export interface CascadeParams {
    enabled: boolean;
    splitNear: number;
    splitFar: number;
    bias: number;
    normalBias: number;
    depthEpsilon: number;
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
    casterClearance?: number;
    biasTexels?: number;
    depthEpsilonTexels?: number;
    normalBiasTexels?: number;
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
    /**
     * Absolute light-space depth kept in front of every cascade, in world units. Deliberately
     * independent of the fitted size: it buys caster coverage at no cost to shadow resolution,
     * because moving an orthographic camera along its own forward leaves its bounds untouched.
     */
    public readonly casterClearance: number;

    /**
     * Depth biases of every cascade, in shadow texels of that cascade. Driven per frame from the
     * fitted extent, since the same value in world units is harmless on a coarse cascade and ruins
     * a fine one.
     */
    public readonly biasTexels: number;
    public readonly depthEpsilonTexels: number;
    public readonly normalBiasTexels: number;
    public readonly excludeLayers: Vector[];

    public depthCamera: Camera;
    public framebuffer: Framebuffer | null;
    public quadTreeStrategy: QuadTreeStrategy | null;
    public readonly cascades: CascadeParams[];

    public _manager: CascadeShadowManager | null;

    protected _planet: Planet | null;
    protected _renderer: Renderer | null;
    protected _initialized: boolean;
    protected _enabled: boolean;
    protected _automaticSplits: boolean;
    protected _depthArrayTexture: WebGLTexture | null;
    protected _lastPlanetHeightFactor: number;
    protected _cascadeBoundingSpheres: Sphere[];
    protected _cascadeCorners: Vec3[][];
    protected _depthCameraBoundingSphere: Sphere;

    constructor(params: ICascadeShadowMapParams = {}) {
        this.id = CascadeShadowMap.__counter__++;

        this._enabled = params.enabled ?? true;
        this._automaticSplits = !params.cascades || params.cascades.length === 0;

        this.size = params.size || DEFAULT_CASCADE_SHADOW_SIZE;

        const cascadeCount =
            params.cascades && params.cascades.length > 0
                ? params.cascades.length
                : params.cascadeCount || DEFAULT_CASCADE_COUNT;

        this.maxDistance = Math.max(params.maxDistance ?? DEFAULT_CASCADE_MAX_DISTANCE, MIN_CASCADE_LIGHT_DISTANCE);
        this.splitLambda = Math.max(0.0, Math.min(params.splitLambda ?? DEFAULT_CASCADE_SPLIT_LAMBDA, 1.0));
        this.verticalViewAngle = params.verticalViewAngle || DEFAULT_VERTICAL_VIEW_ANGLE;
        this.casterMargin = params.casterMargin ?? DEFAULT_CASCADE_CASTER_MARGIN;
        this.casterClearance = params.casterClearance ?? DEFAULT_CASCADE_CASTER_CLEARANCE;
        this.biasTexels = params.biasTexels ?? DEFAULT_CASCADE_BIAS_TEXELS;
        this.depthEpsilonTexels = params.depthEpsilonTexels ?? DEFAULT_CASCADE_DEPTH_EPSILON_TEXELS;
        this.normalBiasTexels = params.normalBiasTexels ?? DEFAULT_CASCADE_NORMAL_BIAS_TEXELS;
        this.excludeLayers = params.excludeLayers ? [...params.excludeLayers] : [];
        this.cascades = this._createCascadeParams(params, cascadeCount);
        this.depthCamera = this._createDepthCamera();
        this.framebuffer = null;

        this._cascadeBoundingSpheres = this._createCascadeBoundingSpheres();
        this._cascadeCorners = this._createCascadeCorners();
        this._depthCameraBoundingSphere = new Sphere();

        this._manager = null;
        this._planet = null;
        this._renderer = null;
        this._initialized = false;
        this._depthArrayTexture = null;
        this._lastPlanetHeightFactor = 1.0;
        this.quadTreeStrategy = null;
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
        this._manager?.update(this);
    }

    public get depthArrayTexture(): WebGLTexture | null {
        return this._depthArrayTexture;
    }

    public init(renderer: Renderer): void {
        if (this._initialized) return;

        this._renderer = renderer;
        this.depthCamera = this._createDepthCamera(this._planet);
        this.framebuffer = this._createFramebuffer(renderer);
        this.framebuffer.init();
        this._depthArrayTexture = this._createDepthArrayTexture(renderer);
        this._validateFramebufferLayers();

        if (this._planet) {
            this._initPlanetSource(this._planet);
        }

        this._initialized = true;
    }

    public bindPlanet(planet: Planet): void {
        if (this._planet === planet && this.quadTreeStrategy) return;

        if (this._planet && this._planet !== planet) {
            this.unbindPlanet();
        }

        this._planet = planet;

        if (this._initialized) {
            this._initPlanetSource(planet);
        }
    }

    public unbindPlanet(): void {
        if (this.quadTreeStrategy) {
            this.quadTreeStrategy.clear();
            this.quadTreeStrategy = null;
        }

        this._planet = null;

        if (this._initialized) {
            this.depthCamera = this._createDepthCamera();
        }
    }

    public destroy(): void {
        if (!this._initialized) return;

        const gl = this._renderer?.handler.gl;

        if (this._depthArrayTexture && this.framebuffer?._fbo) {
            this.framebuffer.activate();
            this.framebuffer.bindOutputTextureLayer(null, 0);
            this.framebuffer.deactivate();
        }

        if (this.quadTreeStrategy) {
            this.quadTreeStrategy.clear();
            this.quadTreeStrategy = null;
        }

        if (this.framebuffer) {
            this.framebuffer.destroy();
            this.framebuffer = null;
        }

        if (gl && this._depthArrayTexture) {
            gl.deleteTexture(this._depthArrayTexture);
        }

        this._depthArrayTexture = null;
        this._planet = null;
        this._renderer = null;
        this._initialized = false;
    }

    public frame(): void {
        if (!this.enabled || !this._initialized) return;

        const r = this._renderer!;

        this._prepareFrame();
        r.applyDepthForCamera(this.depthCamera);

        this._drawFrame();

        r.applyDepthForCamera(r.activeCamera);
        this._finishFrame();
    }

    protected _prepareFrame(): void {
        this._syncPlanetHeightFactor();
        this._updateCascadeBounds();
        this._updateDepthCamera();
    }

    protected _finishFrame(): void {
        // Reserved for debug entities and future frame cleanup.
    }

    protected _createCascadeParams(params: ICascadeShadowMapParams, cascadeCount: number): CascadeParams[] {
        const cascades: CascadeParams[] = [];
        const requestedNear =
            params.cascades && params.cascades.length > 0 ? (params.cascades[0].splitNear ?? 1.0) : 1.0;
        const splitDistributionNear = Math.min(
            Math.max(requestedNear, MIN_CASCADE_SPLIT_DISTANCE),
            this.maxDistance
        );

        for (let i = 0; i < cascadeCount; i++) {
            const splitNear = this._computeCascadeSplitDistance(i, splitDistributionNear, cascadeCount);
            const splitFar = this._computeCascadeSplitDistance(i + 1, splitDistributionNear, cascadeCount);
            const cascade: CascadeParams = {
                enabled: true,
                splitNear,
                splitFar,
                bias: DEFAULT_CASCADE_BIAS,
                normalBias: DEFAULT_CASCADE_NORMAL_BIAS,
                depthEpsilon: DEFAULT_CASCADE_DEPTH_EPSILON,
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

    protected _createCascadeCorners(): Vec3[][] {
        const corners: Vec3[][] = [];

        for (let i = 0; i < this.cascades.length; i++) {
            corners.push(Array.from({ length: 8 }, () => new Vec3()));
        }

        return corners;
    }

    protected _createDepthCamera(planet?: Planet | null): Camera {
        const frustums: [number, number][] = [];

        for (let i = 0; i < this.cascades.length; i++) {
            const cascade = this.cascades[i];
            frustums.push([cascade.splitNear, cascade.splitFar]);
        }

        const params = {
            frustums,
            width: this.size,
            height: this.size,
            viewAngle: this.verticalViewAngle,
            isOrthographic: true,
            focusDistance: this.maxDistance,
            maxAltitude: planet
                ? Math.max(this.maxDistance * 4.0, planet.ellipsoid.getEquatorialSize() * 8.0)
                : undefined,
            reverseDepth: false
        };

        return planet ? new PlanetCamera(planet, params) : new Camera(params);
    }

    protected _createFramebuffer(renderer: Renderer): Framebuffer {
        return new Framebuffer(renderer.handler, {
            width: this.size,
            height: this.size,
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

    protected _createDepthArrayTexture(renderer: Renderer): WebGLTexture | null {
        return renderer.handler.createEmptyTexture2DArrayExt(
            this.size,
            this.size,
            this.cascades.length,
            "LINEAR",
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

    protected _createQuadTreeStrategy(planet: Planet, camera: PlanetCamera): QuadTreeStrategy {
        const quadTreeStrategy = new planet.quadTreeStrategyPrototype({
            planet,
            maxEqualZoomAltitude: planet.quadTreeStrategy.maxEqualZoomAltitude,
            minEqualZoomAltitude: planet.quadTreeStrategy.minEqualZoomAltitude,
            minEqualZoomCameraSlope: planet.quadTreeStrategy.minEqualZoomCameraSlope,
            transitionOpacityEnabled: false
        });

        quadTreeStrategy.init(camera);
        quadTreeStrategy.lodCamera = planet.camera;
        quadTreeStrategy.preRender();
        quadTreeStrategy.clearRenderedNodes();
        quadTreeStrategy.preLoad();

        return quadTreeStrategy;
    }

    protected _initPlanetSource(planet: Planet): void {
        if (!(this.depthCamera instanceof PlanetCamera) || this.depthCamera.planet !== planet) {
            this.depthCamera = this._createDepthCamera(planet);
        }

        this.quadTreeStrategy = this._createQuadTreeStrategy(planet, this.depthCamera as PlanetCamera);
        this._lastPlanetHeightFactor = planet._heightFactor;
    }

    protected _syncPlanetHeightFactor(): void {
        if (!this._planet || this._lastPlanetHeightFactor === this._planet._heightFactor) {
            return;
        }

        this._lastPlanetHeightFactor = this._planet._heightFactor;

        if (this.quadTreeStrategy) {
            this.quadTreeStrategy.destroyBranches();
            this.quadTreeStrategy.clearRenderedNodes();
        }
    }

    protected _updateCascadeBounds(): void {
        this._updateCascadeSplits();

        for (let i = 0; i < this.cascades.length; i++) {
            this._computeFrustumSliceBounds(
                this.cascades[i],
                this._cascadeBoundingSpheres[i],
                this._cascadeCorners[i]
            );
        }
    }

    protected _updateCascadeSplits(): void {
        if (!this._automaticSplits) {
            return;
        }

        const cameraNear = this._renderer!.activeCamera.frustums[0].near;
        const splitNear = Math.min(
            Math.max(cameraNear, MIN_CASCADE_SPLIT_DISTANCE),
            this.maxDistance
        );

        for (let i = 0; i < this.cascades.length; i++) {
            this.cascades[i].splitNear = this._computeCascadeSplitDistance(i, splitNear, this.cascades.length);
            this.cascades[i].splitFar = this._computeCascadeSplitDistance(i + 1, splitNear, this.cascades.length);
        }
    }

    protected _updateDepthCamera(): void {
        const maxCascadeRadius = this._computeDepthCameraBoundingSphere(this._depthCameraBoundingSphere);
        if (maxCascadeRadius < 0.0) {
            this.depthCamera.update();
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
        // Caster room may not be derived from the cascade radius alone. Tying it to the fitted size
        // means that the tighter the fit, the less of the world can cast into it, which is backwards:
        // moving an orthographic camera sunward leaves its bounds untouched and costs depth range
        // only. So an absolute distance sets the floor and the radius may only raise it.
        const maxCasterMargin = Math.max(
            maxCascadeRadius * DEFAULT_CASCADE_CASTER_MARGIN_FACTOR,
            this.casterMargin,
            this.casterClearance
        );
        const lightDistance = bounds.radius + maxCascadeRadius + maxCasterMargin + MIN_CASCADE_LIGHT_DISTANCE;
        const target = bounds.center;
        const eye = target.add(lightDirection.scaleTo(lightDistance));
        const up = this._getDepthCameraUp(lightDirection);

        this.depthCamera.set(eye, target, up);

        for (let i = 0; i < this.cascades.length; i++) {
            const corners = this._cascadeCorners[i];
            const cameraEye = this.depthCamera.eye;
            const cameraRight = this.depthCamera._r;
            const cameraUp = this.depthCamera._u;
            const cameraBack = this.depthCamera._b;
            let minX = Number.POSITIVE_INFINITY;
            let maxX = Number.NEGATIVE_INFINITY;
            let minY = Number.POSITIVE_INFINITY;
            let maxY = Number.NEGATIVE_INFINITY;
            let minDepth = Number.POSITIVE_INFINITY;
            let maxDepth = Number.NEGATIVE_INFINITY;

            for (let j = 0; j < corners.length; j++) {
                const corner = corners[j];
                const relX = corner.x - cameraEye.x;
                const relY = corner.y - cameraEye.y;
                const relZ = corner.z - cameraEye.z;
                const x = relX * cameraRight.x + relY * cameraRight.y + relZ * cameraRight.z;
                const y = relX * cameraUp.x + relY * cameraUp.y + relZ * cameraUp.z;
                const depth = -(relX * cameraBack.x + relY * cameraBack.y + relZ * cameraBack.z);

                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
                minDepth = Math.min(minDepth, depth);
                maxDepth = Math.max(maxDepth, depth);
            }

            const width = Math.max(maxX - minX, MIN_CASCADE_LIGHT_SIZE);
            const height = Math.max(maxY - minY, MIN_CASCADE_LIGHT_SIZE);
            const marginX = Math.max(width * DEFAULT_CASCADE_ORTHOGRAPHIC_MARGIN_FACTOR, MIN_CASCADE_LIGHT_SIZE);
            const marginY = Math.max(height * DEFAULT_CASCADE_ORTHOGRAPHIC_MARGIN_FACTOR, MIN_CASCADE_LIGHT_SIZE);
            const halfWidth = width * 0.5 + marginX;
            const halfHeight = height * 0.5 + marginY;
            const texelSizeX = (2.0 * halfWidth) / this.size;
            const texelSizeY = (2.0 * halfHeight) / this.size;
            const eyeX = cameraEye.dot(cameraRight);
            const eyeY = cameraEye.dot(cameraUp);
            const centerX = Math.round(((minX + maxX) * 0.5 + eyeX) / texelSizeX) * texelSizeX - eyeX;
            const centerY = Math.round(((minY + maxY) * 0.5 + eyeY) / texelSizeY) * texelSizeY - eyeY;
            const receiverDepthMargin = Math.max(
                (maxDepth - minDepth) * DEFAULT_CASCADE_ORTHOGRAPHIC_MARGIN_FACTOR,
                MIN_CASCADE_LIGHT_SIZE
            );
            const casterDepthMargin = Math.max(
                (maxDepth - minDepth) * DEFAULT_CASCADE_CASTER_MARGIN_FACTOR,
                this.casterMargin,
                this.casterClearance,
                MIN_CASCADE_LIGHT_SIZE
            );
            const near = Math.max(MIN_CASCADE_SPLIT_DISTANCE, minDepth - casterDepthMargin);
            const far = Math.max(near + MIN_CASCADE_LIGHT_DISTANCE, maxDepth + receiverDepthMargin);

            this.depthCamera.frustums[i].setOrthoProjection(
                centerX - halfWidth,
                centerX + halfWidth,
                centerY - halfHeight,
                centerY + halfHeight,
                near,
                far
            );

            const texelWorldSize = Math.max(texelSizeX, texelSizeY);
            const cascade = this.cascades[i];

            cascade.bias = texelWorldSize * this.biasTexels;
            cascade.depthEpsilon = texelWorldSize * this.depthEpsilonTexels;
            cascade.normalBias = texelWorldSize * this.normalBiasTexels;
        }

        this.depthCamera.update();
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
        const activeCamera = this._renderer!.activeCamera;
        const candidates = [activeCamera.getUp(), activeCamera.getRight(), Vec3.NORTH, Vec3.UNIT_Y, Vec3.UNIT_X];

        for (let i = 0; i < candidates.length; i++) {
            const projected = candidates[i].sub(lightDirection.scaleTo(candidates[i].dot(lightDirection)));
            if (projected.length2() > 1e-12) {
                return projected.normalize();
            }
        }

        return Vec3.UNIT_Y;
    }

    /** Computes the eight view-frustum corners used by the light-space crop matrix. */
    protected _computeFrustumSliceBounds(cascade: CascadeParams, outSphere: Sphere, corners: Vec3[]): void {
        const mainCamera = this._renderer!.activeCamera;
        const eye = mainCamera.eye;
        const direction = mainCamera._f;
        const right = mainCamera._r;
        const up = mainCamera._u;
        const mainNear = mainCamera.frustums[0].near || MIN_CASCADE_SPLIT_DISTANCE;
        const dMin = Math.max(cascade.splitNear, mainNear, MIN_CASCADE_SPLIT_DISTANCE);
        const dMax = Math.max(cascade.splitFar, dMin + MIN_CASCADE_LIGHT_DISTANCE);

        const dirLenSq = direction.x * direction.x + direction.y * direction.y + direction.z * direction.z;
        const invDirLen = 1.0 / Math.sqrt(dirLenSq);
        const dirX = direction.x * invDirLen;
        const dirY = direction.y * invDirLen;
        const dirZ = direction.z * invDirLen;
        const tanHalfFov = Math.tan(mainCamera.viewAngle * RADIANS_HALF);
        const aspect = mainCamera.getAspectRatio();

        for (let plane = 0; plane < 2; plane++) {
            const depth = plane === 0 ? dMin : dMax;
            const halfHeight = depth * tanHalfFov;
            const halfWidth = halfHeight * aspect;
            const centerX = eye.x + dirX * depth;
            const centerY = eye.y + dirY * depth;
            const centerZ = eye.z + dirZ * depth;

            for (let corner = 0; corner < 4; corner++) {
                const xSign = corner & 1 ? 1.0 : -1.0;
                const ySign = corner & 2 ? 1.0 : -1.0;
                corners[plane * 4 + corner].set(
                    centerX + right.x * halfWidth * xSign + up.x * halfHeight * ySign,
                    centerY + right.y * halfWidth * xSign + up.y * halfHeight * ySign,
                    centerZ + right.z * halfWidth * xSign + up.z * halfHeight * ySign
                );
            }
        }

        const slopeSq = tanHalfFov * tanHalfFov * (aspect * aspect + 1.0);
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

    protected _collectRenderNodes(): QuadTreeStrategy | null {
        const planet = this._planet;
        const camera = this.depthCamera;

        if (!planet || !this.quadTreeStrategy || !(camera instanceof PlanetCamera)) {
            return null;
        }

        camera.updateCameraSlope();

        const quadTreeStrategy = this.quadTreeStrategy;
        quadTreeStrategy.maxZoomLimit = planet.quadTreeStrategy.maxCurrZoom;
        quadTreeStrategy.lodCamera = planet.camera;
        quadTreeStrategy.collectRenderNodes(camera);

        return quadTreeStrategy;
    }

    protected _drawFrame(): void {
        const quadTreeStrategy = this._collectRenderNodes();

        for (let i = 0; i < this.cascades.length; i++) {
            const cascade = this.cascades[i];
            if (!cascade.enabled) continue;

            let renderedNodes: Node[] = [];
            let fadingOpaqueSegments: Segment[] = [];

            if (quadTreeStrategy) {
                renderedNodes = quadTreeStrategy._renderedNodesInFrustum[i] || [];
                fadingOpaqueSegments = quadTreeStrategy._fadingOpaqueSegments;
            }

            this.depthCamera.setCurrentFrustum(i);
            this._renderCascade(cascade, i, renderedNodes, fadingOpaqueSegments);
        }
    }

    protected _renderCascade(
        cascade: CascadeParams,
        cascadeIndex: number,
        renderedNodes: Node[],
        fadingOpaqueSegments: Segment[]
    ): void {
        if (!this._depthArrayTexture) return;

        const framebuffer = this.framebuffer;
        if (!framebuffer) return;

        const gl = framebuffer.handler.gl!;

        framebuffer.activate();
        framebuffer.bindOutputTextureLayer(this._depthArrayTexture, cascadeIndex);

        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.BLEND);

        this._segmentsPass(this.depthCamera, renderedNodes, fadingOpaqueSegments);
        this._geoObjectsPass(this.depthCamera);

        gl.enable(gl.BLEND);

        framebuffer.deactivate();
    }

    protected _segmentsPass(camera: Camera, renderedNodes: Node[], fadingOpaqueSegments: Segment[]): void {
        const h = this._renderer!.handler;
        const gl = h.gl!;
        const planet = this._planet;

        if (!planet || !(camera instanceof PlanetCamera)) return;

        const checkSlope = camera.isOrthographic && camera.slope < RENDER_SKIRTS_SLOPE;

        h.programs.cascade_shadow_depth.activate();
        const sh = h.programs.cascade_shadow_depth;
        const shu = sh.uniforms;

        gl.uniformMatrix4fv(shu.viewMatrix, false, camera.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, camera.getProjectionMatrix());

        gl.enable(gl.CULL_FACE);

        const isEq = planet.terrain!.equalizeVertices;
        const baseLayerSlice = planet.visibleTileLayers.length ? [planet.visibleTileLayers[0]] : undefined;
        const renderSkirts = checkSlope;

        let i = renderedNodes.length;
        while (i--) {
            const s = renderedNodes[i].segment;
            if (!s.node) continue;
            if (s._transitionOpacity >= 1) {
                isEq && s.equalize();
                s.readyToEngage && s.engage();
                s.ensureIndexBuffer();
                s.updateRTCEyePosition(camera);
                s.depthRendering(sh, baseLayerSlice, renderSkirts);
            }
        }

        for (let j = 0; j < fadingOpaqueSegments.length; ++j) {
            const s = fadingOpaqueSegments[j];
            if (!s.node) continue;
            isEq && s.equalize();
            s.readyToEngage && s.engage();
            s.ensureIndexBuffer();
            s.updateRTCEyePosition(camera);
            s.depthRendering(sh, baseLayerSlice, renderSkirts);
        }

        gl.enable(gl.CULL_FACE);
    }

    protected _geoObjectsPass(camera: Camera): void {
        const planet = this._planet;
        if (!planet) return;

        const layers = planet.layers;

        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            if (!(layer instanceof Vector) || !layer.getVisibility()) {
                continue;
            }

            if (this.excludeLayers.includes(layer)) {
                continue;
            }

            layer._geoObjectEntityCollection.geoObjectHandler.drawDepthCameraPass(camera);
        }
    }
}
