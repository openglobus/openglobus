import {Object3d} from "../Object3d";
import {Camera} from "../camera/Camera";
import {Framebuffer} from "../webgl/Framebuffer";
import {Entity} from "../entity/Entity";
import {Vec3} from "../math/Vec3";
import {CameraFrameComposer} from "./CameraFrameComposer";

let cameraFrustumObj = Object3d.createFrustum();

export type FrameHandlerFunc = (frameHandler: CameraFrameHandler) => void;

export interface ICameraFrameHadler {
    camera: Camera,
    frameBuffer: Framebuffer,
    frameHandler: FrameHandlerFunc
    showFrustum?: boolean,
}

export class CameraFrameHandler {
    public readonly camera: Camera;
    public readonly frameBuffer: Framebuffer;
    public frameHandler: FrameHandlerFunc | null;
    protected _composer: CameraFrameComposer | null;
    protected _composerIndex: number;

    public readonly cameraEntity: Entity;
    public showFrustum: boolean;

    constructor(params: ICameraFrameHadler) {
        this.camera = params.camera;
        this.frameBuffer = params.frameBuffer;
        this.frameHandler = params.frameHandler || null;
        this._composer = null;
        this._composerIndex = -1;
        this.showFrustum = params.showFrustum != undefined ? params.showFrustum : true;

        this.cameraEntity = new Entity({
            visibility: true,
            scale: this.frustumScale,
            geoObject: {
                //visibility: false,
                tag: "frustum",
                color: "rgba(0,255,0,0.20)",
                object3d: cameraFrustumObj
            }
        });

        this.frameBuffer.init();
    }

    public get frustumScale(): Vec3 {
        return Object3d.getFrustumScaleByCameraAspectRatio(1000, this.camera.getViewAngle(), this.camera.getAspectRatio());
    }

    public addTo(composer: CameraFrameComposer) {
        if (!this._composer) {
            this._composer = composer;
            this._composerIndex = composer.frameHandlers.length;
            this._composer._frameHandlers.push(this);
        }
    }

    public remove() {
        if (this._composer) {
            this._composer._frameHandlers.splice(this._composerIndex, 1);
            this._composer = null;
            this._composerIndex = -1;
        }
    }

    public frame() {
        if (this.frameHandler && this.frameBuffer.handler.gl) {
            this.frameHandler(this);

            if (this.showFrustum) {
                let cam = this.camera;
                let frustumScale = Object3d.getFrustumScaleByCameraAngles(100, cam.horizontalViewAngle, cam.verticalViewAngle);
                this.cameraEntity.setScale3v(frustumScale);
                this.cameraEntity.setCartesian3v(cam.eye);
                this.cameraEntity.setAbsolutePitch(cam.getAbsolutePitch());
                this.cameraEntity.setAbsoluteYaw(cam.getAbsoluteYaw());
                this.cameraEntity.setAbsoluteRoll(cam.getAbsoluteRoll());
            }
        }
    }
}
