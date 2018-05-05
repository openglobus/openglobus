/**
 * @module og/control/ToggleWireframe
 */

'use strict';

import { Control } from './Control.js';
import { input } from '../input/input.js';

/**
 * Planet GL draw mode(TRIANGLE_STRIP/LINE_STRING) changer.
 * @class
 * @extends {og.control.Control}
 * @param {Object} [options] - Control options.
 */
class ToggleWireframe extends Control {
    constructor(options) {
        super(options);
    }


    oninit() {
        this.renderer.events.on("charkeypress", input.KEY_X, this.toogleWireframe, this);
    }

    toogleWireframe(e) {
        if (this.planet.drawMode === this.renderer.handler.gl.LINE_STRIP) {
            this.planet.setDrawMode(this.renderer.handler.gl.TRIANGLE_STRIP);
        } else {
            this.planet.setDrawMode(this.renderer.handler.gl.LINE_STRIP);
        }
    }
};

export { ToggleWireframe };
