import {input} from "../input/input";
import {Control, IControlParams} from "./Control";

interface IToggleWireframe extends IControlParams {
    isActive?: boolean;
}

/**
 * Planet GL draw mode(TRIANGLE_STRIP/LINE_STRING) changer.
 */
export class ToggleWireframe extends Control {
    protected _isActive = false;

    constructor(options: IToggleWireframe = {}) {
        super(options);
        this._isActive = options.isActive || false;
    }

    public override oninit() {
        this.renderer!.events.on("charkeypress", input.KEY_X, this.toogleWireframe, this);
        if (this._isActive) {
            this.planet!.setDrawMode(this.renderer!.handler.gl!.LINE_STRIP);
        }
    }

    public toogleWireframe = () => {
        if (this.renderer && this.renderer.handler.gl) {
            if (this.planet!.drawMode === this.renderer.handler.gl.LINE_STRIP) {
                this.planet!.setDrawMode(this.renderer.handler.gl.TRIANGLE_STRIP);
            } else {
                this.planet!.setDrawMode(this.renderer.handler.gl.LINE_STRIP);
            }
        }
    }
}
