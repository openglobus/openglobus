import { input } from "../input/input";
import * as math from "../math";
import { Vec3 } from "../math/Vec3";
import { Control } from "./Control";

/**
 * Planet camera keyboard navigation. Use W,S,A,D and left shift key for fly around a planet.
 */

export class KeyboardNavigation extends Control {
    step: number;

    constructor(options: any) {
        options = options || {};
        super({ name: "KeyboardNavigation", ...options });
        this.step = options.step || 250;
    }

    override onactivate() {
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

    override ondeactivate() {
        this.renderer.events.off("keypress", input.KEY_PGUP, this.onCameraMoveForward);
        this.renderer.events.off("keypress", input.KEY_PGDN, this.onCameraMoveBackward);
        this.renderer.events.off("keypress", input.KEY_PLUS, this.onCameraMoveForward);
        this.renderer.events.off("keypress", input.KEY_EQUALS, this.onCameraMoveForward);
        this.renderer.events.off("keypress", input.KEY_MINUS, this.onCameraMoveBackward);
        this.renderer.events.off("keypress", input.KEY_W, this.onCameraMoveForward);
        this.renderer.events.off("keypress", input.KEY_S, this.onCameraMoveBackward);
        this.renderer.events.off("keypress", input.KEY_A, this.onCameraStrifeLeft);
        this.renderer.events.off("keypress", input.KEY_D, this.onCameraStrifeRight);
        this.renderer.events.off("keypress", input.KEY_UP, this.onCameraLookUp);
        this.renderer.events.off("keypress", input.KEY_DOWN, this.onCameraLookDown);
        this.renderer.events.off("keypress", input.KEY_LEFT, this.onCameraLookLeft);
        this.renderer.events.off("keypress", input.KEY_RIGHT, this.onCameraLookRight);
        this.renderer.events.off("keypress", input.KEY_Q, this.onCameraRollLeft);
        this.renderer.events.off("keypress", input.KEY_E, this.onCameraRollRight);
        this.renderer.events.off("keypress", input.KEY_N, this.onCameraRollNorth);
    }

    override oninit() {
        this.activate();
    }

    onCameraMoveForward(event: any) {
        var cam = this.renderer.activeCamera;
        cam.slide(0, 0, -cam._lonLat.height / this.step);
    }

    onCameraMoveBackward(event: any) {
        var cam = this.renderer.activeCamera;
        cam.slide(0, 0, cam._lonLat.height / this.step);
    }

    onCameraStrifeLeft(event: any) {
        var cam = this.renderer.activeCamera;
        cam.slide(-cam._lonLat.height / this.step, 0, 0);
    }

    onCameraStrifeRight(event: any) {
        var cam = this.renderer.activeCamera;
        cam.slide(cam._lonLat.height / this.step, 0, 0);
    }

    onCameraLookUp(event: any) {
        var cam = this.renderer.activeCamera;
        if (this.renderer.events.isKeyPressed(input.KEY_SHIFT)) {
            cam.pitch(15 / this.renderer.handler.deltaTime);
        } else {
            cam.rotateVertical((cam._lonLat.height / 3000000) * math.RADIANS, Vec3.ZERO);
        }
    }

    onCameraLookDown(event: any) {
        var cam = this.renderer.activeCamera;
        if (this.renderer.events.isKeyPressed(input.KEY_SHIFT)) {
            cam.pitch(-15 / this.renderer.handler.deltaTime);
        } else {
            cam.rotateVertical((-cam._lonLat.height / 3000000) * math.RADIANS, Vec3.ZERO);
        }
    }

    onCameraLookLeft(event: any) {
        var cam = this.renderer.activeCamera;
        if (this.renderer.events.isKeyPressed(input.KEY_SHIFT)) {
            cam.roll(15 / this.renderer.handler.deltaTime);
        } else {
            cam.rotateHorizontal((cam._lonLat.height / 3000000) * math.RADIANS, Vec3.ZERO);
        }
    }

    onCameraLookRight(event: any) {
        var cam = this.renderer.activeCamera;
        if (this.renderer.events.isKeyPressed(input.KEY_SHIFT)) {
            cam.roll(-15 / this.renderer.handler.deltaTime);
        } else {
            cam.rotateHorizontal((-cam._lonLat.height / 3000000) * math.RADIANS, Vec3.ZERO);
        }
    }

    onCameraTurnLeft(event: any) {
        var cam = this.renderer.activeCamera;
        if (this.renderer.events.isKeyPressed(input.KEY_SHIFT)) {
            cam.yaw(15 / this.renderer.handler.deltaTime);
        } else {
            cam.rotateHorizontal((cam._lonLat.height / 3000000) * math.RADIANS, false, Vec3.ZERO);
        }
    }

    onCameraTurnRight(event: any) {
        var cam = this.renderer.activeCamera;
        if (this.renderer.events.isKeyPressed(input.KEY_SHIFT)) {
            cam.yaw(-15 / this.renderer.handler.deltaTime);
        } else {
            cam.rotateHorizontal((-cam._lonLat.height / 3000000) * math.RADIANS, false, Vec3.ZERO);
        }
    }

    // from CompassButton._onClick()
    onCameraRollNorth(event: any) {
        let c = this.planet!.getCartesianFromPixelTerrain(this.renderer.handler.getCenter());
        if (c) {
            (this.planet as any).flyCartesian(
                c.normal().scaleTo(c.length() + c.distance(this.planet!.camera.eye as Vec3)),
                null,
                null,
                0,
                null,
                null,
                () => {
                    this.planet!.camera.look(c as Vec3);
                }
            );
        } else {
            this.planet!.flyCartesian(this.planet!.camera.eye);
        }
    }

    onCameraRollLeft(event: any) {
        this.renderer.activeCamera.roll(-15 / this.renderer.handler.deltaTime);
    }

    onCameraRollRight(event: any) {
        this.renderer.activeCamera.roll(15 / this.renderer.handler.deltaTime);
    }
}

/**
 * @deprecated
 */
export function keyboardNavigation(options: any) {
    return new KeyboardNavigation(options);
}
