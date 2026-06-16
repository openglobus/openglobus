import { Camera } from "../../camera/Camera";
import { PlanetCamera } from "../../camera/PlanetCamera";
import { Entity } from "../../entity/Entity";
import { LonLat } from "../../LonLat";
import { Vec2 } from "../../math/Vec2";
import { Vec3 } from "../../math/Vec3";
import { Vec4 } from "../../math/Vec4";
import { Object3d } from "../../Object3d";
import { QuadTreeStrategy } from "../../quadTree";
import type { Renderer } from "../../renderer/Renderer";
import type { Planet } from "../../scene/Planet";
import { Framebuffer } from "../../webgl";
import { Vector } from "../../layer/Vector";
import type { DepthCameraHandler } from "./DepthCameraHandler";

const CAM_WIDTH = 512;
const CAM_HEIGHT = 512;
const DEPTH_NEAR = 100;
const DEPTH_FAR = 100000;
const DEPTH_BIAS = 0.00006;
const DEPTH_NORMAL_BIAS = 0.45;
const DEPTH_EPSILON = 0.00025;
const DEFAULT_VERTICAL_VIEW_ANGLE = 45;
const PERIMETER_STEP_PX = 1;
const DEFAULT_CAMERA_FRUSTUM_LENGTH = 2.5;

const cameraFrustumObj = Object3d.createFrustum();

interface IPerimeterSegmentsData {
    segments: LonLat[][];
    isClosed: boolean;
}

export interface IDepthCameraParams {
    enabled?: boolean;
    width?: number;
    height?: number;
    near?: number;
    far?: number;
    verticalViewAngle?: number;
    horizontalViewAngle?: number;
    showFrustum?: boolean;
    showFootprint?: boolean;
    isOrthographic?: boolean;
    focusDistance?: number;
    excludeLayers?: Vector[];
    bias?: number; //0.00003 .. 0.00008 - 0.0005
    normalBias?: number; // 0.2 .. 1.0
    depthEpsilon?: number; //0.00015 .. 0.0005 - 0.0015
}

function getDistanceFromPixel(x: number, y: number, camera: Camera, framebuffer: Framebuffer): number {
    const px = new Vec2(x, y);
    const nx = px.x / framebuffer.width;
    const ny = (framebuffer.height - px.y) / framebuffer.height;
    const ddd = new Float32Array(4);

    framebuffer.readData(nx, ny, ddd, 0);

    if (ddd[0] === 0) {
        return 0;
    }

    const depth = ddd[0];
    const proj = camera.frustums[0].inverseProjectionMatrix;
    const screenPos = new Vec4(nx * 2.0 - 1.0, ny * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    const viewPosition = proj.mulVec4(screenPos);
    const dir = camera.unproject(nx * camera.width, (1 - ny) * camera.height);

    return -(viewPosition.z / viewPosition.w) / dir.dot(camera.getForward());
}

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
    public bias: number;
    public normalBias: number;
    public depthEpsilon: number;

    public enabled: boolean;

    public camera!: Camera;
    public framebuffer!: Framebuffer;
    public quadTreeStrategy!: QuadTreeStrategy;

    public _handler: DepthCameraHandler | null;
    public _handlerIndex: number;

    protected _planet: Planet | null;
    protected _renderer: Renderer | null;
    protected _initialized: boolean;
    protected _forceOwnQuadTreeStrategyPass: boolean;
    protected _showFrustum: boolean;
    protected _showFootprint: boolean;
    protected _isOrthographic: boolean;
    protected _focusDistance: number;
    protected _lastPlanetHeightFactor: number;

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

    constructor(params: IDepthCameraParams = {}) {
        this.id = DepthCamera.__counter__++;

        this.enabled = params.enabled ?? true;
        this.width = params.width ?? CAM_WIDTH;
        this.height = params.height ?? CAM_HEIGHT;
        this.near = params.near ?? DEPTH_NEAR;
        this.far = params.far ?? DEPTH_FAR;
        this.verticalViewAngle = params.verticalViewAngle ?? DEFAULT_VERTICAL_VIEW_ANGLE;
        this.horizontalViewAngle = params.horizontalViewAngle;
        this.excludeLayers = params.excludeLayers ? [...params.excludeLayers] : [];
        this.bias = params.bias ?? DEPTH_BIAS;
        this.normalBias = params.normalBias ?? DEPTH_NORMAL_BIAS;
        this.depthEpsilon = params.depthEpsilon ?? DEPTH_EPSILON;

        this._planet = null;
        this._renderer = null;
        this._initialized = false;
        this._forceOwnQuadTreeStrategyPass = true;
        this._showFrustum = params.showFrustum ?? true;
        this._showFootprint = params.showFootprint ?? true;
        this._isOrthographic = params.isOrthographic ?? false;
        this._focusDistance = params.focusDistance ?? this.far;
        this._lastPlanetHeightFactor = 1.0;

        this._cameraFootprintEntity = this._showFootprint ? this._createCameraFootprintEntity() : null;
        this._cameraFrustumEntity = this._showFrustum ? this._createCameraFrustumEntity() : null;

        this._cameraFootprintSegmentPointCounts = [];
        this._cameraFootprintClosedState = false;

        this._handler = null;
        this._handlerIndex = -1;

        this._prevCameraPos = new Vec3();
        this._prevCameraPitch = 0;
        this._prevCameraYaw = 0;
        this._prevCameraRoll = 0;
        this._prevCameraFrustumEntityPos = new Vec3();
        this._prevCameraFrustumEntityPitch = 0;
        this._prevCameraFrustumEntityYaw = 0;
        this._prevCameraFrustumEntityRoll = 0;
    }

    public get initialized(): boolean {
        return this._initialized;
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
            if (showFrustum) {
                this._handler.cameraFrustumLayer.add(this._cameraFrustumEntity);
            } else {
                this._handler.cameraFrustumLayer.removeEntity(this._cameraFrustumEntity);
            }
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
            if (showFootprint) {
                this._handler.cameraFootprintLayer.add(this._cameraFootprintEntity);
            } else {
                this._handler.cameraFootprintLayer.removeEntity(this._cameraFootprintEntity);
            }
        }
    }

    public get isOrthographic(): boolean {
        return this._initialized ? this.camera.isOrthographic : this._isOrthographic;
    }

    public set isOrthographic(isOrthographic: boolean) {
        this._isOrthographic = isOrthographic;
        this._forceOwnQuadTreeStrategyPass = true;

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
        this._forceOwnQuadTreeStrategyPass = true;

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

    public get frustumScale(): Vec3 {
        return Object3d.getFrustumScaleByCameraAngles(
            DEFAULT_CAMERA_FRUSTUM_LENGTH,
            this.camera.horizontalViewAngle,
            this.camera.verticalViewAngle
        );
    }

    public init(planet: Planet, renderer: Renderer): void {
        if (this._initialized) return;

        this._planet = planet;
        this._renderer = renderer;
        this.camera = this._createCamera(planet);
        this.framebuffer = this._createFramebuffer(renderer);
        this.framebuffer.init();

        this.quadTreeStrategy = this._createQuadTreeStrategy(planet, this.camera as PlanetCamera);
        this._lastPlanetHeightFactor = planet._heightFactor;
        this._forceOwnQuadTreeStrategyPass = true;
        this._initialized = true;
    }

    public destroy(): void {
        if (!this._initialized) return;

        this.quadTreeStrategy.clear();
        this.framebuffer.destroy();

        this._planet = null;
        this._renderer = null;
        this._initialized = false;
    }

    public frame(): void {
        if (!this.enabled || !this._initialized || !this._renderer || !this._planet) return;

        const framebuffer = this.framebuffer;
        const gl = framebuffer.handler.gl!;
        const mainCam = this._renderer.activeCamera;
        const depthCamera = this.camera as PlanetCamera;

        this._syncPlanetHeightFactor();
        this.prepareFrame();

        framebuffer.activate();

        this._renderer.applyDepthForCamera(depthCamera);

        const quadTreeStrategy = this._getQuadTreeStrategy(depthCamera);

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.BLEND);

        this._segmentsPass(depthCamera, quadTreeStrategy);
        this._geoObjectsPass(depthCamera);

        gl.enable(gl.BLEND);

        framebuffer.deactivate();

        this._renderer.applyDepthForCamera(mainCam);

        this.renderFootprint();
        this.finishFrame();
    }

    public prepareFrame(): void {
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

    public finishFrame(): void {
        const cameraFrustumEntity = this._cameraFrustumEntity;
        if (!this._showFrustum || !cameraFrustumEntity) return;

        const cam = this.camera;
        cameraFrustumEntity.setScale3v(this.frustumScale);
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

    protected _syncPlanetHeightFactor(): void {
        const planet = this._planet;
        if (!planet || this._lastPlanetHeightFactor === planet._heightFactor) return;

        this._lastPlanetHeightFactor = planet._heightFactor;
        this.quadTreeStrategy.destroyBranches();
        this.quadTreeStrategy.clearRenderedNodes();
        this._forceOwnQuadTreeStrategyPass = true;
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
                color: "rgb(155, 155, 255, 0.88)",
                object3d: cameraFrustumObj
            },
            properties: {
                depthCamera: this
            }
        });
    }

    protected _createCamera(planet: Planet): Camera {
        const camera = new PlanetCamera(planet, {
            frustums: [[this.near, this.far]],
            width: this.width,
            height: this.height,
            viewAngle: this.verticalViewAngle,
            isOrthographic: this._isOrthographic,
            focusDistance: this._focusDistance,
            reverseDepth: false
        });

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

    protected _getQuadTreeStrategy(depthCamera: PlanetCamera): QuadTreeStrategy {
        const planet = this._planet!;
        const mainCam = this._renderer!.activeCamera;

        if (!depthCamera.isOrthographic && !this._forceOwnQuadTreeStrategyPass && mainCam.containsPoint(depthCamera.eye)) {
            return planet.quadTreeStrategy;
        }

        this._forceOwnQuadTreeStrategyPass = false;

        const quadTreeStrategy = this.quadTreeStrategy;
        quadTreeStrategy.maxZoomLimit = planet.quadTreeStrategy.maxCurrZoom;
        quadTreeStrategy.collectRenderNodes(depthCamera);

        return quadTreeStrategy;
    }

    protected _segmentsPass(camera: PlanetCamera, quadTreeStrategy: QuadTreeStrategy): void {
        const h = this._renderer!.handler;
        const gl = h.gl!;
        const planet = this._planet!;

        h.programs.depth_camera.activate();
        const sh = h.programs.depth_camera;
        const shu = sh.uniforms;

        gl.uniformMatrix4fv(shu.viewMatrix, false, camera.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, camera.getProjectionMatrix());

        // @todo: optimization cam bottom is under terrain
        gl.disable(gl.CULL_FACE);

        const isEq = planet.terrain!.equalizeVertices;
        const baseLayerSlice = planet.visibleTileLayers.length ? [planet.visibleTileLayers[0]] : undefined;
        const rn = quadTreeStrategy._renderedNodesInFrustum[camera.getCurrentFrustum()];

        let i = rn.length;
        while (i--) {
            const s = rn[i].segment;
            if (!s.node) continue;
            if (s._transitionOpacity >= 1) {
                isEq && s.equalize();
                s.readyToEngage && s.engage();
                s.ensureIndexBuffer();
                s.updateRTCEyePosition(camera);
                s.depthRendering(sh, baseLayerSlice);
            }
        }

        for (let j = 0; j < quadTreeStrategy._fadingOpaqueSegments.length; ++j) {
            const s = quadTreeStrategy._fadingOpaqueSegments[j];
            if (!s.node) continue;
            isEq && s.equalize();
            s.readyToEngage && s.engage();
            s.ensureIndexBuffer();
            s.updateRTCEyePosition(camera);
            s.depthRendering(sh, baseLayerSlice);
        }

        gl.enable(gl.CULL_FACE);
    }

    protected _geoObjectsPass(camera: PlanetCamera): void {
        const layers = this._planet!.layers;

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
