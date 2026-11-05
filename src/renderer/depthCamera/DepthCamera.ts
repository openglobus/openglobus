import { Camera, type ICameraParams } from "../../camera/Camera";
import { PlanetCamera } from "../../camera/PlanetCamera";
import { Entity } from "../../entity/Entity";
import { LonLat } from "../../LonLat";
import { Vec2 } from "../../math/Vec2";
import { Vec3, type NumberArray3 } from "../../math/Vec3";
import { Vec4, type NumberArray4 } from "../../math/Vec4";
import { RADIANS_HALF } from "../../math";
import { Object3d } from "../../Object3d";
import type { Renderer } from "../Renderer";
import { VARIANCE_SHADOW_ENABLED } from "../shadows/ShadowManager";
import type { Planet } from "../../scene/Planet";
import type { Scene } from "../../scene/Scene";
import type { EntityCollection } from "../../entity/EntityCollection";
import { Framebuffer } from "../../webgl";
import { Vector } from "../../layer/Vector";
import type { ShadowMap } from "../shadows/ShadowMap";
import type { DepthCameraHandler } from "./DepthCameraHandler";

const CAM_WIDTH = 512;
const CAM_HEIGHT = 512;
const DEPTH_NEAR = 100;
const DEPTH_FAR = 100000;
const DEPTH_BIAS_WORLD = 1.0;
const DEPTH_NORMAL_BIAS = 0.45;
const TEXEL_SNAP_EPSILON = 1e-9;
const ORTHO_TEXEL_QUANTIZATION_STEPS = 4;
const ORTHO_TEXEL_QUANTIZATION_RATIO = Math.pow(2.0, 1.0 / ORTHO_TEXEL_QUANTIZATION_STEPS);
const DEFAULT_VERTICAL_VIEW_ANGLE = 45;
const PERIMETER_STEP_PX = 1;
const DEFAULT_CAMERA_FRUSTUM_LENGTH = 2.5;
const DEFAULT_CAMERA_FRUSTUM_COLOR = "rgb(155, 255, 155, 0.2)";
const RENDER_SKIRTS_SLOPE = 0.3;

const cameraFrustumObj = Object3d.createFrustum();

interface IPerimeterSegmentsData {
    segments: LonLat[][];
    isClosed: boolean;
}

export interface CameraPose {
    lonLat?: LonLat | NumberArray3;
    lookLonLat?: LonLat | NumberArray3;
    eye?: Vec3 | NumberArray3;
    look?: Vec3 | NumberArray3;
    up?: Vec3 | NumberArray3;
    pitch?: number;
    yaw?: number;
    roll?: number;
}

export interface IDepthCameraParams extends CameraPose {
    enabled?: boolean;
    width?: number;
    height?: number;
    near?: number;
    far?: number;
    verticalViewAngle?: number;
    horizontalViewAngle?: number;
    showFrustum?: boolean;
    showFootprint?: boolean;
    frustumLength?: number;
    frustumColor?: Vec4 | NumberArray4 | string;
    isOrthographic?: boolean;
    focusDistance?: number;
    enableSegmentSkirts?: boolean;
    enableSegmentFaceCulling?: boolean;
    excludeLayers?: Vector[];
    excludeEntityCollections?: EntityCollection[];
    planet?: Planet;
    depthBiasWorld?: number;
    normalBias?: number; // 0.2 .. 1.0
}

const toLonLat = (v: LonLat | NumberArray3): LonLat => (v instanceof LonLat ? v : LonLat.createFromArray(v));
const toVec3 = (v: Vec3 | NumberArray3): Vec3 => (v instanceof Vec3 ? v : Vec3.fromVec(v));

function getDistanceFromPixel(x: number, y: number, camera: Camera, framebuffer: Framebuffer): number {
    const px = new Vec2(x, y);
    const nx = px.x / framebuffer.width;
    const ny = (framebuffer.height - px.y) / framebuffer.height;
    const ddd = new Float32Array(4);

    framebuffer.readData(nx, ny, ddd, 0);

    if (ddd[0] === 0 || ddd[0] >= 1.0) {
        return 0;
    }

    const depth = ddd[0];
    const proj = camera.frustums[0].inverseProjectionMatrix;
    const screenPos = new Vec4(nx * 2.0 - 1.0, ny * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    const viewPosition = proj.mulVec4(screenPos);
    const dir = camera.unproject(nx * camera.width, (1 - ny) * camera.height);

    return -(viewPosition.z / viewPosition.w) / dir.dot(camera.getForward());
}

/**
 * Camera that renders a depth frame of the renderer scenes for projectors and shadow maps. The planets give it
 * their terrain nodes, the scenes their 3D objects.
 * @constructor
 * @param {Object} [options] - Depth camera options:
 * @param {boolean} [options.enabled=true] - Renders the depth frame. A disabled camera gets no planet nodes either.
 * @param {number} [options.width=512] - Depth frame width in pixels. Projectors and shadow maps need a square frame.
 * @param {number} [options.height=512] - Depth frame height in pixels.
 * @param {number} [options.near=100] - Near plane distance in meters.
 * @param {number} [options.far=100000] - Far plane distance in meters.
 * @param {number} [options.verticalViewAngle=45] - Vertical view angle in degrees.
 * @param {number} [options.horizontalViewAngle] - Horizontal view angle in degrees. When set, the vertical one is
 * taken from it and the frame aspect.
 * @param {boolean} [options.isOrthographic=false] - Orthographic projection.
 * @param {number} [options.focusDistance] - Distance at which the orthographic frame size is taken from the view
 * angle. Default is the far distance.
 * @param {boolean} [options.showFrustum=false] - Shows the camera frustum. Without a planet it is shown too.
 * @param {number} [options.frustumLength=2.5] - Size of the shown frustum, it is scaled with the distance.
 * @param {Vec4|Array.<number>|string} [options.frustumColor="rgb(155, 255, 155, 0.2)"] - Shown frustum color.
 * @param {boolean} [options.showFootprint=false] - Shows the frame border on the ground, only with a planet. The
 * depth frame is read back every frame for it.
 * @param {boolean} [options.enableSegmentFaceCulling=true] - Culls the back faces of the terrain segments.
 * @param {boolean} [options.enableSegmentSkirts=false] - Not used for now: the terrain segments are drawn without
 * skirts.
 * @param {Array.<Vector>} [options.excludeLayers] - Vector layers whose 3D objects are not drawn into the frame.
 * @param {Array.<EntityCollection>} [options.excludeEntityCollections] - Entity collections whose 3D objects are
 * not drawn into the frame.
 * @param {Planet} [options.planet] - Planet the camera is bound to: PlanetCamera, lon/lat coordinates, footprint.
 * Default is the first planet of the renderer. The terrain nodes come from all the planets anyway.
 * @param {number} [options.depthBiasWorld=1] - Occlusion bias of the receivers in meters.
 * @param {number} [options.normalBias=0.45] - Offset of the receiver point along its normal in meters.
 * @param {LonLat|Array.<number>} [options.lonLat] - Start position with a planet, `[lon, lat, height]`. Without
 * lonLat and eye the camera looks down at lon 0, lat 0 from the focus distance.
 * @param {LonLat|Array.<number>} [options.lookLonLat] - Point to look at with a planet, `[lon, lat, height]`.
 * @param {Vec3|Array.<number>} [options.eye] - Start position in cartesian coordinates, also without a planet.
 * @param {Vec3|Array.<number>} [options.look] - Point to look at in cartesian coordinates.
 * @param {Vec3|Array.<number>} [options.up] - Up direction.
 * @param {number} [options.pitch] - Start pitch in radians, applied after the position. With a planet the angles
 * are in the planet local frame at the eye.
 * @param {number} [options.yaw] - Start yaw in radians.
 * @param {number} [options.roll] - Start roll in radians.
 */
export class DepthCamera {
    protected static __counter__ = 0;

    public readonly id: number;

    public readonly width: number;
    public readonly height: number;
    public readonly near: number;
    public readonly far: number;
    public readonly verticalViewAngle: number;
    public readonly horizontalViewAngle?: number;
    public readonly excludeLayers: Vector[];
    public readonly excludeEntityCollections: EntityCollection[];
    public depthBiasWorld: number;
    public normalBias: number;

    public enabled: boolean;
    public enableSegmentSkirts: boolean;
    public enableSegmentFaceCulling: boolean;

    public frustumMask: number;

    public camera!: Camera;
    public framebuffer!: Framebuffer;
    public shadowMap: ShadowMap | null;

    public _handler: DepthCameraHandler | null;
    public _handlerIndex: number;

    protected _planet: Planet | null;
    protected _renderer: Renderer | null;
    protected _initialized: boolean;
    protected _cameraPose: CameraPose;
    protected _showFrustum: boolean;
    protected _showFootprint: boolean;
    protected _isOrthographic: boolean;
    protected _focusDistance: number;
    protected _orthoTexelSizeX: number;
    protected _orthoTexelSizeY: number;

    protected _frustumLength: number;
    protected _frustumColor: Vec4 | NumberArray4 | string;
    protected _cameraFrustumEntity: Entity | null;
    protected _cameraFootprintEntity: Entity | null;
    protected _cameraFootprintSegmentPointCounts: number[];
    protected _cameraFootprintClosedState: boolean;

    protected _prevCameraPos: Vec3;
    protected _prevCameraPitch: number;
    protected _prevCameraYaw: number;
    protected _prevCameraRoll: number;
    protected _prevCameraFrustumEntityPos: Vec3;
    protected _prevCameraFrustumEntityPitch: number;
    protected _prevCameraFrustumEntityYaw: number;
    protected _prevCameraFrustumEntityRoll: number;
    protected _prevFrustumScale: Vec3;

    constructor(params: IDepthCameraParams = {}) {
        this.id = DepthCamera.__counter__++;

        this.enabled = params.enabled ?? true;
        this.frustumMask = -1;
        this.enableSegmentSkirts = params.enableSegmentSkirts ?? false;
        this.enableSegmentFaceCulling = params.enableSegmentFaceCulling ?? true;
        this.width = params.width ?? CAM_WIDTH;
        this.height = params.height ?? CAM_HEIGHT;
        this.near = params.near ?? DEPTH_NEAR;
        this.far = params.far ?? DEPTH_FAR;
        this.verticalViewAngle = params.verticalViewAngle ?? DEFAULT_VERTICAL_VIEW_ANGLE;
        this.horizontalViewAngle = params.horizontalViewAngle;
        this.excludeLayers = params.excludeLayers ? [...params.excludeLayers] : [];
        this.excludeEntityCollections = params.excludeEntityCollections ? [...params.excludeEntityCollections] : [];
        this.depthBiasWorld = params.depthBiasWorld ?? DEPTH_BIAS_WORLD;
        this.normalBias = params.normalBias ?? DEPTH_NORMAL_BIAS;

        this._planet = params.planet ?? null;
        this._renderer = null;
        this._initialized = false;
        this._cameraPose = {
            lonLat: params.lonLat,
            lookLonLat: params.lookLonLat,
            eye: params.eye,
            look: params.look,
            up: params.up,
            pitch: params.pitch,
            yaw: params.yaw,
            roll: params.roll
        };
        this._showFrustum = params.showFrustum ?? false;
        this._showFootprint = params.showFootprint ?? false;
        this._isOrthographic = params.isOrthographic ?? false;
        this._focusDistance = params.focusDistance ?? this.far;
        this._orthoTexelSizeX = 0.0;
        this._orthoTexelSizeY = 0.0;

        this._frustumLength = params.frustumLength ?? DEFAULT_CAMERA_FRUSTUM_LENGTH;
        this._frustumColor = params.frustumColor ?? DEFAULT_CAMERA_FRUSTUM_COLOR;

        this._cameraFootprintEntity = this._showFootprint ? this._createCameraFootprintEntity() : null;
        this._cameraFrustumEntity = this._showFrustum ? this._createCameraFrustumEntity() : null;

        this._cameraFootprintSegmentPointCounts = [];
        this._cameraFootprintClosedState = false;

        this._handler = null;
        this._handlerIndex = -1;
        this.shadowMap = null;

        this._prevCameraPos = new Vec3();
        this._prevCameraPitch = 0;
        this._prevCameraYaw = 0;
        this._prevCameraRoll = 0;
        this._prevCameraFrustumEntityPos = new Vec3();
        this._prevCameraFrustumEntityPitch = 0;
        this._prevCameraFrustumEntityYaw = 0;
        this._prevCameraFrustumEntityRoll = 0;
        this._prevFrustumScale = new Vec3();
    }

    public get initialized(): boolean {
        return this._initialized;
    }

    /**
     * Planet the camera is geographically bound to (PlanetCamera, footprint, lon/lat), null without a planet.
     */
    public get planet(): Planet | null {
        return this._planet;
    }

    public get showFrustum(): boolean {
        return this._showFrustum;
    }

    public set showFrustum(showFrustum: boolean) {
        this._showFrustum = showFrustum;

        if (showFrustum && !this._cameraFrustumEntity) {
            this._cameraFrustumEntity = this._createCameraFrustumEntity();
        }

        if (this._handler && this._handlerIndex !== -1 && this._cameraFrustumEntity) {
            this._handler._showFrustumEntity(this._cameraFrustumEntity, showFrustum);
        }
    }

    public get showFootprint(): boolean {
        return this._showFootprint;
    }

    public set showFootprint(showFootprint: boolean) {
        this._showFootprint = showFootprint;

        if (showFootprint && !this._cameraFootprintEntity) {
            this._cameraFootprintEntity = this._createCameraFootprintEntity();
        }

        if (this._handler && this._handlerIndex !== -1 && this._cameraFootprintEntity) {
            this._handler._showFootprintEntity(this._cameraFootprintEntity, showFootprint);
        }
    }

    public get texelScale(): number {
        const height = Math.max(this.height, 1);

        if (this.camera.isOrthographic) {
            const frustum = this.camera.frustums[0];
            return Math.max(frustum.right - frustum.left, frustum.top - frustum.bottom) / height;
        }

        return (2.0 * Math.tan(this.camera.verticalViewAngle * RADIANS_HALF)) / height;
    }

    public get isOrthographic(): boolean {
        return this._initialized ? this.camera.isOrthographic : this._isOrthographic;
    }

    public set isOrthographic(isOrthographic: boolean) {
        this._isOrthographic = isOrthographic;

        if (this._initialized) {
            if (isOrthographic) {
                this.camera.focusDistance = this._focusDistance;
            }
            this.camera.isOrthographic = isOrthographic;
        }
    }

    public get focusDistance(): number {
        return this._initialized ? this.camera.focusDistance : this._focusDistance;
    }

    public set focusDistance(focusDistance: number) {
        if (!Number.isFinite(focusDistance) || focusDistance <= 0) return;

        this._focusDistance = focusDistance;

        if (this._initialized) {
            this.camera.focusDistance = focusDistance;
        }
    }

    public get cameraFootprintEntity(): Entity | null {
        return this._cameraFootprintEntity;
    }

    public get cameraFrustumEntity(): Entity | null {
        return this._cameraFrustumEntity;
    }

    public get frustumLength(): number {
        return this._frustumLength;
    }

    public set frustumLength(length: number) {
        this._frustumLength = length > 0 ? length : DEFAULT_CAMERA_FRUSTUM_LENGTH;
    }

    public get frustumColor(): Vec4 | NumberArray4 | string {
        return this._frustumColor;
    }

    public set frustumColor(color: Vec4 | NumberArray4 | string) {
        this._frustumColor = color;

        const geoObject = this._cameraFrustumEntity?.geoObject;

        if (!geoObject) return;

        if (typeof color === "string") {
            geoObject.setColorHTML(color);
        } else {
            const c = color instanceof Vec4 ? color : new Vec4(color[0], color[1], color[2], color[3]);
            geoObject.setColor(c.x, c.y, c.z, c.w);
        }
    }

    public get frustumScale(): Vec3 {
        return Object3d.getFrustumScaleByCameraAngles(
            this._frustumLength,
            this.camera.horizontalViewAngle,
            this.camera.verticalViewAngle
        );
    }

    /**
     * @param {Planet | null} planet - Default planet to bind the camera to when it has none.
     * @param {Renderer} renderer - Renderer.
     */
    public init(planet: Planet | null, renderer: Renderer): void {
        if (this._initialized) return;

        this._planet = this._planet || planet;
        this._renderer = renderer;
        this.camera = this._createCamera(this._planet);
        this._initPose();
        this.framebuffer = this._createFramebuffer(renderer);
        this.framebuffer.init();

        this._initialized = true;
    }

    public destroy(): void {
        if (!this._initialized) return;

        const cam = this.camera;

        this._cameraPose = {
            eye: cam.eye.clone(),
            look: cam.eye.add(cam.getForward()),
            up: cam.getUp()
        };

        this.framebuffer.destroy();

        this._renderer = null;
        this._initialized = false;
    }

    /**
     * Renders the depth frame of all renderer scenes. Planets give the nodes they have collected for this
     * camera, so it runs after the planet collection, and prepareFrame before it.
     */
    public frame(): void {
        if (!this.enabled || !this._initialized || !this._renderer) return;

        const framebuffer = this.framebuffer;
        const gl = framebuffer.handler.gl!;
        const mainCam = this._renderer.activeCamera;
        const depthCamera = this.camera;

        framebuffer.activate();

        this._renderer.applyDepthForCamera(depthCamera);

        depthCamera.updateCameraSlope();

        gl.clearColor(1.0, 1.0, 1.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.BLEND);

        this._scenesPass(depthCamera);

        gl.enable(gl.BLEND);

        framebuffer.deactivate();

        this.renderFootprint();

        if (VARIANCE_SHADOW_ENABLED) {
            this.shadowMap?.blur();
        }

        this._renderer.applyDepthForCamera(mainCam);
        this.finishFrame();
    }

    public prepareFrame(): void {
        this._prepareOrthographicProjection();
        this._prepareCameraEntitySync();
    }

    protected _scenesPass(camera: Camera): void {
        const scenes = this._renderer!._scenesArr;
        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            if (!scene.isActive() || scene.disableDepthCamera) {
                continue;
            }

            const planet = scene as Planet;

            if (planet.quadTreeStrategy) {
                this._segmentsPass(camera, planet);
                this._vectorLayersPass(camera, planet);
            }

            this._entityCollectionsPass(camera, scene);
        }
    }

    protected _prepareCameraEntitySync(): void {
        const cameraFrustumEntity = this._cameraFrustumEntity;
        if (!this._showFrustum || !cameraFrustumEntity) {
            return;
        }

        const cam = this.camera;
        const cameraFrustumEntityPos = cameraFrustumEntity.getAbsoluteCartesian();
        const cameraFrustumEntityPitch = cameraFrustumEntity.getPitch();
        const cameraFrustumEntityYaw = cameraFrustumEntity.getYaw();
        const cameraFrustumEntityRoll = cameraFrustumEntity.getRoll();
        let cameraUpdated = false;

        if (this._prevCameraPos.equal(cam.eye) && !this._prevCameraPos.equal(cameraFrustumEntityPos)) {
            cam.eye.copy(cameraFrustumEntityPos);
            cameraUpdated = true;
        }

        const cameraPitch = cam.getPitch();
        const cameraYaw = cam.getYaw();
        const cameraRoll = cam.getRoll();

        if (
            this._prevCameraPitch === cameraPitch &&
            this._prevCameraYaw === cameraYaw &&
            this._prevCameraRoll === cameraRoll &&
            (this._prevCameraFrustumEntityPitch !== cameraFrustumEntityPitch ||
                this._prevCameraFrustumEntityYaw !== cameraFrustumEntityYaw ||
                this._prevCameraFrustumEntityRoll !== cameraFrustumEntityRoll)
        ) {
            cam.setPitchYawRoll(cameraFrustumEntityPitch, cameraFrustumEntityYaw, cameraFrustumEntityRoll);
            cameraUpdated = true;
        }

        if (
            cameraUpdated ||
            !this._prevCameraPos.equal(cam.eye) ||
            this._prevCameraPitch !== cam.getPitch() ||
            this._prevCameraYaw !== cam.getYaw() ||
            this._prevCameraRoll !== cam.getRoll()
        ) {
            cam.update();
        }
    }

    protected _finishCameraEntitySync(): void {
        const cameraFrustumEntity = this._cameraFrustumEntity;
        if (!this._showFrustum || !cameraFrustumEntity) return;

        const cam = this.camera;
        const scale = this.frustumScale;

        if (
            this._prevCameraPos.equal(cam.eye) &&
            this._prevCameraPitch === cam.getPitch() &&
            this._prevCameraYaw === cam.getYaw() &&
            this._prevCameraRoll === cam.getRoll() &&
            this._prevFrustumScale.equal(scale) &&
            this._prevCameraFrustumEntityPos.equal(cameraFrustumEntity.getAbsoluteCartesian()) &&
            this._prevCameraFrustumEntityPitch === cameraFrustumEntity.getPitch() &&
            this._prevCameraFrustumEntityYaw === cameraFrustumEntity.getYaw() &&
            this._prevCameraFrustumEntityRoll === cameraFrustumEntity.getRoll()
        ) {
            return;
        }

        cameraFrustumEntity.setScale3v(scale);
        this._prevFrustumScale.copy(scale);
        cameraFrustumEntity.setCartesian3v(cam.eye);
        cameraFrustumEntity.setAbsolutePitch(cam.getPitch());
        cameraFrustumEntity.setAbsoluteYaw(cam.getYaw());
        cameraFrustumEntity.setAbsoluteRoll(cam.getRoll());

        this._prevCameraPitch = cam.getPitch();
        this._prevCameraYaw = cam.getYaw();
        this._prevCameraRoll = cam.getRoll();
        this._prevCameraPos.copy(cam.eye);

        this._prevCameraFrustumEntityPos.copy(cameraFrustumEntity.getAbsoluteCartesian());
        this._prevCameraFrustumEntityPitch = cameraFrustumEntity.getPitch();
        this._prevCameraFrustumEntityYaw = cameraFrustumEntity.getYaw();
        this._prevCameraFrustumEntityRoll = cameraFrustumEntity.getRoll();

        if (this._planet && this._planet.ellipsoid) {
            cameraFrustumEntity._lonLat.copy(
                this._planet.ellipsoid.cartesianToLonLat(cameraFrustumEntity.getAbsoluteCartesian())
            );
        }
    }

    public finishFrame(): void {
        this._finishCameraEntitySync();
    }

    public renderFootprint(): void {
        const cameraFootprintEntity = this._cameraFootprintEntity;
        if (!this._showFootprint || !cameraFootprintEntity) return;

        const framebuffer = this.framebuffer;
        framebuffer.readPixelBuffers();

        const perimeterData = this._collectPerimeterLonLats(framebuffer.width, framebuffer.height);
        const segments = perimeterData.segments;
        const nextPointCounts = segments.map((segment) => segment.length);
        const nextClosedState = perimeterData.isClosed;

        const isSameTopology =
            this._cameraFootprintSegmentPointCounts !== null &&
            this._cameraFootprintClosedState === nextClosedState &&
            this._cameraFootprintSegmentPointCounts.length === nextPointCounts.length &&
            this._cameraFootprintSegmentPointCounts.every((count, index) => count === nextPointCounts[index]);

        const polyline = cameraFootprintEntity.polyline!;
        if (polyline.isClosed !== nextClosedState) {
            polyline.isClosed = nextClosedState;
        }

        if (isSameTopology) {
            polyline.setPathLonLatFast(segments);
        } else {
            polyline.setPathLonLat(segments);
        }

        this._cameraFootprintSegmentPointCounts = nextPointCounts;
        this._cameraFootprintClosedState = nextClosedState;
    }

    public getCamera(): Camera {
        return this.camera;
    }

    public getFramebuffer(): Framebuffer {
        return this.framebuffer;
    }

    public getDepthTexture(): WebGLTexture {
        return this.framebuffer.textures[0]!;
    }

    protected _prepareOrthographicProjection(): void {
        if (!this.camera.isMoving) return;
        if (this._snapOrthographicProjectionToTexelGrid()) {
            this.camera.update();
        }
    }

    /**
     * Quantizes the orthographic extent and keeps the previous size while it still fits to prevent jitter.
     */
    protected _quantizeOrthoTexelSize(extent: number, resolution: number, prevTexelSize: number): number {
        const texelSize = extent / resolution;

        if (!(texelSize > 0.0)) {
            return 0.0;
        }

        if (
            prevTexelSize > 0.0 &&
            texelSize <= prevTexelSize &&
            texelSize > prevTexelSize / ORTHO_TEXEL_QUANTIZATION_RATIO
        ) {
            return prevTexelSize;
        }

        const step = Math.ceil(Math.log2(texelSize) * ORTHO_TEXEL_QUANTIZATION_STEPS);

        return Math.pow(2.0, step / ORTHO_TEXEL_QUANTIZATION_STEPS);
    }

    protected _snapOrthographicProjectionToTexelGrid(): boolean {
        const cam = this.camera;

        if (!cam.isOrthographic) {
            return false;
        }

        const frustum = cam.frustums[0];
        const framebuffer = this.framebuffer;

        const texelSizeX = this._quantizeOrthoTexelSize(
            frustum.right - frustum.left,
            framebuffer.width,
            this._orthoTexelSizeX
        );
        const texelSizeY = this._quantizeOrthoTexelSize(
            frustum.top - frustum.bottom,
            framebuffer.height,
            this._orthoTexelSizeY
        );

        if (texelSizeX <= 0.0 || texelSizeY <= 0.0) {
            return false;
        }

        this._orthoTexelSizeX = texelSizeX;
        this._orthoTexelSizeY = texelSizeY;

        const width = texelSizeX * framebuffer.width;
        const height = texelSizeY * framebuffer.height;

        const centerX = (frustum.left + frustum.right) * 0.5;
        const centerY = (frustum.bottom + frustum.top) * 0.5;

        const eyeX = cam.eye.dot(cam._r);
        const eyeY = cam.eye.dot(cam._u);

        const snappedMinX = Math.floor((eyeX + centerX - width * 0.5) / texelSizeX) * texelSizeX;
        const snappedMinY = Math.floor((eyeY + centerY - height * 0.5) / texelSizeY) * texelSizeY;

        const left = snappedMinX - eyeX;
        const right = left + width;
        const bottom = snappedMinY - eyeY;
        const top = bottom + height;

        if (
            Math.abs(left - frustum.left) <= TEXEL_SNAP_EPSILON &&
            Math.abs(right - frustum.right) <= TEXEL_SNAP_EPSILON &&
            Math.abs(bottom - frustum.bottom) <= TEXEL_SNAP_EPSILON &&
            Math.abs(top - frustum.top) <= TEXEL_SNAP_EPSILON
        ) {
            return false;
        }

        frustum.setOrthoBounds(left, right, bottom, top);

        return true;
    }

    public getCartesianFromPixelTerrain(x: number, y: number): Vec3 | undefined {
        const distance = getDistanceFromPixel(x, y, this.camera, this.framebuffer);
        if (distance === 0) return;

        const nx = x / this.framebuffer.width;
        const ny = (this.framebuffer.height - y) / this.framebuffer.height;

        if (this.camera.isOrthographic) {
            const position = new Vec3();
            this.camera.unproject(nx * this.camera.width, (1 - ny) * this.camera.height, distance, position);
            return position;
        }

        const direction = this.camera.unproject(nx * this.camera.width, (1 - ny) * this.camera.height);
        return direction.scaleTo(distance).addA(this.camera.eye);
    }

    public getLonLatFromPixelTerrain(x: number, y: number): LonLat | undefined {
        const coords = this.getCartesianFromPixelTerrain(x, y);
        return coords && this._planet ? this._planet.ellipsoid.cartesianToLonLat(coords) : undefined;
    }

    protected _createCameraFootprintEntity(): Entity {
        return new Entity({
            polyline: {
                color: "rgba(255,0,0,0.82)",
                thickness: 5.0,
                isClosed: true
            }
        });
    }

    protected _createCameraFrustumEntity(): Entity {
        return new Entity({
            visibility: true,
            scale: new Vec3(1, 1, 1),
            geoObject: {
                tag: "depth-camera-frustum",
                color: this._frustumColor,
                object3d: cameraFrustumObj
            },
            properties: {
                depthCamera: this
            }
        });
    }

    protected _initPose(): void {
        const cam = this.camera;
        const p = this._cameraPose;

        if (p.lonLat && cam instanceof PlanetCamera) {
            cam.setLonLat(
                toLonLat(p.lonLat),
                p.lookLonLat ? toLonLat(p.lookLonLat) : undefined,
                p.up ? toVec3(p.up) : undefined
            );
        } else if (p.eye) {
            cam.set(toVec3(p.eye), p.look ? toVec3(p.look) : undefined, p.up ? toVec3(p.up) : undefined);
        } else if (cam instanceof PlanetCamera) {
            cam.setLonLat(new LonLat(0, 0, this._focusDistance));
        }

        if (p.pitch != null || p.yaw != null || p.roll != null) {
            cam.setPitchYawRoll(p.pitch ?? 0, p.yaw ?? 0, p.roll ?? 0);
        }

        cam.update();
    }

    protected _createCamera(planet: Planet | null): Camera {
        const params: ICameraParams = {
            frustums: [[this.near, this.far]],
            width: this.width,
            height: this.height,
            viewAngle: this.verticalViewAngle,
            isOrthographic: this._isOrthographic,
            focusDistance: this._focusDistance,
            reverseDepth: false
        };

        const camera = planet ? new PlanetCamera(planet, params) : new Camera(params);

        if (this.horizontalViewAngle != null) {
            camera.setHorizontalViewAngle(this.horizontalViewAngle);
        }

        return camera;
    }

    protected _createFramebuffer(renderer: Renderer): Framebuffer {
        return new Framebuffer(renderer.handler, {
            width: this.width,
            height: this.height,
            depthComponent: "DEPTH_COMPONENT32F",
            targets: [
                {
                    internalFormat: "RGBA32F",
                    attachment: "COLOR_ATTACHMENT",
                    readAsync: true
                }
            ],
            useDepth: true
        });
    }

    protected _segmentsPass(camera: Camera, planet: Planet): void {
        const h = this._renderer!.handler;
        const gl = h.gl!;

        if (this._handlerIndex === -1) return;

        let checkSlope = camera.isOrthographic && camera.slope < RENDER_SKIRTS_SLOPE;

        h.programs.depth_camera.activate();
        const sh = h.programs.depth_camera;
        const shu = sh.uniforms;

        gl.uniformMatrix4fv(shu.viewMatrix, false, camera.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, camera.getProjectionMatrix());

        if (this.enableSegmentFaceCulling) {
            gl.enable(gl.CULL_FACE);
        } else if (checkSlope) {
            gl.disable(gl.CULL_FACE);
        }

        //const isEq = planet.terrain!.equalizeVertices;
        const baseLayerSlice = planet.visibleTileLayers.length ? [planet.visibleTileLayers[0]] : undefined;
        const rn = planet.quadTreeStrategy.getViewCameraRenderedNodes(this._handlerIndex, camera.getCurrentFrustum());

        let i = rn.length;
        while (i--) {
            const s = rn[i].segment;
            if (!s || !s.node) continue;
            //isEq && s.equalize();
            s.readyToEngage && s.engage();
            s.ensureIndexBuffer();
            s.updateRTCEyePosition(camera);
            s.depthRendering(sh, baseLayerSlice);
        }

        gl.enable(gl.CULL_FACE);
    }

    protected _vectorLayersPass(camera: Camera, planet: Planet): void {
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

    protected _entityCollectionsPass(camera: Camera, scene: Scene): void {
        const ecs = scene.entityCollections;

        for (let i = 0; i < ecs.length; i++) {
            const ec = ecs[i];
            if (ec.getVisibility() && !this.excludeEntityCollections.includes(ec)) {
                ec.geoObjectHandler.drawDepthCameraPass(camera);
            }
        }
    }

    protected _collectPerimeterLonLats(width: number, height: number): IPerimeterSegmentsData {
        const segments: LonLat[][] = [];
        let currentSegment: LonLat[] | null = null;
        let hasMissingData = false;
        let firstPointHasData = false;
        let lastPointHasData = false;
        let sampledPointIndex = 0;

        const addPoint = (x: number, y: number) => {
            const lonLat = this.getLonLatFromPixelTerrain(x, y);
            const hasData = !!lonLat;

            if (sampledPointIndex === 0) {
                firstPointHasData = hasData;
            }
            lastPointHasData = hasData;
            sampledPointIndex++;

            if (lonLat) {
                if (!currentSegment) {
                    currentSegment = [];
                    segments.push(currentSegment);
                }
                currentSegment.push(new LonLat(lonLat.lon, lonLat.lat, lonLat.height));
            } else {
                hasMissingData = true;
                currentSegment = null;
            }
        };

        for (let x = 1; x < width; x += PERIMETER_STEP_PX) addPoint(x, 1);
        for (let y = 2; y < height; y += PERIMETER_STEP_PX) addPoint(width - 1, y);
        for (let x = width - 2; x >= 1; x -= PERIMETER_STEP_PX) addPoint(x, height - 1);
        for (let y = height - 2; y >= 2; y -= PERIMETER_STEP_PX) addPoint(1, y);

        if (segments.length > 1 && firstPointHasData && lastPointHasData) {
            const firstSegment = segments[0];
            const lastSegment = segments[segments.length - 1];

            lastSegment.push(...firstSegment);
            segments[0] = lastSegment;
            segments.pop();
        }

        const normalizedSegments = segments.filter((segment) => segment.length > 1);
        const isClosed = !hasMissingData && normalizedSegments.length === 1;

        return {
            segments: normalizedSegments,
            isClosed
        };
    }
}
