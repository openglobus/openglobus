goog.provide('og.control.MousePosition');

goog.require('og.control.Control');
goog.require('og.planetSegment');
goog.require('og.mercator');

og.control.MousePosition = function (options) {
    og.base(this, options);
    this.displayType = 0;
    this.converter = og.control.MousePosition.DisplayTypesConverters[0];
    this.display = null;
};

og.extend(og.control.MousePosition, og.control.Control);

og.control.MousePosition.toDecimal = function (ll) {
    var str = ll.lat.toFixed(5) + ", " + ll.lon.toFixed(5);
    return str;
};

og.control.MousePosition.toDegrees = function (ll) {
    var str = og.control.MousePosition.dec2deg(ll.lat) + ", " + og.control.MousePosition.dec2deg(ll.lon);
    return str;
};

og.control.MousePosition.toMercator = function (ll) {
    var m = og.mercator.forwardMercator(ll.lon, ll.lat);
    var str = m.lat.toFixed(5) + ", " + m.lon.toFixed(5);
    return str;
};

og.control.MousePosition.DisplayTypesConverters = [og.control.MousePosition.toDecimal, og.control.MousePosition.toDegrees, og.control.MousePosition.toMercator];

og.control.MousePosition.dec2deg = function (base) {
    var t, t2;
    var degrees = base < 0 ? Math.ceil(base) : Math.floor(base);
    var minutes = Math.floor(t = Math.abs((base - degrees)) * 60);
    var seconds = Math.floor(t2 = (t - minutes) * 6000);
    seconds = seconds / 100.00;
    return (og.control.MousePosition.numToFixedString(degrees, 3) + "\u00B0" +
        og.control.MousePosition.numToFixedString(minutes, 2) + "\u0027" +
        og.control.MousePosition.numToFixedString(seconds.toFixed(2), 2) + "\u0022");
};

og.control.MousePosition.numToFixedString = function (num, fixed) {
    var dl = num.toString().split('.')[0].length;
    var white = "&nbsp;";
    for (var i = dl; i < fixed; i++) {
        white += '&nbsp;&nbsp;';
    }
    return white + num.toString();
};

og.control.MousePosition.prototype.init = function () {
    this.display = document.createElement('div');
    this.display.className = 'ogMousePositionControl';
    var that = this;
    this.display.onclick = function (e) {
        that.displayType += 1;
        if (that.displayType >= og.control.MousePosition.DisplayTypesConverters.length)
            that.displayType = 0;
        that.converter = og.control.MousePosition.DisplayTypesConverters[that.displayType];
    };
    document.body.appendChild(this.display);

    this.renderer.addEvent("ondraw", this, this.draw);
};

og.control.MousePosition.prototype.draw = function () {
    var planetNode = this.renderer.renderNodes.Earth;

    if (planetNode.mousePositionOnEarth) {
        var ll = planetNode.ellipsoid.ECEF2LonLat(planetNode.mousePositionOnEarth.z, planetNode.mousePositionOnEarth.x, planetNode.mousePositionOnEarth.y);
        this.display.innerHTML = "Lat/Lon: " + this.converter(ll);
    } else {
        this.display.innerHTML = "Lat/Lon: " + "_____________________";
    }
};