/*
 * Copyright 2026 Michael Gevlich
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CameraFrameComposer } from "../CameraFrameComposer";
import { CameraFrameHandler } from "../CameraFrameHandler";
import { Camera } from "../../camera/Camera";
import { PlanetCamera } from "../../camera/PlanetCamera";
import { Framebuffer } from "../../webgl";
import { camera_depth } from "./camera_depth";
import { Control, IControlParams } from "../Control";
import { Vec2 } from "../../math/Vec2";
import { Vec4 } from "../../math/Vec4";
import { Vec3 } from "../../math/Vec3";
import { LonLat } from "../../LonLat";
import { Vector } from "../../layer/Vector";
import { Entity } from "../../entity/Entity";
import { QuadTreeStrategy } from "../../quadTree";

function getDistanceFromPixel(x: number, y: number, camera: Camera, framebuffer: Framebuffer): number {
    let px = new Vec2(x, y);

    let nx = px.x / framebuffer.width;
    let ny = (framebuffer.height - px.y) / framebuffer.height;

    let ddd = new Float32Array(4);

    let dist = 0;

    framebuffer.readData(nx, ny, ddd, 0);

    if (ddd[0] === 0) {
        return 0;
    }

    let depth = ddd[0],
        proj = camera.frustums[0].inverseProjectionMatrix;

    let screenPos = new Vec4(nx * 2.0 - 1.0, ny * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    let viewPosition = proj.mulVec4(screenPos);

    let dir = camera.unproject(nx * camera.width, (1 - ny) * camera.height);

    dist = -(viewPosition.z / viewPosition.w) / dir.dot(camera.getForward());

    return dist;
}

const CAM_WIDTH = 512;
const CAM_HEIGHT = 512;
const PERIMETER_STEP_PX = 1;
const DEPTH_NEAR = 100;
const DEPTH_FAR = 1000000;

const POLYLINE_DEPTH_OFFSET = -100;

interface IPerimeterSegmentsData {
    segments: LonLat[][];
    isClosed: boolean;
}

export interface ICameraDepthHandlerParams extends IControlParams {
    showFrustum?: boolean;
    showFootprint?: boolean;
}

export class CameraDepthHandler extends Control {
    protected _frameHandler: CameraFrameHandler | null;
    protected _frameComposer: CameraFrameComposer;

    public readonly cameraFootprintLayer: Vector;

    protected readonly _cameraFootprintEntity: Entity;
    protected _cameraFootprintSegmentPointCounts: number[] | null;
    protected _cameraFootprintClosedState: boolean | null;

    protected _quadTreeStrategy: QuadTreeStrategy | null;

    protected _showFrustum: boolean;
    protected _showFootprint: boolean;

    constructor(params: ICameraDepthHandlerParams) {
        super(params);

        this._frameComposer = new CameraFrameComposer();
        this._frameHandler = null;

        this._showFrustum = params.showFrustum ?? true;
        this._showFootprint = params.showFootprint ?? true;

        this._cameraFootprintEntity = new Entity({
            polyline: {
                color: "rgba(255,0,0,0.82)",
                thickness: 5.0,
                isClosed: true
            }
        });

        this.cameraFootprintLayer = new Vector(`cameraFootprintLayer:${this.__id}`, {
            entities: [this._cameraFootprintEntity],
            pickingEnabled: false,
            depthOffset: POLYLINE_DEPTH_OFFSET,
            hideInLayerSwitcher: true,
            clampToGround: true,
            visibility: this._showFootprint
        });

        this._cameraFootprintSegmentPointCounts = null;
        this._cameraFootprintClosedState = null;

        this._quadTreeStrategy = null;
    }

    protected _createCamera(): Camera {
        if (this.planet) {
            return new PlanetCamera(this.planet, {
                frustums: [[DEPTH_NEAR, DEPTH_FAR]],
                width: CAM_WIDTH,
                height: CAM_HEIGHT,
                viewAngle: 45,
                reverseDepth: false
            });
        } else {
            return new Camera({
                frustums: [[DEPTH_NEAR, DEPTH_FAR]],
                width: CAM_WIDTH,
                height: CAM_HEIGHT,
                viewAngle: 45,
                reverseDepth: false
            });
        }
    }

    public get camera(): Camera | undefined {
        if (this._frameHandler) {
            return this._frameHandler.camera;
        }
    }

    public override oninit() {
        super.oninit();

        if (!this.renderer) return;

        this.renderer.handler.addProgram(camera_depth());

        if (this.planet) {
            this.planet.addLayer(this.cameraFootprintLayer);
        }

        let depthFramebuffer = new Framebuffer(this.renderer.handler, {
            width: CAM_WIDTH,
            height: CAM_HEIGHT,
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

        this._frameHandler = new CameraFrameHandler({
            camera: this._createCamera(),
            frameBuffer: depthFramebuffer,
            frameHandler: this._depthHandlerCallback,
            showFrustum: this._showFrustum
        });

        if (this.renderer.controls.CameraFrameComposer) {
            this._frameComposer = this.renderer.controls.CameraFrameComposer as CameraFrameComposer;
        } else {
            this.renderer.addControl(this._frameComposer);
        }

        this._frameComposer.add(this._frameHandler);

        if (this.planet) {
            const quadTreeParams = {
                planet: this.planet,
                maxEqualZoomAltitude: this.planet.quadTreeStrategy.maxEqualZoomAltitude,
                minEqualZoomAltitude: this.planet.quadTreeStrategy.minEqualZoomAltitude,
                minEqualZoomCameraSlope: this.planet.quadTreeStrategy.minEqualZoomCameraSlope,
                transitionOpacityEnabled: false
            };

            this._quadTreeStrategy = new this.planet.quadTreeStrategyPrototype(quadTreeParams);

            this._quadTreeStrategy.init(this.camera as PlanetCamera);

            this._quadTreeStrategy.preRender();
            this._quadTreeStrategy.clearRenderedNodes();
            this._quadTreeStrategy.preLoad();
        }
    }

    public get framebuffer(): Framebuffer | undefined {
        if (this._frameHandler) {
            return this._frameHandler.frameBuffer;
        }
    }

    public getCamera(): Camera {
        return this.camera!;
    }

    public getDepthFramebuffer(): Framebuffer | null {
        return this.framebuffer || null;
    }

    public getDepthTexture(): WebGLTexture {
        return this.framebuffer!.textures[0]!;
    }

    protected _depthHandlerCallback = (frameHandler: CameraFrameHandler) => {
        if (!this.planet) return;
        if (!this._quadTreeStrategy) return;

        let framebuffer = frameHandler.frameBuffer,
            gl = framebuffer.handler.gl!,
            h = framebuffer.handler,
            mainCam = this.renderer!.activeCamera;

        framebuffer.activate();

        let cam = frameHandler.camera as PlanetCamera;

        this.renderer!.applyDepthForCamera(cam);

        this._quadTreeStrategy.collectRenderNodes(cam);

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.BLEND);

        h.programs.camera_depth.activate();
        let sh = h.programs.camera_depth;
        let shu = sh.uniforms;

        gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());

        let isEq = this.planet.terrain!.equalizeVertices;

        let rn = this._quadTreeStrategy._renderedNodesInFrustum[cam.getCurrentFrustum()];

        let i = rn.length;
        while (i--) {
            let s = rn[i].segment;
            if (s._transitionOpacity >= 1) {
                isEq && s.equalize();
                s.readyToEngage && s.engage();
                s.ensureIndexBuffer();
                s.updateRTCEyePosition(cam);
                s.depthRendering(sh);
            }
        }

        for (let i = 0; i < this._quadTreeStrategy._fadingOpaqueSegments.length; ++i) {
            let s = this._quadTreeStrategy._fadingOpaqueSegments[i];
            isEq && s.equalize();
            s.readyToEngage && s.engage();
            s.ensureIndexBuffer();
            s.updateRTCEyePosition(cam);
            s.depthRendering(sh);
        }

        gl.enable(gl.BLEND);

        framebuffer.deactivate();

        this.renderer!.applyDepthForCamera(mainCam);

        this._renderFootprint(frameHandler);
    };

    protected _renderFootprint(frameHandler: CameraFrameHandler) {
        if (this._showFootprint) {
            let framebuffer = frameHandler.frameBuffer;

            framebuffer.readPixelBuffersAsync();

            const perimeterData = this._collectPerimeterLonLats(framebuffer.width, framebuffer.height);
            const segments = perimeterData.segments;
            const nextPointCounts = segments.map((segment) => segment.length);
            const nextClosedState = perimeterData.isClosed;

            const isSameTopology =
                this._cameraFootprintSegmentPointCounts !== null &&
                this._cameraFootprintClosedState === nextClosedState &&
                this._cameraFootprintSegmentPointCounts.length === nextPointCounts.length &&
                this._cameraFootprintSegmentPointCounts.every((count, index) => count === nextPointCounts[index]);

            const polyline = this._cameraFootprintEntity.polyline!;
            if (polyline.isClosed !== nextClosedState) {
                polyline.isClosed = nextClosedState;
            }

            this.cameraFootprintLayer.setVisibility(true);

            if (isSameTopology) {
                polyline.setPathLonLatFast(segments);
            } else {
                polyline.setPathLonLat(segments);
            }

            this._cameraFootprintSegmentPointCounts = nextPointCounts;
            this._cameraFootprintClosedState = nextClosedState;
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

        for (let x = 1; x < width; x += PERIMETER_STEP_PX) {
            addPoint(x, 1);
        }

        for (let y = 2; y < height; y += PERIMETER_STEP_PX) {
            addPoint(width - 1, y);
        }

        for (let x = width - 2; x >= 1; x -= PERIMETER_STEP_PX) {
            addPoint(x, height - 1);
        }

        for (let y = height - 2; y >= 2; y -= PERIMETER_STEP_PX) {
            addPoint(1, y);
        }

        if (segments.length > 1 && firstPointHasData && lastPointHasData) {
            const firstSegment = segments[0];
            const lastSegment = segments[segments.length - 1];

            // Path sampling is cyclic. Merge end and start when both are valid.
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

    public getCartesianFromPixelTerrain(x: number, y: number): Vec3 | undefined {
        if (this._frameHandler) {
            let framebuffer = this._frameHandler.frameBuffer;
            let camera = this._frameHandler.camera;
            let distance = getDistanceFromPixel(x, y, camera, framebuffer);
            if (distance === 0) {
                return;
            }
            let nx = x / framebuffer.width;
            let ny = (framebuffer.height - y) / framebuffer.height;
            let direction = camera.unproject(nx * camera.width, (1 - ny) * camera.height);
            return direction.scaleTo(distance).addA(camera.eye);
        }
    }

    public getLonLatFromPixelTerrain(x: number, y: number): LonLat | undefined {
        if (this.planet) {
            let coords = this.getCartesianFromPixelTerrain(x, y);
            if (coords) {
                return this.planet.ellipsoid.cartesianToLonLat(coords);
            }
        }
    }

    public override activate() {
        super.activate();
    }

    public override deactivate() {
        super.deactivate();
    }
}
