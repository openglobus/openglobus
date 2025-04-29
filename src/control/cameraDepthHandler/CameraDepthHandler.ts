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

export interface ICameraDepthhandlerParams extends IControlParams {

}

export class CameraDepthHandler extends Control {

    protected _depthHandler: CameraFrameHandler | null;
    protected _frameComposer: CameraFrameComposer;

    constructor(params: ICameraDepthhandlerParams) {
        super(params);

        this._frameComposer = new CameraFrameComposer();
        this._depthHandler = null;
    }

    protected _createCamera(): Camera {
        if (this.planet) {
            return new PlanetCamera(this.planet, {
                frustums: [[10, 10000]],
                width: CAM_WIDTH,
                height: CAM_HEIGHT,
                viewAngle: 45
            })
        } else {
            return new Camera({
                frustums: [[10, 10000]],
                width: CAM_WIDTH,
                height: CAM_HEIGHT,
                viewAngle: 45
            });
        }
    }

    public override oninit() {
        super.oninit();

        if (!this.renderer) return;

        this.renderer.handler.addProgram(camera_depth());

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

        this._depthHandler = new CameraFrameHandler({
            camera: this._createCamera(),
            frameBuffer: depthFramebuffer,
            frameHandler: this._depthHandlerCallback
        })
    }

    protected _depthHandlerCallback = (frameHandler: CameraFrameHandler) => {

        if (!this.planet) return;

        let cam = frameHandler.camera,
            framebuffer = frameHandler.frameBuffer,
            gl = framebuffer.handler.gl!;

        framebuffer.activate();

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
        let rn = this.planet._renderedNodes;

        let i = rn.length;
        while (i--) {
            if (rn[i].segment._transitionOpacity >= 1) {
                rn[i].segment.depthRendering(sh);
            }
        }

        //@ts-ignore
        for (let i = 0; i < this.planet._fadingOpaqueSegments.length; ++i) {
            //@ts-ignore
            this.planet._fadingOpaqueSegments[i].depthRendering(sh);
        }

        framebuffer.deactivate();

        //gl.enable(gl.BLEND);

        framebuffer.readPixelBuffersAsync();

        let lt = this.getLonLatFromPixelTerrain(1, 1),
            rt = this.getLonLatFromPixelTerrain(framebuffer.width - 1, 1);
        let rb = this.getLonLatFromPixelTerrain(framebuffer.width - 1, framebuffer.height - 1),
            lb = this.getLonLatFromPixelTerrain(1, framebuffer.height - 1);

        if (lt && rt && rb && lb) {
            frameHandler.cameraGeoImage.setCorners([[lt.lon, lt.lat], [rt.lon, rt.lat], [rb.lon, rb.lat], [lb.lon, lb.lat]]);
        }

        // let r = globus.renderer;
        //
        // // PASS to depth visualization
        // r.screenDepthFramebuffer.activate();
        // sh = h.programs.depth;
        // let p = sh._program;
        //
        // gl.bindBuffer(gl.ARRAY_BUFFER, r.screenFramePositionBuffer);
        // gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);
        //
        // sh.activate();
        //
        // gl.activeTexture(gl.TEXTURE0);
        // gl.bindTexture(gl.TEXTURE_2D, framebuffer.textures[0]);
        // gl.uniform1i(p.uniforms.depthTexture, 0);
        //
        // gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        //
        // r.screenDepthFramebuffer.deactivate();
        // gl.enable(gl.BLEND);


        frameHandler.cameraEntity.setCartesian3v(cam.eye);
        frameHandler.cameraEntity.setPitch(cam.getPitch());
        frameHandler.cameraEntity.setYaw(cam.getYaw());
        frameHandler.cameraEntity.setRoll(cam.getRoll());
    }

    public getCartesianFromPixelTerrain(x: number, y: number): Vec3 | undefined {
        if (this._depthHandler) {
            let framebuffer = this._depthHandler.frameBuffer;
            let camera = this._depthHandler.camera;
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