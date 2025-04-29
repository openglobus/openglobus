import {Control, IControlParams} from "./Control";
import {Vector} from "../layer";
import {CameraFrameHandler} from "./CameraFrameHandler";

export interface ICameraFrameComposerParams extends IControlParams {
    frameHandlers?: CameraFrameHandler[]
}

export class CameraFrameComposer extends Control {

    protected _frameHandlers: CameraFrameHandler[];
    protected _cameraLayer: Vector;

    constructor(params: ICameraFrameComposerParams = {}) {
        super({
            name: "CameraFrameComposer",
            autoActivate: true,
            ...params
        });

        this._cameraLayer = new Vector("Cameras", {
            pickingEnabled: false,
            scaleByDistance: [100, 1000000, 1.0]
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
        for (let i = 0, len = this._frameHandlers.length; i < len; i++) {
            this._frameHandlers[i].frame();
        }
    }
}