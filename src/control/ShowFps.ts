import { Control } from "./Control";
import type { IControlParams } from "./Control";

const UPDATE_INTERVAL = 500;

const MAX_MEASURE_TIME = UPDATE_INTERVAL * 4;

/**
 * Frames per second(FPS) display control. It looks like a map button in the top right
 * corner and shows the current frame rate instead of an icon.
 *
 * Note that the rate is measured by the control itself and not taken from
 * {@link Handler#deltaTime}, which is clamped and does not represent the real frame time.
 * @class
 * @extends {Control}
 */
export class ShowFps extends Control {
    public el: HTMLDivElement | null;

    protected _frames: number;
    protected _measureStart: number;

    constructor(options: IControlParams = {}) {
        super({ name: "ShowFps", ...options });

        this.el = null;
        this._frames = 0;
        this._measureStart = 0;
    }

    public override oninit() {
        this.el = document.createElement("div");
        this.el.classList.add("og-map-button", "og-fps-button");
        this.el.title = "Frames per second";
        this.el.innerText = "--";

        this.renderer!.topRightContainer().appendChild(this.el);

        this._frames = 0;
        this._measureStart = window.performance.now();

        this.renderer!.events.on("predraw", this._draw);
    }

    public override onremove() {
        this.renderer && this.renderer.events.off("predraw", this._draw);

        if (this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }

        this.el = null;
    }

    protected _draw = () => {
        if (!this.el) return;

        this._frames++;

        let now = window.performance.now();
        let elapsed = now - this._measureStart;

        if (elapsed >= UPDATE_INTERVAL) {
            if (elapsed <= MAX_MEASURE_TIME) {
                this.el.innerText = ((this._frames * 1000) / elapsed).toFixed(0);
            }
            this._frames = 0;
            this._measureStart = now;
        }
    };
}
