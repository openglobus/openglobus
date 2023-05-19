/**
 * @module og/control/Ruler
 */

"use strict";

import { Control } from "../Control.js";
import { DrawingScene } from "./DrawingScene.js";

/**
 * Activate drawing
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class DrawingControl extends Control {
    constructor(options = {}) {
        super(options);

        this._drawingScene = new DrawingScene({
            name: `drawingScene:${this._id}`
        });
    }

    oninit() {
        this._drawingScene.bindPlanet(this.planet);
    }

    onactivate() {
        this.renderer.addNode(this._drawingScene);
    }

    ondeactivate() {
        this.renderer.removeNode(this._drawingScene);
    }
}

export { DrawingControl };
