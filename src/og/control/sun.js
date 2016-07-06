goog.provide('og.control.Sun');

goog.require('og.inheritance');
goog.require('og.control.BaseControl');
goog.require('og.LightSource');
goog.require('og.astro.earth');
goog.require('og.math.Quaternion');

/**
 * Real Sun geocentric position control that place the Sun on the right place by the Earth.
 * @class
 * @extends {og.control.BaseControl}
 * @param {Object} [options] - Control options.
 */
og.control.Sun = function (options) {
    og.inheritance.base(this, options);

    /**
     * Earth planet node.
     * @public
     * @type {og.node.Planet}
     */
    this.planet;

    /**
     * Sunlight position placed in the camera eye.
     * @private
     * @type {boolean}
     */
    //this._isCameraSunlight = false;

    /**
     * Light source.
     * @public
     * @type {og.LightSource}
     */
    this.sunlight = null;

    /**
     * Current frame handler clock date and time.
     * @private
     * @type {Number}
     */
    this._currDate = 0;

    /**
     * Previous frame handler clock date and time.
     * @private
     * @type {Number}
     */
    this._prevDate = 0;
};

og.inheritance.extend(og.control.Sun, og.control.BaseControl);

og.control.Sun.prototype.oninit = function () {

    this.planet = this.renderer.renderNodes.Earth;
    this.planet._sunControl = this;

    this.planet.lightEnabled = true;

    //sunlight initialization
    this.sunlight = new og.LightSource("Sun", {
        'ambient': new og.math.Vector3(0.15, 0.15, 0.25),
        'diffuse': new og.math.Vector3(0.9, 0.9, 0.8),
        'specular': new og.math.Vector3(0.1, 0.1, 0.06),
        'shininess': 110
    });
    this.sunlight.addTo(this.planet);

    var that = this;
    this.renderer.events.on("draw", this, this._draw);

    this.renderer.events.on("charkeypress", this, function () {
        that.planet.lightEnabled = !that.planet.lightEnabled;
    }, og.input.KEY_L);
};

og.control.Sun.prototype._draw = function () {

    this._currDate = this.renderer.handler.clock.currentDate;

    if (Math.abs(this._currDate - this._prevDate) > 0.00034 && this.active) {
        this._prevDate = this._currDate;
        this.sunlight.setPosition(og.astro.earth.getSunPosition(this._currDate));
    }
};

