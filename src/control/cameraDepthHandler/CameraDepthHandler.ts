import {CameraFrameComposer} from "../CameraFrameComposer";
import {CameraFrameHandler} from "../CameraFrameHandler";
import {Camera} from "../../camera/Camera";
import {PlanetCamera} from "../../camera/PlanetCamera";
import {Framebuffer} from "../../webgl";
import {camera_depth} from "./camera_depth";
import {Control, IControlParams} from "../Control";
import {Vec2} from "../../math/Vec2";
import {Vec4} from "../../math/Vec4";
import {Vec3} from "../../math/Vec3";
import {LonLat} from "../../LonLat";
import {GeoImage} from "../../layer/GeoImage";
import {QuadTreeStrategy} from "../../quadTree";


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

const CAM_WIDTH = 640;
const CAM_HEIGHT = 480;

export interface ICameraDepthHandlerParams extends IControlParams {

}

export class CameraDepthHandler extends Control {

    protected _frameHandler: CameraFrameHandler | null;
    protected _frameComposer: CameraFrameComposer;

    public readonly cameraGeoImage: GeoImage;

    protected _quadTreeStrategy: QuadTreeStrategy | null;

    protected _skipPreRender = false;

    constructor(params: ICameraDepthHandlerParams) {
        super(params);

        this._frameComposer = new CameraFrameComposer();
        this._frameHandler = null;

        this.cameraGeoImage = new GeoImage(`cameraGeoImage:${this.__id}`, {
            src: "test4.jpg",
            corners: [[0, 1], [1, 1], [1, 0], [0, 0]],
            visibility: true,
            isBaseLayer: false,
            opacity: 0.7
        });

        this._quadTreeStrategy = null;
    }

    protected _createCamera(): Camera {
        if (this.planet) {
            return new PlanetCamera(this.planet, {
                frustums: [[100, 1000000000]],
                width: CAM_WIDTH,
                height: CAM_HEIGHT,
                viewAngle: 45
            })
        } else {
            return new Camera({
                frustums: [[100, 1000000000]],
                width: CAM_WIDTH,
                height: CAM_HEIGHT,
                viewAngle: 45
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
            this.planet.addLayer(this.cameraGeoImage);
        }

        let depthFramebuffer = new Framebuffer(this.renderer.handler, {
            width: CAM_WIDTH,
            height: CAM_HEIGHT,
            targets: [{
                internalFormat: "RGBA16F",
                type: "FLOAT",
                attachment: "COLOR_ATTACHMENT",
                readAsync: true
            }],
            useDepth: true
        });

        this._frameHandler = new CameraFrameHandler({
            camera: this._createCamera(),
            frameBuffer: depthFramebuffer,
            frameHandler: this._depthHandlerCallback
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
                transitionOpacityEnabled: false,
            };

            this._quadTreeStrategy = new this.planet.quadTreeStrategyPrototype(quadTreeParams);

            this._quadTreeStrategy.init(this.camera as PlanetCamera);

            this._quadTreeStrategy.preRender();
            this._quadTreeStrategy.clearRenderedNodes();
            this._skipPreRender = false;
            this._quadTreeStrategy.preLoad();
        }
    }

    public get framebuffer(): Framebuffer | undefined {
        if (this._frameHandler) {
            return this._frameHandler.frameBuffer;
        }
    }

    protected _depthHandlerCallback = (frameHandler: CameraFrameHandler) => {

        if (!this.planet) return;

        let framebuffer = frameHandler.frameBuffer,
            gl = framebuffer.handler.gl!;

        framebuffer.activate();

        if (this._quadTreeStrategy) {
            let cam = frameHandler.camera as PlanetCamera;

            if (this._skipPreRender) {
                this._quadTreeStrategy.collectRenderNodes(cam);
            }

            this._skipPreRender = true;

            console.log(this._quadTreeStrategy._renderedNodes);
            //this.planet.renderDepthFramebuffer(cam, this._quadTreeStrategy);
        }
        /*
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.BLEND);

        let h = framebuffer.handler;
        h.programs.camera_depth.activate();
        let sh = h.programs.camera_depth._program;
        let shu = sh.uniforms;

        gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());

        gl.uniform3fv(shu.eyePositionHigh, cam.eyeHigh);
        gl.uniform3fv(shu.eyePositionLow, cam.eyeLow);

        // drawing planet nodes
        let rn = this.planet.quadTreeStrategy._renderedNodes;

        let i = rn.length;
        while (i--) {
            if (rn[i].segment._transitionOpacity >= 1) {
                rn[i].segment.depthRendering(sh);
            }
        }

        for (let i = 0; i < this.planet.quadTreeStrategy._fadingOpaqueSegments.length; ++i) {
            this.planet.quadTreeStrategy._fadingOpaqueSegments[i].depthRendering(sh);
        }
        */

        framebuffer.deactivate();

        //gl.enable(gl.BLEND);

        framebuffer.readPixelBuffersAsync();

        let lt = this.getLonLatFromPixelTerrain(1, 1),
            rt = this.getLonLatFromPixelTerrain(framebuffer.width - 1, 1);
        let rb = this.getLonLatFromPixelTerrain(framebuffer.width - 1, framebuffer.height - 1),
            lb = this.getLonLatFromPixelTerrain(1, framebuffer.height - 1);

        if (lt && rt && rb && lb) {
            this.cameraGeoImage.setCorners([[lt.lon, lt.lat], [rt.lon, rt.lat], [rb.lon, rb.lat], [lb.lon, lb.lat]]);
        }
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