goog.provide('og.control.ToggleWireframe');

goog.require('og.inheritance');
goog.require('og.webgl');
goog.require('og.input');

/**
 * Planet GL draw mode(TRIANGLE_STRIP/LINE_STRING) changer.
 * @class
 * @extends {og.control.BaseControl}
 * @param {Object} [options] - Control options.
 */
og.control.ToggleWireframe = function (options) {
    og.inheritance.base(this, options);
};

og.inheritance.extend(og.control.ToggleWireframe, og.control.BaseControl);

og.control.ToggleWireframe.prototype.oninit = function () {
    this.renderer.events.on("charkeypress", this, this.toogleWireframe, og.input.KEY_X);
};

og.control.ToggleWireframe.prototype.toogleWireframe = function (e) {
    if (this.planet.drawMode === this.renderer.handler.gl.LINE_STRIP) {
        this.planet.setDrawMode(this.renderer.handler.gl.TRIANGLE_STRIP);
    } else {
        this.planet.setDrawMode(this.renderer.handler.gl.LINE_STRIP);
    }
};
