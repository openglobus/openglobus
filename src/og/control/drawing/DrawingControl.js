/**
 * @module og/control/Ruler
 */

"use strict";

import { Control } from "../Control.js";
import { PolygonDrawingScene } from "./PolygonDrawingScene.js";
import { LineStringDrawingScene } from "./LineStringDrawingScene.js";

/**
 * Activate drawing
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class DrawingControl extends Control {
    constructor(options = {}) {
        super(options);

        this._drawingScene = new LineStringDrawingScene({
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
