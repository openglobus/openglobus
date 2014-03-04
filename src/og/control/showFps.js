goog.provide('og.control.ShowFps');

goog.require('og.inheritance');
goog.require('og.control.Control');

og.control.ShowFps = function (options) {
    og.inheritance.base(this, options);
};

og.inheritance.extend(og.control.ShowFps, og.control.Control);

og.control.ShowFps.prototype.init = function () {
    var d = document.createElement('div');
    d.className = 'defaultText ';
    d.id = "ogShowFpsControl";
    document.body.appendChild(d);
    this.renderer.events.on("ondraw", this, this.draw);
};


og.control.ShowFps.prototype.draw = function () {
    print2d("ogShowFpsControl", this.renderer.handler.fps.toFixed(1), this.renderer.handler.gl.canvas.width - 40, 0);
};

