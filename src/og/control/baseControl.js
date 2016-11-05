goog.provide('og.control.BaseControl');

/**
 * Base control class for implementing renderer controls.
 * All other controls extend from this class.
 * @class
 * @param {Object} [options] - Control activation options:
 * @param {Boolean} [options.autoActivated=true] - If true - calls initialize function after the renderer assigning.
 * @param {Boolean} [options.active] - Control activity.
 */
og.control.BaseControl = function (options) {
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
     * @public
     * @type {Boolean}
     */
    this.active = options.active || false;
};

/**
 * Control initialization function have to be overriden.
 * @public
 * @virtual
 */
og.control.BaseControl.prototype.oninit = function () { }

/**
 * Control renderer assigning function have to be overriden.
 * @public
 * @virtual
 */
og.control.BaseControl.prototype.onadd = function () { }

/**
 * Control remove function have to be overriden.
 * @public
 * @virtual
 */
og.control.BaseControl.prototype.onremove = function () { }

/**
 * Control activation function have to be overriden.
 * @public
 * @virtual
 */
og.control.BaseControl.prototype.onactivate = function () { }

/**
 * Control deactivation function have to be overriden.
 * @public
 * @virtual
 */
og.control.BaseControl.prototype.ondeactivate = function () { }

/**
 * Assign renderer to the control.
 * @public
 * @type {og.Renderer}
 */
og.control.BaseControl.prototype.addTo = function (renderer) {
    this.renderer = renderer;
    renderer.controls.push(this);
    this.onadd && this.onadd();
    if (this.autoActivate) {
        this.oninit && this.oninit();
        this._initialized = true;
        this.active = true;
    }
};

/**
 * Assign renderer to the control.
 * @public
 */
og.control.BaseControl.prototype.remove = function () {
    this.onremove && this.onremove();
    this.renderer = null;
    this.active = false;
    this._initialized = false;
};

/**
 * Activate control.
 * @public
 */
og.control.BaseControl.prototype.activate = function () {
    this.active = true;
    this.onactivate && this.onactivate();
};

/**
 * Deactivate control.
 * @public
 */
og.control.BaseControl.prototype.deactivate = function () {
    this.active = false;
    this.ondeactivate && this.ondeactivate();
};