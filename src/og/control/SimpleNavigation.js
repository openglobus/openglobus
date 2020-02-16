'use strict';

import { Control } from './Control.js';
import { input } from '../input/input.js';

/**
 * Simple keyboard camera navigation with W,S,A,D and shift keys to fly around the scene.
 * @class
 * @extends {og.control.Control}
 * @param {Object} [options] - Control options.
 */
class SimpleNavigation extends Control {
    constructor(options) {
        options = options || {};
        super(options);

        this.camera = null;
        this.speed = options.speed || 1.0;
    }

    oninit() {
        this.camera = this.renderer.activeCamera;
        this.renderer.events.on("keypress", input.KEY_W, this.onCameraMoveForward, this);
        this.renderer.events.on("keypress", input.KEY_S, this.onCameraMoveBackward, this);
        this.renderer.events.on("keypress", input.KEY_A, this.onCameraStrifeLeft, this);
        this.renderer.events.on("keypress", input.KEY_D, this.onCameraStrifeRight, this);
        this.renderer.events.on("keypress", input.KEY_UP, this.onCameraLookUp, this);
        this.renderer.events.on("keypress", input.KEY_DOWN, this.onCameraLookDown, this);
        this.renderer.events.on("keypress", input.KEY_LEFT, this.onCameraTurnLeft, this);
        this.renderer.events.on("keypress", input.KEY_RIGHT, this.onCameraTurnRight, this);
        this.renderer.events.on("keypress", input.KEY_Q, this.onCameraRollLeft, this);
        this.renderer.events.on("keypress", input.KEY_E, this.onCameraRollRight, this);
    }

    onCameraMoveForward(event) {
        var camera = this.camera;
        camera.slide(0, 0, -this.speed);
        camera.update();
    }

    onCameraMoveBackward(event) {
        var camera = this.camera;
        camera.slide(0, 0, this.speed);
        camera.update();
    }

    onCameraStrifeLeft(event) {
        var camera = this.camera;
        camera.slide(-this.speed, 0, 0);
        camera.update();
    }

    onCameraStrifeRight(event) {
        var camera = this.camera;
        camera.slide(this.speed, 0, 0);
        camera.update();
    }

    onCameraLookUp(event) {
        var cam = this.camera;
        cam.pitch(0.5);
        cam.update();
    }

    onCameraLookDown(event) {
        var cam = this.camera;
        cam.pitch(-0.5);
        cam.update();
    }

    onCameraTurnLeft(event) {
        var cam = this.camera;
        cam.yaw(0.5);
        cam.update();
    }

    onCameraTurnRight(event) {
        var cam = this.camera;
        cam.yaw(-0.5);
        cam.update();
    }

    onCameraRollLeft(event) {
        var cam = this.camera;
        cam.roll(-0.5);
        cam.update();
    }

    onCameraRollRight(event) {
        var cam = this.camera;
        cam.roll(0.5);
        cam.update();
    }
};

/**
 * Creates simple navigation control instance.
 */
export function simpleNavigation(options) {
    return new SimpleNavigation(options);
};

export { SimpleNavigation };
