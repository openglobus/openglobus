/**
 * @module og/control/Ruller
 */

"use strict";

import { Control } from "../Control.js";
import { RullerScene } from "./RullerScene.js";

/**
 * Activate ruller
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class Ruller extends Control {
    constructor(options = {}) {
        super(options);

        this._rullerScene = new RullerScene({
            name: `rullerScene:${this._id}`,
        });
    }

    oninit() {
        this._rullerScene.bindPlanet(this.planet);
        this.activate();
    }

    onactivate() {
        this.renderer.addNode(this._rullerScene);
    }

    ondeactivate() {
        this.renderer.removeNode(this._rullerScene);
    }
}

export { Ruller };
