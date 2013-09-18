og.control.ShowFps = function (options) {
    og.control.ShowFps.superclass.constructor.call(this, options);
};

og._class_.extend(og.control.ShowFps, og.control.Control);

og.control.ShowFps.prototype.draw = function () {
    print2d("lbFps", this.renderer.ctx.fps.toFixed(1), this.renderer.ctx.gl._viewportWidth - 40, 0);
};

