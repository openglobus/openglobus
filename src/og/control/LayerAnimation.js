/**
 * @module og/control/LayerAnimation
 */

"use strict";

import { Control } from "./Control.js";

/**
 *
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class LayerAnimation extends Control {
    constructor(options = {}) {
        super(options);

        this._name = "layerAnimation";
    }

    oninit() {

    }

    onactivate() {
        this._stopped = false;
    }
}

export function layerAnimation(options) {
    return LayerAnimation(options);
}

export { LayerAnimation };
