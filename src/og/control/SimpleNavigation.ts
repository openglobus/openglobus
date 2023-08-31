import {Camera} from "../camera/Camera";
import {Control, IControlParams} from "./Control";
import {input} from "../input/input";

interface ISimpleNavigationParams extends IControlParams {
    speed?: number;
}

/**
 * Simple keyboard camera navigation with W,S,A,D and shift keys to fly around the scene.
 */
export class SimpleNavigation extends Control {
    public speed: number;

    constructor(options: ISimpleNavigationParams = {}) {
        super(options);
        this.speed = options.speed || 1.0;
    }

    override oninit() {
        let r = this.renderer!;
        r.events.on("keypress", input.KEY_W, this.onCameraMoveForward, this);
        r.events.on("keypress", input.KEY_S, this.onCameraMoveBackward, this);
        r.events.on("keypress", input.KEY_A, this.onCameraStrifeLeft, this);
        r.events.on("keypress", input.KEY_D, this.onCameraStrifeRight, this);
        r.events.on("keypress", input.KEY_UP, this.onCameraLookUp, this);
        r.events.on("keypress", input.KEY_DOWN, this.onCameraLookDown, this);
        r.events.on("keypress", input.KEY_LEFT, this.onCameraTurnLeft, this);
        r.events.on("keypress", input.KEY_RIGHT, this.onCameraTurnRight, this);
        r.events.on("keypress", input.KEY_Q, this.onCameraRollLeft, this);
        r.events.on("keypress", input.KEY_E, this.onCameraRollRight, this);
    }

    onCameraMoveForward() {
        if (this._active) {
            let cam = this.renderer!.activeCamera!;
            cam.slide(0, 0, -this.speed);
            cam.update();
        }
    }

    onCameraMoveBackward() {
        if (this._active) {
            let cam = this.renderer!.activeCamera!;
            cam.slide(0, 0, this.speed);
            cam.update();
        }
    }

    onCameraStrifeLeft() {
        if (this._active) {
            let cam = this.renderer!.activeCamera!;
            cam.slide(-this.speed, 0, 0);
            cam.update();
        }
    }

    onCameraStrifeRight() {
        if (this._active) {
            let cam = this.renderer!.activeCamera!;
            cam.slide(this.speed, 0, 0);
            cam.update();
        }
    }

    onCameraLookUp() {
        if (this._active) {
            let cam = this.renderer!.activeCamera!;
            cam.pitch(0.5);
            cam.update();
        }
    }

    onCameraLookDown() {
        if (this._active) {
            let cam = this.renderer!.activeCamera!;
            cam.pitch(-0.5);
            cam.update();
        }
    }

    onCameraTurnLeft() {
        if (this._active) {
            let cam = this.renderer!.activeCamera!;
            cam.yaw(0.5);
            cam.update();
        }
    }

    onCameraTurnRight() {
        if (this._active) {
            let cam = this.renderer!.activeCamera!;
            cam.yaw(-0.5);
            cam.update();
        }
    }

    onCameraRollLeft() {
        if (this._active) {
            let cam = this.renderer!.activeCamera!;
            cam.roll(-0.5);
            cam.update();
        }
    }

    onCameraRollRight() {
        if (this._active) {
            let cam = this.renderer!.activeCamera!;
            cam.roll(0.5);
            cam.update();
        }
    }
}