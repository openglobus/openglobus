/**
 * @module og/control/Ruler
 */

"use strict";

import { Control } from "../Control.js";
import { RulerScene } from "./RulerScene.js";

/**
 * Activate ruler
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class Ruler extends Control {
    constructor(options = {}) {
        super(options);

        this._rulerScene = new RulerScene({
            name: `rulerScene:${this._id}`,
            ignoreTerrain: options.ignoreTerrain
        });
    }

    set ignoreTerrain(v) {
        this._rulerScene.ignoreTerrain = v;
    }

    oninit() {
        this._rulerScene.bindPlanet(this.planet);
    }

    onactivate() {
        this.renderer.addNode(this._rulerScene);
    }

    ondeactivate() {
        this.renderer.removeNode(this._rulerScene);
    }
}

export { Ruler };
