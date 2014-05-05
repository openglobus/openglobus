goog.provide('og.control.KeyboardNavigation');

goog.require('og.inheritance');
goog.require('og.control.Control');
goog.require('og.input');

og.control.KeyboardNavigation = function (options) {
    og.inheritance.base(this, options);
};

og.inheritance.extend(og.control.KeyboardNavigation, og.control.Control);

og.control.KeyboardNavigation.prototype.init = function () {
    this.renderer.keyboardHandler.addEvent("onkeypressed", this, this.onCameraMoveForward, og.input.KEY_W);
    this.renderer.keyboardHandler.addEvent("onkeypressed", this, this.onCameraMoveBackward, og.input.KEY_S);
    this.renderer.keyboardHandler.addEvent("onkeypressed", this, this.onCameraStrifeLeft, og.input.KEY_A);
    this.renderer.keyboardHandler.addEvent("onkeypressed", this, this.onCameraStrifeRight, og.input.KEY_D);
    this.renderer.keyboardHandler.addEvent("onkeypressed", this, this.onCameraLookUp, og.input.KEY_UP);
    this.renderer.keyboardHandler.addEvent("onkeypressed", this, this.onCameraLookDown, og.input.KEY_DOWN);
    this.renderer.keyboardHandler.addEvent("onkeypressed", this, this.onCameraTurnLeft, og.input.KEY_LEFT);
    this.renderer.keyboardHandler.addEvent("onkeypressed", this, this.onCameraTurnRight, og.input.KEY_RIGHT);
    this.renderer.keyboardHandler.addEvent("onkeypressed", this, this.onCameraRollLeft, og.input.KEY_Q);
    this.renderer.keyboardHandler.addEvent("onkeypressed", this, this.onCameraRollRight, og.input.KEY_E);
    this.renderer.keyboardHandler.addEvent("onkeypressed", this, this.onCameraGrowAlt, og.input.KEY_SPACE);
};

og.control.KeyboardNavigation.prototype.onCameraGrowAlt = function (e) {
    //this.activeCamera.altitude += 0.7;
    //this.activeCamera.setLatLonToPosition();
};

og.control.KeyboardNavigation.prototype.onCameraMoveForward = function (event) {
    var camera = this.renderer.activeCamera;
    if (this.renderer.keyboardHandler.isKeyPressed(og.input.KEY_SHIFT)) {
        camera.slide(0, 0, -50);
    } else {
        camera.slide(0, 0, -1);
    }

};

og.control.KeyboardNavigation.prototype.onCameraMoveBackward = function (event) {
    var camera = this.renderer.activeCamera;
    if (this.renderer.keyboardHandler.isKeyPressed(og.input.KEY_SHIFT)) {
        camera.slide(0, 0, 50);
    } else {
        camera.slide(0, 0, 1);
    }
};

og.control.KeyboardNavigation.prototype.onCameraStrifeLeft = function (event) {
    var camera = this.renderer.activeCamera;
    if (this.renderer.keyboardHandler.isKeyPressed(og.input.KEY_SHIFT)) {
        camera.slide(-50, 0, 0);
    } else {
        camera.slide(-1, 0, 0);
    }
};

og.control.KeyboardNavigation.prototype.onCameraStrifeRight = function (event) {
    var camera = this.renderer.activeCamera;
    if (this.renderer.keyboardHandler.isKeyPressed(og.input.KEY_SHIFT)) {
        camera.slide(50, 0, 0);
    } else {
        camera.slide(1, 0, 0);
    }
};

og.control.KeyboardNavigation.prototype.onCameraLookUp = function (event) {
    this.renderer.activeCamera.pitch(1);
};

og.control.KeyboardNavigation.prototype.onCameraLookDown = function (event) {
    this.renderer.activeCamera.pitch(-1);
};

og.control.KeyboardNavigation.prototype.onCameraTurnLeft = function (event) {
    this.renderer.activeCamera.yaw(1);
};

og.control.KeyboardNavigation.prototype.onCameraTurnRight = function (event) {
    this.renderer.activeCamera.yaw(-1);
};

og.control.KeyboardNavigation.prototype.onCameraRollLeft = function (event) {
    this.renderer.activeCamera.roll(-1);
};

og.control.KeyboardNavigation.prototype.onCameraRollRight = function (event) {
    this.renderer.activeCamera.roll(1);
};