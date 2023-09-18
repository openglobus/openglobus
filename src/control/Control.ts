import {Planet, Renderer} from "../index";

export interface IControlParams {
    name?: string;
    autoActivate?: boolean
}

/**
 * Base control class. All other controls extend from this class.
 * @class Control
 * @param {Boolean} [options.autoActivate=true] - If true - calls initialize function after the renderer assigning.
 */
export class Control {
    static __counter__: number = 0;
    protected __id: number;
    protected _name: string;

    /**
     * Control activity.
     * @protected
     * @type {boolean}
     */
    protected _active: boolean;

    /**
     * Control initialized.
     * @protected
     * @type {boolean}
     */
    protected _initialized: boolean;

    public planet: Planet | null;

    /**
     * Assigned renderer.
     * @public
     * @type {Renderer}
     */
    public renderer: Renderer | null;

    /**
     * Auto activation flag.
     * @public
     * @type {boolean}
     */
    public autoActivate: boolean;

    protected _deferredActive: boolean;

    constructor(options: IControlParams = {}) {

        this.__id = Control.__counter__++;

        this._name = options.name || `_control_${this.__id.toString()}`;

        this.planet = null;

        this._initialized = false;

        this.renderer = null;

        this.autoActivate = options.autoActivate || false;

        this._active = false;

        this._deferredActive = true;
    }

    /**
     * Returns control name.
     * @public
     * @return {string} -
     */
    public get name(): string {
        return this._name;
    }

    /**
     * Control initialization function have to be overridden.
     * @public
     */
    public oninit() {
    }

    /**
     * Control renderer assigning function have to be overridden.
     * @public
     */
    public onadd() {
    }

    /**
     * Control remove function have to be overridden.
     * @public
     */
    public onremove() {
    }

    /**
     * Control activation function have to be overridden.
     * @public
     */
    public onactivate() {
    }

    /**
     * Control deactivation function have to be overriden.
     * @public
     */
    public ondeactivate() {
    }

    /**
     * Assign renderer to the control.
     * @public
     * @type {Renderer}
     */
    public addTo(renderer: Renderer) {
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
     * Removes control.
     * @public
     */
    public remove() {

        this.deactivate();

        this.onremove && this.onremove();

        let r = this.renderer,
            n = this.name;

        if (!r) return;

        let c = r.controls[n];

        if (c) {
            if (this.isEqual(c)) {
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
    public activate() {
        if (!this._active) {
            if (!this._initialized) {
                this._initialized = true;
                this.oninit && this.oninit();
            }
            if (this._deferredActive) {
                this._active = true;
                this.onactivate && this.onactivate();
            } else {
                this._deferredActive = true;
            }
        }
    }

    /**
     * Deactivate control.
     * @public
     */
    public deactivate() {
        if (this._active) {
            this._active = false;
            this.ondeactivate && this.ondeactivate();
        } else if (!this._initialized) {
            this._deferredActive = false;
        }
    }

    /**
     * Is control active.
     * @public
     */
    public isActive(): boolean {
        return this._active;
    }

    public isEqual(control: Control): boolean {
        return control.__id === this.__id;
    }
}
