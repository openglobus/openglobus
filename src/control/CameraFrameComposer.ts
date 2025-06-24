import {Control, IControlParams} from "./Control";
import {CameraFrameHandler} from "./CameraFrameHandler";
import {EntityCollection} from "../entity";
import {RenderNode} from '../scene/RenderNode';

export interface ICameraFrameComposerParams extends IControlParams {
    frameHandlers?: CameraFrameHandler[]
}

export class CameraFrameComposer extends Control {

    public readonly _frameHandlers: CameraFrameHandler[];
    protected _cameraLayer: EntityCollection;
    protected _cameraScene: RenderNode;

    constructor(params: ICameraFrameComposerParams = {}) {
        super({
            name: "CameraFrameComposer",
            autoActivate: true,
            ...params
        });

        this._cameraLayer = new EntityCollection({
            scaleByDistance: [100, 1000000, 1.0],
            pickingEnabled: false,
        });

        this._cameraScene = new RenderNode("CameraScene");

        this._frameHandlers = params.frameHandlers || [];
    }

    public get frameHandlers(): CameraFrameHandler[] {
        return [...this._frameHandlers];
    }

    public add(handler: CameraFrameHandler) {
        handler.addTo(this);
        this._cameraLayer.add(handler.cameraEntity);
    }

    public override oninit() {
        super.oninit();
        this._cameraLayer.addTo(this._cameraScene);
    }

    public override activate() {
        super.activate();
        if (this.renderer) {
            this.renderer.events.on("postdraw", this._onPostdraw);
            this.renderer.addNode(this._cameraScene);
        }
    }

    public override deactivate() {
        super.deactivate();
        if (this.renderer) {
            this.renderer.events.off("postdraw", this._onPostdraw);
            this.renderer.removeNode(this._cameraScene);
        }
    }

    protected _onPostdraw = () => {
        for (let i = 0, len = this._frameHandlers.length; i < len; i++) {
            this._frameHandlers[i].frame();
        }
    }
}