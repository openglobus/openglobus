goog.provide('og.control.ShowFps');

goog.require('og.control.Control');
goog.require('og.class');

og.control.ShowFps = function (options) {
    og.class.base(this, options);
};

og.class.extend(og.control.ShowFps, og.control.Control);

og.control.ShowFps.prototype.init = function () {
    var d = document.createElement('div');
    d.className = 'defaultText ';
    d.id = "ogShowFpsControl";
    document.body.appendChild(d);
    this.renderer.addEvent("ondraw", this, this.draw);
};


og.control.ShowFps.prototype.draw = function () {
    print2d("ogShowFpsControl", this.renderer.handler.fps.toFixed(1), this.renderer.handler.gl._viewportWidth - 40, 0);
};

