goog.provide('og.control.ShowFps');

goog.require('og.control.Control');
goog.require('og._class_');

og.control.ShowFps = function (options) {
    og.control.ShowFps.superclass.constructor.call(this, options);
};

og._class_.extend(og.control.ShowFps, og.control.Control);

og.control.ShowFps.prototype.init = function () {
    var d = document.createElement('div');
    d.className = 'defaultText ';
    d.id = "ogShowFpsControl";
    document.body.appendChild(d);
};


og.control.ShowFps.prototype.draw = function () {
    print2d("ogShowFpsControl", this.renderer.ctx.fps.toFixed(1), this.renderer.ctx.gl._viewportWidth - 40, 0);
};

