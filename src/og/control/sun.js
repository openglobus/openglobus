goog.provide('og.control.Sun');

goog.require('og.inheritance');
goog.require('og.control.BaseControl');
goog.require('og.light.PointLight');
goog.require('og.astro.earth');
goog.require('og.math.Quaternion');

og.control.Sun = function (options) {
    og.inheritance.base(this, options);

    this.planet;

    /**
     * Sunlight position placed in the camera eye.
     * @private
     * @type {boolean}
     */
    //this._isCameraSunlight = false;

    /**
     * Point light source.
     * @public
     * @type {og.light.PointLight}
     */
    this.sunlight = null;

    this._currDate = 0;
    this._prevDate = 0;
};

og.inheritance.extend(og.control.Sun, og.control.BaseControl);

og.control.Sun.prototype.initialize = function () {

    this.planet = this.renderer.renderNodes.Earth;
    this.planet._sunControl = this;

    this.planet.lightEnabled = true;

    //sunlight initialization
    this.sunlight = new og.light.PointLight();
    this.sunlight.setAmbient(new og.math.Vector3(0.15, 0.15, 0.25));
    this.sunlight.setDiffuse(new og.math.Vector3(0.9, 0.9, 0.8));
    this.sunlight.setSpecular(new og.math.Vector3(0.1, 0.1, 0.06));
    this.sunlight.setShininess(110);
    this.sunlight.addTo(this.planet);

    var that = this;
    this.renderer.events.on("draw", this, this.draw);

    this.renderer.events.on("charkeypress", this, function () {
        that.planet.lightEnabled = !that.planet.lightEnabled;
    }, og.input.KEY_L);
};

og.control.Sun.prototype.draw = function () {

    var c = this.renderer.handler.clock;
    this._currDate = c.currentDate;

    if (Math.abs(this._currDate - this._prevDate) > 0.00034 && this.active) {
        this._prevDate = this._currDate;
        this.sunlight.setPosition(og.astro.earth.getSunPosition(this._currDate));
    }
};

