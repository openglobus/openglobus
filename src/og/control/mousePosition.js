og.control.MousePosition = function (options) {
    og.control.MouseNavigation.superclass.constructor.call(this, options);
    this.mouseIsMoving = false;
};

og._class_.extend(og.control.MousePosition, og.control.Control);

og.control.MousePosition.prototype.init = function () {
    var d = document.createElement('div');
    d.className = 'defaultText';
    d.id = "ogMousePositionControl";
    document.body.appendChild(d);
};

og.control.MousePosition.prototype.draw = function () {
    if (this.renderer.mousePositionOnEarth) {
        var ll = this.renderer.renderNodes[0].ellipsoid.ECEF2LatLon(this.renderer.mousePositionOnEarth.z, this.renderer.mousePositionOnEarth.x, this.renderer.mousePositionOnEarth.y);
        print2d("ogMousePositionControl", ll[0].toFixed(5) + " " + ll[1].toFixed(5), this.renderer.ctx.gl._viewportWidth - 180, this.renderer.ctx.gl._viewportHeight - 35);
    } else {
        print2d("ogMousePositionControl", "__._____ __._____", this.renderer.ctx.gl._viewportWidth - 180, this.renderer.ctx.gl._viewportHeight - 35);
    }
};