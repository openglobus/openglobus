goog.provide('og.control.EarthCoordinates');

goog.require('og.inheritance');
goog.require('og.control.BaseControl');
goog.require('og.planetSegment');
goog.require('og.mercator');

/**
 * Control displays mouse or screen center Earth coordinates.
 * @class
 * @extends {og.control.BaseControl}
 * @param {Object} [options] - Options:
 * @param {Boolean} [options.center] - Earth coordiantes by screen center otherwise mouse pointer. False is default.
 * @param {Boolean} [options.type] - Coordinates shown: 0 - is decimal degrees, 1 - degrees, 2 - mercator geodetic coordinates.
 */
og.control.EarthCoordinates = function (options) {
    og.inheritance.base(this, options);

    /**
     * Display type.
     * @private
     * @type {Boolean}
     */
    this._displayType = options.type || 0;

    /**
     * Current coordinates type converter.
     * @private
     * @function
     */
    this._converter = og.control.EarthCoordinates.DisplayTypesConverters[0];

    /**
     * Display dom element.
     * @private
     * @type {Object}
     */
    this._display = null;

    /**
     * Screen center or mouse pointer coordinates show flag.
     * @private
     * @type {Boolean}
     */
    this._center = options.center || false;

    /**
     * Current position.
     * @public
     * @type {og.math.Vector3}
     */
    this.position = null;
};

og.control.earthCoordinates = function (options) {
    return new og.control.EarthCoordinates(options);
};

og.inheritance.extend(og.control.EarthCoordinates, og.control.BaseControl);

og.control.EarthCoordinates.toDecimal = function (ll) {
    return ll.lat.toFixed(5) + ", " + ll.lon.toFixed(5);
};

og.control.EarthCoordinates.toDegrees = function (ll) {
    return og.control.EarthCoordinates.dec2deg(ll.lat) + ", " + og.control.EarthCoordinates.dec2deg(ll.lon);
};

og.control.EarthCoordinates.toMercator = function (ll) {
    var m = ll.forwardMercator();
    return m.lat.toFixed(5) + ", " + m.lon.toFixed(5);
};

og.control.EarthCoordinates.DisplayTypesConverters = [
    og.control.EarthCoordinates.toDecimal,
    og.control.EarthCoordinates.toDegrees,
    og.control.EarthCoordinates.toMercator
];

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

og.control.EarthCoordinates.prototype.oninit = function () {
    this._display = document.createElement('div');
    this._display.className = 'ogEarthCoordinatesControl';
    var that = this;
    this._display.onclick = function (e) {
        that._displayType += 1;
        if (that._displayType >= og.control.EarthCoordinates.DisplayTypesConverters.length)
            that._displayType = 0;
        that._converter = og.control.EarthCoordinates.DisplayTypesConverters[that._displayType];
        that.showPosition();
    };
    this.renderer.div.appendChild(this._display);

    centerDiv = document.createElement('div');
    centerDiv.className = 'ogCenterIcon';
    centerDiv.innerHTML = '<svg width="12" height="12"><g><path stroke-width="1" stroke-opacity="1" d="M6 0L6 12M0 6L12 6" stroke="#009DFF"></path></g></svg>';
    this.renderer.div.appendChild(centerDiv);

    if (this._center) {
        this.renderer.events.on("draw", this, this._draw);
        centerDiv.style.display = "block";
    } else {
        this.renderer.events.on("mousemove", this, this._onMouseMove);
        centerDiv.style.display = "none";
    }
};

/**
 * Sets coordinates capturing type.
 * @public
 * @param {Boolean} center - True - capture screen center, false - mouse pointer.
 */
og.control.EarthCoordinates.prototype.setCenter = function (center) {
    if (center != this._center) {
        this._center = center;
        if (center) {
            this.renderer.events.off("mousemove", this._onMouseMove);
            this.renderer.events.on("draw", this, this._draw);
            centerDiv.style.display = "block";
        } else {
            this.renderer.events.off("draw", this._draw);
            this.renderer.events.on("mousemove", this, this._onMouseMove);
            centerDiv.style.display = "none";
        }
    }
};

og.control.EarthCoordinates.prototype._showPosition = function () {
    if (this.position) {
        this._display.innerHTML = "Lat/Lon: " + this._converter(this.position) + " Height(km): " + (this.position.height > 0 ? "~" + (Math.round(this.position.height) / 1000).toFixed(2) : "-");
    } else {
        this._display.innerHTML = "Lat/Lon: " + "_____________________";
    }
};

og.control.EarthCoordinates.prototype._draw = function () {
    var r = this.renderer;
    var ts = r.events.touchState;
    if (r.controlsBag.scaleRot <= 0 &&
        !r.activeCamera._flying ||
        ts.moving && ts.sys.touches.length === 1) {
        this.position = r.renderNodes.Earth.getLonLatFromPixelTerrain(r.handler.getCenter());
        this._showPosition();
    }
};

og.control.EarthCoordinates.prototype._onMouseMove = function () {
    var r = this.renderer;
    var ms = r.events.mouseState;
    if (!(ms.leftButtonDown || ms.rightButtonDown) &&
        r.controlsBag.scaleRot <= 0 &&
        !r.activeCamera._flying) {
        this.position = r.renderNodes.Earth.getLonLatFromPixelTerrain(ms, true);
        this._showPosition();
    }
};