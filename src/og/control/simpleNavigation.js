goog.provide('og.control.SimpleNavigation');

goog.require('og.inheritance');
goog.require('og.control.BaseControl');
goog.require('og.input');

/**
 * Simple keyboard camera navigation with W,S,A,D and shift keys to fly around the scene.
 * @class
 * @extends {og.control.BaseControl}
 * @param {Object} [options] - Control options.
 */
og.control.SimpleNavigation = function (options) {
    og.inheritance.base(this, options);
    this.camera = null;
    this.speed = 10;
};

og.inheritance.extend(og.control.SimpleNavigation, og.control.BaseControl);

og.control.SimpleNavigation.prototype.oninit = function () {
    this.camera = this.renderer.activeCamera;
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
    var camera = this.camera;
    camera.slide(0, 0, -this.speed);
    camera.update();
};

og.control.SimpleNavigation.prototype.onCameraMoveBackward = function (event) {
    var camera = this.camera;
    camera.slide(0, 0, this.speed);
    camera.update();
};

og.control.SimpleNavigation.prototype.onCameraStrifeLeft = function (event) {
    var camera = this.camera;
    camera.slide(-this.speed, 0, 0);
    camera.update();
};

og.control.SimpleNavigation.prototype.onCameraStrifeRight = function (event) {
    var camera = this.camera;
    camera.slide(this.speed, 0, 0);
    camera.update();
};

og.control.SimpleNavigation.prototype.onCameraLookUp = function (event) {
    var cam = this.camera;
    cam.pitch(0.5);
    cam.update();
};

og.control.SimpleNavigation.prototype.onCameraLookDown = function (event) {
    var cam = this.camera;
    cam.pitch(-0.5);
    cam.update();
};

og.control.SimpleNavigation.prototype.onCameraTurnLeft = function (event) {
    var cam = this.camera;
    cam.yaw(0.5);
    cam.update();
};

og.control.SimpleNavigation.prototype.onCameraTurnRight = function (event) {
    var cam = this.camera;
    cam.yaw(-0.5);
    cam.update();
};

og.control.SimpleNavigation.prototype.onCameraRollLeft = function (event) {
    var cam = this.camera;
    cam.roll(-0.5);
    cam.update();
};

og.control.SimpleNavigation.prototype.onCameraRollRight = function (event) {
    var cam = this.camera;
    cam.roll(0.5);
    cam.update();
};