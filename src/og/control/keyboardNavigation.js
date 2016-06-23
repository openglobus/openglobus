goog.provide('og.control.KeyboardNavigation');

goog.require('og.inheritance');
goog.require('og.control.BaseControl');
goog.require('og.input');

/**
 * Planet camera keyboard navigation. Use W,S,A,D and left shift key for fly around a planet.
 * @class
 * @extends {og.control.BaseControl}
 * @param {Object} [options] - Control options.
 */
og.control.KeyboardNavigation = function (options) {
    og.inheritance.base(this, options);
};

og.inheritance.extend(og.control.KeyboardNavigation, og.control.BaseControl);

og.control.KeyboardNavigation.prototype.oninit = function () {
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
    this.renderer.events.on("keypress", this, this.onCameraGrowAlt, og.input.KEY_SPACE);
};

og.control.KeyboardNavigation.prototype.onCameraGrowAlt = function (e) {

};

og.control.KeyboardNavigation.prototype.onCameraMoveForward = function (event) {
    var camera = this.renderer.activeCamera;
    camera.slide(0, 0, -camera._lonLat.height / 30);
    camera.update();
};

og.control.KeyboardNavigation.prototype.onCameraMoveBackward = function (event) {
    var camera = this.renderer.activeCamera;
    camera.slide(0, 0, camera._lonLat.height / 30);
    camera.update();
};

og.control.KeyboardNavigation.prototype.onCameraStrifeLeft = function (event) {
    var camera = this.renderer.activeCamera;
    camera.slide(-camera._lonLat.height / 30, 0, 0);
    camera.update();
};

og.control.KeyboardNavigation.prototype.onCameraStrifeRight = function (event) {
    var camera = this.renderer.activeCamera;
    camera.slide(camera._lonLat.height / 30, 0, 0);
    camera.update();
};

og.control.KeyboardNavigation.prototype.onCameraLookUp = function (event) {
    var cam = this.renderer.activeCamera;
    if (this.renderer.events.isKeyPressed(og.input.KEY_SHIFT)) {
        cam.pitch(5);
    } else {
        cam.rotateVertical(cam._lonLat.height / 3000000 * og.math.RADIANS, og.math.Vector3.ZERO);
    }
    cam.update();
};

og.control.KeyboardNavigation.prototype.onCameraLookDown = function (event) {
    var cam = this.renderer.activeCamera;
    if (this.renderer.events.isKeyPressed(og.input.KEY_SHIFT)) {
        cam.pitch(-5);
    } else {
        cam.rotateVertical(-cam._lonLat.height / 3000000 * og.math.RADIANS, og.math.Vector3.ZERO);
    }
    cam.update();
};

og.control.KeyboardNavigation.prototype.onCameraTurnLeft = function (event) {
    var cam = this.renderer.activeCamera;
    if (this.renderer.events.isKeyPressed(og.input.KEY_SHIFT)) {
        cam.yaw(5);
    } else {
        cam.rotateHorizontal(cam._lonLat.height / 3000000 * og.math.RADIANS, false, og.math.Vector3.ZERO);
    }
    cam.update();
};

og.control.KeyboardNavigation.prototype.onCameraTurnRight = function (event) {
    var cam = this.renderer.activeCamera;
    if (this.renderer.events.isKeyPressed(og.input.KEY_SHIFT)) {
        cam.yaw(-5);
    } else {
        cam.rotateHorizontal(-cam._lonLat.height / 3000000 * og.math.RADIANS, false, og.math.Vector3.ZERO);
    }
    cam.update();
};

og.control.KeyboardNavigation.prototype.onCameraRollLeft = function (event) {
    this.renderer.activeCamera.roll(-5);
    this.renderer.activeCamera.update();
};

og.control.KeyboardNavigation.prototype.onCameraRollRight = function (event) {
    this.renderer.activeCamera.roll(5);
    this.renderer.activeCamera.update();
};