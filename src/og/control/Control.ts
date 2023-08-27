import { Planet, Renderer } from "../index";

/**
 * Base control class for implementing renderer controls.
 * All other controls extend from this class.
 */
export class Control {
    _id = 0;
    _name: string;
    planet: Planet | null;
    _initialized: boolean;
    renderer: any;
    autoActivate: any;
    _active: boolean;
    static __counter = 0;

    /**
     * @param {Boolean} [options.autoActivated=true] - If true - calls initialize function after the renderer assigning.
     */
    constructor(options: { name?: string, autoActivate?: boolean } = {}) {

        this._id = Control.__counter++;

        this._name = options.name || "_control_" + this._id;

        this.planet = null;

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
        this.autoActivate = options.autoActivate || false;

        /**
         * Control activity.
         * @protected
         * @type {Boolean}
         */
        this._active = false;
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
    oninit() {
    }

    /**
     * Control renderer assigning function have to be overriden.
     * @public
     * @virtual
     */
    onadd() {
    }

    /**
     * Control remove function have to be overriden.
     * @public
     * @virtual
     */
    onremove() {
    }

    /**
     * Control activation function have to be overriden.
     * @public
     * @virtual
     */
    onactivate() {
    }

    /**
     * Control deactivation function have to be overriden.
     * @public
     * @virtual
     */
    ondeactivate() {
    }

    /**
     * Assign renderer to the control.
     * @public
     * @type {Renderer}
     */
    addTo(renderer: Renderer) {
        if (renderer) {
            this.renderer = renderer;
            renderer.controls[this.name] = this;
            this.onadd && this.onadd();
            if (renderer.isInitialized()) {
                this._initialized = true;
                this.oninit && this.oninit();
                if (this.autoActivate) {
                    this.activate();
                }
            }
        }
    }

    /**
     * Assign renderer to the control.
     * @public
     */
    remove() {

        this.deactivate();

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
        if (!this._active) {
            if (!this._initialized) {
                this._initialized = true;
                this.oninit && this.oninit();
            }
            this._active = true;
            this.onactivate && this.onactivate();
        }
    }

    /**
     * Deactivate control.
     * @public
     */
    deactivate() {
        if (this._active) {
            this._active = false;
            this.ondeactivate && this.ondeactivate();
        }
    }

    /**
     * Is control active.
     * @public
     */
    isActive() {
        return this._active;
    }

    isEqual(control: any) {
        return control._id === this._id;
    }
}
