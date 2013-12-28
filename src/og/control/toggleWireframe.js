goog.provide('og.control.ToggleWireframe');

goog.require('og.webgl');
goog.require('og.input');
goog.require('og.class');


og.control.ToggleWireframe = function (options) {
    og.class.base(this, options);
};

og.class.extend(og.control.ToggleWireframe, og.control.Control);

og.control.ToggleWireframe.prototype.init = function () {
    this.renderer.input.setEvent("oncharkeypressed", this, null, this.toogleWireframe, og.input.KEY_X);
};

og.control.ToggleWireframe.prototype.toogleWireframe = function (e) {
    if (this.renderer.renderNodes.Earth.drawMode === this.renderer.ctx.gl.LINE_STRIP) {
        this.renderer.renderNodes.Earth.setDrawMode(this.renderer.ctx.gl.TRIANGLE_STRIP);
    } else {
        this.renderer.renderNodes.Earth.setDrawMode(this.renderer.ctx.gl.LINE_STRIP);
    }
};
