import {Control, IControlParams} from "./Control";
import {Camera} from "../camera/Camera";
import {Framebuffer} from "../webgl/Framebuffer";

export interface ICameraFrameHadler {
    camera: Camera,
    frameBuffer: Framebuffer,
    handler: (camera?: Camera) => void
}

export interface ICameraFrameComposerParams extends IControlParams {

}

export class CameraFrameHandler {
    public camera: Camera;
    public frameBuffer: Framebuffer;
    public handler: (camera?: Camera) => void | null;
    protected _composer: CameraFrameComposer | null;
    protected _composerIndex: number;

    constructor(params: ICameraFrameHadler) {
        this.camera = params.camera;
        this.frameBuffer = params.frameBuffer;
        this.handler = params.handler || null;
        this._composer = null;
        this._composerIndex = -1;
    }

    public addTo(composer: CameraFrameComposer) {
        if (!this._composer) {
            this._composer = composer;
            this._composerIndex = composer.handlers.length;
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
        if (this.handler) {
            this.frameBuffer.activate();
            this.handler(this.camera);
            this.frameBuffer.deactivate();
        }
    }
}

export class CameraFrameComposer extends Control {

    protected _handlers: CameraFrameHandler[];

    constructor(params: ICameraFrameComposerParams) {
        super({
            name: "CameraFrameComposer",
            autoActivate: true,
            ...params
        });

        this._handlers = [];
    }

    public get handlers(): CameraFrameHandler[] {
        return [...this._handlers];
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
        for (let i = 0; i < this._handlers.length; i++) {
            this._handlers[i].frame();
        }
    }
}