goog.provide('og.control.EarthCoordinates');

goog.require('og.inheritance');
goog.require('og.control.BaseControl');
goog.require('og.planetSegment');
goog.require('og.mercator');

og.control.EarthCoordinates = function (options) {
    og.inheritance.base(this, options);
    this.displayType = 0;
    this.converter = og.control.EarthCoordinates.DisplayTypesConverters[0];
    this.display = null;
    this.position = null;

    this._center = options.center || false;
};

og.inheritance.extend(og.control.EarthCoordinates, og.control.BaseControl);

og.control.EarthCoordinates.toDecimal = function (ll) {
    var str = ll.lat.toFixed(5) + ", " + ll.lon.toFixed(5);
    return str;
};

og.control.EarthCoordinates.toDegrees = function (ll) {
    var str = og.control.EarthCoordinates.dec2deg(ll.lat) + ", " + og.control.EarthCoordinates.dec2deg(ll.lon);
    return str;
};

og.control.EarthCoordinates.toMercator = function (ll) {
    var m = ll.forwardMercator();
    var str = m.lat.toFixed(5) + ", " + m.lon.toFixed(5);
    return str;
};

og.control.EarthCoordinates.DisplayTypesConverters = [og.control.EarthCoordinates.toDecimal, og.control.EarthCoordinates.toDegrees, og.control.EarthCoordinates.toMercator];

og.control.EarthCoordinates.dec2deg = function (base) {
    var t, t2;
    var degrees = base < 0 ? Math.ceil(base) : Math.floor(base);
    var minutes = Math.floor(t = Math.abs((base - degrees)) * 60);
    var seconds = Math.floor(t2 = (t - minutes) * 6000);
    seconds = seconds / 100.00;
    return (og.control.EarthCoordinates.numToFixedString(degrees, 3) + "\u00B0" +
        og.control.EarthCoordinates.numToFixedString(minutes, 2) + "\u0027" +
        og.control.EarthCoordinates.numToFixedString(seconds.toFixed(2), 2) + "\u0022");
};

og.control.EarthCoordinates.numToFixedString = function (num, fixed) {
    var dl = num.toString().split('.')[0].length;
    var white = "&nbsp;";
    for (var i = dl; i < fixed; i++) {
        white += '&nbsp;&nbsp;';
    }
    return white + num.toString();
};

og.control.EarthCoordinates.prototype.initialize = function () {
    this.display = document.createElement('div');
    this.display.className = 'ogEarthCoordinatesControl';
    var that = this;
    this.display.onclick = function (e) {
        that.displayType += 1;
        if (that.displayType >= og.control.EarthCoordinates.DisplayTypesConverters.length)
            that.displayType = 0;
        that.converter = og.control.EarthCoordinates.DisplayTypesConverters[that.displayType];
        that.showPosition();
    };
    this.renderer.div.appendChild(this.display);

    centerDiv = document.createElement('div');
    centerDiv.className = 'ogCenterIcon';
    centerDiv.innerHTML = '<svg width="12" height="12"><g><path stroke-width="1" stroke-opacity="1" d="M6 0L6 12M0 6L12 6" stroke="#009DFF"></path></g></svg>';
    this.renderer.div.appendChild(centerDiv);

    if (this._center) {
        this.renderer.events.on("draw", this, this.onDraw);
        centerDiv.style.display = "block";
    } else {
        this.renderer.events.on("mousemove", this, this.onMouseMove);
        centerDiv.style.display = "none";
    }
};

og.control.EarthCoordinates.prototype.setCenter = function (center) {
    if (center != this._center) {
        this._center = center;
        if (center) {
            this.renderer.events.off("mousemove", this.onMouseMove);
            this.renderer.events.on("draw", this, this.onDraw);
            centerDiv.style.display = "block";
        } else {
            this.renderer.events.off("draw", this.onDraw);
            this.renderer.events.on("mousemove", this, this.onMouseMove);
            centerDiv.style.display = "none";
        }
    }
};

og.control.EarthCoordinates.prototype.showPosition = function () {
    if (this.position) {
        this.display.innerHTML = "Lat/Lon: " + this.converter(this.position) + " Height(km): " + (this.position.height > 0 ? "~" + (Math.round(this.position.height) / 1000).toFixed(2) : "-");
    } else {
        this.display.innerHTML = "Lat/Lon: " + "_____________________";
    }
};

og.control.EarthCoordinates.prototype.onDraw = function () {
    var r = this.renderer;
    var ts = r.events.touchState;
    if (r.controlsBag.scaleRot <= 0 &&
        !r.activeCamera._flying ||
        ts.moving && ts.sys.touches.length === 1) {
        this.position = r.renderNodes.Earth.getLonLatFromPixelTerrain(r.handler.getCenter());
        this.showPosition();
    }
};

og.control.EarthCoordinates.prototype.onMouseMove = function () {
    var r = this.renderer;
    var ms = r.events.mouseState;
    if (!(ms.leftButtonDown || ms.rightButtonDown) &&
        r.controlsBag.scaleRot <= 0 &&
        !r.activeCamera._flying) {
        this.position = r.renderNodes.Earth.getLonLatFromPixelTerrain(ms, true);
        this.showPosition();
    }
};