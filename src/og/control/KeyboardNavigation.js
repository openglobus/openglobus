/**
 * @module og/control/KeyboardNavigation
 */

"use strict";

import { input } from "../input/input.js";
import * as math from "../math.js";
import { Vec3 } from "../math/Vec3.js";
import { Control } from "./Control.js";

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
        this.renderer.events.on("keypress", input.KEY_PGUP, this.onCameraMoveForward, this);
        this.renderer.events.on("keypress", input.KEY_PGDN, this.onCameraMoveBackward, this);
        this.renderer.events.on("keypress", input.KEY_PLUS, this.onCameraMoveForward, this);
        this.renderer.events.on("keypress", input.KEY_EQUALS, this.onCameraMoveForward, this);
        this.renderer.events.on("keypress", input.KEY_MINUS, this.onCameraMoveBackward, this);
        this.renderer.events.on("keypress", input.KEY_W, this.onCameraMoveForward, this);
        this.renderer.events.on("keypress", input.KEY_S, this.onCameraMoveBackward, this);
        this.renderer.events.on("keypress", input.KEY_A, this.onCameraStrifeLeft, this);
        this.renderer.events.on("keypress", input.KEY_D, this.onCameraStrifeRight, this);
        this.renderer.events.on("keypress", input.KEY_UP, this.onCameraLookUp, this);
        this.renderer.events.on("keypress", input.KEY_DOWN, this.onCameraLookDown, this);
        this.renderer.events.on("keypress", input.KEY_LEFT, this.onCameraLookLeft, this);
        this.renderer.events.on("keypress", input.KEY_RIGHT, this.onCameraLookRight, this);
        this.renderer.events.on("keypress", input.KEY_Q, this.onCameraRollLeft, this);
        this.renderer.events.on("keypress", input.KEY_E, this.onCameraRollRight, this);
        this.renderer.events.on("keypress", input.KEY_N, this.onCameraRollNorth, this);
    }

    onCameraMoveForward(event) {
        var cam = this.renderer.activeCamera;
        cam.slide(0, 0, -cam._lonLat.height / this.step);
    }

    onCameraMoveBackward(event) {
        var cam = this.renderer.activeCamera;
        cam.slide(0, 0, cam._lonLat.height / this.step);
    }

    onCameraStrifeLeft(event) {
        var cam = this.renderer.activeCamera;
        cam.slide(-cam._lonLat.height / this.step, 0, 0);
    }

    onCameraStrifeRight(event) {
        var cam = this.renderer.activeCamera;
        cam.slide(cam._lonLat.height / this.step, 0, 0);
    }

    onCameraLookUp(event) {
        var cam = this.renderer.activeCamera;
        if (this.renderer.events.isKeyPressed(input.KEY_SHIFT)) {
            cam.pitch(15 / this.renderer.handler.deltaTime);
        } else {
            cam.rotateVertical((cam._lonLat.height / 3000000) * math.RADIANS, Vec3.ZERO);
        }
    }

    onCameraLookDown(event) {
        var cam = this.renderer.activeCamera;
        if (this.renderer.events.isKeyPressed(input.KEY_SHIFT)) {
            cam.pitch(-15 / this.renderer.handler.deltaTime);
        } else {
            cam.rotateVertical((-cam._lonLat.height / 3000000) * math.RADIANS, Vec3.ZERO);
        }
    }

    onCameraLookLeft(event) {
        var cam = this.renderer.activeCamera;
        if (this.renderer.events.isKeyPressed(input.KEY_SHIFT)) {
            cam.roll(15 / this.renderer.handler.deltaTime);
        } else {
            cam.rotateHorizontal((cam._lonLat.height / 3000000) * math.RADIANS, Vec3.ZERO);
        }
    }

    onCameraLookRight(event) {
        var cam = this.renderer.activeCamera;
        if (this.renderer.events.isKeyPressed(input.KEY_SHIFT)) {
            cam.roll(-15 / this.renderer.handler.deltaTime);
        } else {
            cam.rotateHorizontal((-cam._lonLat.height / 3000000) * math.RADIANS, Vec3.ZERO);
        }
    }

    onCameraTurnLeft(event) {
        var cam = this.renderer.activeCamera;
        if (this.renderer.events.isKeyPressed(input.KEY_SHIFT)) {
            cam.yaw(15 / this.renderer.handler.deltaTime);
        } else {
            cam.rotateHorizontal((cam._lonLat.height / 3000000) * math.RADIANS, false, Vec3.ZERO);
        }
    }

    onCameraTurnRight(event) {
        var cam = this.renderer.activeCamera;
        if (this.renderer.events.isKeyPressed(input.KEY_SHIFT)) {
            cam.yaw(-15 / this.renderer.handler.deltaTime);
        } else {
            cam.rotateHorizontal((-cam._lonLat.height / 3000000) * math.RADIANS, false, Vec3.ZERO);
        }
    }

    // from CompassButton._onClick()
    onCameraRollNorth(event) {
      let c = this.planet.getCartesianFromPixelTerrain(this.renderer.handler.getCenter());
      if (c) {
        this.planet.flyCartesian(
          c.normal().scaleTo(c.length() + c.distance(this.planet.camera.eye)),
          null,
          null,
          0,
          null,
          null,
          () => {
            this.planet.camera.look(c);
          }
          );
      } else {
        this.planet.flyCartesian(this.planet.camera.eye);
      }
    }

    onCameraRollLeft(event) {
        this.renderer.activeCamera.roll(-15 / this.renderer.handler.deltaTime);
    }

    onCameraRollRight(event) {
        this.renderer.activeCamera.roll(15 / this.renderer.handler.deltaTime);
    }
}

export function keyboardNavigation(options) {
    return new KeyboardNavigation(options);
}

export { KeyboardNavigation };

