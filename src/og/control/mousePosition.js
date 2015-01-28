goog.provide('og.control.MousePosition');

goog.require('og.inheritance');
goog.require('og.control.Control');
goog.require('og.planetSegment');
goog.require('og.mercator');

og.control.MousePosition = function (options) {
    og.inheritance.base(this, options);
    this.displayType = 0;
    this.converter = og.control.MousePosition.DisplayTypesConverters[0];
    this.display = null;
    this.position = null;
};

og.inheritance.extend(og.control.MousePosition, og.control.Control);

og.control.MousePosition.toDecimal = function (ll) {
    var str = ll.lat.toFixed(5) + ", " + ll.lon.toFixed(5);
    return str;
};

og.control.MousePosition.toDegrees = function (ll) {
    var str = og.control.MousePosition.dec2deg(ll.lat) + ", " + og.control.MousePosition.dec2deg(ll.lon);
    return str;
};

og.control.MousePosition.toMercator = function (ll) {
    var m = ll.forwardMercator();
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
        that.showPosition();
    };
    this.renderer.div.appendChild(this.display);

    this.renderer.events.on("onmousemove", this, this.onMouseMove);
};

og.control.MousePosition.prototype.showPosition = function () {
    if (this.position) {
        this.display.innerHTML = "Lat/Lon: " + this.converter(this.position) + " Height(km): " + (this.position.height > 0 ? "~" + (Math.round(this.position.height) / 1000).toFixed(2) : "-");
    } else {
        this.display.innerHTML = "Lat/Lon: " + "_____________________";
    }
};

og.control.MousePosition.prototype.onMouseMove = function () {
    var ms = this.renderer.events.mouseState;
    if (!(ms.leftButtonDown || ms.rightButtonDown) && this.renderer.controlsBag.scaleRot <= 0) {
        this.position = this.renderer.renderNodes.Earth.getLonLatFromPixelTerrain(ms);
        this.showPosition();
    }
};