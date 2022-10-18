/**
 * @module og/control/Ruler
 */

"use strict";

import { Control } from "./Control.js";
import { Ruler } from "./ruler/Ruler.js";
import { elementFactory, btnClickHandler } from "./UIhelpers.js";

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
        let btn = elementFactory(
            'div',
            { id: 'og-ruler-menu-btn', class: 'og-ruler og-menu-btn og-OFF' },
            elementFactory(
                'div',
                { id: 'og-ruler-menu-icon', class: 'og-icon-holder' }
            )
        );

        this.renderer.div.appendChild(btn);

        btn.addEventListener('click', () => {
            if (btn.classList.contains('og-OFF')) {
                this.onactivate();
            } else {
                this.ondeactivate();
            }
        });

        btnClickHandler(
            btn,
            null,
            null,
            '#og-ruler-menu-icon'
        );
    }
}

export { RulerSwitcher };

