goog.provide('og.control.ShowFps');

goog.require('og.inheritance');
goog.require('og.control.BaseControl');

og.control.ShowFps = function (options) {
    og.inheritance.base(this, options);
};

og.inheritance.extend(og.control.ShowFps, og.control.BaseControl);

og.control.ShowFps.prototype.initialize = function () {
    var d = document.createElement('div');
    d.className = 'defaultText ';
    d.id = "ogShowFpsControl";
    document.body.appendChild(d);
    this.renderer.events.on("draw", this, this.draw);
};


og.control.ShowFps.prototype.draw = function () {
    print2d("ogShowFpsControl", (1000.0 / this.renderer.handler.deltaTime).toFixed(1), this.renderer.handler.gl.canvas.clientWidth - 60, 0);
};

