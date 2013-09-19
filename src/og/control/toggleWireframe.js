goog.provide('og.control.ToggleWireframe');

goog.require('og.webgl');
goog.require('og.input');
goog.require('og._class_');


og.control.ToggleWireframe = function (options) {
    og.control.ToggleWireframe.superclass.constructor.call(this, options);
};

og._class_.extend(og.control.ToggleWireframe, og.control.Control);

og.control.ToggleWireframe.prototype.init = function () {
    this.renderer.input.setEvent("oncharkeypressed", this, null, this.toogleWireframe, og.input.KEY_X);
};

og.control.ToggleWireframe.prototype.toogleWireframe = function (e) {
    if (this.renderer.renderNodes[0].drawMode === og.webgl.GL_LINE_STRIP) {
        this.renderer.renderNodes[0].setDrawMode(og.webgl.GL_TRIANGLE_STRIP);
    } else {
        this.renderer.renderNodes[0].setDrawMode(og.webgl.GL_LINE_STRIP);
    }
};
