/**
 * Class Control
 * Controls affect the display or behaviour of the render. They allow everything
 * from navigating to displaying a scale indicator.
 * Example:
 *
 * >
 * >
 * >
 */

og.control = function() { };

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

og.control.Control.prototype.everyFrame = function () {
    if (this.active) {
        if (this.activated) {
            if (this.draw) {
                this.draw();
            }
        } else {
            this.initialize();
        }
    }
};