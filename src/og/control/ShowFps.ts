import { print2d } from "../utils/shared";
import { Control } from "./Control";

/**
 * Frame per second(FPS) display control.
 */
export class ShowFps extends Control {
    constructor(options: any) {
        super(options);
    }

    override oninit() {
        var d = document.createElement("div");
        d.className = "defaultText ";
        d.id = "ogShowFpsControl";
        document.body.appendChild(d);
        this.renderer.events.on("draw", this._draw, this);
    }

    _draw() {
        print2d(
            "ogShowFpsControl",
            (1000.0 / this.renderer.handler.deltaTime).toFixed(1),
            this.renderer.handler.canvas.clientWidth - 60,
            0
        );
    }
}

/**
 * @deprecated
 */
export function showFps(options: any) {
    return new ShowFps(options);
}
