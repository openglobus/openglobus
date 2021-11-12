/**
 * @module og/control/KeyboardNavigation
 */

"use strict";

import * as math from "../math.js";
import { Control } from "./Control.js";
import { input } from "../input/input.js";
import { Vec3 } from "../math/Vec3.js";

/**
 * Planet camera keyboard navigation. Use W,S,A,D and left shift key for fly around a planet.
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */

class KeyboardNavigation extends Control {
    constructor(options) {
        options = options || {};
        super(options);
        this.step = options.step || 250;
    }

    oninit() {
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
        var cam = this.renderer.activeCamera;
        cam.slide(0, 0, -cam._lonLat.height / this.step);
        cam.checkTerrainCollision();
        cam.update();
    }

    onCameraMoveBackward(event) {
        var cam = this.renderer.activeCamera;
        cam.slide(0, 0, cam._lonLat.height / this.step);
        cam.checkTerrainCollision();
        cam.update();
    }

    onCameraStrifeLeft(event) {
        var cam = this.renderer.activeCamera;
        cam.slide(-cam._lonLat.height / this.step, 0, 0);
        cam.checkTerrainCollision();
        cam.update();
    }

    onCameraStrifeRight(event) {
        var cam = this.renderer.activeCamera;
        cam.slide(cam._lonLat.height / this.step, 0, 0);
        cam.checkTerrainCollision();
        cam.update();
    }

    onCameraLookUp(event) {
        var cam = this.renderer.activeCamera;
        if (this.renderer.events.isKeyPressed(input.KEY_SHIFT)) {
            cam.pitch(15 / this.renderer.handler.deltaTime);
        } else {
            cam.rotateVertical((cam._lonLat.height / 3000000) * math.RADIANS, Vec3.ZERO);
        }
        cam.update();
    }

    onCameraLookDown(event) {
        var cam = this.renderer.activeCamera;
        if (this.renderer.events.isKeyPressed(input.KEY_SHIFT)) {
            cam.pitch(-15 / this.renderer.handler.deltaTime);
        } else {
            cam.rotateVertical((-cam._lonLat.height / 3000000) * math.RADIANS, Vec3.ZERO);
        }
        cam.update();
    }

    onCameraTurnLeft(event) {
        var cam = this.renderer.activeCamera;
        if (this.renderer.events.isKeyPressed(input.KEY_SHIFT)) {
            cam.yaw(15 / this.renderer.handler.deltaTime);
        } else {
            cam.rotateHorizontal((cam._lonLat.height / 3000000) * math.RADIANS, false, Vec3.ZERO);
        }
        cam.update();
    }

    onCameraTurnRight(event) {
        var cam = this.renderer.activeCamera;
        if (this.renderer.events.isKeyPressed(input.KEY_SHIFT)) {
            cam.yaw(-15 / this.renderer.handler.deltaTime);
        } else {
            cam.rotateHorizontal((-cam._lonLat.height / 3000000) * math.RADIANS, false, Vec3.ZERO);
        }
        cam.update();
    }

    onCameraRollLeft(event) {
        this.renderer.activeCamera.roll(-15 / this.renderer.handler.deltaTime);
        this.renderer.activeCamera.update();
    }

    onCameraRollRight(event) {
        this.renderer.activeCamera.roll(15 / this.renderer.handler.deltaTime);
        this.renderer.activeCamera.update();
    }
}

export function keyboardNavigation(options) {
    return new KeyboardNavigation(options);
}

export { KeyboardNavigation };
