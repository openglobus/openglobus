"use strict";

import { input } from "../input/input.js";
import { Control } from "./Control.js";

/**
 * Simple keyboard camera navigation with W,S,A,D and shift keys to fly around the scene.
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class SimpleNavigation extends Control {
    constructor(options = {}) {
        super({ autoActivate: true, ...options });

        this.camera = null;
        this.speed = options.speed || 1.0;
    }

    oninit() {
        this.camera = this.renderer.activeCamera;
        this.renderer.events.on("keypress", input.KEY_W, this.onCameraMoveForward, this, 'KEY_W');
        this.renderer.events.on("keypress", input.KEY_S, this.onCameraMoveBackward, this, 'KEY_S');
        this.renderer.events.on("keypress", input.KEY_A, this.onCameraStrifeLeft, this, 'KEY_A');
        this.renderer.events.on("keypress", input.KEY_D, this.onCameraStrifeRight, this, 'KEY_D');
        this.renderer.events.on("keypress", input.KEY_UP, this.onCameraLookUp, this, 'KEY_UP');
        this.renderer.events.on("keypress", input.KEY_DOWN, this.onCameraLookDown, this, 'KEY_DOWN');
        this.renderer.events.on("keypress", input.KEY_LEFT, this.onCameraTurnLeft, this, 'KEY_LEFT');
        this.renderer.events.on("keypress", input.KEY_RIGHT, this.onCameraTurnRight, this, 'KEY_RIGHT');
        this.renderer.events.on("keypress", input.KEY_Q, this.onCameraRollLeft, this, 'KEY_Q');
        this.renderer.events.on("keypress", input.KEY_E, this.onCameraRollRight, this, 'KEY_E');
    }

    onCameraMoveForward() {
        if (this._active) {
            var camera = this.camera;
            camera.slide(0, 0, -this.speed);
            //camera.update();
        }
    }

    onCameraMoveBackward() {
        if (this._active) {
            var camera = this.camera;
            camera.slide(0, 0, this.speed);
            //camera.update();
        }
    }

    onCameraStrifeLeft() {
        if (this._active) {
            var camera = this.camera;
            camera.slide(-this.speed, 0, 0);
            //camera.update();
        }
    }

    onCameraStrifeRight() {
        if (this._active) {
            var camera = this.camera;
            camera.slide(this.speed, 0, 0);
            //camera.update();
        }
    }

    onCameraLookUp() {
        if (this._active) {
            var cam = this.camera;
            cam.pitch(0.5);
            //cam.update();
        }
    }

    onCameraLookDown() {
        if (this._active) {
            var cam = this.camera;
            cam.pitch(-0.5);
            //cam.update();
        }
    }

    onCameraTurnLeft() {
        if (this._active) {
            var cam = this.camera;
            cam.yaw(0.5);
            //cam.update();
        }
    }

    onCameraTurnRight() {
        if (this._active) {
            var cam = this.camera;
            cam.yaw(-0.5);
            //cam.update();
        }
    }

    onCameraRollLeft() {
        if (this._active) {
            var cam = this.camera;
            cam.roll(-0.5);
            //cam.update();
        }
    }

    onCameraRollRight() {
        if (this._active) {
            var cam = this.camera;
            cam.roll(0.5);
            //cam.update();
        }
    }
}

/**
 * Creates simple navigation control instance.
 */
export function simpleNavigation(options) {
    return new SimpleNavigation(options);
}

export { SimpleNavigation };

