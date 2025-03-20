import {Control, IControlParams} from "./Control";

export interface ICameraFrameComposerParams extends IControlParams {

}

export class CameraFrameComposer extends Control {
    constructor(params: ICameraFrameComposerParams) {
        super({
            name: "CameraFrameComposer",
            autoActivate: true,
            ...params
        });
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
    }
}