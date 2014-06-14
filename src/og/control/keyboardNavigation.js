goog.provide('og.control.KeyboardNavigation');

goog.require('og.inheritance');
goog.require('og.control.Control');
goog.require('og.input');

og.control.KeyboardNavigation = function (options) {
    og.inheritance.base(this, options);
};

og.inheritance.extend(og.control.KeyboardNavigation, og.control.Control);

og.control.KeyboardNavigation.prototype.init = function () {
    this.renderer.events.on("onkeypressed", this, this.onCameraMoveForward, og.input.KEY_W);
    this.renderer.events.on("onkeypressed", this, this.onCameraMoveBackward, og.input.KEY_S);
    this.renderer.events.on("onkeypressed", this, this.onCameraStrifeLeft, og.input.KEY_A);
    this.renderer.events.on("onkeypressed", this, this.onCameraStrifeRight, og.input.KEY_D);
    this.renderer.events.on("onkeypressed", this, this.onCameraLookUp, og.input.KEY_UP);
    this.renderer.events.on("onkeypressed", this, this.onCameraLookDown, og.input.KEY_DOWN);
    this.renderer.events.on("onkeypressed", this, this.onCameraTurnLeft, og.input.KEY_LEFT);
    this.renderer.events.on("onkeypressed", this, this.onCameraTurnRight, og.input.KEY_RIGHT);
    this.renderer.events.on("onkeypressed", this, this.onCameraRollLeft, og.input.KEY_Q);
    this.renderer.events.on("onkeypressed", this, this.onCameraRollRight, og.input.KEY_E);
    this.renderer.events.on("onkeypressed", this, this.onCameraGrowAlt, og.input.KEY_SPACE);
};

og.control.KeyboardNavigation.prototype.onCameraGrowAlt = function (e) {

};

og.control.KeyboardNavigation.prototype.onCameraMoveForward = function (event) {
    var camera = this.renderer.activeCamera;
    camera.slide(0, 0, -camera.lonLat.height / 30);
};

og.control.KeyboardNavigation.prototype.onCameraMoveBackward = function (event) {
    var camera = this.renderer.activeCamera;
    camera.slide(0, 0, camera.lonLat.height / 30);
};

og.control.KeyboardNavigation.prototype.onCameraStrifeLeft = function (event) {
    var camera = this.renderer.activeCamera;
    camera.slide(-camera.lonLat.height / 30, 0, 0);
};

og.control.KeyboardNavigation.prototype.onCameraStrifeRight = function (event) {
    var camera = this.renderer.activeCamera;
    camera.slide(camera.lonLat.height / 30, 0, 0);
};

og.control.KeyboardNavigation.prototype.onCameraLookUp = function (event) {
    var cam = this.renderer.activeCamera;
    if (this.renderer.events.isKeyPressed(og.input.KEY_SHIFT)) {
        cam.pitch(1);
    } else {
        cam.rotateVertical(cam.lonLat.height / 3000000 * og.math.RADIANS, og.math.Vector3.ZERO);
    }
};

og.control.KeyboardNavigation.prototype.onCameraLookDown = function (event) {
    var cam = this.renderer.activeCamera;
    if (this.renderer.events.isKeyPressed(og.input.KEY_SHIFT)) {
        cam.pitch(-1);
    } else {
        cam.rotateVertical(-cam.lonLat.height / 3000000 * og.math.RADIANS, og.math.Vector3.ZERO);
    }
};

og.control.KeyboardNavigation.prototype.onCameraTurnLeft = function (event) {
    var cam = this.renderer.activeCamera;
    if (this.renderer.events.isKeyPressed(og.input.KEY_SHIFT)) {
        cam.yaw(1);
    } else {
        cam.rotateHorizontal(cam.lonLat.height / 3000000 * og.math.RADIANS, false, og.math.Vector3.ZERO);
    }
};

og.control.KeyboardNavigation.prototype.onCameraTurnRight = function (event) {
    var cam = this.renderer.activeCamera;
    if (this.renderer.events.isKeyPressed(og.input.KEY_SHIFT)) {
        cam.yaw(-1);
    } else {
        cam.rotateHorizontal(-cam.lonLat.height / 3000000 * og.math.RADIANS, false, og.math.Vector3.ZERO);
    }
};

og.control.KeyboardNavigation.prototype.onCameraRollLeft = function (event) {
    this.renderer.activeCamera.roll(-1);
};

og.control.KeyboardNavigation.prototype.onCameraRollRight = function (event) {
    this.renderer.activeCamera.roll(1);
};