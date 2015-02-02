goog.provide('og.control.TouchNavigation');

goog.require('og.inheritance');
goog.require('og.control.Control');
goog.require('og.math');
goog.require('og.math.Vector3');
goog.require('og.math.Matrix4');
goog.require('og.math.Quaternion');
goog.require('og.bv.Sphere');
goog.require('og.math.Ray');

og.control.TouchNavigation = function (options) {
    og.inheritance.base(this, options);
};

og.inheritance.extend(og.control.TouchNavigation, og.control.Control);


og.control.TouchNavigation.prototype.init = function () {
    this.planet = this.renderer.renderNodes.Earth;
    this.renderer.events.on("ontouchstart", this, this.onTouchStart);
    this.renderer.events.on("ontouchend", this, this.onTouchEnd);
    this.renderer.events.on("ontouchcancel", this, this.onTouchCancel);
    this.renderer.events.on("ontouchmove", this, this.onTouchMove);
    this.renderer.events.on("ondraw", this, this.onDraw);
};

og.control.TouchNavigation.prototype.onTouchStart = function (e) {
    if (e.sys.touches.item(0)) {
        print2d("lbCoords", e.sys.touches.item(0).clientX, 250, 100);
    }
};

og.control.TouchNavigation.prototype.onTouchEnd = function (e) {

};

og.control.TouchNavigation.prototype.onTouchCancel = function (e) {

};

og.control.TouchNavigation.prototype.onTouchMove = function (e) {
    if (e.sys.touches.item(0)) {
        print2d("lbCoords", e.sys.touches.item(0).clientX, 200, 100);
    }
};

og.control.TouchNavigation.prototype.onDraw = function (e) {

};