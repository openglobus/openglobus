goog.provide('og.control.Sun');

goog.require('og.inheritance');
goog.require('og.control.Control');
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
};

og.inheritance.extend(og.control.Sun, og.control.Control);

og.control.Sun.prototype.init = function () {

    this.planet = this.renderer.renderNodes.Earth;

    this.planet.lightEnabled = true;

    //sunlight initialization
    this.sunlight = new og.light.PointLight();
    this.sunlight.setPosition(og.astro.earth.getSunPosition(og.jd.DateToUTC(new Date())));
    this.sunlight.setAmbient(new og.math.Vector3(0.15, 0.15, 0.25));
    this.sunlight.setDiffuse(new og.math.Vector3(0.9, 0.9, 0.8));
    this.sunlight.setSpecular(new og.math.Vector3(0.1, 0.1, 0.06));
    this.sunlight.setShininess(110);
    this.sunlight.addTo(this.planet);

    var that = this;
    this.renderer.events.on("draw", this, this.draw);
    //this.renderer.events.on("keypress", this, function () {
    //    var rx = og.math.Quaternion.xRotation(2 * og.math.RADIANS);
    //    that.sunlight._position = rx.mulVec3(that.sunlight._position);
    //}, og.input.KEY_V);

    this.renderer.events.on("keypress", this, function () {
        var ry = og.math.Quaternion.yRotation(2 * og.math.RADIANS);
        that.sunlight._position = ry.mulVec3(that.sunlight._position);
    }, og.input.KEY_F);

    this.renderer.events.on("charkeypress", this, function () {
        that.planet.lightEnabled = !that.planet.lightEnabled;
    }, og.input.KEY_L);

};

og.control.Sun.prototype.draw = function () {

    var cam = this.renderer.activeCamera;

    //if (!this._isCameraSunlight)
    //    this.sunlight._position = cam._v.scaleTo(cam._terrainAltitude * 0.2).add(cam._u.scaleTo(cam._terrainAltitude * 0.4)).add(cam.eye);
    //else
    //    this.sunlight._position = cam.eye;

    this._isCameraSunlight = false;
};

