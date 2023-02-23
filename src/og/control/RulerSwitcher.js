/**
 * @module og/control/Ruler
 */

"use strict";

import { Control } from "./Control.js";
import { Ruler } from "./ruler/Ruler.js";
import { ToggleButton } from "../ui/ToggleButton.js";

const ICON_BUTTON_SVG = `<?xml version="1.0" encoding="iso-8859-1"?>
<!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->
<svg fill="#000000" height="800px" width="800px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
\t viewBox="0 0 512 512" xml:space="preserve">
<g>
\t<g>
\t\t<path d="M369.151,0L0.001,369.15L142.85,512l369.149-369.15L369.151,0z M47.286,369.15l10.908-10.908l47.782,47.782l23.642-23.642
\t\t\tL81.837,334.6l10.909-10.909l23.711,23.711L140.1,323.76l-23.711-23.711l10.909-10.909l23.711,23.711l23.642-23.642
\t\t\tl-23.711-23.711l10.909-10.909l47.782,47.782l23.642-23.642l-47.782-47.782l10.908-10.908l23.71,23.71l23.642-23.642l-23.71-23.71
\t\t\tl10.908-10.908l23.711,23.711l23.642-23.642l-23.711-23.711l10.909-10.909l47.782,47.782l23.642-23.642l-47.782-47.782
\t\t\tl10.908-10.908l23.71,23.711l23.642-23.642l-23.711-23.71L334.6,81.837l23.711,23.71l23.642-23.642l-23.711-23.712l10.908-10.908
\t\t\tl95.564,95.564L142.85,464.714L47.286,369.15z"/>
\t</g>
</g>
</svg>`;

/**
 * Activate ruler
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class RulerSwitcher extends Control {
    constructor(options = {}) {
        super(options);

        this.ruler = new Ruler({
            ignoreTerrain: options.ignoreTerrain
        });
    }

    oninit() {
        this.planet.addControl(this.ruler);
        this._createMenuBtn();
    }

    onactivate() {
        this.ruler.activate();
    }

    ondeactivate() {
        this.ruler.deactivate();
    }

    _createMenuBtn() {

        let btn = new ToggleButton({
            classList: ["og-map-button", "og-ruler_button"],
            icon: ICON_BUTTON_SVG,
            appendTo: this.renderer.div
        });

        btn.on("change", (isActive) => {
            if (isActive) {
                this.onactivate();
            } else {
                this.ondeactivate();
            }
        });
    }
}

export { RulerSwitcher };

