goog.provide('og.control.MousePosition');

goog.require('og.control.Control');
goog.require('og.planetSegment');
goog.require('og._class_');

og.control.MousePosition = function (options) {
    og.control.MousePosition.superclass.constructor.call(this, options);
    this.displayType = 0;
    this.converter = og.control.MousePosition.DisplayTypesConverters[0];
};

og._class_.extend(og.control.MousePosition, og.control.Control);

og.control.MousePosition.toDecimal = function (ll) {
    var str = ll[0].toFixed(5) + " " + ll[1].toFixed(5);
    return str;
};

og.control.MousePosition.toDegrees = function (ll) {
    var str = og.control.MousePosition.dec2deg(ll[0]) + " " + og.control.MousePosition.dec2deg(ll[1]);
    return str;
};

og.control.MousePosition.toMercator = function (ll) {
    var m = og.planetSegment.forwardMercator(ll[1], ll[0]);
    var str = m[1].toFixed(5) + " " + m[0].toFixed(5);
    return str;
};

og.control.MousePosition.DisplayTypesConverters = [og.control.MousePosition.toDecimal, og.control.MousePosition.toDegrees, og.control.MousePosition.toMercator];

og.control.MousePosition.dec2deg = function (base) {
    var t, t2;
    var degrees = Math.floor(base);
    var minutes = Math.floor(t = (base - degrees) * 60);
    var seconds = Math.floor(t2 = (t - minutes) * 6000);
    seconds = seconds / 100.00;
    return (degrees + "\u00B0&nbsp;" + minutes + "\u0027&nbsp;" + seconds.toFixed(2) + "\u0022");
};

og.control.MousePosition.prototype.init = function () {
    var d = document.createElement('div');
    d.className = 'defaultText';
    var that = this;
    d.onclick = function (e) {
        that.displayType += 1;
        if (that.displayType >= og.control.MousePosition.DisplayTypesConverters.length)
            that.displayType = 0;
        that.converter = og.control.MousePosition.DisplayTypesConverters[that.displayType];
    };

    d.id = "ogMousePositionControl";
    document.body.appendChild(d);
};

og.control.MousePosition.prototype.draw = function () {
    if (this.renderer.mousePositionOnEarth) {
        var ll = this.renderer.renderNodes[0].ellipsoid.ECEF2LatLon(this.renderer.mousePositionOnEarth.z, this.renderer.mousePositionOnEarth.x, this.renderer.mousePositionOnEarth.y);
        print2d("ogMousePositionControl", this.converter(ll), this.renderer.ctx.gl._viewportWidth - 480, this.renderer.ctx.gl._viewportHeight - 35);
    } else {
        print2d("ogMousePositionControl", "_________________________", this.renderer.ctx.gl._viewportWidth - 480, this.renderer.ctx.gl._viewportHeight - 35);
    }
};