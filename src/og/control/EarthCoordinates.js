/**
 * @module og/control/EarthCoordinates
 */

'use strict';

import { Control } from './Control.js';

function dec2deg(base) {
    var t;
    var degrees = base < 0 ? Math.ceil(base) : Math.floor(base);
    var minutes = Math.floor(t = Math.abs((base - degrees)) * 60);
    var seconds = Math.floor((t - minutes) * 6000);
    seconds = seconds / 100.00;
    return (numToFixedString(degrees, 3) + "\u00B0" +
        numToFixedString(minutes, 2) + "\u0027" +
        numToFixedString(seconds.toFixed(2), 2) + "\u0022");
};

function numToFixedString(num, fixed) {
    var dl = num.toString().split('.')[0].length;
    var white = "&nbsp;";
    for (var i = dl; i < fixed; i++) {
        white += '&nbsp;&nbsp;';
    }
    return white + num.toString();
};

function toDecimal(ll) {
    return ll.lat.toFixed(5) + ", " + ll.lon.toFixed(5);
};

function toDegrees(ll) {
    return dec2deg(ll.lat) + ", " + dec2deg(ll.lon);
};

function toMercator(ll) {
    var m = ll.forwardMercator();
    return m.lat.toFixed(5) + ", " + m.lon.toFixed(5);
};

const DisplayTypesConverters = [
    toDecimal,
    toDegrees,
    toMercator
];

/**
 * Control displays mouse or screen center Earth coordinates.
 * @class
 * @extends {og.control.Control}
 * @param {Object} [options] - Options:
 * @param {Boolean} [options.center] - Earth coordiantes by screen center otherwise mouse pointer. False is default.
 * @param {Boolean} [options.type] - Coordinates shown: 0 - is decimal degrees, 1 - degrees, 2 - mercator geodetic coordinates.
 */
class EarthCoordinates extends Control {
    constructor(options) {
        super(options);

        options = options || {};

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
        this._converter = DisplayTypesConverters[0];

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

        var pad = false;
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            pad = true;
        }

        this._center = options.center || pad;

        /**
         * Current position.
         * @public
         * @type {og.Vec3}
         */
        this.position = null;
    }

    oninit() {
        this._display = document.createElement('div');
        this._display.className = 'ogEarthCoordinatesControl';
        var that = this;

        function _refresh(el) {

            if (that._displayType >= DisplayTypesConverters.length) {
                that._displayType = 0;
            }

            if (that._displayType == 0) {
                el.style.width = "275px";
            } else if (that._displayType == 1) {
                el.style.width = "355px";
            } else if (that._displayType == 2) {
                el.style.width = "350px";
            }
            that._converter = DisplayTypesConverters[that._displayType];
            that._showPosition();
        };

        this._display.onclick = function (e) {
            that._displayType += 1;
            _refresh(this);
        };

        this.renderer.div.appendChild(this._display);

        _refresh(this._display);

        let centerDiv = document.createElement('div');
        centerDiv.className = 'ogCenterIcon';
        centerDiv.innerHTML = '<svg width="12" height="12"><g><path stroke-width="1" stroke-opacity="1" d="M6 0L6 12M0 6L12 6" stroke="#009DFF"></path></g></svg>';
        this.renderer.div.appendChild(centerDiv);

        if (this._center) {
            this.renderer.activeCamera.events.on("moveend", this._grabCoordinates, this);
            centerDiv.style.display = "block";
        } else {
            this.renderer.events.on("mousemove", this._onMouseMove, this);
            centerDiv.style.display = "none";
        }

    }

    /**
     * Sets coordinates capturing type.
     * @public
     * @param {Boolean} center - True - capture screen center, false - mouse pointer.
     */
    setCenter(center) {
        if (center != this._center) {
            this._center = center;
            if (center) {
                this.renderer.events.off("mousemove", this._onMouseMove);
                this.renderer.activeCamera.events.on("moveend", this._grabCoordinates, this);
                centerDiv.style.display = "block";
            } else {
                this.renderer.events.off("draw", this._draw);
                this.renderer.events.on("mousemove", this._onMouseMove, this);
                centerDiv.style.display = "none";
            }
        }
    }

    _showPosition() {
        if (this.position) {
            this.position.height = ((this.position.height > 10000 || this.position.height < -10000) ? 0 : this.position.height);
            this._display.innerHTML = "Lat/Lon: " + this._converter(this.position) + " h(m): " + (this.position.height > 0 ? "~" + (Math.round(this.position.height) / 1000).toFixed(3) * 1000 : "-");
        } else {
            this._display.innerHTML = "Lat/Lon: " + "_____________________";
        }
    }

    _grabCoordinates() {
        var r = this.renderer;
        this.position = this.planet.getLonLatFromPixelTerrain(r.handler.getCenter());
        this._showPosition();
    }

    _onMouseMove() {
        var r = this.renderer;
        var ms = r.events.mouseState;
        if (!(ms.leftButtonDown || ms.rightButtonDown) &&
            r.controlsBag.scaleRot <= 0 &&
            !r.activeCamera._flying) {
            this.position = this.planet.getLonLatFromPixelTerrain(ms, true);
            this._showPosition();
        }
    }
};

export function earthCoordinates(options) {
    return new EarthCoordinates(options);
};

export { EarthCoordinates };
