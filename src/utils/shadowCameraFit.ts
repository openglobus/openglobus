import type { DepthCamera } from "../control/depthCamera/DepthCamera";
import type { QuadTreeStrategy } from "../quadTree/QuadTreeStrategy";
import type { Planet } from "../scene/Planet";
import type { CameraFootprint } from "./cameraFootprint";
import { Vec3 } from "../math/Vec3";
import { EPS12 } from "../math";

/**
 * How high above the footprint a caster may stand and still reach the shadow map.
 * Raising it is cheap. It only moves the camera sunward.
 */
const SHADOW_CASTER_RELIEF_FACTOR = 1.25;
const SHADOW_CASTER_HEIGHT_FACTOR = 0.25;
const MIN_SHADOW_CASTER_HEIGHT = 100;
const MAX_SHADOW_CASTER_HEIGHT = 10000;

/**
 * Controls shadow camera height snapping.
 * A value of 1 uses 128, 256, 512 m, etc., preventing small movements every frame.
 */
const SHADOW_CASTER_HEIGHT_STEPS = 1;

/**
 * Minimum far-plane margin for terrain below the fitted receivers.
 * fit() adds the measured terrain descent to this value.
 */
const SHADOW_RECEIVER_DEPTH_PADDING = 500;

/**
 * Extra border around the fitted bounds, in texels.
 * Keeps soft-shadow samples inside the map and prevents edge artifacts.
 */
const SHADOW_ORTHO_TEXEL_PADDING = 3;

/**
 * Snaps the fitted extent to four size levels per doubling.
 * Slack delays shrinking, preventing texel-grid movement and shadow shimmer.
 * See _quantizeOrthoTexelSize().
 */
const ORTHO_TEXEL_QUANTIZATION_STEPS = 4;
const ORTHO_TEXEL_QUANTIZATION_RATIO = Math.pow(2.0, 1.0 / ORTHO_TEXEL_QUANTIZATION_STEPS);
const ORTHO_TEXEL_RELEASE_SLACK = 0.15;

/** Smallest bounds padding and far-near gap, in world units. */
const MIN_SHADOW_ORTHO_SIZE = 1.0;

export interface ILightSpaceBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
}

export interface IOrthoBounds {
    left: number;
    right: number;
    bottom: number;
    top: number;
}

interface ITerrainRelief {
    up: number;
    down: number;
    depthUp: number;
    depthDown: number;
    cornerSpread: number;
}

export interface IShadowCameraFitParams {
    /**
     * Adds proportional padding to each side of the fitted bounds.
     * 0.01 adds 1% per side. This keeps curved ground between the four
     * sampled screen corners inside the shadow map.
     */
    orthoMarginFactor?: number;

    /**
     * Extends caster coverage toward the Sun:
     * max(casterClearance, casterHeight * casterClearanceFactor)
     */
    casterClearance?: number;
    casterClearanceFactor?: number;

    /**
     * Minimum view-ray slope used when adjusting the footprint for terrain relief.
     * 0.1 limits sideways movement to 10 metres per metre of relief.
     * This prevents near-horizontal rays from greatly expanding the shadow map.
     */
    minFootprintRaySlope?: number;

    /**
     * Limits sideways footprint expansion caused by terrain below the reference level.
     * 0.5 allows expansion up to half the footprint radius.
     * Higher values improve downhill coverage but reduce shadow resolution.
     */
    reliefLateralFactor?: number;

    /** Upper limits on the terrain relief the fit takes from the quad tree, in world units. */
    maxReliefUp?: number;
    maxReliefDown?: number;

    /**
     * Aligns the fitted bounds to a texel grid fixed in the world, so that shadow edges stop crawling while
     * the camera moves. See _snapOrthographicBounds.
     */
    snapToTexelGrid?: boolean;

    /**
     * How the shadow rectangle is turned around the sun direction: along the local horizon under the
     * footprint, or along the world axes. The camera aims at the sun either way, only the roll changes.
     * Horizon aligned wastes less of the map, but then the rectangle turns as the camera moves and its
     * texel grid stops holding still. See getStableLightUp.
     */
    horizonAlignedLightUp?: boolean;

    /**
     * Pads each side of the shadow map by the distance the camera travels in one frame, times this number.
     *
     * The fit always runs a frame behind the view, so while flying fast the ground right in front of the
     * camera can fall outside the map and lose its shadow - this is what covers it. In exchange the map size
     * follows the camera speed and the shadow edges start crawling, so it is off by default.
     */
    motionMarginFrames?: number;

    /**
     * Shadow depth bias, counted in shadow map texels so that it follows its resolution, plus a flat
     * offset in metres:
     *
     *     depthBiasWorld = texelWorldSize * depthBiasTexels + depthBiasOffset
     *
     * Too little and surfaces shadow themselves, too much and the shadow comes away from the foot of its
     * caster by depthBiasWorld * cos(sunElevation). The shader adds a slope term of its own, also
     * counted in texels, see SHADOW_MAP_SLOPE_DEPTH_BIAS.
     */
    depthBiasTexels?: number;
    depthBiasOffset?: number;

    /**
     * Renders the depth pass from the depth camera's own quad tree traversal rather than from the planet's.
     * The planet's one covers only the near band of the view and drops tiles while they fade. Above a main
     * camera height of about 136 km DepthCamera takes the planet's traversal whatever this says.
     */
    pinOwnQuadTreeTraversal?: boolean;
}

/** Last fit measurements, for readouts and debugging. */
export interface IShadowCameraFitStats {
    /** Shadow texel size in world units, the way ShadowManager measures it. */
    texelWorldSize: number;
    footprintRadius: number;
    /** Spread of the footprint ground points in geocentric radius. */
    cornerHeightSpread: number;
    /** Terrain relief above and below the footprint corners, as the main camera traversal reports it. */
    reliefUp: number;
    reliefDown: number;
    /** The same, with the depth camera traversal taken into account. Only the down side is used, by the far plane. */
    depthReliefUp: number;
    depthReliefDown: number;
    casterHeight: number;
    /** Main camera displacement since the previous fit, in world units. */
    cameraStep: number;
    orthoWidth: number;
    orthoHeight: number;
    orthoBounds: IOrthoBounds;
    near: number;
    far: number;
}

function projPerp(vector: Vec3, axis: Vec3): Vec3 {
    return vector.sub(axis.scaleTo(vector.dot(axis)));
}

/**
 * Fallback seed for the light space up vector, for when
 * the preferred one turns out to be parallel to the light.
 */
function getLeastAlignedAxis(direction: Vec3): Vec3 {
    let x = Math.abs(direction.x);
    let y = Math.abs(direction.y);
    let z = Math.abs(direction.z);

    if (x <= y && x <= z) {
        return Vec3.UNIT_X;
    }

    return y <= z ? Vec3.UNIT_Y : Vec3.UNIT_Z;
}

/**
 * Up vector of the light space basis, that is, how the shadow rectangle
 * is turned around the sun direction.
 */
function getStableLightUp(footprint: CameraFootprint, lightDirection: Vec3, horizonAligned: boolean): Vec3 {
    let seed = horizonAligned ? footprint.ellipsoid!.getSurfaceNormal3v(footprint.center) : Vec3.NORTH;
    let projected = projPerp(seed, lightDirection);

    if (projected.length2() <= EPS12) {
        projected = projPerp(getLeastAlignedAxis(lightDirection), lightDirection);
    }

    return projected.normalize();
}

/**
 * How high the rendered terrain rises above a reference radius, and how deep it drops below it, as two
 * positive heights.
 */
function getStrategyRelief(
    quadTreeStrategy: QuadTreeStrategy | undefined,
    upFrom: number,
    downFrom: number
): { up: number; down: number } {
    if (!quadTreeStrategy || quadTreeStrategy.maxTerrainRadius <= 0.0) {
        return { up: 0.0, down: 0.0 };
    }

    return {
        up: Math.max(0.0, quadTreeStrategy.maxTerrainRadius - upFrom),
        down: Math.max(0.0, downFrom - quadTreeStrategy.minTerrainRadius)
    };
}

function getRadiusRange(points: Vec3[]): { min: number; max: number } {
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < points.length; i++) {
        let radius = points[i].length();

        min = Math.min(min, radius);
        max = Math.max(max, radius);
    }

    return { min, max };
}

/**
 * Light space depth of the closest point of the caster volume, which is the footprint raised by the caster
 * height. Only the near plane has to clear it: a caster whose shadow lands on the footprint shares the
 * light space XY of that shadow, so it is already inside the fitted bounds sideways.
 */
function getCasterMinZ(footprint: CameraFootprint, forward: Vec3, casterHeight: number): number {
    let minZ = Infinity;

    for (let i = 0; i < footprint.points.length; i++) {
        let casterPoint = footprint.points[i].add(footprint.normals[i].scaleTo(casterHeight));

        minZ = Math.min(minZ, casterPoint.sub(footprint.center).dot(forward));
    }

    return minZ;
}

function getLightSpaceBounds(origin: Vec3, right: Vec3, up: Vec3, forward: Vec3, points: Vec3[]): ILightSpaceBounds {
    let bounds: ILightSpaceBounds = {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
        minZ: Infinity,
        maxZ: -Infinity
    };

    for (let i = 0; i < points.length; i++) {
        let relativePoint = points[i].sub(origin);
        let x = relativePoint.dot(right);
        let y = relativePoint.dot(up);
        let z = relativePoint.dot(forward);

        bounds.minX = Math.min(bounds.minX, x);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxY = Math.max(bounds.maxY, y);
        bounds.minZ = Math.min(bounds.minZ, z);
        bounds.maxZ = Math.max(bounds.maxZ, z);
    }

    return bounds;
}

function isFittableBounds(bounds: IOrthoBounds): boolean {
    return (
        Number.isFinite(bounds.left) &&
        Number.isFinite(bounds.right) &&
        Number.isFinite(bounds.bottom) &&
        Number.isFinite(bounds.top) &&
        bounds.right > bounds.left &&
        bounds.top > bounds.bottom
    );
}

function quantizeUp(value: number, stepsPerOctave: number): number {
    if (!(value > 0.0)) {
        return 0.0;
    }

    return Math.pow(2.0, Math.ceil(Math.log2(value) * stepsPerOctave) / stepsPerOctave);
}

/**
 * Places and sizes an orthographic depth camera over a camera footprint, so that the shadow map covers the
 * ground the main camera sees, and everything that casts onto it, at the tightest texel the footprint allows.
 *
 * The fit holds state between frames - the texel grid step and the camera displacement - so one instance
 * belongs to one depth camera.
 */
export class ShadowCameraFit {
    public orthoMarginFactor: number;
    public casterClearance: number;
    public casterClearanceFactor: number;
    public minFootprintRaySlope: number;
    public reliefLateralFactor: number;
    public maxReliefUp: number;
    public maxReliefDown: number;
    public snapToTexelGrid: boolean;
    public horizonAlignedLightUp: boolean;
    public motionMarginFrames: number;
    public depthBiasTexels: number;
    public depthBiasOffset: number;
    public pinOwnQuadTreeTraversal: boolean;

    public readonly stats: IShadowCameraFitStats;

    protected _lastCameraEye: Vec3;
    protected _cameraStep: number;

    protected _orthoTexelSizeX: number;
    protected _orthoTexelSizeY: number;

    constructor(params: IShadowCameraFitParams = {}) {
        this.orthoMarginFactor = params.orthoMarginFactor ?? 0.01;
        this.casterClearance = params.casterClearance ?? 100000;
        this.casterClearanceFactor = params.casterClearanceFactor ?? 6.0;
        this.minFootprintRaySlope = params.minFootprintRaySlope ?? 0.1;
        this.reliefLateralFactor = params.reliefLateralFactor ?? 0.5;
        this.maxReliefUp = params.maxReliefUp ?? 12000;
        this.maxReliefDown = params.maxReliefDown ?? 2000;
        this.snapToTexelGrid = params.snapToTexelGrid ?? true;
        this.horizonAlignedLightUp = params.horizonAlignedLightUp ?? false;
        this.motionMarginFrames = params.motionMarginFrames ?? 0.0;
        this.depthBiasTexels = params.depthBiasTexels ?? 1.0;
        this.depthBiasOffset = params.depthBiasOffset ?? 100;
        this.pinOwnQuadTreeTraversal = params.pinOwnQuadTreeTraversal ?? true;

        this.stats = {
            texelWorldSize: 0.0,
            footprintRadius: 0.0,
            cornerHeightSpread: 0.0,
            reliefUp: 0.0,
            reliefDown: 0.0,
            depthReliefUp: 0.0,
            depthReliefDown: 0.0,
            casterHeight: 0.0,
            cameraStep: 0.0,
            orthoWidth: 0.0,
            orthoHeight: 0.0,
            orthoBounds: { left: 0.0, right: 0.0, bottom: 0.0, top: 0.0 },
            near: 0.0,
            far: 0.0
        };

        this._lastCameraEye = new Vec3();
        this._cameraStep = 0.0;
        this._orthoTexelSizeX = 0.0;
        this._orthoTexelSizeY = 0.0;
    }

    /** Drops the state carried between frames, for a camera that has been teleported. */
    public reset(): void {
        this._lastCameraEye.set(0.0, 0.0, 0.0);
        this._cameraStep = 0.0;
        this._orthoTexelSizeX = 0.0;
        this._orthoTexelSizeY = 0.0;
    }

    /**
     * Places the depth camera over the footprint and sets its orthographic projection and depth biases.
     *
     * @param {DepthCamera} depthCamera - Orthographic depth camera to fit.
     * @param {CameraFootprint} footprint - Ground area to cover, taken of the main camera this frame.
     * @param {Vec3} sunPos - Sun position.
     * @returns {boolean} - False when the footprint is incomplete or gives no usable bounds.
     */
    public fit(depthCamera: DepthCamera, footprint: CameraFootprint, sunPos: Vec3): boolean {
        let camera = footprint.camera;

        if (!footprint.isValid || !camera || !depthCamera.initialized) {
            return false;
        }

        let shadowCamera = depthCamera.camera;
        let textureWidth = depthCamera.framebuffer.width;
        let textureHeight = depthCamera.framebuffer.height;

        this._cameraStep = this._lastCameraEye.isZero() ? 0.0 : camera.eye.distance(this._lastCameraEye);
        this._lastCameraEye.copy(camera.eye);

        let lightDirection = sunPos.normal().scale(-1.0);
        let lightUp = getStableLightUp(footprint, lightDirection, this.horizonAlignedLightUp);

        // 1. Aim the camera along the sunlight. Only the roll is a choice here, the eye is placed in step 4.
        shadowCamera.set(footprint.center.sub(lightDirection), footprint.center, lightUp);

        let forward = shadowCamera.getForward();
        let right = shadowCamera.getRight();
        let up = shadowCamera.getUp();

        // 2. Box the ground the view sees, with the terrain relief around it, along the camera axes.
        let relief = this._getTerrainRelief(depthCamera, footprint);
        let bounds = getLightSpaceBounds(
            footprint.center,
            right,
            up,
            forward,
            this._getReceiverBoundsPoints(footprint, relief)
        );

        // 3. Pad that box and round it onto the world texel grid.
        let orthoBounds = this._snapOrthographicBounds(
            this._expandOrthographicBounds(bounds, textureWidth, textureHeight),
            right,
            up,
            footprint.center,
            textureWidth,
            textureHeight
        );

        if (!isFittableBounds(orthoBounds)) {
            return false;
        }

        // 4. Move the eye sunward, until the whole caster volume stands in front of the near plane. Along
        // forward only, so the box stays exactly as it was fitted. The height comes from the view relief,
        // not the depth one - that one depends on the bounds this very step places.
        let casterHeight = this._getCasterHeight(camera.planet, footprint.radius, relief.up);
        let near = depthCamera.near;
        let casterMinZ = getCasterMinZ(footprint, forward, casterHeight);
        let casterClearance = Math.max(this.casterClearance, casterHeight * this.casterClearanceFactor);
        let eyeOffset = casterMinZ - near - casterClearance;
        let eye = footprint.center.add(forward.scaleTo(eyeOffset));

        // 5. Push the far plane past the lowest receiver.
        let receiverDepthPadding = SHADOW_RECEIVER_DEPTH_PADDING + relief.depthDown;
        let far = Math.max(near + MIN_SHADOW_ORTHO_SIZE, bounds.maxZ + receiverDepthPadding - eyeOffset);

        // 6. Apply, then hand the depth pass its biases and its own traversal.
        shadowCamera.set(eye, eye.add(forward), lightUp);
        shadowCamera.frustum.setOrthoProjection(
            orthoBounds.left,
            orthoBounds.right,
            orthoBounds.bottom,
            orthoBounds.top,
            near,
            far
        );
        shadowCamera.update();

        this._updateDepthBiases(depthCamera, orthoBounds, textureWidth);

        if (this.pinOwnQuadTreeTraversal) {
            depthCamera._forceOwnQuadTreeStrategyPass = true;
        }

        let stats = this.stats;

        stats.footprintRadius = footprint.radius;
        stats.cornerHeightSpread = relief.cornerSpread;
        stats.reliefUp = relief.up;
        stats.reliefDown = relief.down;
        stats.depthReliefUp = relief.depthUp;
        stats.depthReliefDown = relief.depthDown;
        stats.casterHeight = casterHeight;
        stats.cameraStep = this._cameraStep;
        stats.orthoWidth = orthoBounds.right - orthoBounds.left;
        stats.orthoHeight = orthoBounds.top - orthoBounds.bottom;
        stats.orthoBounds = orthoBounds;
        stats.near = near;
        stats.far = far;

        return true;
    }

    /** Returns how much higher and how much lower the terrain goes than the four footprint corners. */
    protected _getTerrainRelief(depthCamera: DepthCamera, footprint: CameraFootprint): ITerrainRelief {
        let camera = footprint.camera!;
        let corners = getRadiusRange(footprint.points);

        let view = getStrategyRelief(camera.planet.quadTreeStrategy, corners.max, corners.min);
        let referenceRadius = camera.eye.length() - camera.getHeight() + footprint.ellipsoidHeight;
        let map = getStrategyRelief(depthCamera.quadTreeStrategy, referenceRadius, referenceRadius);

        return {
            up: Math.min(this.maxReliefUp, view.up),
            down: Math.min(this.maxReliefDown, view.down),
            depthUp: Math.min(this.maxReliefUp, Math.max(view.up, map.up)),
            depthDown: Math.min(this.maxReliefDown, Math.max(view.down, map.down)),
            cornerSpread: corners.max - corners.min
        };
    }

    /**
     * Returns the points the bounds are fitted to: the four footprint corners, plus the relief they hide,
     * reached by walking each corner along its own view ray. Along the ray, because that is where the hidden
     * terrain lies - pushing the corners sideways instead would widen the bounds for relief that is only ever
     * an estimate.
     */
    protected _getReceiverBoundsPoints(footprint: CameraFootprint, relief: ITerrainRelief): Vec3[] {
        let points = footprint.points.slice();

        if (relief.up <= 0.0 && relief.down <= 0.0) {
            return points;
        }

        let eye = footprint.camera!.eye;
        let lateralLimit = footprint.radius * this.reliefLateralFactor;

        for (let i = 0; i < footprint.points.length; i++) {
            let point = footprint.points[i];
            let toPoint = point.sub(eye);
            let distance = toPoint.length();

            if (distance <= 0.0) {
                continue;
            }

            let direction = toPoint.scale(1.0 / distance);
            let slope = Math.max(-direction.dot(footprint.normals[i]), this.minFootprintRaySlope);

            if (relief.up > 0.0) {
                points.push(point.add(direction.scaleTo(-Math.min(relief.up / slope, distance))));
            }

            if (relief.down > 0.0) {
                let tangential = Math.sqrt(Math.max(0.0, 1.0 - slope * slope));
                let limit = tangential > 0.0 ? lateralLimit / tangential : Infinity;

                points.push(point.add(direction.scaleTo(Math.min(relief.down / slope, limit))));
            }
        }

        return points;
    }

    /**
     * Returns the caster height, rounded to a coarse step. It decides where the shadow camera stands, and a
     * camera that jumps every time the terrain range is revised makes the whole map blink.
     */
    protected _getCasterHeight(planet: Planet, footprintRadius: number, terrainRelief: number): number {
        let height = Math.max(
            footprintRadius * SHADOW_CASTER_HEIGHT_FACTOR * (planet._heightFactor || 1.0),
            terrainRelief * SHADOW_CASTER_RELIEF_FACTOR
        );
        let clamped = Math.min(MAX_SHADOW_CASTER_HEIGHT, Math.max(MIN_SHADOW_CASTER_HEIGHT, height));

        return Math.min(MAX_SHADOW_CASTER_HEIGHT, quantizeUp(clamped, SHADOW_CASTER_HEIGHT_STEPS));
    }

    protected _expandOrthographicBounds(
        bounds: ILightSpaceBounds,
        textureWidth: number,
        textureHeight: number
    ): IOrthoBounds {
        let width = bounds.maxX - bounds.minX;
        let height = bounds.maxY - bounds.minY;
        let motionPadding = this._cameraStep * this.motionMarginFrames;
        let paddingX = Math.max(
            width * this.orthoMarginFactor + (width / textureWidth) * SHADOW_ORTHO_TEXEL_PADDING + motionPadding,
            MIN_SHADOW_ORTHO_SIZE
        );
        let paddingY = Math.max(
            height * this.orthoMarginFactor + (height / textureHeight) * SHADOW_ORTHO_TEXEL_PADDING + motionPadding,
            MIN_SHADOW_ORTHO_SIZE
        );

        return {
            left: bounds.minX - paddingX,
            right: bounds.maxX + paddingX,
            bottom: bounds.minY - paddingY,
            top: bounds.maxY + paddingY
        };
    }

    /**
     * Returns the texel size to fit the extent onto, keeping the previous one while it is still large enough.
     */
    protected _quantizeOrthoTexelSize(extent: number, resolution: number, prevTexelSize: number): number {
        let texelSize = extent / resolution;

        if (!Number.isFinite(texelSize) || texelSize <= 0.0) {
            return 0.0;
        }

        let releaseBelow = prevTexelSize / (ORTHO_TEXEL_QUANTIZATION_RATIO * (1.0 + ORTHO_TEXEL_RELEASE_SLACK));

        if (prevTexelSize > 0.0 && texelSize <= prevTexelSize && texelSize > releaseBelow) {
            return prevTexelSize;
        }

        return quantizeUp(texelSize, ORTHO_TEXEL_QUANTIZATION_STEPS);
    }

    protected _snapOrthographicBounds(
        bounds: IOrthoBounds,
        right: Vec3,
        up: Vec3,
        anchor: Vec3,
        resolutionX: number,
        resolutionY: number
    ): IOrthoBounds {
        if (!this.snapToTexelGrid) {
            return bounds;
        }

        let texelSizeX = this._quantizeOrthoTexelSize(bounds.right - bounds.left, resolutionX, this._orthoTexelSizeX);
        let texelSizeY = this._quantizeOrthoTexelSize(bounds.top - bounds.bottom, resolutionY, this._orthoTexelSizeY);

        if (texelSizeX <= 0.0 || texelSizeY <= 0.0) {
            return bounds;
        }

        this._orthoTexelSizeX = texelSizeX;
        this._orthoTexelSizeY = texelSizeY;

        let width = texelSizeX * resolutionX;
        let height = texelSizeY * resolutionY;
        let anchorX = anchor.dot(right);
        let anchorY = anchor.dot(up);
        let centerX = (bounds.left + bounds.right) * 0.5;
        let centerY = (bounds.bottom + bounds.top) * 0.5;
        let left = Math.floor((anchorX + centerX - width * 0.5) / texelSizeX) * texelSizeX - anchorX;
        let bottom = Math.floor((anchorY + centerY - height * 0.5) / texelSizeY) * texelSizeY - anchorY;

        return {
            left,
            right: left + width,
            bottom,
            top: bottom + height
        };
    }

    protected _updateDepthBiases(depthCamera: DepthCamera, orthoBounds: IOrthoBounds, textureWidth: number): void {
        let texelWorldSize =
            Math.max(orthoBounds.right - orthoBounds.left, orthoBounds.top - orthoBounds.bottom) / textureWidth;

        this.stats.texelWorldSize = texelWorldSize;

        depthCamera.depthBiasWorld = texelWorldSize * this.depthBiasTexels + this.depthBiasOffset;
    }
}
