import {Control, IControlParams} from "./Control";
import {Camera} from "../camera/Camera";
import {Framebuffer} from "../webgl/Framebuffer";
import {WebGLContextExt} from "../webgl/Handler";

type FrameHandlerFunc = (camera: Camera, framebuffer: Framebuffer, gl: WebGLContextExt) => void;

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

    constructor(params: ICameraFrameHadler) {
        this.camera = params.camera;
        this.frameBuffer = params.frameBuffer;
        this.frameHandler = params.frameHandler || null;
        this._composer = null;
        this._composerIndex = -1;
        this.frameBuffer.init();
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
            this.frameHandler(this.camera, this.frameBuffer, this.frameBuffer.handler.gl);
        }
    }
}

export interface ICameraFrameComposerParams extends IControlParams {
    frameHandlers?: CameraFrameHandler[]
}

export class CameraFrameComposer extends Control {

    protected _frameHandlers: CameraFrameHandler[];

    constructor(params: ICameraFrameComposerParams = {}) {
        super({
            name: "CameraFrameComposer",
            autoActivate: true,
            ...params
        });

        this._frameHandlers = params.frameHandlers || [];
    }

    public get frameHandlers(): CameraFrameHandler[] {
        return [...this._frameHandlers];
    }

    public add(handler: CameraFrameHandler) {
        handler.addTo(this);
    }

    public override oninit() {
        super.oninit();
    }

    public override activate() {
        super.activate();
        this.renderer?.events.on("postdraw", this._onPostdraw);
    }

    public override deactivate() {
        super.deactivate();
        this.renderer?.events.off("postdraw", this._onPostdraw);
    }

    protected _onPostdraw = () => {
        for (let i = 0; i < this._frameHandlers.length; i++) {
            this._frameHandlers[i].frame();
        }
    }
}