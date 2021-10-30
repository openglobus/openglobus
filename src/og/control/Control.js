/**
 * @module og/control/Control
 */

'use strict';

/**
 * Base control class for implementing renderer controls.
 * All other controls extend from this class.
 * @class
 * @param {Object} [options] - Control activation options:
 * @param {Boolean} [options.autoActivated=true] - If true - calls initialize function after the renderer assigning.
 */
class Control {
    constructor(options) {
        options = options || {};

        this._id = Control.__staticCounter++;

        this._name = options.name || "_control_" + this._id;

        /**
         * Control initialized.
         * @protected
         * @type {Boolean}
         */
        this._initialized = false;

        /**
         * Assigned renderer.
         * @public
         * @type {Renderer}
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

    static get __staticCounter() {
        if (!this.__counter && this.__counter !== 0) {
            this.__counter = 0;
        }
        return this.__counter;
    }

    static set __staticCounter(n) {
        this.__counter = n;
    }

    /**
     * Returns control name.
     * @public
     * @virtual
     */
    get name() {
        return this._name;
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
     * @type {Renderer}
     */
    addTo(renderer) {
        if (renderer) {
            this.renderer = renderer;
            renderer.controls[this.name] = this;
            this.onadd && this.onadd();
            if (this.autoActivate) {
                this._initialized = true;
                this.oninit && this.oninit();
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

        let r = this.renderer,
            n = this.name;

        if (!r) return;

        let c = r.controls[n];

        if (c) {
            if (this.isEqual(c)) {
                r.controls[n] = null;
                delete r.controls[n];
            }
        }

        this.renderer = null;
        this._active = false;
        this._initialized = false;
    }

    /**
     * Activate control.
     * @public
     */
    activate() {
        if (!this._initialized) {
            this._initialized = true;
            this.oninit && this.oninit();
        }
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

    isEqual(control) {
        return control._id === this._id;
    }
}

export { Control };