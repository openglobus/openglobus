goog.provide('og.control.ShowFps');

goog.require('og.inheritance');
goog.require('og.control.BaseControl');

/**
 * Frame per second(FPS) display control.
 * @class
 * @extends {og.control.BaseControl}
 * @param {Object} [options] - Control options.
 */
og.control.ShowFps = function (options) {
    og.inheritance.base(this, options);

    options = options || {};
};

og.inheritance.extend(og.control.ShowFps, og.control.BaseControl);

og.control.showFps = function (options) {
    return new og.control.ShowFps(options);
};

og.control.ShowFps.prototype.oninit = function () {
    var d = document.createElement('div');
    d.className = 'defaultText ';
    d.id = "ogShowFpsControl";
    document.body.appendChild(d);
    this.renderer.events.on("draw", this._draw, this);
};


og.control.ShowFps.prototype._draw = function () {
    print2d("ogShowFpsControl", (1000.0 / this.renderer.handler.deltaTime).toFixed(1), this.renderer.handler.gl.canvas.clientWidth - 60, 0);
};

