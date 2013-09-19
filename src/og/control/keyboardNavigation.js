goog.provide('og.control.KeyboardNavigation');

goog.require('og.control.Control');
goog.require('og.input');
goog.require('og._class_');

og.control.KeyboardNavigation = function (options) {
    og.control.KeyboardNavigation.superclass.constructor.call(this, options);
};

og._class_.extend(og.control.KeyboardNavigation, og.control.Control);

og.control.KeyboardNavigation.prototype.init = function () {
    this.renderer.input.setEvent("onkeypressed", this, null, this.onCameraMoveForward, og.input.KEY_W);
    this.renderer.input.setEvent("onkeypressed", this, null, this.onCameraMoveBackward, og.input.KEY_S);
    this.renderer.input.setEvent("onkeypressed", this, null, this.onCameraStrifeLeft, og.input.KEY_A);
    this.renderer.input.setEvent("onkeypressed", this, null, this.onCameraStrifeRight, og.input.KEY_D);
    this.renderer.input.setEvent("onkeypressed", this, null, this.onCameraLookUp, og.input.KEY_UP);
    this.renderer.input.setEvent("onkeypressed", this, null, this.onCameraLookDown, og.input.KEY_DOWN);
    this.renderer.input.setEvent("onkeypressed", this, null, this.onCameraTurnLeft, og.input.KEY_LEFT);
    this.renderer.input.setEvent("onkeypressed", this, null, this.onCameraTurnRight, og.input.KEY_RIGHT);
    this.renderer.input.setEvent("onkeypressed", this, null, this.onCameraRollLeft, og.input.KEY_Q);
    this.renderer.input.setEvent("onkeypressed", this, null, this.onCameraRollRight, og.input.KEY_E);
    this.renderer.input.setEvent("onkeypressed", this, null, this.onCameraGrowAlt, og.input.KEY_SPACE);
};

og.control.KeyboardNavigation.prototype.onCameraGrowAlt = function (e) {
    //this.activeCamera.altitude += 0.7;
    //this.activeCamera.setLatLonToPosition();
};

og.control.KeyboardNavigation.prototype.onCameraMoveForward = function (event) {
    var camera = this.renderer.activeCamera;
    if (this.renderer.input.isKeyPressed(og.input.KEY_SHIFT)) {
        camera.slide(0, 0, -50);
    } else {
        camera.slide(0, 0, -0.1);
    }

};

og.control.KeyboardNavigation.prototype.onCameraMoveBackward = function (event) {
    var camera = this.renderer.activeCamera;
    if (this.renderer.input.isKeyPressed(og.input.KEY_SHIFT)) {
        camera.slide(0, 0, 50);
    } else {
        camera.slide(0, 0, 0.1);
    }
};

og.control.KeyboardNavigation.prototype.onCameraStrifeLeft = function (event) {
    var camera = this.renderer.activeCamera;
    if (this.renderer.input.isKeyPressed(og.input.KEY_SHIFT)) {
        camera.slide(-50, 0, 0);
    } else {
        camera.slide(-0.1, 0, 0);
    }
};

og.control.KeyboardNavigation.prototype.onCameraStrifeRight = function (event) {
    var camera = this.renderer.activeCamera;
    if (this.renderer.input.isKeyPressed(og.input.KEY_SHIFT)) {
        camera.slide(50, 0, 0);
    } else {
        camera.slide(0.1, 0, 0);
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