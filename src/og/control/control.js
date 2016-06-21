goog.provide('og.control.Control');

/*
 * Base control class for implementing renderer controls.
 * All other controls extend from this class.
 * @class
 * @params {Object} [options] - Control activation options:
 * @param {Boolean} [options.autoActivated] - If true - calls initialize function after the renderer assigning.
 * @param {Boolean} [options.active] - Control activity.
 */
og.control.Control = function (options) {
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
    this.autoActivate = options.autoActivate || false;

    /**
     * Control activity.
     * @public
     * @type {Boolean}
     */
    this.active = options.active || false;
};

/**
 * Control Initialization function have to be overriden.
 * @public
 * @abstract
 */
og.control.Control.prototype.initialize = function () { }

/**
 * Assign renderer to the control.
 * @public
 * @type {og.Renderer}
 */
og.control.Control.prototype.setRenderer = function (renderer) {
    this.renderer = renderer;
    if (this.autoActivate) {
        this.initialize && this.initialize();
        this._initialized = true;
        this.active = true;
    }
};

/**
 * Activate control.
 * @public
 */
og.control.Control.prototype.activate = function () {
    this.active = true;
};

/**
 * Deactivate control.
 * @public
 */
og.control.Control.prototype.deactivate = function () {
    this.active = false;
};