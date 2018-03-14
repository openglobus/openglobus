/**
 * @module og/control/BaseControl
 */

'use strict';

/**
 * Base control class for implementing renderer controls.
 * All other controls extend from this class.
 * @class
 * @param {Object} [options] - Control activation options:
 * @param {Boolean} [options.autoActivated=true] - If true - calls initialize function after the renderer assigning.
 */
class BaseControl {
    constructor(options) {
        options = options || {};

        /**
         * Control initialized.
         * @protected
         * @type {Boolean}
         */
        this._initialized = false;

        /**
         * Assigned renderer.
         * @public
         * @type {og.Renderer}
         */
        this.renderer = null;

        /**
         * Auto activation flag.
         * @public
         * @type {Boolean}
         */
        this.autoActivate = options.autoActivate != undefined ? options.autoActivate : true;

        /**
         * Control activity.
         * @protected
         * @type {Boolean}
         */
        this._active = false;
    }

    /**
     * Control initialization function have to be overriden.
     * @public
     * @virtual
     */
    oninit() { }

    /**
     * Control renderer assigning function have to be overriden.
     * @public
     * @virtual
     */
    onadd() { }

    /**
     * Control remove function have to be overriden.
     * @public
     * @virtual
     */
    onremove() { }

    /**
     * Control activation function have to be overriden.
     * @public
     * @virtual
     */
    onactivate() { }

    /**
     * Control deactivation function have to be overriden.
     * @public
     * @virtual
     */
    ondeactivate() { }

    /**
     * Assign renderer to the control.
     * @public
     * @type {og.Renderer}
     */
    addTo(renderer) {
        if (renderer) {
            this.renderer = renderer;
            renderer.controls.push(this);
            this.onadd && this.onadd();
            if (this.autoActivate) {
                this.oninit && this.oninit();
                this._initialized = true;
                this._active = true;
            }
        }
    }

    /**
     * Assign renderer to the control.
     * @public
     */
    remove() {
        this.onremove && this.onremove();
        this.renderer = null;
        this._active = false;
        this._initialized = false;
    }

    /**
     * Activate control.
     * @public
     */
    activate() {
        this._active = true;
        this.onactivate && this.onactivate();
    }

    /**
     * Deactivate control.
     * @public
     */
    deactivate() {
        this._active = false;
        this.ondeactivate && this.ondeactivate();
    }

    /**
     * Is control active.
     * @public
     */
    isActive() {
        return this._active;
    }
};

export { BaseControl };