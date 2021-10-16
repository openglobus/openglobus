/**
 * @module og/control/ShowFps
 */

'use strict';

import { Control } from './Control.js';
import { print2d } from '../utils/shared.js';

/**
 * Frame per second(FPS) display control.
 * @class
 * @extends {og.control.Control}
 * @param {Object} [options] - Control options.
 */
class ShowFps extends Control {
    constructor(options) {
        super(options);
    }

    oninit() {
        var d = document.createElement('div');
        d.className = 'defaultText ';
        d.id = "ogShowFpsControl";
        document.body.appendChild(d);
        this.renderer.events.on("draw", this._draw, this);
    }
    
    _draw() {
        print2d("ogShowFpsControl", (1000.0 / this.renderer.handler.deltaTime).toFixed(1), this.renderer.handler.canvas.clientWidth - 60, 0);
    }
}

export function showFps(options) {
    return new ShowFps(options);
}

export { ShowFps };
