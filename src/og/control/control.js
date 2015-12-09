goog.provide('og.control.Control');

/*
 * og.control.Control is a base class for implementing renderer controls.
 * All other controls extend from this class.
 *
 * @class
 * @params {*} options - Control activation options.
 */
og.control.Control = function (options) {
    this.renderer = null;
    this.activated = false;
    if (options) {
        this.autoActivate = options.autoActivate ? options.autoActivate : false;
        this.active = options.active ? options.active : false;
    }
};

og.control.Control.prototype.setRenderer = function (renderer) {
    this.renderer = renderer;
    if (this.autoActivate) {
        this.initialize();
        this.active = true;
    }
};

og.control.Control.prototype.initialize = function () {
    if (this.init) {
        this.init();
    }
    this.activated = true;
};

og.control.Control.prototype.activate = function () {
    this.active = true;
};

og.control.Control.prototype.deactivate = function () {
    this.active = false;
};