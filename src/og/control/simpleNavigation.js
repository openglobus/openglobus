goog.provide('og.control.SimpleNavigation');

goog.require('og.inheritance');
goog.require('og.control.BaseControl');
goog.require('og.input');

og.control.SimpleNavigation = function (options) {
    og.inheritance.base(this, options);
};

og.inheritance.extend(og.control.SimpleNavigation, og.control.BaseControl);

og.control.SimpleNavigation.prototype.initialize = function () {
    this.renderer.events.on("keypress", this, this.onCameraMoveForward, og.input.KEY_W);
    this.renderer.events.on("keypress", this, this.onCameraMoveBackward, og.input.KEY_S);
    this.renderer.events.on("keypress", this, this.onCameraStrifeLeft, og.input.KEY_A);
    this.renderer.events.on("keypress", this, this.onCameraStrifeRight, og.input.KEY_D);
    this.renderer.events.on("keypress", this, this.onCameraLookUp, og.input.KEY_UP);
    this.renderer.events.on("keypress", this, this.onCameraLookDown, og.input.KEY_DOWN);
    this.renderer.events.on("keypress", this, this.onCameraTurnLeft, og.input.KEY_LEFT);
    this.renderer.events.on("keypress", this, this.onCameraTurnRight, og.input.KEY_RIGHT);
    this.renderer.events.on("keypress", this, this.onCameraRollLeft, og.input.KEY_Q);
    this.renderer.events.on("keypress", this, this.onCameraRollRight, og.input.KEY_E);
};

og.control.SimpleNavigation.prototype.onCameraMoveForward = function (event) {
    var camera = this.renderer.activeCamera;
    camera.slide(0, 0, -10);
    camera.update();
};

og.control.SimpleNavigation.prototype.onCameraMoveBackward = function (event) {
    var camera = this.renderer.activeCamera;
    camera.slide(0, 0, 10);
    camera.update();
};

og.control.SimpleNavigation.prototype.onCameraStrifeLeft = function (event) {
    var camera = this.renderer.activeCamera;
    camera.slide(-10, 0, 0);
    camera.update();
};

og.control.SimpleNavigation.prototype.onCameraStrifeRight = function (event) {
    var camera = this.renderer.activeCamera;
    camera.slide(10, 0, 0);
    camera.update();
};

og.control.SimpleNavigation.prototype.onCameraLookUp = function (event) {
    var cam = this.renderer.activeCamera;
    cam.pitch(0.5);
    cam.update();
};

og.control.SimpleNavigation.prototype.onCameraLookDown = function (event) {
    var cam = this.renderer.activeCamera;
    cam.pitch(-0.5);
    cam.update();
};

og.control.SimpleNavigation.prototype.onCameraTurnLeft = function (event) {
    var cam = this.renderer.activeCamera;
    cam.yaw(0.5);
    cam.update();
};

og.control.SimpleNavigation.prototype.onCameraTurnRight = function (event) {
    var cam = this.renderer.activeCamera;
    cam.yaw(-0.5);
    cam.update();
};

og.control.SimpleNavigation.prototype.onCameraRollLeft = function (event) {
    var cam = this.renderer.activeCamera;
    cam.roll(-0.5);
    cam.update();
};

og.control.SimpleNavigation.prototype.onCameraRollRight = function (event) {
    var cam = this.renderer.activeCamera;
    cam.roll(0.5);
    cam.update();
};