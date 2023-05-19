"use strict";

import { ToggleButton } from "../ui/ToggleButton.js";
import { Control } from "./Control.js";
import { DrawingControl } from "./drawing/DrawingControl.js";

const ICON_BUTTON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><circle cx="120" cy="48" r="24" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="40" cy="120" r="24" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="160" cy="208" r="24" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="208" cy="72" r="24" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="184.8" y1="65.7" x2="143.2" y2="54.3" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="102.2" y1="64.1" x2="57.8" y2="103.9" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="59.4" y1="134.2" x2="140.6" y2="193.8" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="168" y1="185.4" x2="200" y2="94.6" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>`;

/**
 * Activate drawing control
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class DrawingSwitcher extends Control {
    constructor(options = {}) {
        super({
            name: "DrawingSwitcher",
            ...options
        });

        this.drawingControl = new DrawingControl();
    }

    oninit() {
        this.planet.addControl(this.drawingControl);
        this._createMenuBtn();
    }

    onactivate() {
        this.drawingControl.activate();
    }

    ondeactivate() {
        this.drawingControl.deactivate();
    }

    _createMenuBtn() {

        let btn = new ToggleButton({
            classList: ["og-map-button", "og-drawing_button"],
            icon: ICON_BUTTON_SVG
        });

        btn.appendTo(this.renderer.div);

        btn.on("change", (isActive) => {
            if (isActive) {
                this.onactivate();
            } else {
                this.ondeactivate();
            }
        });
    }
}

export { DrawingSwitcher };

