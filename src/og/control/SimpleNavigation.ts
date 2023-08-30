import { input } from "../input/input";
import { Control } from "./Control";

/**
 * Simple keyboard camera navigation with W,S,A,D and shift keys to fly around the scene.
 */
export class SimpleNavigation extends Control {
    camera: any;
    speed: any;
    constructor(options: { speed?: number } = {}) {
        super({ autoActivate: true, ...options });

        this.camera = null;
        this.speed = options.speed || 1.0;
    }

    override oninit() {
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

    onCameraMoveForward() {
        if (this._active) {
            var camera = this.camera;
            camera.slide(0, 0, -this.speed);
            camera.update();
        }
    }

    onCameraMoveBackward() {
        if (this._active) {
            var camera = this.camera;
            camera.slide(0, 0, this.speed);
            camera.update();
        }
    }

    onCameraStrifeLeft() {
        if (this._active) {
            var camera = this.camera;
            camera.slide(-this.speed, 0, 0);
            camera.update();
        }
    }

    onCameraStrifeRight() {
        if (this._active) {
            var camera = this.camera;
            camera.slide(this.speed, 0, 0);
            camera.update();
        }
    }

    onCameraLookUp() {
        if (this._active) {
            var cam = this.camera;
            cam.pitch(0.5);
            cam.update();
        }
    }

    onCameraLookDown() {
        if (this._active) {
            var cam = this.camera;
            cam.pitch(-0.5);
            cam.update();
        }
    }

    onCameraTurnLeft() {
        if (this._active) {
            var cam = this.camera;
            cam.yaw(0.5);
            cam.update();
        }
    }

    onCameraTurnRight() {
        if (this._active) {
            var cam = this.camera;
            cam.yaw(-0.5);
            cam.update();
        }
    }

    onCameraRollLeft() {
        if (this._active) {
            var cam = this.camera;
            cam.roll(-0.5);
            cam.update();
        }
    }

    onCameraRollRight() {
        if (this._active) {
            var cam = this.camera;
            cam.roll(0.5);
            cam.update();
        }
    }
}

/**
 * Creates simple navigation control instance.
 * @deprecated
 */
export function simpleNavigation(options: any) {
    return new SimpleNavigation(options);
}
