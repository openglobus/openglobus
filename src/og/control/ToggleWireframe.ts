import { input } from "../input/input";
import { Control } from "./Control";

/**
 * Planet GL draw mode(TRIANGLE_STRIP/LINE_STRING) changer.
 */
export class ToggleWireframe extends Control {
    _isActive = false;

    constructor(options: { name?: string, autoActivate?: boolean, isActive?: boolean } = {}) {
        super(options);
        this._isActive = options.isActive || false;
    }

    override oninit() {
        this.renderer.events.on("charkeypress", input.KEY_X, this.toogleWireframe, this);
        if (this._isActive) {
            this.planet!.setDrawMode(this.renderer.handler.gl.LINE_STRIP);
        }
    }

    toogleWireframe(e: any) {
        if (this.planet!.drawMode === this.renderer.handler.gl.LINE_STRIP) {
            this.planet!.setDrawMode(this.renderer.handler.gl.TRIANGLE_STRIP);
        } else {
            this.planet!.setDrawMode(this.renderer.handler.gl.LINE_STRIP);
        }
    }
}
