import {Object3d} from "../Object3d";
import {Camera} from "../camera/Camera";
import {Framebuffer} from "../webgl/Framebuffer";
import {GeoImage} from "../layer/GeoImage";
import {Entity} from "../entity/Entity";
import {Vec3} from "../math/Vec3";
import {CameraFrameComposer} from "./CameraFrameComposer";

let cameraFrustumObj = Object3d.createFrustum();

export type FrameHandlerFunc = (frameHandler: CameraFrameHandler) => void;

export interface ICameraFrameHadler {
    camera: Camera,
    frameBuffer: Framebuffer,
    frameHandler: FrameHandlerFunc
}

export class CameraFrameHandler {
    public camera: Camera;
    public frameBuffer: Framebuffer;
    public frameHandler: FrameHandlerFunc | null;
    protected _composer: CameraFrameComposer | null;
    protected _composerIndex: number;

    public readonly cameraGeoImage: GeoImage;

    public readonly cameraEntity: Entity;

    constructor(params: ICameraFrameHadler) {
        this.camera = params.camera;
        this.frameBuffer = params.frameBuffer;
        this.frameHandler = params.frameHandler || null;
        this._composer = null;
        this._composerIndex = -1;

        this.cameraGeoImage = new GeoImage("Camera GeoImage", {
            src: "test4.jpg",
            corners: [[0, 1], [1, 1], [1, 0], [0, 0]],
            visibility: true,
            isBaseLayer: false,
            opacity: 0.7
        });

        this.cameraEntity = new Entity({
            visibility: true,
            scale: this.frustumScale,
            geoObject: {
                //visibility: false,
                tag: "frustum",
                color: "rgba(255,255,30,0.25)",
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
            //@ts-ignore
            this._composer._handlers.push(this);
        }
    }

    public remove() {
        if (this._composer) {
            //@ts-ignore
            this._composer._handlers.splice(this._composerIndex, 1);
            this._composer = null;
            this._composerIndex = -1;
        }
    }

    public frame() {
        if (this.frameHandler && this.frameBuffer.handler.gl) {
            this.frameHandler(this);
        }
    }
}
